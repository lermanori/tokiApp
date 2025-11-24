import { AlgorithmContext, EventData, ScoredEvent } from './types';

/**
 * Strategy interface for recommendation algorithms.
 * Enables swapping implementations without touching route logic.
 */
export interface RecommendationStrategy {
  /**
   * Calculate recommendation scores for the provided events.
   */
  scoreEvents(events: EventData[], context: AlgorithmContext): Promise<ScoredEvent[]>;

  /**
   * Return the unique identifier for the strategy implementation.
   */
  getName(): string;
}



