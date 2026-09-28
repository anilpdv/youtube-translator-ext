import type { CachedTranslationBatch } from '../domain/CachedTranslationBatch';
import type { TranslationBatch } from '../../translation/domain/TranslationBatch';

export interface TranslationResumePlan {
  readonly reusableBatches: readonly CachedTranslationBatch[];
  readonly pendingBatches: readonly TranslationBatch[];
}
