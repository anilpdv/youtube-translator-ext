import { describe, expect, it } from 'vitest';
import { createTranslationResumePlan } from '../../cache/planning/TranslationResumePlanner';

describe('createTranslationResumePlan', () => {
  it('reuses only matching completed batches', () => {
    const batches = [{
      id: 'one', index: 0, cues: [{ id: 'a', startMs: 0, endMs: 1, text: 'a' }],
      characterCount: 1, estimatedCost: 1,
    }, {
      id: 'two', index: 1, cues: [{ id: 'b', startMs: 1, endMs: 2, text: 'b' }],
      characterCount: 1, estimatedCost: 1,
    }];
    const cached = [{
      batchId: 'one', batchIndex: 0, sourceCueIds: ['a'], sourceBatchHash: 'hash',
      translations: [], status: 'completed' as const, attempts: 1, completedAt: 1,
    }];
    const plan = createTranslationResumePlan(batches, cached);
    expect(plan.reusableBatches).toHaveLength(1);
    expect(plan.pendingBatches.map((batch) => batch.id)).toEqual(['two']);
  });
});
