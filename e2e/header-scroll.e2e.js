const { by, device, element, waitFor } = require('detox');

const appConfig = require('../app.config.js');
const APP_SCHEME = appConfig.expo.scheme || 'tokimap';

const BACKEND_URL = process.env.TOKI_E2E_BACKEND_URL || 'http://127.0.0.1:3002';
const WS_URL = BACKEND_URL.startsWith('https://')
  ? BACKEND_URL.replace('https://', 'wss://')
  : BACKEND_URL.replace('http://', 'ws://');

const E2E_LAUNCH_ARGS = {
  TOKI_E2E_API_URL: BACKEND_URL,
  TOKI_E2E_WS_URL: WS_URL,
  TOKI_E2E_DISABLE_REALTIME: '1',
  TOKI_E2E_DISABLE_OTA: '1',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe('header scroll behaviour', () => {
  beforeEach(async () => {
    await device.launchApp({
      newInstance: true,
      delete: true,
      launchArgs: E2E_LAUNCH_ARGS,
      url: `${APP_SCHEME}://exMap`,
    });
  });

  it('header is visible before scroll and scrolls with content', async () => {
    // Wait for the discover screen to fully load (guest mode — no login needed)
    await waitFor(element(by.id('explore-greeting')))
      .toBeVisible()
      .withTimeout(20000);

    await sleep(1000); // let map tiles settle

    const beforePath = await device.takeScreenshot('header-before-scroll');
    console.log(`📸 Before scroll: ${beforePath}`);

    // Scroll down hard on the feed list — three fast swipes
    await element(by.id('discover-feed-list')).swipe('up', 'fast', 0.9);
    await sleep(500);
    await element(by.id('discover-feed-list')).swipe('up', 'fast', 0.9);
    await sleep(500);

    const afterPath = await device.takeScreenshot('header-after-scroll');
    console.log(`📸 After scroll: ${afterPath}`);

    // The greeting text should no longer be visible once scrolled past the header
    await expect(element(by.id('explore-greeting'))).not.toBeVisible();
  });
});
