import type { TranslatedCue } from '../../translation/domain/TranslationCue';

export interface CachedTranslationBatch {
  readonly batchId: string;
  readonly batchIndex: number;
  readonly sourceCueIds: readonly string[];
  readonly sourceBatchHash: string;
  readonly translations: readonly TranslatedCue[];
  readonly status: 'completed';
  readonly attempts: number;
  readonly completedAt: number;
}
