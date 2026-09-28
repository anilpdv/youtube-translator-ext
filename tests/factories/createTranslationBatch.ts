import type { TranslationBatch } from '../../translation/domain/TranslationBatch';

export function createTranslationBatch(overrides: Partial<TranslationBatch> = {}): TranslationBatch {
  return {
    id: 'fixture-video:0:cue-1:cue-1', index: 0,
    cues: [{ id: 'cue-1', startMs: 0, endMs: 1000, text: 'Hello' }],
    characterCount: 5, estimatedCost: 1, ...overrides,
  };
}
