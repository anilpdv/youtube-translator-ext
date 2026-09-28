import type { TranslationCacheRecord } from '../../cache/domain/TranslationCacheRecord';

export function createCacheRecord(overrides: Partial<TranslationCacheRecord> = {}): TranslationCacheRecord {
  const now = 0;
  return {
    schemaVersion: 1, id: 'fixture-record',
    key: {
      videoId: 'fixture-video', captionTrackId: 'fixture-track', sourceLanguage: 'en',
      targetLanguage: 'fr', providerId: 'fake', modelId: 'fake-model',
      promptVersion: '1', batchingVersion: '1', sourceCaptionHash: 'hash',
    },
    batches: [], expectedBatchCount: 1, expectedCueCount: 1, completion: 'partial',
    translatedCueCount: 0, createdAt: now, updatedAt: now, lastAccessedAt: now,
    approximateSizeBytes: 0, ...overrides,
  };
}
