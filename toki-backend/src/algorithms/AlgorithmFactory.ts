import { Pool } from 'pg';
import { pool } from '../config/database';
import { RecommendationStrategy } from './RecommendationStrategy';
import { WeightedRecommendationAlgorithm } from './WeightedRecommendationAlgorithm';

export type AlgorithmType = 'weighted-recommendation' | 'default';

/**
 * Factory responsible for providing recommendation algorithm instances.
 * Uses lazy initialization and caches strategies for reuse.
 */
export class AlgorithmFactory {
  private static strategies: Map<AlgorithmType, RecommendationStrategy> =
    new Map();

  static getAlgorithm(
    type: AlgorithmType = 'weighted-recommendation',
    db?: Pool
  ): RecommendationStrategy {
    if (!this.strategies.has(type)) {
      switch (type) {
        case 'weighted-recommendation':
          this.strategies.set(
            type,
            new WeightedRecommendationAlgorithm(db ?? pool)
          );
          break;
        case 'default':
          this.strategies.set(
            type,
            new WeightedRecommendationAlgorithm(db ?? pool)
          );
          break;
        default:
          throw new Error(`Unknown algorithm type: ${type}`);
      }
    }

    return this.strategies.get(type)!;
  }

  static registerAlgorithm(
    type: AlgorithmType,
    strategy: RecommendationStrategy
  ): void {
    this.strategies.set(type, strategy);
  }

  static clearCache(): void {
    this.strategies.clear();
  }
}



