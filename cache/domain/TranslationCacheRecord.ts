import type { CachedTranslationBatch } from './CachedTranslationBatch';
import type { TranslationCacheKey } from './TranslationCacheKey';

export type CacheCompletion = 'partial' | 'complete';

export interface TranslationCacheRecord {
  readonly schemaVersion: number;
  readonly id: string;
  readonly key: TranslationCacheKey;
  readonly batches: readonly CachedTranslationBatch[];
  readonly expectedBatchCount: number;
  readonly expectedCueCount: number;
  readonly completion: CacheCompletion;
  readonly translatedCueCount: number;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly lastAccessedAt: number;
  readonly approximateSizeBytes: number;
}
