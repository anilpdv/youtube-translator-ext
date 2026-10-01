import type { CaptionDocument } from '../../captions/domain/CaptionDocument';
import type { TranslationBatch } from '../domain/TranslationBatch';
import type { TranslationError } from '../domain/TranslationError';
import type { TranslationLimits } from '../domain/TranslationLimits';
import type { SourceTranslationCue } from '../domain/TranslationCue';
import { TranslationError as TranslationErrorClass } from '../domain/TranslationError';
import { estimateTokens } from './estimateCueCost';
import { createTranslationTimingSlices } from '../adapters/createTranslationTimingSlices';

export class TranslationBatcher {
  constructor(private readonly limits: TranslationLimits) {}

  createBatches(document: CaptionDocument): readonly TranslationBatch[] {
    if (!document.cues.length) {
      throw new TranslationErrorClass({
        code: 'INVALID_REQUEST',
        message: 'The caption document contains no cues.',
      });
    }
    const batches: TranslationBatch[] = [];
    let current: SourceTranslationCue[] = [];
    let characterCount = 0;
    let estimatedCost = 0;
    const commit = (): void => {
      if (!current.length) return;
      const index = batches.length;
      batches.push({
        id: `${document.videoId}:${index}:${current[0].id}:${current[current.length - 1].id}`,
        index,
        cues: current,
        characterCount,
        estimatedCost,
      });
      current = [];
      characterCount = 0;
      estimatedCost = 0;
    };
    for (const source of createTranslationTimingSlices(document)) {
      const chars = source.text.length;
      const cost = estimateTokens(source.text);
      if (
        chars > this.limits.maxCharactersPerBatch ||
        cost > this.limits.maxEstimatedTokensPerBatch
      ) {
        throw new TranslationErrorClass({
          code: 'INVALID_REQUEST',
          message: `Cue "${source.id}" exceeds the maximum translation batch size.`,
          details: { cueId: source.id, characterCount: chars, estimatedTokens: cost },
        });
      }
      if (
        current.length > 0 &&
        (current.length + 1 > this.limits.maxCuesPerBatch ||
          characterCount + chars > this.limits.maxCharactersPerBatch ||
          estimatedCost + cost > this.limits.maxEstimatedTokensPerBatch)
      ) {
        commit();
      }
      current.push(source);
      characterCount += chars;
      estimatedCost += cost;
    }
    commit();
    return batches;
  }
}
