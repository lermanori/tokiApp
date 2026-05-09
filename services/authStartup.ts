import { performRequestWithRefresh, type MinimalFetchResponse } from './authRequest';
import { parseStoredAuthSession } from './authSession';

type FetchLike = (input: string, init?: RequestInit) => Promise<MinimalFetchResponse>;

export interface RestoreStartupSessionOptions {
  rawStoredSession: string | null;
  validateUrl: string;
  refreshUrl: string;
  fetchImpl: FetchLike;
  requestHeaders?: Record<string, string>;
  maxAgeMs?: number | null;
}

export type StartupAuthResult =
  | {
      status: 'authenticated';
      accessToken: string;
      refreshToken: string;
      refreshed: boolean;
      cleared: false;
      refreshAttempted: boolean;
      failureReason: null;
    }
  | {
      status: 'login_required';
      accessToken: null;
      refreshToken: null;
      refreshed: false;
      cleared: boolean;
      refreshAttempted: boolean;
      failureReason: 'no_session' | 'refresh_failed' | 'validation_failed';
    };

export const restoreStartupSession = async (
  options: RestoreStartupSessionOptions,
): Promise<StartupAuthResult> => {
  const requestHeaders = options.requestHeaders ?? {
    'Content-Type': 'application/json',
  };

  const parsedSession = parseStoredAuthSession(options.rawStoredSession, {
    maxAgeMs: options.maxAgeMs,
  });

  if (parsedSession.status !== 'valid') {
    return {
      status: 'login_required',
      accessToken: null,
      refreshToken: null,
      refreshed: false,
      cleared: parsedSession.status === 'expired' || parsedSession.status === 'invalid',
      refreshAttempted: false,
      failureReason: 'no_session',
    };
  }

  let currentAccessToken = parsedSession.session.accessToken;
  let currentRefreshToken = parsedSession.session.refreshToken;
  let cleared = false;

  try {
    const result = await performRequestWithRefresh({
      url: options.validateUrl,
      refreshUrl: options.refreshUrl,
      refreshToken: currentRefreshToken,
      requestInit: {
        method: 'GET',
        headers: {
          ...requestHeaders,
          Authorization: `Bearer ${currentAccessToken}`,
        },
      },
      fetchImpl: options.fetchImpl,
      getHeaders: () => ({
        ...requestHeaders,
        Authorization: `Bearer ${currentAccessToken}`,
      }),
      saveTokens: async (accessToken, refreshToken) => {
        currentAccessToken = accessToken;
        currentRefreshToken = refreshToken;
      },
      clearTokens: async () => {
        currentAccessToken = '';
        currentRefreshToken = '';
        cleared = true;
      },
    });

    return {
      status: 'authenticated',
      accessToken: currentAccessToken,
      refreshToken: currentRefreshToken,
      refreshed: result.didRefresh,
      cleared: false,
      refreshAttempted: result.attemptedRefresh,
      failureReason: null,
    };
  } catch (error) {
    const refreshAttempted = Boolean((error as any)?.attemptedRefresh);
    return {
      status: 'login_required',
      accessToken: null,
      refreshToken: null,
      refreshed: false,
      cleared,
      refreshAttempted,
      failureReason: refreshAttempted ? 'refresh_failed' : 'validation_failed',
    };
  }
};
