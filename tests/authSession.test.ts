import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getAuthSessionMaxAgeMs,
  parseStoredAuthSession,
  serializeAuthSession,
} from '../services/authSession';

test('restores a stored login before the short session lifetime expires', () => {
  const startedAt = 1_000;
  const rawSession = serializeAuthSession(
    { accessToken: 'access-token', refreshToken: 'refresh-token' },
    startedAt,
  );

  const result = parseStoredAuthSession(rawSession, {
    now: startedAt + 4_999,
    maxAgeMs: 5_000,
  });

  assert.equal(result.status, 'valid');
  if (result.status === 'valid') {
    assert.equal(result.session.accessToken, 'access-token');
    assert.equal(result.session.refreshToken, 'refresh-token');
    assert.equal(result.session.persistedAt, startedAt);
  }
});

test('flips from green to red once the short session lifetime is exceeded', () => {
  const startedAt = 20_000;
  const rawSession = serializeAuthSession(
    { accessToken: 'access-token', refreshToken: 'refresh-token' },
    startedAt,
  );

  const stillValid = parseStoredAuthSession(rawSession, {
    now: startedAt + 3_000,
    maxAgeMs: 3_000,
  });
  assert.equal(stillValid.status, 'valid');

  const expired = parseStoredAuthSession(rawSession, {
    now: startedAt + 3_001,
    maxAgeMs: 3_000,
  });
  assert.equal(expired.status, 'expired');
});

test('rejects malformed stored sessions', () => {
  const result = parseStoredAuthSession('{"accessToken":42}', {
    now: 100,
    maxAgeMs: 5_000,
  });

  assert.equal(result.status, 'invalid');
});

test('parses the optional session max-age env var safely', () => {
  assert.equal(getAuthSessionMaxAgeMs(undefined), null);
  assert.equal(getAuthSessionMaxAgeMs('5000'), 5_000);
  assert.equal(getAuthSessionMaxAgeMs('-1'), null);
  assert.equal(getAuthSessionMaxAgeMs('abc'), null);
});
