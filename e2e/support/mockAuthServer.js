const http = require('http');
const packageJson = require('../../package.json');

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Detox User',
  bio: 'Simulator login restore test user',
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

const initialTokens = {
  accessToken: 'detox-access-token',
  refreshToken: 'detox-refresh-token',
};

const refreshedTokens = {
  accessToken: 'detox-access-token-refreshed',
  refreshToken: 'detox-refresh-token-refreshed',
};

const readRequestBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return null;
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return null;
  }
};

class MockAuthServer {
  constructor() {
    this.server = null;
    this.port = null;
    this.refreshCallCount = 0;
    this.nearbyRequestCount = 0;
    this.nearbyRequestsByVersion = {};
    this.accessMode = 'valid';
    this.refreshMode = 'valid';
    this.sessionStartedAt = Date.now();
    this.accessLifetimeMs = null;
    this.refreshLifetimeMs = null;
    this.versionPolicy = this.createVersionPolicy('supported');
  }

  async start() {
    if (this.server) {
      return;
    }

    this.server = http.createServer(async (request, response) => {
      const url = new URL(request.url, `http://${request.headers.host}`);

      if (request.method === 'OPTIONS') {
        response.writeHead(204, this.headers());
        response.end();
        return;
      }

      if (url.pathname === '/api/auth/login' && request.method === 'POST') {
        this.sessionStartedAt = Date.now();
        this.json(response, 200, {
          success: true,
          message: 'Login successful',
          data: {
            user: mockUser,
            tokens: initialTokens,
          },
        });
        return;
      }

      if (url.pathname === '/api/mobile/bootstrap' && request.method === 'GET') {
        this.json(response, 200, this.versionPolicy);
        return;
      }

      if (url.pathname === '/api/auth/me' && request.method === 'GET') {
        const authHeader = request.headers.authorization;
        if (authHeader === `Bearer ${refreshedTokens.accessToken}`) {
          this.json(response, 200, {
            success: true,
            data: { user: mockUser },
          });
          return;
        }

        if (authHeader === `Bearer ${initialTokens.accessToken}` && this.isAccessTokenValid()) {
          this.json(response, 200, {
            success: true,
            data: { user: mockUser },
          });
          return;
        }

        this.json(response, 401, {
          success: false,
          message: 'Please provide a valid authentication token',
        });
        return;
      }

      if (url.pathname === '/api/auth/refresh' && request.method === 'POST') {
        this.refreshCallCount += 1;
        const body = await readRequestBody(request);

        if (this.isRefreshTokenValid(body?.refreshToken)) {
          this.json(response, 200, {
            success: true,
            data: {
              tokens: refreshedTokens,
            },
          });
          return;
        }

        this.json(response, 401, {
          success: false,
          message: 'Refresh token expired',
        });
        return;
      }

      if (url.pathname === '/api/tokis/nearby' && request.method === 'GET') {
        const versionHeader = request.headers['x-app-version'];
        const version = typeof versionHeader === 'string' && versionHeader.length > 0
          ? versionHeader
          : 'unknown';

        this.nearbyRequestCount += 1;
        this.nearbyRequestsByVersion[version] = (this.nearbyRequestsByVersion[version] || 0) + 1;

        this.json(response, 200, {
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

      if (url.pathname === '/api/test/analytics/nearby-requests' && request.method === 'GET') {
        const requestedVersion = url.searchParams.get('version');
        const version = requestedVersion || packageJson.version;

        this.json(response, 200, {
          success: true,
          data: {
            total: this.nearbyRequestCount,
            version,
            count: this.nearbyRequestsByVersion[version] || 0,
            countsByVersion: this.nearbyRequestsByVersion,
          },
        });
        return;
      }

      if (url.pathname === '/api/connections' && request.method === 'GET') {
        this.json(response, 200, {
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

      if (url.pathname === '/api/connections/pending' && request.method === 'GET') {
        this.json(response, 200, {
          success: true,
          data: [],
        });
        return;
      }

      if (url.pathname === '/api/notifications/combined' && request.method === 'GET') {
        this.json(response, 200, {
          success: true,
          data: {
            notifications: [],
          },
        });
        return;
      }

      if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
        this.json(response, 200, {
          success: true,
          message: 'Logged out',
        });
        return;
      }

      this.json(response, 200, {
        success: true,
        data: {},
        message: 'ok',
      });
    });

    await new Promise((resolve) => {
      this.server.listen(0, '127.0.0.1', resolve);
    });

    this.port = this.server.address().port;
  }

  async stop() {
    if (!this.server) {
      return;
    }

    await new Promise((resolve, reject) => {
      this.server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    this.server = null;
    this.port = null;
  }

  reset() {
    this.refreshCallCount = 0;
    this.nearbyRequestCount = 0;
    this.nearbyRequestsByVersion = {};
    this.accessMode = 'valid';
    this.refreshMode = 'valid';
    this.sessionStartedAt = Date.now();
    this.accessLifetimeMs = null;
    this.refreshLifetimeMs = null;
    this.versionPolicy = this.createVersionPolicy('supported');
  }

  setScenario({ accessMode, refreshMode }) {
    if (accessMode) {
      this.accessMode = accessMode;
    }

    if (refreshMode) {
      this.refreshMode = refreshMode;
    }
  }

  setTimedScenario({ accessLifetimeMs, refreshLifetimeMs }) {
    this.accessMode = 'timed';
    this.refreshMode = 'timed';
    this.sessionStartedAt = Date.now();
    this.accessLifetimeMs = accessLifetimeMs;
    this.refreshLifetimeMs = refreshLifetimeMs;
  }

  setVersionPolicy(state, overrides = {}) {
    this.versionPolicy = this.createVersionPolicy(state, overrides);
  }

  getLaunchArgs() {
    return {
      TOKI_E2E_API_URL: this.baseUrl(),
      TOKI_E2E_DISABLE_REALTIME: '1',
      TOKI_E2E_DISABLE_OTA: '1',
    };
  }

  getRefreshCallCount() {
    return this.refreshCallCount;
  }

  isAccessTokenValid() {
    if (this.accessMode === 'valid') {
      return true;
    }

    if (this.accessMode === 'expired') {
      return false;
    }

    if (this.accessMode === 'timed') {
      return Date.now() - this.sessionStartedAt < (this.accessLifetimeMs ?? 0);
    }

    return false;
  }

  isRefreshTokenValid(refreshToken) {
    if (refreshToken !== initialTokens.refreshToken) {
      return false;
    }

    if (this.refreshMode === 'valid') {
      return true;
    }

    if (this.refreshMode === 'expired') {
      return false;
    }

    if (this.refreshMode === 'timed') {
      return Date.now() - this.sessionStartedAt < (this.refreshLifetimeMs ?? 0);
    }

    return false;
  }

  baseUrl() {
    if (!this.port) {
      throw new Error('Mock server has not been started');
    }

    return `http://127.0.0.1:${this.port}`;
  }

  headers() {
    return {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'access-control-allow-headers': 'Content-Type, Authorization, x-platform, x-app-version, x-app-build, x-runtime-version, x-update-id, x-update-channel',
      'content-type': 'application/json',
    };
  }

  createVersionPolicy(state, overrides = {}) {
    const now = Date.now();
    const basePolicy = {
      policyVersion: 'detox-policy',
      ttlSeconds: 300,
      validUntil: new Date(now + 5 * 60 * 1000).toISOString(),
      support: {
        state,
        reasonCode: state === 'supported' ? null : 'DETOX_OVERRIDE',
        title: state === 'maintenance' ? 'Maintenance' : state === 'requires_store' ? 'Update required' : state === 'soft_outdated' ? 'New version available' : 'Updating Toki',
        message: state === 'maintenance'
          ? 'We are doing maintenance.'
          : state === 'requires_store'
            ? 'Please update Toki to continue.'
            : state === 'soft_outdated'
              ? 'A newer version is available.'
              : 'Installing a required update.',
        delivery: state === 'requires_ota' ? 'ota' : state === 'requires_store' || state === 'soft_outdated' ? 'store' : 'none',
        minVersion: {
          ios: null,
          android: null,
        },
        minBuild: {
          ios: null,
          android: null,
        },
        recommendedVersion: {
          ios: null,
          android: null,
        },
        recommendedBuild: {
          ios: null,
          android: null,
        },
        supportedRuntimes: ['1.0.1'],
        storeUrl: {
          ios: 'https://apps.apple.com/example',
          android: 'https://play.google.com/store/apps/details?id=example',
        },
      },
      maintenance: {
        active: state === 'maintenance',
        title: state === 'maintenance' ? 'Maintenance' : null,
        message: state === 'maintenance' ? 'We are doing maintenance.' : null,
        eta: null,
      },
    };

    return {
      ...basePolicy,
      ...overrides,
      support: {
        ...basePolicy.support,
        ...(overrides.support || {}),
      },
      maintenance: {
        ...basePolicy.maintenance,
        ...(overrides.maintenance || {}),
      },
    };
  }

  json(response, statusCode, body) {
    response.writeHead(statusCode, this.headers());
    response.end(JSON.stringify(body));
  }
}

module.exports = {
  MockAuthServer,
};
