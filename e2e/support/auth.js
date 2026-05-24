const { by, device, element, expect: detoxExpect, waitFor } = require('detox');
const { MockAuthServer } = require('./mockAuthServer');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const TEST_CREDENTIALS = {
  email: 'test@example.com',
  password: 'password123',
};

// Cold launch races between /login and the guest exMap "Login to watch Tokis map" overlay.
// Wait for either, then if the overlay won, tap it to navigate to /login.
const ensureOnLoginScreen = async () => {
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

// Type credentials, submit, wait for the authenticated explore screen.
// Works against any backend the app is pointed at (mock or real prod).
const loginThroughUi = async ({
  email = TEST_CREDENTIALS.email,
  password = TEST_CREDENTIALS.password,
} = {}) => {
  await device.disableSynchronization();
  await ensureOnLoginScreen();
  await element(by.id('email-input')).replaceText(email);
  await element(by.id('password-input')).replaceText(password);
  await sleep(1000);
  await element(by.id('password-input')).tapReturnKey();
  await device.enableSynchronization();
  await waitFor(element(by.id('explore-greeting'))).toBeVisible().withTimeout(15000);
  await detoxExpect(element(by.text('Login to watch Tokis map'))).not.toExist();
};

// Helper for tests that want a mock backend (no real data, no network).
const startMockAuthServer = async () => {
  const server = new MockAuthServer();
  await server.start();
  return server;
};

module.exports = {
  TEST_CREDENTIALS,
  ensureOnLoginScreen,
  loginThroughUi,
  startMockAuthServer,
};
