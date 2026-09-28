export interface CacheMetadata {
  readonly recordCount: number;
  readonly approximateSizeBytes: number;
  readonly oldestRecordAt: number | null;
  readonly newestRecordAt: number | null;
  readonly lastCleanupAt: number | null;
}
