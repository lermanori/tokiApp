import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildUnsupportedPolicyFromApi,
  getSoftPromptFromPolicy,
  getValidCachedPolicy,
  isPolicyBlocking,
  isPolicyStillValid,
  shouldTryOtaForPolicy,
} from '../services/version/versionGateMachine';
import type { CachedVersionPolicyEnvelope, VersionPolicy } from '../services/version/types';

const createPolicy = (
  supportState: VersionPolicy['support']['state'],
  validUntil: string,
): VersionPolicy => ({
  policyVersion: 'test-policy',
  ttlSeconds: 300,
  validUntil,
  support: {
    state: supportState,
    title: 'Title',
    message: 'Message',
    delivery: supportState === 'requires_ota' ? 'ota' : supportState === 'requires_store' ? 'store' : 'none',
    supportedRuntimes: ['1.0.1'],
  },
  maintenance: {
    active: supportState === 'maintenance',
    title: supportState === 'maintenance' ? 'Maintenance' : null,
    message: supportState === 'maintenance' ? 'Maintenance message' : null,
    eta: null,
  },
});

test('recognizes blocking policy states', () => {
  assert.equal(isPolicyBlocking('supported'), false);
  assert.equal(isPolicyBlocking('soft_outdated'), false);
  assert.equal(isPolicyBlocking('requires_ota'), true);
  assert.equal(isPolicyBlocking('requires_store'), true);
  assert.equal(isPolicyBlocking('maintenance'), true);
});

test('returns only non-expired cached policies', () => {
  const now = new Date('2026-05-06T10:00:00.000Z');
  const validEnvelope: CachedVersionPolicyEnvelope = {
    savedAt: now.toISOString(),
    policy: createPolicy('supported', '2026-05-06T10:05:00.000Z'),
  };
  const expiredEnvelope: CachedVersionPolicyEnvelope = {
    savedAt: now.toISOString(),
    policy: createPolicy('supported', '2026-05-06T09:55:00.000Z'),
  };

  assert.equal(isPolicyStillValid(validEnvelope.policy, now), true);
  assert.equal(isPolicyStillValid(expiredEnvelope.policy, now), false);
  assert.equal(getValidCachedPolicy(validEnvelope, now)?.policyVersion, 'test-policy');
  assert.equal(getValidCachedPolicy(expiredEnvelope, now), null);
});

test('marks only required ota policies as ota-required', () => {
  assert.equal(shouldTryOtaForPolicy(createPolicy('requires_ota', '2026-05-06T10:05:00.000Z')), true);
  assert.equal(shouldTryOtaForPolicy(createPolicy('requires_store', '2026-05-06T10:05:00.000Z')), false);
});

test('builds a soft update prompt from soft-outdated policy only', () => {
  const softPrompt = getSoftPromptFromPolicy(createPolicy('soft_outdated', '2026-05-06T10:05:00.000Z').support);
  const supportedPrompt = getSoftPromptFromPolicy(createPolicy('supported', '2026-05-06T10:05:00.000Z').support);

  assert.deepEqual(softPrompt, {
    title: 'Title',
    message: 'Message',
    mode: 'soft_update',
    storeUrl: null,
  });
  assert.equal(supportedPrompt, null);
});

test('converts unsupported api payloads into blocking policy objects', () => {
  const policy = buildUnsupportedPolicyFromApi({
    state: 'requires_store',
    title: 'Update required',
    message: 'Please update.',
    delivery: 'store',
    storeUrl: {
      ios: 'https://apps.apple.com/example',
      android: null,
    },
  });

  assert.equal(policy.support.state, 'requires_store');
  assert.equal(policy.support.delivery, 'store');
  assert.equal(policy.support.storeUrl?.ios, 'https://apps.apple.com/example');
});
