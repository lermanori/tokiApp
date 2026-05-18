// In-memory access- and refresh-token revocation stores for E2E tests.
// Any token whose `iat` (issued-at, seconds) is before the recorded
// timestamp for a user is treated as invalid.

const accessRevokedBeforeByUserId: Map<string, number> = new Map();
const refreshRevokedBeforeByUserId: Map<string, number> = new Map();

export const revokeAccessTokensForUser = (userId: string): void => {
  accessRevokedBeforeByUserId.set(userId, Math.floor(Date.now() / 1000));
};

export const isAccessTokenRevoked = (userId: string, iat: number): boolean => {
  const revokedBefore = accessRevokedBeforeByUserId.get(userId);
  return revokedBefore !== undefined && iat < revokedBefore;
};

export const revokeRefreshTokensForUser = (userId: string): void => {
  refreshRevokedBeforeByUserId.set(userId, Math.floor(Date.now() / 1000));
};

export const isRefreshTokenRevoked = (userId: string, iat: number): boolean => {
  const revokedBefore = refreshRevokedBeforeByUserId.get(userId);
  return revokedBefore !== undefined && iat < revokedBefore;
};
