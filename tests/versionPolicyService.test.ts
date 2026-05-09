import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluateVersionPolicy } from '../toki-backend/src/services/versionPolicyService';

const ORIGINAL_ENV = { ...process.env };

const resetEnv = () => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.MOBILE_MAINTENANCE_ACTIVE;
  delete process.env.MOBILE_REQUIRED_UPDATE_DELIVERY;
  delete process.env.MOBILE_SUPPORTED_RUNTIMES;
  delete process.env.MOBILE_MIN_BUILD_IOS;
  delete process.env.MOBILE_MIN_BUILD_ANDROID;
  delete process.env.MOBILE_SOFT_BUILD_IOS;
  delete process.env.MOBILE_SOFT_BUILD_ANDROID;
};

test.afterEach(() => {
  resetEnv();
});

test('returns requires_ota for old builds on a supported runtime when delivery is OTA', () => {
  process.env.MOBILE_SUPPORTED_RUNTIMES = '1.0.1';
  process.env.MOBILE_MIN_BUILD_IOS = '5';
  process.env.MOBILE_REQUIRED_UPDATE_DELIVERY = 'ota';

  const policy = evaluateVersionPolicy({
    platform: 'ios',
    appVersion: '1.3.0',
    appBuild: 4,
    runtimeVersion: '1.0.1',
    updateId: null,
    updateChannel: 'production',
  }, new Date('2026-05-06T10:00:00.000Z'));

  assert.equal(policy.support.state, 'requires_ota');
  assert.equal(policy.support.delivery, 'ota');
});

test('returns requires_store for unsupported runtimes', () => {
  process.env.MOBILE_SUPPORTED_RUNTIMES = '1.0.1';

  const policy = evaluateVersionPolicy({
    platform: 'android',
    appVersion: '1.3.1',
    appBuild: 7,
    runtimeVersion: '1.0.0',
    updateId: null,
    updateChannel: 'production',
  }, new Date('2026-05-06T10:00:00.000Z'));

  assert.equal(policy.support.state, 'requires_store');
  assert.equal(policy.support.reasonCode, 'RUNTIME_UNSUPPORTED');
});

test('maintenance overrides normal support rules', () => {
  process.env.MOBILE_MAINTENANCE_ACTIVE = 'true';
  process.env.MOBILE_MIN_BUILD_IOS = '999';

  const policy = evaluateVersionPolicy({
    platform: 'ios',
    appVersion: '1.3.1',
    appBuild: 10,
    runtimeVersion: '1.0.1',
    updateId: null,
    updateChannel: 'production',
  }, new Date('2026-05-06T10:00:00.000Z'));

  assert.equal(policy.maintenance.active, true);
  assert.equal(policy.support.state, 'maintenance');
});

test('returns soft_outdated for older recommended builds that are still supported', () => {
  process.env.MOBILE_SOFT_BUILD_ANDROID = '9';

  const policy = evaluateVersionPolicy({
    platform: 'android',
    appVersion: '1.3.1',
    appBuild: 8,
    runtimeVersion: '1.0.1',
    updateId: null,
    updateChannel: 'production',
  }, new Date('2026-05-06T10:00:00.000Z'));

  assert.equal(policy.support.state, 'soft_outdated');
  assert.equal(policy.support.delivery, 'store');
});

test('returns supported for current builds on supported runtimes', () => {
  process.env.MOBILE_SUPPORTED_RUNTIMES = '1.0.1';
  process.env.MOBILE_MIN_BUILD_IOS = '5';
  process.env.MOBILE_SOFT_BUILD_IOS = '6';

  const policy = evaluateVersionPolicy({
    platform: 'ios',
    appVersion: '1.3.1',
    appBuild: 6,
    runtimeVersion: '1.0.1',
    updateId: null,
    updateChannel: 'production',
  }, new Date('2026-05-06T10:00:00.000Z'));

  assert.equal(policy.support.state, 'supported');
  assert.equal(policy.support.delivery, 'none');
});
