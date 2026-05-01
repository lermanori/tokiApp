import test from 'node:test';
import assert from 'node:assert/strict';

import { performRequestWithRefresh } from '../services/authRequest';

type MockResponse = {
  ok: boolean;
  status: number;
  statusText?: string;
  body: any;
};

const createResponse = (response: MockResponse) => ({
  ok: response.ok,
  status: response.status,
  statusText: response.statusText ?? '',
  json: async () => response.body,
});

test('uses the refresh token after a 401 and retries with the new access token', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  let currentAccessToken = 'expired-access-token';
  let savedTokens: { accessToken: string; refreshToken: string } | null = null;

  const responses: MockResponse[] = [
    {
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      body: { message: 'Access token expired' },
    },
    {
      ok: true,
      status: 200,
      body: {
        success: true,
        data: {
          tokens: {
            accessToken: 'fresh-access-token',
            refreshToken: 'fresh-refresh-token',
          },
        },
      },
    },
    {
      ok: true,
      status: 200,
      body: {
        success: true,
        data: { id: 'user-1' },
      },
    },
  ];

  const result = await performRequestWithRefresh({
    url: 'https://example.com/api/auth/me',
    refreshUrl: 'https://example.com/api/auth/refresh',
    refreshToken: 'stored-refresh-token',
    requestInit: {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${currentAccessToken}`,
        'Content-Type': 'application/json',
      },
    },
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      const next = responses.shift();
      assert.ok(next, `Unexpected fetch call for ${url}`);
      return createResponse(next);
    },
    getHeaders: () => ({
      Authorization: `Bearer ${currentAccessToken}`,
      'Content-Type': 'application/json',
    }),
    saveTokens: async (accessToken, refreshToken) => {
      currentAccessToken = accessToken;
      savedTokens = { accessToken, refreshToken };
    },
    clearTokens: async () => {
      currentAccessToken = '';
    },
  });

  assert.equal(result.didRefresh, true);
  assert.deepEqual(result.data, {
    success: true,
    data: { id: 'user-1' },
  });

  assert.deepEqual(savedTokens, {
    accessToken: 'fresh-access-token',
    refreshToken: 'fresh-refresh-token',
  });

  assert.equal(calls.length, 3);
  assert.equal(calls[0]?.url, 'https://example.com/api/auth/me');
  assert.equal(calls[1]?.url, 'https://example.com/api/auth/refresh');
  assert.equal(calls[2]?.url, 'https://example.com/api/auth/me');

  assert.equal(calls[1]?.init?.method, 'POST');
  assert.equal(calls[1]?.init?.body, JSON.stringify({ refreshToken: 'stored-refresh-token' }));
  assert.deepEqual(calls[2]?.init?.headers, {
    Authorization: 'Bearer fresh-access-token',
    'Content-Type': 'application/json',
  });
});

test('clears tokens when the refresh token itself is rejected', async () => {
  let cleared = false;

  await assert.rejects(
    performRequestWithRefresh({
      url: 'https://example.com/api/protected',
      refreshUrl: 'https://example.com/api/auth/refresh',
      refreshToken: 'expired-refresh-token',
      requestInit: {
        method: 'GET',
        headers: {
          Authorization: 'Bearer expired-access-token',
          'Content-Type': 'application/json',
        },
      },
      fetchImpl: async (url) => {
        if (url.endsWith('/protected')) {
          return createResponse({
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
            body: { message: 'Expired access token' },
          });
        }

        return createResponse({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          body: { message: 'Refresh token expired' },
        });
      },
      getHeaders: () => ({
        Authorization: 'Bearer expired-access-token',
        'Content-Type': 'application/json',
      }),
      saveTokens: async () => {
        throw new Error('saveTokens should not be called');
      },
      clearTokens: async () => {
        cleared = true;
      },
    }),
    /Authentication failed/,
  );

  assert.equal(cleared, true);
});
