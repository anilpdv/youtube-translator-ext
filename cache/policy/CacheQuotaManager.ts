import type { CacheLimits } from '../domain/CacheLimits';
import { CacheError } from '../domain/CacheError';
import type { TranslationCacheRecord } from '../domain/TranslationCacheRecord';

export function assertCacheRecordWithinLimits(record: TranslationCacheRecord, limits: CacheLimits): void {
  if (record.approximateSizeBytes > limits.maxRecordBytes) {
    throw new CacheError({ code: 'CACHE_RECORD_TOO_LARGE', message: 'Translation cache record is too large.', recordId: record.id });
  }
}
