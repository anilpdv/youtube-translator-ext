export type TranslationErrorCode =
  | 'INVALID_REQUEST'
  | 'VIDEO_MISMATCH'
  | 'INVALID_LANGUAGE'
  | 'PROVIDER_NOT_FOUND'
  | 'PROVIDER_UNAVAILABLE'
  | 'INVALID_CREDENTIALS'
  | 'MODEL_NOT_AVAILABLE'
  | 'RATE_LIMITED'
  | 'REQUEST_TIMEOUT'
  | 'NETWORK_FAILURE'
  | 'PROVIDER_FAILURE'
  | 'RESPONSE_TOO_LARGE'
  | 'MALFORMED_RESPONSE'
  | 'MISSING_CUE'
  | 'DUPLICATE_CUE'
  | 'UNKNOWN_CUE'
  | 'EMPTY_TRANSLATION'
  | 'TRANSLATION_TOO_LONG'
  | 'ABNORMAL_REPETITION'
  | 'SESSION_CANCELLED'
  | 'RETRY_EXHAUSTED';

export interface TranslationErrorOptions {
  readonly code: TranslationErrorCode;
  readonly message: string;
  readonly retryable?: boolean;
  readonly retryAfterMs?: number;
  readonly batchId?: string;
  readonly details?: Record<string, unknown>;
  readonly cause?: unknown;
}

export class TranslationError extends Error {
  readonly code: TranslationErrorCode;
  readonly retryable: boolean;
  readonly retryAfterMs?: number;
  readonly batchId?: string;
  readonly details?: Record<string, unknown>;
  readonly cause?: unknown;

  constructor(options: TranslationErrorOptions) {
    super(options.message);
    this.name = 'TranslationError';
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.retryAfterMs = options.retryAfterMs;
    this.batchId = options.batchId;
    this.details = options.details;
    this.cause = options.cause;
  }
}
