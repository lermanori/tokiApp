const { by, device, element, expect: detoxExpect, waitFor } = require('detox');
const { expect: jestExpect } = require('@jest/globals');
const { MockAuthServer } = require('./support/mockAuthServer');

const server = new MockAuthServer();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const loginThroughUi = async () => {
  await device.disableSynchronization();
  await waitFor(element(by.id('email-input'))).toBeVisible().withTimeout(15000);
  await element(by.id('email-input')).replaceText('test@example.com');
  await element(by.id('password-input')).replaceText('password123');
  await element(by.id('login-button')).tap();
  await device.enableSynchronization();
  await waitFor(element(by.id('explore-greeting'))).toBeVisible().withTimeout(15000);
};

const relaunchApp = async () => {
  await device.terminateApp();
  await device.launchApp({
    newInstance: true,
    launchArgs: server.getLaunchArgs(),
  });
};

describe('existing user login restore', () => {
  beforeAll(async () => {
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  beforeEach(async () => {
    server.reset();
    await device.launchApp({
      newInstance: true,
      delete: true,
      launchArgs: server.getLaunchArgs(),
    });
  });

  it('keeps the user signed in when the access token is still valid', async () => {
    await loginThroughUi();

    server.setScenario({ accessMode: 'valid', refreshMode: 'valid' });
    await relaunchApp();

    await waitFor(element(by.id('explore-greeting'))).toBeVisible().withTimeout(15000);
    await detoxExpect(element(by.id('login-button'))).not.toExist();
    jestExpect(server.getRefreshCallCount()).toBe(0);
  });

  it('refreshes the session on relaunch when access is expired but refresh is still valid', async () => {
    await loginThroughUi();

    server.setScenario({ accessMode: 'expired', refreshMode: 'valid' });
    await relaunchApp();

    await waitFor(element(by.id('explore-greeting'))).toBeVisible().withTimeout(15000);
    await detoxExpect(element(by.id('login-button'))).not.toExist();
    jestExpect(server.getRefreshCallCount()).toBeGreaterThan(0);
  });

  it('returns the user to login when both access and refresh are no longer usable', async () => {
    await loginThroughUi();

    server.setScenario({ accessMode: 'expired', refreshMode: 'expired' });
    await relaunchApp();

    await waitFor(element(by.id('login-button'))).toBeVisible().withTimeout(15000);
    await detoxExpect(element(by.text('Welcome back!'))).toBeVisible();
    jestExpect(server.getRefreshCallCount()).toBeGreaterThan(0);
  });

  it('returns the user to login after waiting longer than the refresh lifetime', async () => {
    await loginThroughUi();

    server.setTimedScenario({
      accessLifetimeMs: 1000,
      refreshLifetimeMs: 2500,
    });

    await sleep(3000);
    await relaunchApp();

    await waitFor(element(by.id('login-button'))).toBeVisible().withTimeout(15000);
    await detoxExpect(element(by.text('Welcome back!'))).toBeVisible();
    jestExpect(server.getRefreshCallCount()).toBeGreaterThan(0);
  });
});
