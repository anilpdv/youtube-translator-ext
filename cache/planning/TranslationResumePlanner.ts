import type { CachedTranslationBatch } from '../domain/CachedTranslationBatch';
import type { TranslationBatch } from '../../translation/domain/TranslationBatch';
import type { TranslationResumePlan } from './TranslationResumePlan';

export function createTranslationResumePlan(
  batches: readonly TranslationBatch[],
  cached: readonly CachedTranslationBatch[],
): TranslationResumePlan {
  const byId = new Map(cached.map((batch) => [batch.batchId, batch]));
  const reusableBatches: CachedTranslationBatch[] = [];
  const pendingBatches: TranslationBatch[] = [];
  for (const batch of batches) {
    const saved = byId.get(batch.id);
    if (saved && saved.sourceCueIds.length === batch.cues.length &&
      saved.sourceCueIds.every((id, index) => id === batch.cues[index].id)) {
      reusableBatches.push(saved);
    } else {
      pendingBatches.push(batch);
    }
  }
  return { reusableBatches, pendingBatches };
}
