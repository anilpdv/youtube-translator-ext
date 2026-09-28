import type { TranslationCacheRecord } from '../domain/TranslationCacheRecord';
import { isTranslationCacheRecord } from './CacheRecordValidator';

export function migrateCacheRecord(value: unknown): TranslationCacheRecord | null {
  return isTranslationCacheRecord(value) ? value : null;
}
