const { by, device, element, expect: detoxExpect, waitFor } = require('detox');
const { expect: jestExpect } = require('@jest/globals');

const appConfig = require('../app.config.js');

const BACKEND_URL = process.env.TOKI_E2E_BACKEND_URL || 'http://127.0.0.1:3002';
const APP_SCHEME = appConfig.expo.scheme || 'tokimap';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'password123';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const launchApp = async ({ deleteApp = false, url } = {}) => {
  await device.launchApp({
    newInstance: true,
    delete: deleteApp,
    ...(url ? { url } : {}),
  });
};

const launchLogin = async ({ deleteApp = false } = {}) => {
  await launchApp({ deleteApp, url: `${APP_SCHEME}://login` });
};

const relaunchApp = async ({ url } = {}) => {
  await device.terminateApp();
  await launchApp({ url });
};

const ensureOnLoginScreen = async () => {
  try {
    await waitFor(element(by.id('email-input'))).toBeVisible().withTimeout(15000);
    return;
  } catch (_) {}
  await waitFor(element(by.id('guest-overlay-login-button'))).toBeVisible().withTimeout(5000);
  await element(by.id('guest-overlay-login-button')).tap();
  await waitFor(element(by.id('email-input'))).toBeVisible().withTimeout(15000);
};

const submitLoginForm = async () => {
  await device.disableSynchronization();
  await element(by.id('email-input')).replaceText(TEST_EMAIL);
  await element(by.id('password-input')).replaceText(TEST_PASSWORD);
  await sleep(1000);
  await element(by.id('password-input')).tapReturnKey();
  await device.enableSynchronization();
};

const loginThroughUi = async () => {
  await ensureOnLoginScreen();
  await submitLoginForm();
  await waitFor(element(by.id('explore-greeting'))).toBeVisible().withTimeout(15000);
};

const fetchNearbyToki = async () => {
  const response = await fetch(
    `${BACKEND_URL}/api/tokis/nearby?latitude=32.0853&longitude=34.7818&radius=50`
  );
  const json = await response.json();
  const toki = json?.data?.tokis?.[0];
  jestExpect(toki?.id).toBeTruthy();
  jestExpect(toki?.title).toBeTruthy();
  return toki;
};

const expireAccessTokens = async (email) => {
  const response = await fetch(`${BACKEND_URL}/api/test/auth/expire-access-tokens-for-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  jestExpect(response.ok).toBe(true);
};

const expireRefreshTokens = async (email) => {
  const response = await fetch(`${BACKEND_URL}/api/test/auth/expire-refresh-tokens-for-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  jestExpect(response.ok).toBe(true);
};

// Triggers the auth-required redirect from toki details. The report button uses the
// raw-coord workaround documented in auth-entry-flow #5 (RN new-arch + Detox quirk:
// element-based tap fires onPressIn but not onPress).
const tapReportButtonViaRawCoords = async () => {
  let visible = false;
  for (let i = 0; i < 8; i += 1) {
    try {
      await waitFor(element(by.id('toki-details-report-button')))
        .toBeVisible()
        .withTimeout(800);
      visible = true;
      break;
    } catch (_) {
      await element(by.id('toki-details-scroll')).swipe('up', 'fast', 0.7);
    }
  }
  if (!visible) {
    throw new Error('Could not bring toki-details-report-button into view');
  }
  await sleep(200);
  const attrs = await element(by.id('toki-details-report-button')).getAttributes();
  const frame = attrs.frame || attrs.elements?.[0]?.frame;
  if (!frame) {
    throw new Error(`Could not read frame from element attributes: ${JSON.stringify(attrs)}`);
  }
  const tapX = Math.round(frame.x + frame.width / 2);
  const tapY = Math.round(frame.y + frame.height / 2);
  await device.tap({ x: tapX, y: tapY });
};

describe('deep link auth', () => {
  it('opens toki details directly when relaunching with valid tokens', async () => {
    await launchLogin({ deleteApp: true });
    await loginThroughUi();

    const toki = await fetchNearbyToki();
    await relaunchApp({ url: `${APP_SCHEME}://toki-details?tokiId=${toki.id}` });

    await waitFor(element(by.text(toki.title))).toBeVisible().withTimeout(20000);
    await detoxExpect(element(by.id('login-button'))).not.toExist();
  });

  it('returns to the deep-link target after a guest is forced to log in', async () => {
    const toki = await fetchNearbyToki();

    await launchApp({
      deleteApp: true,
      url: `${APP_SCHEME}://toki-details?tokiId=${toki.id}`,
    });

    await waitFor(element(by.text(toki.title))).toBeVisible().withTimeout(20000);

    await tapReportButtonViaRawCoords();

    await waitFor(element(by.id('email-input'))).toBeVisible().withTimeout(15000);
    await submitLoginForm();

    // Critical assertion: post-login lands back on toki details, NOT on /(tabs).
    await waitFor(element(by.text(toki.title))).toBeVisible().withTimeout(20000);
    await detoxExpect(element(by.id('login-button'))).not.toExist();
  });

  it('silently refreshes the session when relaunching with a deep link and expired access token', async () => {
    await launchLogin({ deleteApp: true });
    await loginThroughUi();

    const toki = await fetchNearbyToki();
    await expireAccessTokens(TEST_EMAIL);

    await relaunchApp({ url: `${APP_SCHEME}://toki-details?tokiId=${toki.id}` });

    await waitFor(element(by.text(toki.title))).toBeVisible().withTimeout(20000);
    await detoxExpect(element(by.id('login-button'))).not.toExist();
  });

  it('returns to the deep-link target after both tokens are revoked and the user re-logs in', async () => {
    await launchLogin({ deleteApp: true });
    await loginThroughUi();

    const toki = await fetchNearbyToki();
    await expireAccessTokens(TEST_EMAIL);
    await expireRefreshTokens(TEST_EMAIL);

    await relaunchApp({ url: `${APP_SCHEME}://toki-details?tokiId=${toki.id}` });

    // Stored tokens are unusable -> /auth/me 401 -> refresh 401 -> app clears
    // state and the layout redirects to /login?returnTo=/toki-details&tokiId=...
    // (see app/_layout.tsx:781). The chain takes longer than a fresh-launch login,
    // so allow extra time.
    await waitFor(element(by.id('email-input'))).toBeVisible().withTimeout(30000);
    await submitLoginForm();

    // returnTo should bring us back to the toki, not /(tabs).
    await waitFor(element(by.text(toki.title))).toBeVisible().withTimeout(20000);
    await detoxExpect(element(by.id('login-button'))).not.toExist();
  });
});
