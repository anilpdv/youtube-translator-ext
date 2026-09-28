export type CacheErrorCode =
  | 'CACHE_UNAVAILABLE' | 'CACHE_READ_FAILED' | 'CACHE_WRITE_FAILED'
  | 'CACHE_DELETE_FAILED' | 'CACHE_RECORD_INVALID' | 'CACHE_RECORD_CORRUPT'
  | 'CACHE_VERSION_UNSUPPORTED' | 'CACHE_KEY_MISMATCH' | 'CACHE_SOURCE_MISMATCH'
  | 'CACHE_BATCH_MISMATCH' | 'CACHE_RECORD_TOO_LARGE' | 'CACHE_QUOTA_EXCEEDED'
  | 'CACHE_MIGRATION_FAILED' | 'CACHE_CANCELLED';

export interface CacheErrorOptions {
  readonly code: CacheErrorCode;
  readonly message: string;
  readonly retryable?: boolean;
  readonly recordId?: string;
  readonly details?: Record<string, unknown>;
  readonly cause?: unknown;
}

export class CacheError extends Error {
  readonly code: CacheErrorCode;
  readonly retryable: boolean;
  readonly recordId?: string;
  readonly details?: Record<string, unknown>;
  readonly cause?: unknown;

  constructor(options: CacheErrorOptions) {
    super(options.message);
    this.name = 'CacheError';
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.recordId = options.recordId;
    this.details = options.details;
    this.cause = options.cause;
  }
}
