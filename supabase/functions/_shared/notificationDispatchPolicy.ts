export const EXPO_PERMANENT_ERROR_CODES = new Set([
  'DeviceNotRegistered',
  'InvalidCredentials',
  'InvalidProviderToken',
  'MessageTooBig',
  'MismatchSenderId',
]);

const BASE_RETRY_DELAY_SECONDS = 30;
const MAX_RETRY_DELAY_SECONDS = 1800;
const DEFAULT_MAX_ATTEMPTS = 5;

export type DispatchResolutionStatus = 'failed' | 'retry' | 'sent';

export interface ResolveDispatchDecisionInput {
  attempts: number;
  hadSuccessfulDeliveries: boolean;
  hasPermanentError: boolean;
  hasRetryableError: boolean;
  httpStatus?: number | null;
  maxAttempts?: number;
}

export interface DispatchDecision {
  retryDelaySeconds: number | null;
  status: DispatchResolutionStatus;
}

export function normalizeExpoErrorCode(input: unknown): string | null {
  if (typeof input !== 'string') {
    return null;
  }

  const code = input.trim();
  return code.length > 0 ? code : null;
}

export function isRetryableHttpStatus(status: number | null | undefined): boolean {
  if (typeof status !== 'number') {
    return true;
  }

  return status === 429 || status >= 500;
}

export function computeRetryDelaySeconds(attempts: number): number {
  const normalizedAttempts = Number.isFinite(attempts) ? Math.max(1, Math.floor(attempts)) : 1;
  return Math.min(
    MAX_RETRY_DELAY_SECONDS,
    BASE_RETRY_DELAY_SECONDS * 2 ** Math.max(0, normalizedAttempts - 1),
  );
}

export function resolveDispatchDecision(input: ResolveDispatchDecisionInput): DispatchDecision {
  if (input.hadSuccessfulDeliveries) {
    return {
      retryDelaySeconds: null,
      status: 'sent',
    };
  }

  const maxAttempts =
    input.maxAttempts && Number.isFinite(input.maxAttempts)
      ? Math.max(1, Math.floor(input.maxAttempts))
      : DEFAULT_MAX_ATTEMPTS;
  const attempts = Number.isFinite(input.attempts) ? Math.max(1, Math.floor(input.attempts)) : 1;

  if (attempts >= maxAttempts) {
    return {
      retryDelaySeconds: null,
      status: 'failed',
    };
  }

  if (input.hasRetryableError || isRetryableHttpStatus(input.httpStatus)) {
    return {
      retryDelaySeconds: computeRetryDelaySeconds(attempts),
      status: 'retry',
    };
  }

  if (input.hasPermanentError) {
    return {
      retryDelaySeconds: null,
      status: 'failed',
    };
  }

  return {
    retryDelaySeconds: computeRetryDelaySeconds(attempts),
    status: 'retry',
  };
}

