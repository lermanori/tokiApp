const { by, device, element, expect: detoxExpect, waitFor } = require('detox');
const { expect: jestExpect } = require('@jest/globals');

const appConfig = require('../app.config.js');

// The app's backend URL is baked in at build time via EXPO_PUBLIC_E2E_BACKEND_URL.
// This constant is only used by tests that hit the backend directly (revoke, nearby).
const BACKEND_URL = process.env.TOKI_E2E_BACKEND_URL || 'http://127.0.0.1:3002';

const APP_SCHEME = appConfig.expo.scheme || 'tokimap';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const launchApp = async ({ deleteApp = false, url } = {}) => {
  await device.launchApp({
    newInstance: true,
    delete: deleteApp,
    ...(url ? { url } : {}),
  });
};

const launchExMap = async ({ deleteApp = false } = {}) => {
  await launchApp({
    deleteApp,
    url: `${APP_SCHEME}://exMap`,
  });
};

const launchLogin = async ({ deleteApp = false } = {}) => {
  await launchApp({
    deleteApp,
    url: `${APP_SCHEME}://login`,
  });
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
  await element(by.id('email-input')).replaceText('test@example.com');
  await element(by.id('password-input')).replaceText('password123');
  await sleep(1000);
  await element(by.id('password-input')).tapReturnKey();
  await device.enableSynchronization();
  await waitFor(element(by.id('explore-greeting'))).toBeVisible().withTimeout(15000);
  await detoxExpect(element(by.text('Login to watch Tokis map'))).not.toExist();
  await detoxExpect(element(by.text('Previewing Tokis around Tel Aviv. Login to explore the full live map.'))).not.toExist();
};

const relaunchApp = async ({ url } = {}) => {
  await device.terminateApp();
  await launchApp({ url });
};

describe('auth entry flow', () => {
  it('allows regular login from an unauthenticated launch', async () => {
    await launchLogin({ deleteApp: true });
    await loginThroughUi();

    await detoxExpect(element(by.id('login-button'))).not.toExist();
    await detoxExpect(element(by.id('explore-greeting'))).toBeVisible();
  });

  it('bypasses login on relaunch when valid credentials already exist', async () => {
    await launchLogin({ deleteApp: true });
    await loginThroughUi();

    await relaunchApp();

    await waitFor(element(by.id('explore-greeting'))).toBeVisible().withTimeout(15000);
    await detoxExpect(element(by.id('login-button'))).not.toExist();
    await detoxExpect(element(by.text('Login to watch Tokis map'))).not.toExist();
    await detoxExpect(element(by.text('Previewing Tokis around Tel Aviv. Login to explore the full live map.'))).not.toExist();
  });

  it('refreshes the session on relaunch when the access token is expired but refresh is still valid', async () => {
    await launchLogin({ deleteApp: true });
    await loginThroughUi();

    // Server-side revoke this user's current access token. Refresh token stays valid.
    const revokeResponse = await fetch(`${BACKEND_URL}/api/test/auth/expire-access-tokens-for-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }),
    });
    jestExpect(revokeResponse.ok).toBe(true);

    await relaunchApp();

    // After relaunch, app's /auth/me call should 401 (token revoked) → trigger refresh →
    // get new access token → /auth/me succeeds → explore-greeting becomes visible.
    await waitFor(element(by.id('explore-greeting'))).toBeVisible().withTimeout(20000);
    await detoxExpect(element(by.id('login-button'))).not.toExist();
    await detoxExpect(element(by.text('Login to watch Tokis map'))).not.toExist();
    await detoxExpect(element(by.text('Previewing Tokis around Tel Aviv. Login to explore the full live map.'))).not.toExist();
  });

  it('lets a guest view exMap until the first protected click sends them to login', async () => {
    await launchExMap({ deleteApp: true });

    await waitFor(element(by.id('explore-greeting'))).toBeVisible().withTimeout(20000);
    await detoxExpect(element(by.id('login-button'))).not.toExist();

    await element(by.id('exmap-search-button')).tap();

    await waitFor(element(by.id('login-button'))).toBeVisible().withTimeout(15000);
    await detoxExpect(element(by.text('Welcome back!'))).toBeVisible();
  });

  it('lets a guest view toki details until the first protected click sends them to login', async () => {
    // Fetch a real public toki from the local backend.
    const nearbyResponse = await fetch(`${BACKEND_URL}/api/tokis/nearby?latitude=32.0853&longitude=34.7818&radius=50`);
    const nearbyJson = await nearbyResponse.json();
    const toki = nearbyJson?.data?.tokis?.[0];
    jestExpect(toki?.id).toBeTruthy();
    jestExpect(toki?.title).toBeTruthy();

    await launchApp({
      deleteApp: true,
      url: `${APP_SCHEME}://toki-details?tokiId=${toki.id}`,
    });

    await waitFor(element(by.text(toki.title))).toBeVisible().withTimeout(20000);
    await detoxExpect(element(by.id('login-button'))).not.toExist();

    // Scroll the Report button into view. Standard Detox element-based tap doesn't
    // fire onPress here (RN-new-architecture quirk; manual tap works but synthesized
    // tap doesn't reach the TouchableOpacity responder). Workaround: read the
    // button's screen bounds via getAttributes() and use device.tap() to send a
    // raw simulator tap at those coordinates.
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

    await sleep(200); // let scroll deceleration fully settle
    const attrs = await element(by.id('toki-details-report-button')).getAttributes();
    const frame = attrs.frame || attrs.elements?.[0]?.frame;
    if (!frame) {
      throw new Error(`Could not read frame from element attributes: ${JSON.stringify(attrs)}`);
    }
    const tapX = Math.round(frame.x + frame.width / 2);
    const tapY = Math.round(frame.y + frame.height / 2);
    console.log(`🎯 [E2E] Tapping at raw screen coords (${tapX}, ${tapY})`);
    await device.tap({ x: tapX, y: tapY });

    await waitFor(element(by.id('login-button'))).toBeVisible().withTimeout(15000);
    await detoxExpect(element(by.text('Welcome back!'))).toBeVisible();
  });
});
