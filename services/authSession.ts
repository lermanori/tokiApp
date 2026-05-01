export interface StoredAuthSession {
  accessToken: string;
  refreshToken: string;
  persistedAt: number;
}

export interface ParsedAuthSession {
  accessToken: string;
  refreshToken: string;
  persistedAt: number;
}

export type ParsedAuthSessionResult =
  | { status: 'missing' }
  | { status: 'invalid' }
  | { status: 'expired'; session: ParsedAuthSession }
  | { status: 'valid'; session: ParsedAuthSession };

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const normalizePersistedAt = (value: unknown, now: number): number => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }

  return now;
};

export const serializeAuthSession = (
  tokens: { accessToken: string; refreshToken: string },
  now: number = Date.now(),
): string => {
  const payload: StoredAuthSession = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    persistedAt: now,
  };

  return JSON.stringify(payload);
};

export const parseStoredAuthSession = (
  rawValue: string | null,
  options: { now?: number; maxAgeMs?: number | null } = {},
): ParsedAuthSessionResult => {
  if (!rawValue) {
    return { status: 'missing' };
  }

  const now = options.now ?? Date.now();

  try {
    const parsed = JSON.parse(rawValue) as Partial<StoredAuthSession>;

    if (!isNonEmptyString(parsed.accessToken) || !isNonEmptyString(parsed.refreshToken)) {
      return { status: 'invalid' };
    }

    const session: ParsedAuthSession = {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      persistedAt: normalizePersistedAt(parsed.persistedAt, now),
    };

    if (typeof options.maxAgeMs === 'number' && options.maxAgeMs >= 0) {
      const ageMs = now - session.persistedAt;
      if (ageMs > options.maxAgeMs) {
        return { status: 'expired', session };
      }
    }

    return { status: 'valid', session };
  } catch {
    return { status: 'invalid' };
  }
};

export const getAuthSessionMaxAgeMs = (envValue: string | undefined): number | null => {
  if (!envValue) {
    return null;
  }

  const parsed = Number.parseInt(envValue, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
};
