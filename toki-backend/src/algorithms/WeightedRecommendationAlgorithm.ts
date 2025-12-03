import { Pool } from 'pg';
import { pool } from '../config/database';
import { calculateDistance } from '../utils/distance';
import { RecommendationStrategy } from './RecommendationStrategy';
import {
  AlgorithmContext,
  AlgorithmWeights,
  EventData,
  ScoredEvent,
} from './types';

type UserContext = {
  categoryCounts: Map<string, number>;
  categorySet: Set<string>;
  savedCategoryCounts: Map<string, number>;
  connectionIds: string[];
  connectionIdSet: Set<string>;
  connectionParticipation: Map<string, number>;
};

const PARTICIPATION_STATUSES = ['approved', 'joined', 'completed'] as const;

export class WeightedRecommendationAlgorithm implements RecommendationStrategy {
  private db: Pool;

  constructor(db: Pool = pool) {
    this.db = db;
  }

  getName(): string {
    return 'weighted-recommendation';
  }

  async scoreEvents(
    events: EventData[],
    context: AlgorithmContext
  ): Promise<ScoredEvent[]> {
    if (events.length === 0) {
      return [];
    }

    const userContext = await this.loadUserContext(context.userId, events);

    const scoredEvents = events.map((event) => {
      const score = this.calculateEventScore(event, context, userContext);
      return {
        ...event,
        algorithm_score: score,
      };
    });

    // Apply duplicate category penalty to encourage diversity
    const categoryCounts: Record<string, number> = {};
    const penalized = scoredEvents.map((event) => {
      const category = event.category || 'unknown';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      const occurrences = categoryCounts[category];
      const penalty =
        occurrences > 3 ? context.weights.w_pen * (occurrences - 3) * 0.1 : 0;
      return {
        ...event,
        algorithm_score: event.algorithm_score - penalty,
      };
    });

    return penalized;
  }

  private calculateEventScore(
    event: EventData,
    context: AlgorithmContext,
    userContext: UserContext
  ): number {
    const { weights, userLat, userLng } = context;

    let score = 0;

    const similarityScore = this.calculateSimilarityScore(event, userContext);
    score += weights.w_hist * similarityScore;

    const socialScore = this.calculateSocialScore(event, userContext);
    const connectionBoost = this.calculateConnectionEventBoost(
      event,
      userContext
    );
    const combinedSocial = Math.min(1, socialScore + connectionBoost * 0.5);
    score += weights.w_social * combinedSocial;

    const popularityScore = this.calculatePopularityScore(event);
    score += weights.w_pop * popularityScore;

    const timeScore = this.calculateTimeScore(event);
    score += weights.w_time * timeScore;

    const geoScore = this.calculateGeoScore(event, userLat, userLng);
    score += weights.w_geo * geoScore;

    const noveltyScore = this.calculateNoveltyScore(event, userContext);
    score += weights.w_novel * noveltyScore;

    return score;
  }

  private async loadUserContext(
    userId: string,
    events: EventData[]
  ): Promise<UserContext> {
    const eventIds = events.map((event) => event.id);
    const client = await this.db.connect();

    try {
      const [
        categoryHistoryResult,
        savedCategoriesResult,
        connectionsResult,
      ] = await Promise.all([
        client.query<
          { category: string; count: string }
        >(
          `
            SELECT t.category, COUNT(*)::text AS count
            FROM toki_participants tp
            JOIN tokis t ON t.id = tp.toki_id
            WHERE tp.user_id = $1
              AND tp.status = ANY($2)
            GROUP BY t.category
          `,
          [userId, PARTICIPATION_STATUSES]
        ),
        client.query<{ category: string; count: string }>(
          `
            SELECT t.category, COUNT(*)::text AS count
            FROM saved_tokis st
            JOIN tokis t ON t.id = st.toki_id
            WHERE st.user_id = $1
            GROUP BY t.category
          `,
          [userId]
        ),
        client.query<{ connection_id: string }>(
          `
            SELECT DISTINCT
              CASE
                WHEN requester_id = $1 THEN recipient_id
                ELSE requester_id
              END AS connection_id
            FROM user_connections
            WHERE (requester_id = $1 OR recipient_id = $1)
              AND status = 'accepted'
          `,
          [userId]
        ),
      ]);

      const connectionIds = connectionsResult.rows.map(
        (row) => row.connection_id
      );
      const connectionIdSet = new Set(connectionIds);

      let connectionParticipation = new Map<string, number>();

      if (eventIds.length > 0 && connectionIds.length > 0) {
        const participationResult = await client.query<{
          toki_id: string;
          count: string;
        }>(
          `
            SELECT tp.toki_id, COUNT(*)::text AS count
            FROM toki_participants tp
            WHERE tp.toki_id = ANY($1::uuid[])
              AND tp.user_id = ANY($2::uuid[])
              AND tp.status = 'approved'
            GROUP BY tp.toki_id
          `,
          [eventIds, connectionIds]
        );

        connectionParticipation = new Map(
          participationResult.rows.map((row) => [row.toki_id, Number(row.count)])
        );
      }

      const categoryCounts = new Map<string, number>(
        categoryHistoryResult.rows.map((row) => [row.category, Number(row.count)])
      );
      const savedCategoryCounts = new Map<string, number>(
        savedCategoriesResult.rows.map((row) => [row.category, Number(row.count)])
      );
      const categorySet = new Set(categoryCounts.keys());

      return {
        categoryCounts,
        categorySet,
        savedCategoryCounts,
        connectionIds,
        connectionIdSet,
        connectionParticipation,
      };
    } finally {
      client.release();
    }
  }

  private calculateSimilarityScore(
    event: EventData,
    context: UserContext
  ): number {
    const count = context.categoryCounts.get(event.category) ?? 0;
    const savedCount = context.savedCategoryCounts.get(event.category) ?? 0;
    const combined = count + savedCount * 0.5;
    return Math.min(combined / 10, 1);
  }

  private calculateSocialScore(
    event: EventData,
    context: UserContext
  ): number {
    const participation = context.connectionParticipation.get(event.id) ?? 0;
    return Math.min(participation / 5, 1);
  }

  private calculatePopularityScore(event: EventData): number {
    const maxAttendees = Math.max(event.max_attendees || 0, 1);
    const current = Math.max(event.current_attendees || 0, 0);
    return Math.min(current / maxAttendees, 1);
  }

  private calculateTimeScore(event: EventData): number {
    if (!event.scheduled_time) {
      return 0.3;
    }

    const eventTime = new Date(event.scheduled_time).getTime();
    const now = Date.now();
    const hoursUntil = (eventTime - now) / (1000 * 60 * 60);

    if (hoursUntil <= 0) {
      return 0;
    }

    return Math.max(0, Math.min(1, 1 - hoursUntil / (24 * 7)));
  }

  private calculateGeoScore(
    event: EventData,
    userLat?: number | null,
    userLng?: number | null
  ): number {
    if (
      userLat == null ||
      userLng == null ||
      event.latitude == null ||
      event.longitude == null
    ) {
      return 0.5;
    }

    const distanceKm =
      event.distance_km ??
      calculateDistance(userLat, userLng, event.latitude, event.longitude);

    if (distanceKm <= 1) {
      return 1;
    }
    if (distanceKm <= 10) {
      return Math.max(0.5, 1 - (distanceKm - 1) * 0.05);
    }
    if (distanceKm <= 50) {
      return Math.max(0.1, 0.55 - (distanceKm - 10) * 0.01);
    }
    return 0.1;
  }

  private calculateNoveltyScore(
    event: EventData,
    context: UserContext
  ): number {
    if (context.categorySet.has(event.category)) {
      return 0.3;
    }
    return 1;
  }

  private calculateConnectionEventBoost(
    event: EventData,
    context: UserContext
  ): number {
    const hostBoost =
      event.host_id && context.connectionIdSet.has(event.host_id) ? 1 : 0;
    const participantBoost = context.connectionParticipation.get(event.id) ?? 0;
    const normalizedParticipantBoost = Math.min(participantBoost / 3, 1);

    // Weight host connections slightly higher than attendees
    const combined =
      hostBoost * 0.6 + normalizedParticipantBoost * 0.4;

    return Math.min(combined, 1);
  }
}



