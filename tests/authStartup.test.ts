import test from 'node:test';
import assert from 'node:assert/strict';

import { serializeAuthSession } from '../services/authSession';
import { restoreStartupSession } from '../services/authStartup';

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

test('startup stays authenticated when the access token is still valid', async () => {
  const calls: string[] = [];
  const storedSession = serializeAuthSession({
    accessToken: 'valid-access-token',
    refreshToken: 'valid-refresh-token',
  });

  const result = await restoreStartupSession({
    rawStoredSession: storedSession,
    validateUrl: 'https://example.com/api/auth/me',
    refreshUrl: 'https://example.com/api/auth/refresh',
    fetchImpl: async (url) => {
      calls.push(url);
      return createResponse({
        ok: true,
        status: 200,
        body: { success: true, data: { id: 'user-1' } },
      });
    },
  });

  assert.deepEqual(calls, ['https://example.com/api/auth/me']);
  assert.equal(result.status, 'authenticated');
  assert.equal(result.refreshed, false);
  assert.equal(result.refreshAttempted, false);
  assert.equal(result.failureReason, null);
  assert.equal(result.accessToken, 'valid-access-token');
  assert.equal(result.refreshToken, 'valid-refresh-token');
});

test('startup refreshes and stays authenticated when access is expired but refresh is still valid', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const storedSession = serializeAuthSession({
    accessToken: 'expired-access-token',
    refreshToken: 'valid-refresh-token',
  });

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
      body: { success: true, data: { id: 'user-1' } },
    },
  ];

  const result = await restoreStartupSession({
    rawStoredSession: storedSession,
    validateUrl: 'https://example.com/api/auth/me',
    refreshUrl: 'https://example.com/api/auth/refresh',
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      const next = responses.shift();
      assert.ok(next, `Unexpected fetch call for ${url}`);
      return createResponse(next);
    },
  });

  assert.equal(result.status, 'authenticated');
  assert.equal(result.refreshed, true);
  assert.equal(result.refreshAttempted, true);
  assert.equal(result.failureReason, null);
  assert.equal(result.accessToken, 'fresh-access-token');
  assert.equal(result.refreshToken, 'fresh-refresh-token');
  assert.equal(calls.length, 3);
  assert.equal(calls[0]?.url, 'https://example.com/api/auth/me');
  assert.equal(calls[1]?.url, 'https://example.com/api/auth/refresh');
  assert.equal(calls[2]?.url, 'https://example.com/api/auth/me');
});

test('startup requires login when both access and refresh tokens are invalid', async () => {
  const calls: string[] = [];
  const storedSession = serializeAuthSession({
    accessToken: 'expired-access-token',
    refreshToken: 'expired-refresh-token',
  });

  const result = await restoreStartupSession({
    rawStoredSession: storedSession,
    validateUrl: 'https://example.com/api/auth/me',
    refreshUrl: 'https://example.com/api/auth/refresh',
    fetchImpl: async (url) => {
      calls.push(url);
      if (url.endsWith('/auth/me')) {
        return createResponse({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          body: { message: 'Access token expired' },
        });
      }

      return createResponse({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        body: { message: 'Refresh token expired' },
      });
    },
  });

  assert.deepEqual(calls, [
    'https://example.com/api/auth/me',
    'https://example.com/api/auth/refresh',
  ]);
  assert.equal(result.status, 'login_required');
  assert.equal(result.cleared, true);
  assert.equal(result.refreshAttempted, true);
  assert.equal(result.failureReason, 'refresh_failed');
  assert.equal(result.accessToken, null);
  assert.equal(result.refreshToken, null);
});

test('startup requires login when no stored tokens exist', async () => {
  let callCount = 0;

  const result = await restoreStartupSession({
    rawStoredSession: null,
    validateUrl: 'https://example.com/api/auth/me',
    refreshUrl: 'https://example.com/api/auth/refresh',
    fetchImpl: async () => {
      callCount += 1;
      return createResponse({
        ok: true,
        status: 200,
        body: { success: true },
      });
    },
  });

  assert.equal(callCount, 0);
  assert.equal(result.status, 'login_required');
  assert.equal(result.cleared, false);
  assert.equal(result.refreshAttempted, false);
  assert.equal(result.failureReason, 'no_session');
  assert.equal(result.accessToken, null);
  assert.equal(result.refreshToken, null);
});
