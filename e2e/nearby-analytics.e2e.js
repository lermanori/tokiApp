const http = require('http');
const { by, device, element, expect: detoxExpect, waitFor } = require('detox');
const { expect: jestExpect } = require('@jest/globals');

const API_ROOT = process.env.TOKI_E2E_BACKEND_URL || process.env.TOKI_TEST_API_URL || 'http://127.0.0.1:3002';
const API_BASE_URL = `${API_ROOT}/api`;
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'password123';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const httpRequestJson = (url, options = {}) => new Promise((resolve, reject) => {
  const parsedUrl = new URL(url);
  const request = http.request(
    {
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || undefined,
      path: `${parsedUrl.pathname}${parsedUrl.search}`,
      method: options.method || 'GET',
      headers: options.headers || {},
    },
    (response) => {
      const chunks = [];

      response.on('data', (chunk) => {
        chunks.push(chunk);
      });

      response.on('end', () => {
        const bodyText = Buffer.concat(chunks).toString('utf8');

        try {
          const parsed = bodyText.length > 0 ? JSON.parse(bodyText) : {};

          if (response.statusCode && response.statusCode >= 400) {
            reject(new Error(`HTTP ${response.statusCode}: ${JSON.stringify(parsed)}`));
            return;
          }

          resolve(parsed);
        } catch (error) {
          reject(error);
        }
      });
    }
  );

  request.on('error', reject);

  if (options.body) {
    request.write(options.body);
  }

  request.end();
});

const loginApi = async () => {
  const response = await httpRequestJson(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    }),
  });

  const accessToken = response?.data?.tokens?.accessToken;
  if (!accessToken) {
    throw new Error(`Login did not return an access token: ${JSON.stringify(response)}`);
  }

  return accessToken;
};

const getNearbyCount = async () => {
  const accessToken = await loginApi();
  const response = await httpRequestJson(`${API_BASE_URL}/analytics/nearby-request-count`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response?.data?.count ?? 0;
};

const waitForNearbyCountGreaterThan = async (initialCount, timeoutMs = 15000) => {
  const startedAt = Date.now();
  let lastCount = initialCount;

  while (Date.now() - startedAt < timeoutMs) {
    const count = await getNearbyCount();
    lastCount = count;
    if (count > initialCount) {
      return count;
    }

    await sleep(500);
  }

  throw new Error(`Timed out waiting for nearby count to increase. Last count: ${lastCount}`);
};

const ensureOnLoginScreen = async () => {
  // Cold launch races between /login and the guest exMap "Login to watch Tokis map" overlay.
  // Wait for either, then if the overlay won, tap it to navigate to /login.
  try {
    await waitFor(element(by.id('email-input'))).toBeVisible().withTimeout(15000);
    return;
  } catch (_) {
    // fall through to overlay path
  }
  await waitFor(element(by.id('guest-overlay-login-button'))).toBeVisible().withTimeout(5000);
  await element(by.id('guest-overlay-login-button')).tap();
  await waitFor(element(by.id('email-input'))).toBeVisible().withTimeout(15000);
};

const loginThroughUi = async () => {
  await device.disableSynchronization();
  await ensureOnLoginScreen();
  await element(by.id('email-input')).replaceText(TEST_EMAIL);
  await element(by.id('password-input')).replaceText(TEST_PASSWORD);
  await element(by.id('login-button')).tap();
  await device.enableSynchronization();
  await waitFor(element(by.id('explore-greeting'))).toBeVisible().withTimeout(15000);
};

describe('nearby analytics metric', () => {
  beforeEach(async () => {
    await device.launchApp({
      newInstance: true,
      delete: true,
    });
  });

  it('increments the real nearby request count after login', async () => {
    const before = await getNearbyCount();

    await loginThroughUi();

    const after = await waitForNearbyCountGreaterThan(before);
    jestExpect(after).toBeGreaterThan(before);
    await detoxExpect(element(by.id('explore-greeting'))).toBeVisible();
  });
});
