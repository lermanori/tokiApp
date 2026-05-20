const { by, device, element, expect: detoxExpect, waitFor } = require('detox');
const { MockAuthServer } = require('./support/mockAuthServer');

const server = new MockAuthServer();

describe('version gate bootstrap', () => {
  beforeAll(async () => {
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  beforeEach(async () => {
    server.reset();
  });

  it('allows supported clients to reach the login screen', async () => {
    server.setVersionPolicy('supported');

    await device.launchApp({
      newInstance: true,
      delete: true,
      launchArgs: server.getLaunchArgs(),
    });

    // Cold launch races between /login and the guest exMap overlay -- accept either.
    let reachedPostGate = false;
    for (let i = 0; i < 15; i += 1) {
      try {
        await waitFor(element(by.id('login-button'))).toBeVisible().withTimeout(500);
        reachedPostGate = true;
        break;
      } catch (_) {}
      try {
        await waitFor(element(by.id('guest-overlay-login-button'))).toBeVisible().withTimeout(500);
        reachedPostGate = true;
        break;
      } catch (_) {}
    }
    if (!reachedPostGate) {
      throw new Error('Neither login-button nor guest-overlay-login-button appeared within 15s');
    }
    await detoxExpect(element(by.id('version-gate-screen'))).not.toExist();
  });

  it('blocks unsupported clients behind the update screen', async () => {
    server.setVersionPolicy('requires_store');

    await device.launchApp({
      newInstance: true,
      delete: true,
      launchArgs: server.getLaunchArgs(),
    });

    await waitFor(element(by.id('version-gate-screen'))).toBeVisible().withTimeout(15000);
    await detoxExpect(element(by.text('Update required'))).toBeVisible();
  });

  it('shows maintenance mode before the app tree mounts', async () => {
    server.setVersionPolicy('maintenance');

    await device.launchApp({
      newInstance: true,
      delete: true,
      launchArgs: server.getLaunchArgs(),
    });

    await waitFor(element(by.id('version-gate-screen'))).toBeVisible().withTimeout(15000);
    await detoxExpect(element(by.text('Maintenance'))).toBeVisible();
  });
});
