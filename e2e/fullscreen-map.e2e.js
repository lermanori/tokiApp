const { by, device, element, expect: detoxExpect, waitFor } = require('detox');
const { loginThroughUi } = require('./support/auth');

const appConfig = require('../app.config.js');
const APP_SCHEME = appConfig.expo.scheme || 'tokimap';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const LAUNCH_ARGS = {
  TOKI_E2E_DISABLE_OTA: '1',
  TOKI_E2E_DISABLE_REALTIME: '1',
};

describe('fullscreen map', () => {
  beforeEach(async () => {
    // Hits the real backend (no TOKI_E2E_API_URL override) so we test with real data.
    await device.launchApp({
      newInstance: true,
      delete: true,
      launchArgs: LAUNCH_ARGS,
      url: `${APP_SCHEME}://login`,
    });
    await loginThroughUi();
  });

  it('opens fullscreen map when expand icon is tapped', async () => {
    await sleep(1500); // let map tiles and region settle

    const beforePath = await device.takeScreenshot('fullscreen-map-before');
    console.log(`📸 Before expand: ${beforePath}`);

    await element(by.id('map-expand-button')).tap();

    await waitFor(element(by.id('fullscreen-map-modal')))
      .toBeVisible()
      .withTimeout(5000);

    const afterPath = await device.takeScreenshot('fullscreen-map-after');
    console.log(`📸 After expand: ${afterPath}`);

    await detoxExpect(element(by.id('fullscreen-map-modal'))).toBeVisible();

    // Dismiss the fullscreen modal and confirm it closes
    await element(by.id('map-collapse-button')).tap();
    await waitFor(element(by.id('fullscreen-map-modal')))
      .not.toBeVisible()
      .withTimeout(3000);

    const closedPath = await device.takeScreenshot('fullscreen-map-closed');
    console.log(`📸 After close: ${closedPath}`);
  });
});
