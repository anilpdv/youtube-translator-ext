import type { TranslationBatch } from '../domain/TranslationBatch';
import type { TranslatedCue } from '../domain/TranslationCue';
import type { TranslationLimits } from '../domain/TranslationLimits';
import { TranslationError } from '../domain/TranslationError';
import type { ProviderTranslationItem } from '../providers/ProviderResponse';
import { detectAbnormalRepetition } from './detectAbnormalRepetition';

export class TranslationResponseValidator {
  constructor(private readonly limits: TranslationLimits) {}

  validate(
    batch: TranslationBatch,
    items: readonly ProviderTranslationItem[],
  ): readonly TranslatedCue[] {
    const sourceById = new Map(batch.cues.map((cue) => [cue.id, cue]));
    const seen = new Set<string>();
    for (const item of items) {
      if (seen.has(item.id)) {
        throw new TranslationError({
          code: 'DUPLICATE_CUE',
          message: 'The provider returned a cue more than once.',
          retryable: true,
          batchId: batch.id,
          details: { cueId: item.id },
        });
      }
      const source = sourceById.get(item.id);
      if (!source) {
        throw new TranslationError({
          code: 'UNKNOWN_CUE',
          message: 'The provider returned an unknown cue ID.',
          retryable: true,
          batchId: batch.id,
          details: { cueId: item.id },
        });
      }
      const translatedText = item.translation.trim();
      if (!translatedText) {
        throw new TranslationError({
          code: 'EMPTY_TRANSLATION',
          message: 'The provider returned an empty translation.',
          retryable: true,
          batchId: batch.id,
        });
      }
      if (translatedText.length > this.limits.maxTranslatedCueLength) {
        throw new TranslationError({
          code: 'TRANSLATION_TOO_LONG',
          message: 'A translated cue exceeds the allowed length.',
          retryable: true,
          batchId: batch.id,
        });
      }
      const repetition = detectAbnormalRepetition({ sourceText: source.text, translatedText });
      if (repetition.repetitive) {
        throw new TranslationError({
          code: 'ABNORMAL_REPETITION', message: 'The provider returned repeated subtitle content.',
          retryable: true, batchId: batch.id,
          details: { cueId: source.id, repeatedTokenRatio: repetition.repeatedTokenRatio, lengthRatio: repetition.translationSourceLengthRatio },
        });
      }
      seen.add(item.id);
    }
    for (const cue of batch.cues) {
      if (!seen.has(cue.id)) {
        throw new TranslationError({
          code: 'MISSING_CUE',
          message: 'The provider omitted a required cue.',
          retryable: true,
          batchId: batch.id,
          details: { cueId: cue.id },
        });
      }
    }
    return batch.cues.map((source) => {
      const item = items.find((candidate) => candidate.id === source.id);
      return {
        id: source.id,
        parentCueId: source.parentCueId,
        sliceIndex: source.sliceIndex,
        sourceText: source.text,
        translatedText: item!.translation.trim(),
        startMs: source.startMs,
        endMs: source.endMs,
      };
    });
  }
}
