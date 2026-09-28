export interface CacheLimits {
  readonly maxRecordCount: number;
  readonly maxTotalBytes: number;
  readonly maxRecordBytes: number;
  readonly maximumAgeMs: number;
  readonly incompleteMaximumAgeMs: number;
  readonly cleanupTargetRatio: number;
}

export const DEFAULT_CACHE_LIMITS: CacheLimits = {
  maxRecordCount: 100,
  maxTotalBytes: 100 * 1024 * 1024,
  maxRecordBytes: 10 * 1024 * 1024,
  maximumAgeMs: 30 * 24 * 60 * 60 * 1000,
  incompleteMaximumAgeMs: 7 * 24 * 60 * 60 * 1000,
  cleanupTargetRatio: 0.8,
};
