import { expect, test, type Page, type Route } from '@playwright/test';

const authHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'access-control-allow-headers': 'Content-Type, Authorization, x-platform',
  'content-type': 'application/json',
};

const initialAccessToken = 'playwright-access-token';
const initialRefreshToken = 'playwright-refresh-token';
const refreshedAccessToken = 'playwright-access-token-refreshed';
const refreshedRefreshToken = 'playwright-refresh-token-refreshed';

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Playwright User',
  bio: 'Session restore test user',
  location: 'Tel Aviv',
  avatar: '',
  verified: true,
  latitude: 32.0853,
  longitude: 34.7818,
  rating: '5',
  memberSince: '2024-01-01T00:00:00.000Z',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  stats: {
    tokis_created: 0,
    tokis_joined: 0,
    connections_count: 0,
  },
  socialLinks: {},
};

type SessionMode = 'valid' | 'expired';
type RefreshMode = 'valid' | 'expired';

interface MockApiController {
  setAccessMode(mode: SessionMode): void;
  setRefreshMode(mode: RefreshMode): void;
  getRefreshCallCount(): number;
}

const jsonResponse = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    headers: authHeaders,
    body: JSON.stringify(body),
  });

const installAuthApiMock = async (page: Page): Promise<MockApiController> => {
  let accessMode: SessionMode = 'valid';
  let refreshMode: RefreshMode = 'valid';
  let refreshCallCount = 0;

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: authHeaders });
      return;
    }

    if (url.pathname === '/api/auth/login' && request.method() === 'POST') {
      await jsonResponse(route, {
        success: true,
        message: 'Login successful',
        data: {
          user: mockUser,
          tokens: {
            accessToken: initialAccessToken,
            refreshToken: initialRefreshToken,
          },
        },
      });
      return;
    }

    if (url.pathname === '/api/auth/me' && request.method() === 'GET') {
      const authHeader = request.headers().authorization;

      if (authHeader === `Bearer ${refreshedAccessToken}`) {
        await jsonResponse(route, {
          success: true,
          data: { user: mockUser },
        });
        return;
      }

      if (authHeader === `Bearer ${initialAccessToken}` && accessMode === 'valid') {
        await jsonResponse(route, {
          success: true,
          data: { user: mockUser },
        });
        return;
      }

      await jsonResponse(route, {
        success: false,
        message: 'Please provide a valid authentication token',
      }, 401);
      return;
    }

    if (url.pathname === '/api/auth/refresh' && request.method() === 'POST') {
      refreshCallCount += 1;
      const body = request.postDataJSON() as { refreshToken?: string } | null;

      if (refreshMode === 'valid' && body?.refreshToken === initialRefreshToken) {
        await jsonResponse(route, {
          success: true,
          data: {
            tokens: {
              accessToken: refreshedAccessToken,
              refreshToken: refreshedRefreshToken,
            },
          },
        });
        return;
      }

      await jsonResponse(route, {
        success: false,
        message: 'Refresh token expired',
      }, 401);
      return;
    }

    if (url.pathname === '/api/tokis/nearby' && request.method() === 'GET') {
      await jsonResponse(route, {
        success: true,
        data: {
          tokis: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
            hasMore: false,
          },
          searchParams: {},
        },
      });
      return;
    }

    if (url.pathname === '/api/connections' && request.method() === 'GET') {
      await jsonResponse(route, {
        success: true,
        data: {
          connections: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            pages: 0,
          },
        },
      });
      return;
    }

    if (url.pathname === '/api/connections/pending' && request.method() === 'GET') {
      await jsonResponse(route, {
        success: true,
        data: [],
      });
      return;
    }

    if (url.pathname === '/api/notifications/combined' && request.method() === 'GET') {
      await jsonResponse(route, {
        success: true,
        data: {
          notifications: [],
        },
      });
      return;
    }

    if (url.pathname === '/api/auth/logout' && request.method() === 'POST') {
      await jsonResponse(route, {
        success: true,
        message: 'Logged out',
      });
      return;
    }

    await jsonResponse(route, {
      success: true,
      data: {},
      message: 'ok',
    });
  });

  return {
    setAccessMode(mode) {
      accessMode = mode;
    },
    setRefreshMode(mode) {
      refreshMode = mode;
    },
    getRefreshCallCount() {
      return refreshCallCount;
    },
  };
};

const loginThroughUi = async (page: Page) => {
  await page.goto('/login');
  await page.getByPlaceholder('Email').fill('test@example.com');
  await page.getByPlaceholder('Password').fill('password123');
  await page.getByText('Login', { exact: true }).click();
  await expect(page.getByText('Feeling social right now?')).toBeVisible();
};

test.describe('existing user login restore', () => {
  test('keeps the user signed in when the access token is still valid', async ({ page }) => {
    const mockApi = await installAuthApiMock(page);

    await loginThroughUi(page);
    mockApi.setAccessMode('valid');
    await page.reload();

    await expect(page.getByText('Feeling social right now?')).toBeVisible();
    expect(mockApi.getRefreshCallCount()).toBe(0);
  });

  test('refreshes the session on reload when access is expired but refresh is still valid', async ({ page }) => {
    const mockApi = await installAuthApiMock(page);

    await loginThroughUi(page);
    mockApi.setAccessMode('expired');
    mockApi.setRefreshMode('valid');

    await page.reload();

    await expect(page.getByText('Feeling social right now?')).toBeVisible();
    expect(mockApi.getRefreshCallCount()).toBeGreaterThan(0);
  });

  test('returns the user to login when both access and refresh are no longer usable', async ({ page }) => {
    const mockApi = await installAuthApiMock(page);

    await loginThroughUi(page);
    mockApi.setAccessMode('expired');
    mockApi.setRefreshMode('expired');

    await page.reload();

    await expect(page.getByText('Welcome back!')).toBeVisible();
    await expect(page.getByText('Login', { exact: true })).toBeVisible();
    expect(mockApi.getRefreshCallCount()).toBeGreaterThan(0);
  });
});
