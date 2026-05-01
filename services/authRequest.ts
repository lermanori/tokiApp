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
}

const createAuthError = (message: string, status: number) => {
  const error = new Error(message);
  (error as any).status = status;
  (error as any).isAuthError = status === 401 || status === 403;
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
    return { data: initialData as T, didRefresh: false };
  }

  if (initialResponse.status !== 401 || !refreshToken) {
    const errorMessage = (initialData as any)?.message || `HTTP ${initialResponse.status}: ${initialResponse.statusText}`;
    throw createAuthError(errorMessage, initialResponse.status);
  }

  const refreshResponse = await fetchImpl(refreshUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
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
      throw new Error((retryData as any)?.message || 'Request failed after token refresh');
    }

    return { data: retryData as T, didRefresh: true };
  }

  if (refreshResponse.status === 401) {
    await clearTokens();
  }

  throw new Error('Authentication failed. Please log in again.');
};
