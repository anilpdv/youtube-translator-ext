import type { CaptionDocument } from '../../captions/domain/CaptionDocument';
import type { TranslationBatch, TranslationBatchResult } from '../../translation/domain/TranslationBatch';
import type { TranslationDocument } from '../../translation/domain/TranslationDocument';
import { TRANSLATION_CACHE_SCHEMA_VERSION, TRANSLATION_BATCHING_VERSION } from '../domain/CacheSchemaVersion';
import type { CacheLimits } from '../domain/CacheLimits';
import { DEFAULT_CACHE_LIMITS } from '../domain/CacheLimits';
import type { CachedTranslationBatch } from '../domain/CachedTranslationBatch';
import type { TranslationCacheKey } from '../domain/TranslationCacheKey';
import { serializeTranslationCacheKey } from '../domain/TranslationCacheKey';
import type { TranslationCacheRecord } from '../domain/TranslationCacheRecord';
import { hashCaptionDocument, hashTranslationBatch } from '../hashing/CaptionDocumentHasher';
import { CacheCleanupService } from '../policy/CacheCleanupService';
import { assertCacheRecordWithinLimits } from '../policy/CacheQuotaManager';
import type { TranslationCacheRepository } from '../repository/TranslationCacheRepository';

export class TranslationCacheService {
  private readonly cleanup: CacheCleanupService;

  constructor(
    private readonly repository: TranslationCacheRepository,
    private readonly limits: CacheLimits = DEFAULT_CACHE_LIMITS,
  ) {
    this.cleanup = new CacheCleanupService(repository, limits);
  }

  async createKey(input: {
    captionDocument: CaptionDocument;
    targetLanguage: string;
    providerId: string;
    modelId: string;
    promptVersion: string;
  }): Promise<TranslationCacheKey> {
    return {
      videoId: input.captionDocument.videoId,
      captionTrackId: input.captionDocument.track.id,
      sourceLanguage: input.captionDocument.track.languageCode,
      targetLanguage: input.targetLanguage,
      providerId: input.providerId,
      modelId: input.modelId,
      promptVersion: input.promptVersion,
      batchingVersion: TRANSLATION_BATCHING_VERSION,
      sourceCaptionHash: await hashCaptionDocument(input.captionDocument),
    };
  }

  async get(key: TranslationCacheKey): Promise<TranslationCacheRecord | null> {
    const record = await this.repository.get(serializeTranslationCacheKey(key));
    if (!record) return null;
    if (record.key.sourceCaptionHash !== key.sourceCaptionHash) return null;
    return { ...record, lastAccessedAt: Date.now() };
  }

  async saveBatch(input: {
    key: TranslationCacheKey;
    batch: TranslationBatch;
    result: TranslationBatchResult;
    expectedBatchCount: number;
    expectedCueCount: number;
  }): Promise<void> {
    if (input.result.status !== 'completed') return;
    const previous = await this.repository.get(serializeTranslationCacheKey(input.key));
    const cached: CachedTranslationBatch = {
      batchId: input.result.batchId,
      batchIndex: input.result.batchIndex,
      sourceCueIds: input.batch.cues.map((cue) => cue.id),
      sourceBatchHash: await hashTranslationBatch(input.batch.cues),
      translations: input.result.translations,
      status: 'completed',
      attempts: input.result.attempts,
      completedAt: input.result.completedAt,
    };
    const batches = [...(previous?.batches ?? []).filter((batch) => batch.batchId !== cached.batchId), cached];
    const now = Date.now();
    const record: TranslationCacheRecord = {
      schemaVersion: TRANSLATION_CACHE_SCHEMA_VERSION,
      id: serializeTranslationCacheKey(input.key),
      key: input.key,
      batches,
      expectedBatchCount: input.expectedBatchCount,
      expectedCueCount: input.expectedCueCount,
      completion: batches.length === input.expectedBatchCount ? 'complete' : 'partial',
      translatedCueCount: batches.reduce((sum, batch) => sum + batch.translations.length, 0),
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
      lastAccessedAt: now,
      approximateSizeBytes: JSON.stringify(batches).length,
    };
    assertCacheRecordWithinLimits(record, this.limits);
    await this.repository.put(record);
    await this.cleanup.cleanup(now);
  }

  async saveDocument(key: TranslationCacheKey, document: TranslationDocument): Promise<void> {
    for (const result of document.batchResults) {
      if (result.status !== 'completed') continue;
      const batch = document.source.cues
        .slice(result.batchIndex * 40, result.batchIndex * 40 + 40)
        .map((cue) => ({ id: cue.id, startMs: cue.startMs, endMs: cue.endMs, text: cue.text }));
      await this.saveBatch({
        key,
        batch: { id: result.batchId, index: result.batchIndex, cues: batch, characterCount: 0, estimatedCost: 0 },
        result,
        expectedBatchCount: document.batchResults.length,
        expectedCueCount: document.source.cues.length,
      });
    }
  }
}
