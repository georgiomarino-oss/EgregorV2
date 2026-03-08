import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EXPO_PERMANENT_ERROR_CODES,
  computeRetryDelaySeconds,
  isRetryableHttpStatus,
  normalizeExpoErrorCode,
  resolveDispatchDecision,
} from '../../supabase/functions/_shared/notificationDispatchPolicy';

test('normalizeExpoErrorCode trims valid strings and rejects non-strings', () => {
  assert.equal(normalizeExpoErrorCode(' DeviceNotRegistered '), 'DeviceNotRegistered');
  assert.equal(normalizeExpoErrorCode('   '), null);
  assert.equal(normalizeExpoErrorCode(undefined), null);
  assert.equal(normalizeExpoErrorCode(42), null);
});

test('isRetryableHttpStatus treats 429 and 5xx as retryable', () => {
  assert.equal(isRetryableHttpStatus(429), true);
  assert.equal(isRetryableHttpStatus(500), true);
  assert.equal(isRetryableHttpStatus(503), true);
  assert.equal(isRetryableHttpStatus(400), false);
  assert.equal(isRetryableHttpStatus(404), false);
  assert.equal(isRetryableHttpStatus(null), true);
});

test('computeRetryDelaySeconds applies exponential backoff with cap', () => {
  assert.equal(computeRetryDelaySeconds(1), 30);
  assert.equal(computeRetryDelaySeconds(2), 60);
  assert.equal(computeRetryDelaySeconds(3), 120);
  assert.equal(computeRetryDelaySeconds(6), 960);
  assert.equal(computeRetryDelaySeconds(10), 1800);
});

test('permanent Expo token/provider errors remain in terminal error set', () => {
  assert.equal(EXPO_PERMANENT_ERROR_CODES.has('DeviceNotRegistered'), true);
  assert.equal(EXPO_PERMANENT_ERROR_CODES.has('InvalidProviderToken'), true);
});

test('resolveDispatchDecision returns sent when any delivery succeeds', () => {
  const decision = resolveDispatchDecision({
    attempts: 1,
    hadSuccessfulDeliveries: true,
    hasPermanentError: false,
    hasRetryableError: false,
    httpStatus: 200,
    maxAttempts: 5,
  });

  assert.equal(decision.status, 'sent');
  assert.equal(decision.retryDelaySeconds, null);
});

test('resolveDispatchDecision retries transient failures before max attempts', () => {
  const decision = resolveDispatchDecision({
    attempts: 2,
    hadSuccessfulDeliveries: false,
    hasPermanentError: false,
    hasRetryableError: true,
    httpStatus: 503,
    maxAttempts: 5,
  });

  assert.equal(decision.status, 'retry');
  assert.equal(decision.retryDelaySeconds, 60);
});

test('resolveDispatchDecision fails when max attempts is reached', () => {
  const decision = resolveDispatchDecision({
    attempts: 5,
    hadSuccessfulDeliveries: false,
    hasPermanentError: false,
    hasRetryableError: true,
    httpStatus: 503,
    maxAttempts: 5,
  });

  assert.equal(decision.status, 'failed');
  assert.equal(decision.retryDelaySeconds, null);
});

test('resolveDispatchDecision fails permanent non-retryable provider errors', () => {
  const decision = resolveDispatchDecision({
    attempts: 1,
    hadSuccessfulDeliveries: false,
    hasPermanentError: true,
    hasRetryableError: false,
    httpStatus: 400,
    maxAttempts: 5,
  });

  assert.equal(decision.status, 'failed');
  assert.equal(decision.retryDelaySeconds, null);
});
