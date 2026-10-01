import type { SubtitlePhraseCardPlannerOptions } from './SubtitlePhraseCardPlanner';
import type { PhraseAccumulatorSnapshot, TimedTextUnit } from './PhraseAccumulator';
import type { PhraseBoundary } from './classifyPhraseBoundary';
import type { SubtitlePhraseCard } from '../domain/SubtitlePhraseCard';

export interface PhraseCommitDecision {
  readonly commit: boolean;
  readonly forced: boolean;
  readonly reason: SubtitlePhraseCard['boundaryReason'] | null;
}

export function shouldCommitPhraseCard(input: {
  readonly snapshot: PhraseAccumulatorSnapshot;
  readonly boundary: PhraseBoundary;
  readonly nextUnit: TimedTextUnit | null;
  readonly options: SubtitlePhraseCardPlannerOptions;
}): PhraseCommitDecision {
  const { snapshot, boundary, options } = input;
  const belowMinimum = snapshot.durationMs < options.minimumCardDurationMs;
  const reachedPreferredDuration = snapshot.durationMs >= options.preferredCardDurationMs;
  const reachedMaximumDuration = snapshot.durationMs >= options.maximumCardDurationMs;
  const reachedPreferredWords = snapshot.wordCount >= options.preferredWordsPerCard;
  const reachedMaximumWords = snapshot.wordCount >= options.maximumWordsPerCard;
  const exceededLines = snapshot.estimatedLines > options.maximumLines;

  if (exceededLines) {
    return { commit: true, forced: true, reason: 'line-capacity' };
  }

  if (reachedMaximumWords) {
    return { commit: true, forced: true, reason: 'line-capacity' };
  }

  if (reachedMaximumDuration) {
    return { commit: true, forced: true, reason: 'duration-limit' };
  }

  if (boundary.strength === 'sentence') {
    if (belowMinimum && input.nextUnit) {
      return { commit: false, forced: false, reason: null };
    }
    return { commit: true, forced: false, reason: 'sentence' };
  }

  if (boundary.strength === 'silence' && !belowMinimum) {
    return { commit: true, forced: false, reason: 'silence' };
  }

  if (
    boundary.strength === 'clause' &&
    (reachedPreferredDuration || reachedPreferredWords)
  ) {
    return { commit: true, forced: false, reason: 'punctuation' };
  }

  if (!input.nextUnit && snapshot.units.length > 0) {
    return { commit: true, forced: false, reason: 'source-cue-end' };
  }

  return { commit: false, forced: false, reason: null };
}
