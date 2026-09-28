import type { TranslationError } from '../domain/TranslationError';

export interface RetryDecision {
  readonly shouldRetry: boolean;
  readonly delayMs: number;
}

export class RetryPolicy {
  constructor(
    private readonly maxAttempts: number,
    private readonly baseDelayMs = 1_000,
    private readonly maxDelayMs = 15_000,
  ) {}

  decide(error: TranslationError, attempt: number): RetryDecision {
    if (!error.retryable || attempt >= this.maxAttempts) {
      return { shouldRetry: false, delayMs: 0 };
    }
    if (error.retryAfterMs !== undefined) {
      return {
        shouldRetry: true,
        delayMs: Math.min(error.retryAfterMs, this.maxDelayMs),
      };
    }
    const exponential = this.baseDelayMs * 2 ** Math.max(0, attempt - 1);
    return {
      shouldRetry: true,
      delayMs: Math.min(exponential, this.maxDelayMs),
    };
  }
}
