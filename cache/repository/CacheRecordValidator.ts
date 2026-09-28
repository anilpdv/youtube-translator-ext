import { TRANSLATION_CACHE_SCHEMA_VERSION } from '../domain/CacheSchemaVersion';
import type { TranslationCacheRecord } from '../domain/TranslationCacheRecord';

export function isTranslationCacheRecord(value: unknown): value is TranslationCacheRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as TranslationCacheRecord;
  return record.schemaVersion === TRANSLATION_CACHE_SCHEMA_VERSION &&
    typeof record.id === 'string' &&
    !!record.key && Array.isArray(record.batches) &&
    typeof record.expectedBatchCount === 'number' &&
    typeof record.expectedCueCount === 'number' &&
    (record.completion === 'partial' || record.completion === 'complete') &&
    record.batches.every((batch) =>
      batch.status === 'completed' &&
      typeof batch.batchId === 'string' &&
      Array.isArray(batch.sourceCueIds) &&
      Array.isArray(batch.translations));
}
