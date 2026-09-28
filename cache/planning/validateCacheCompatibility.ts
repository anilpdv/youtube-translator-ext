import type { TranslationCacheKey } from '../domain/TranslationCacheKey';
import type { TranslationCacheRecord } from '../domain/TranslationCacheRecord';

export function validateCacheCompatibility(
  record: TranslationCacheRecord,
  key: TranslationCacheKey,
): boolean {
  return Object.keys(key).every((field) =>
    record.key[field as keyof TranslationCacheKey] === key[field as keyof TranslationCacheKey],
  );
}
