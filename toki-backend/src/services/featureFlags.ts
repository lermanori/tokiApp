import { pool } from '../config/database';
import logger from '../utils/logger';

export type FeatureFlagMap = Record<string, boolean>;

const TTL_MS = 60_000;
let cache: { value: FeatureFlagMap; expiresAt: number } | null = null;

export async function getFeatures(): Promise<FeatureFlagMap> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.value;
  }
  try {
    const result = await pool.query<{ key: string; enabled: boolean }>(
      'SELECT key, enabled FROM feature_flags'
    );
    const value: FeatureFlagMap = {};
    for (const row of result.rows) {
      value[row.key] = row.enabled === true;
    }
    cache = { value, expiresAt: Date.now() + TTL_MS };
    return value;
  } catch (error: any) {
    logger.warn('[featureFlags] failed to load flags, defaulting to off:', error?.message);
    return {};
  }
}

export async function isEnabled(key: string): Promise<boolean> {
  const flags = await getFeatures();
  return flags[key] === true;
}

export function invalidateFeatureCache(): void {
  cache = null;
}
