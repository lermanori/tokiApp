export interface MinimalFetchResponse<T = any> {
  ok: boolean;
  status: number;
  statusText: string;
  json(): Promise<T>;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<MinimalFetchResponse>;

export interface PerformRequestWithRefreshOptions {
  url: string;
  requestInit: RequestInit;
  refreshToken: string | null;
  refreshUrl: string;
  fetchImpl: FetchLike;
  getHeaders: () => Record<string, string>;
  saveTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  clearTokens: () => Promise<void>;
}

export interface PerformRequestWithRefreshResult<T> {
  data: T;
  didRefresh: boolean;
  attemptedRefresh: boolean;
}

const createAuthError = (message: string, status: number, payload?: Record<string, any>) => {
  const error = new Error(message);
  (error as any).status = status;
  (error as any).isAuthError = status === 401 || status === 403;
  (error as any).payload = payload ?? null;
  (error as any).code = payload?.code ?? null;
  (error as any).supportState = payload?.supportState ?? null;
  (error as any).title = payload?.title ?? null;
  (error as any).storeUrl = payload?.storeUrl ?? null;
  return error;
};

const createRefreshMetadataError = (
  message: string,
  status: number,
  attemptedRefresh: boolean,
  payload?: Record<string, any>,
) => {
  const error = createAuthError(message, status, payload);
  (error as any).attemptedRefresh = attemptedRefresh;
  (error as any).refreshFailed = attemptedRefresh;
  return error;
};

export const performRequestWithRefresh = async <T>(
  options: PerformRequestWithRefreshOptions,
): Promise<PerformRequestWithRefreshResult<T>> => {
  const {
    url,
    requestInit,
    refreshToken,
    refreshUrl,
    fetchImpl,
    getHeaders,
    saveTokens,
    clearTokens,
  } = options;

  const initialResponse = await fetchImpl(url, requestInit);
  const initialData = await initialResponse.json();

  if (initialResponse.ok) {
    return { data: initialData as T, didRefresh: false, attemptedRefresh: false };
  }

  if (initialResponse.status !== 401 || !refreshToken) {
    const errorMessage = (initialData as any)?.message || `HTTP ${initialResponse.status}: ${initialResponse.statusText}`;
    throw createRefreshMetadataError(errorMessage, initialResponse.status, false, initialData as Record<string, any>);
  }

  const refreshResponse = await fetchImpl(refreshUrl, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ refreshToken }),
  });

  const refreshData = await refreshResponse.json();
  if (refreshResponse.ok && (refreshData as any).success) {
    await saveTokens(
      (refreshData as any).data.tokens.accessToken,
      (refreshData as any).data.tokens.refreshToken,
    );

    const retryResponse = await fetchImpl(url, {
      ...requestInit,
      headers: getHeaders(),
    });
    const retryData = await retryResponse.json();

    if (!retryResponse.ok) {
      throw createRefreshMetadataError(
        (retryData as any)?.message || 'Request failed after token refresh',
        retryResponse.status,
        true,
        retryData as Record<string, any>,
      );
    }

    return { data: retryData as T, didRefresh: true, attemptedRefresh: true };
  }

  if (refreshResponse.status === 401) {
    await clearTokens();
  }

  throw createRefreshMetadataError(
    'Authentication failed. Please log in again.',
    refreshResponse.status,
    true,
    refreshData as Record<string, any>,
  );
};
