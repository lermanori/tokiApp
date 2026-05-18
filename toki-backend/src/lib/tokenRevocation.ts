// In-memory access-token revocation store for E2E tests.
// Any access token whose `iat` (issued-at, seconds) is before the recorded
// timestamp for a user is treated as invalid. Refresh tokens are unaffected,
// so the app can refresh and obtain a new access token that passes again.

const revokedBeforeByUserId: Map<string, number> = new Map();

export const revokeAccessTokensForUser = (userId: string): void => {
  revokedBeforeByUserId.set(userId, Math.floor(Date.now() / 1000));
};

export const isAccessTokenRevoked = (userId: string, iat: number): boolean => {
  const revokedBefore = revokedBeforeByUserId.get(userId);
  return revokedBefore !== undefined && iat < revokedBefore;
};
