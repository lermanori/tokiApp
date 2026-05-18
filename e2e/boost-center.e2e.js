const http = require('http');
const https = require('https');
const { by, device, element, expect: detoxExpect, waitFor } = require('detox');
const { expect: jestExpect } = require('@jest/globals');

const appConfig = require('../app.config.js');

const API_ROOT =
  process.env.TOKI_TEST_API_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://127.0.0.1:3002';
const API_BASE_URL = `${API_ROOT}/api`;
const APP_SCHEME = appConfig.expo.scheme || 'tokimap';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'password123';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const WS_ROOT = API_ROOT.startsWith('https://')
  ? API_ROOT.replace('https://', 'wss://')
  : API_ROOT.replace('http://', 'ws://');

const getLaunchArgs = () => ({
  TOKI_E2E_API_URL: API_ROOT,
  TOKI_E2E_WS_URL: WS_ROOT,
  TOKI_E2E_DISABLE_REALTIME: '1',
  TOKI_E2E_DISABLE_OTA: '1',
});

const httpRequestJson = (url, options = {}) => new Promise((resolve, reject) => {
  const parsedUrl = new URL(url);
  const transport = parsedUrl.protocol === 'https:' ? https : http;
  const request = transport.request(
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

const authedJson = async (path, accessToken, options = {}) => {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  };

  return httpRequestJson(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
};

const ensureBoostTiersExist = async (accessToken) => {
  const response = await authedJson('/boosts/tiers', accessToken);
  const tiers = response?.data || [];
  jestExpect(Array.isArray(tiers)).toBe(true);

  if (tiers.length === 0) {
    throw new Error(
      'Boost tiers are empty in the test environment. Run the boost migration/seed before this E2E flow.'
    );
  }

  return tiers;
};

const createHostToki = async (accessToken) => {
  const now = new Date();
  const scheduledTime = new Date(now.getTime() + 48 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16)
    .replace('T', ' ');

  const response = await authedJson('/tokis', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      title: `Boost E2E ${Date.now()}`,
      description: 'Detox-created Toki for the boost center flow.',
      location: 'Tel Aviv',
      latitude: 32.0853,
      longitude: 34.7818,
      timeSlot: 'Evening',
      scheduledTime,
      maxAttendees: 10,
      category: 'sports',
      visibility: 'public',
      tags: ['e2e', 'boost'],
      autoApprove: true,
      isPaid: false,
    }),
  });

  const tokiId = response?.data?.id;
  if (!tokiId) {
    throw new Error(`Create Toki did not return an id: ${JSON.stringify(response)}`);
  }

  return tokiId;
};

const deleteToki = async (accessToken, tokiId) => {
  if (!tokiId) return;
  try {
    await authedJson(`/tokis/${tokiId}`, accessToken, { method: 'DELETE' });
  } catch (error) {
    console.warn(`Failed to delete test Toki ${tokiId}:`, error.message);
  }
};

const fetchTokiSnapshot = async (accessToken, tokiId) => {
  try {
    const response = await authedJson(`/tokis/${tokiId}`, accessToken);
    return {
      exists: true,
      id: response?.data?.id,
      title: response?.data?.title,
      status: response?.data?.status,
      visibility: response?.data?.visibility,
      hostId: response?.data?.host?.id,
      scheduledTime: response?.data?.scheduledTime,
    };
  } catch (error) {
    return {
      exists: false,
      error: error.message,
    };
  }
};

const logTokiSnapshot = async (label, accessToken, tokiId) => {
  if (!tokiId) {
    console.log(`[BOOST E2E] ${label}: no tokiId`);
    return;
  }

  const snapshot = await fetchTokiSnapshot(accessToken, tokiId);
  console.log(`[BOOST E2E] ${label}:`, JSON.stringify({ tokiId, ...snapshot }));
};

const ensureOnLoginScreen = async () => {
  // Cold launch races between /login and the guest exMap overlay. Poll both
  // with short timeouts so whichever wins is detected within ~1s.
  for (let i = 0; i < 15; i += 1) {
    try {
      await waitFor(element(by.id('email-input'))).toBeVisible().withTimeout(500);
      return;
    } catch (_) {}
    try {
      await waitFor(element(by.id('guest-overlay-login-button'))).toBeVisible().withTimeout(500);
      await element(by.id('guest-overlay-login-button')).tap();
      await waitFor(element(by.id('email-input'))).toBeVisible().withTimeout(15000);
      return;
    } catch (_) {}
  }
  throw new Error('Neither login screen nor guest overlay appeared within 15s');
};

const loginThroughUi = async () => {
  await device.disableSynchronization();
  await ensureOnLoginScreen();
  await element(by.id('email-input')).replaceText(TEST_EMAIL);
  await element(by.id('password-input')).replaceText(TEST_PASSWORD);
  await sleep(200);
  await element(by.id('login-button')).tap();
  // Synchronization stays disabled — caller re-enables once on the target screen.
  // Avoids blocking on exMap's mount, nearby fetch, and map animations after login.
};

const scrollBoostButtonIntoView = async () => {
  // The ScrollView's bounds extend past the bottom safe area (host view has a
  // sticky footer), so it fails Detox's 100% visibility check. Swipe on a
  // child element that's fully on-screen instead.
  await waitFor(element(by.text('About this Toki'))).toBeVisible().withTimeout(15000);
  for (let i = 0; i < 10; i += 1) {
    try {
      await waitFor(element(by.id('toki-details-boost-button')))
        .toBeVisible()
        .withTimeout(500);
      return;
    } catch (_) {
      await element(by.text('About this Toki')).swipe('up', 'slow', 0.8);
      await sleep(200);
    }
  }
  throw new Error('Could not bring toki-details-boost-button into view');
};

const openTokiDetails = async (tokiIdToOpen) => {
  // Wait until the login screen unmounts — signal that auth tokens were persisted
  // and the router has moved past /login. Faster than waiting for exMap to settle.
  await waitFor(element(by.id('email-input'))).not.toBeVisible().withTimeout(15000);
  await device.openURL({
    url: `${APP_SCHEME}://toki-details?tokiId=${tokiIdToOpen}`,
  });
  await device.enableSynchronization();
};

describe('boost center host flow', () => {
  let accessToken;
  let tokiId;

  beforeEach(async () => {
    accessToken = await loginApi();
    await ensureBoostTiersExist(accessToken);
    tokiId = await createHostToki(accessToken);
    console.log(`[BOOST E2E] created tokiId=${tokiId}`);
    await logTokiSnapshot('after createHostToki', accessToken, tokiId);

    await device.launchApp({
      newInstance: true,
      delete: true,
      launchArgs: getLaunchArgs(),
    });
    await logTokiSnapshot('after launchApp', accessToken, tokiId);
  });

  afterEach(async () => {
    await logTokiSnapshot('before deleteToki', accessToken, tokiId);
    await deleteToki(accessToken, tokiId);
    await logTokiSnapshot('after deleteToki', accessToken, tokiId);
    tokiId = null;
  });

  it('shows boost tiers after entering Boost Center from toki details', async () => {
    await loginThroughUi();
    await logTokiSnapshot('after UI login', accessToken, tokiId);

    await openTokiDetails(tokiId);
    await scrollBoostButtonIntoView();
    await element(by.id('toki-details-boost-button')).tap();

    await waitFor(element(by.id('boost-center-screen'))).toBeVisible().withTimeout(15000);
    await detoxExpect(element(by.text('No active boost'))).toBeVisible();
    await detoxExpect(element(by.id('boost-tier-card-basic'))).toExist();
    await detoxExpect(element(by.id('boost-tier-card-standard'))).toExist();
    await detoxExpect(element(by.id('boost-tier-card-premium'))).toExist();
    await detoxExpect(element(by.id('boost-tier-card-pro_pack'))).toExist();
    await detoxExpect(element(by.id('boost-tier-empty-state'))).not.toExist();
  });

  it('creates a pending payment request from the buy flow', async () => {
    await loginThroughUi();
    await logTokiSnapshot('after UI login', accessToken, tokiId);

    await openTokiDetails(tokiId);
    await scrollBoostButtonIntoView();
    await element(by.id('toki-details-boost-button')).tap();

    await waitFor(element(by.id('boost-center-screen'))).toBeVisible().withTimeout(15000);
    await waitFor(element(by.id('boost-buy-button-basic'))).toBeVisible().withTimeout(10000);
    await element(by.id('boost-buy-button-basic')).tap();

    await waitFor(element(by.id('boost-payment-screen'))).toBeVisible().withTimeout(15000);
    await detoxExpect(element(by.text('Waiting for authorization code'))).toBeVisible();
    await detoxExpect(element(by.id('boost-payment-code-input'))).toBeVisible();
    await detoxExpect(element(by.id('boost-payment-submit-button'))).toExist();
  });
});
