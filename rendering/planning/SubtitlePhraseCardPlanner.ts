import type { SubtitlePhraseCard } from '../domain/SubtitlePhraseCard';
import { PhraseAccumulator, type TimedTextUnit } from './PhraseAccumulator';
import { classifyPhraseBoundary, type PhraseBoundaryStrength } from './classifyPhraseBoundary';
import { countReadingUnits, estimateCaptionLines, joinCaptionUnits, wrapCaptionText } from './joinCaptionUnits';
import { rebalancePhraseCards } from './rebalancePhraseCards';
import { shouldCommitPhraseCard } from './shouldCommitPhraseCard';
import { validatePhraseCards } from './validatePhraseCards';

export interface SubtitlePhraseCardPlannerOptions {
  readonly minimumCardDurationMs: number;
  readonly preferredCardDurationMs: number;
  readonly maximumCardDurationMs: number;
  readonly maximumWordsPerCard: number;
  readonly preferredWordsPerCard: number;
  readonly maximumCharactersPerLine: number;
  readonly maximumLines: number;
  readonly phraseBoundaryGraceMs: number;
  readonly minimumSilenceBoundaryMs: number;
}

export const DEFAULT_SUBTITLE_PHRASE_CARD_OPTIONS: SubtitlePhraseCardPlannerOptions = {
  minimumCardDurationMs: 1_200,
  preferredCardDurationMs: 2_400,
  maximumCardDurationMs: 5_000,
  maximumWordsPerCard: 14,
  preferredWordsPerCard: 9,
  maximumCharactersPerLine: 42,
  maximumLines: 2,
  phraseBoundaryGraceMs: 350,
  minimumSilenceBoundaryMs: 350,
};

export interface PhraseCardPlannerInput {
  readonly units: readonly TimedTextUnit[];
  readonly sourceLanguage: string;
  readonly targetLanguage: string;
  readonly timingSource: SubtitlePhraseCard['timingSource'];
  readonly idPrefix?: string;
}

interface BoundaryCandidate {
  readonly unitIndex: number;
  readonly strength: PhraseBoundaryStrength;
  readonly reason: SubtitlePhraseCard['boundaryReason'];
}

const hasNaturalBoundary = (strength: PhraseBoundaryStrength): boolean =>
  strength === 'sentence' || strength === 'silence' || strength === 'clause';

const buildCard = (
  units: readonly TimedTextUnit[],
  index: number,
  reason: SubtitlePhraseCard['boundaryReason'],
  input: PhraseCardPlannerInput,
  options: SubtitlePhraseCardPlannerOptions,
): SubtitlePhraseCard => {
  const rawText = joinCaptionUnits(units);
  const text = wrapCaptionText(rawText, options.maximumCharactersPerLine, options.maximumLines);
  const parentCueIds = [...new Set(units.map((unit) => unit.parentCueId))];

  return {
    id: `${input.idPrefix ?? 'phrase'}:${index}`,
    parentCueIds,
    startMs: units[0]?.startMs ?? 0,
    endMs: units.at(-1)?.endMs ?? 0,
    originalText: text,
    translatedText: null,
    sourceLanguage: input.sourceLanguage,
    targetLanguage: input.targetLanguage,
    timingSource: input.timingSource,
    boundaryReason: reason,
    stable: true,
  };
};

const chooseForcedCommitIndex = (
  accumulator: PhraseAccumulator,
  candidates: readonly BoundaryCandidate[],
  options: SubtitlePhraseCardPlannerOptions,
): number => {
  const units = accumulator.getUnits();
  if (units.length <= 1) return 0;

  const preferredCandidate = [...candidates]
    .reverse()
    .find((candidate) => {
      if (!hasNaturalBoundary(candidate.strength) || candidate.unitIndex >= units.length - 1) return false;
      const snapshot = accumulator.snapshotThrough(candidate.unitIndex, options.maximumCharactersPerLine);
      return (
        snapshot.durationMs >= options.minimumCardDurationMs &&
        snapshot.estimatedLines <= options.maximumLines &&
        snapshot.wordCount <= options.maximumWordsPerCard
      );
    });
  if (preferredCandidate) return preferredCandidate.unitIndex;

  for (let index = units.length - 2; index >= 0; index -= 1) {
    const snapshot = accumulator.snapshotThrough(index, options.maximumCharactersPerLine);
    if (
      snapshot.estimatedLines <= options.maximumLines &&
      snapshot.wordCount <= options.maximumWordsPerCard
    ) {
      return index;
    }
  }

  return units.length - 2;
};

export class SubtitlePhraseCardPlanner {
  constructor(private readonly options: SubtitlePhraseCardPlannerOptions = DEFAULT_SUBTITLE_PHRASE_CARD_OPTIONS) {}

  plan(input: PhraseCardPlannerInput): readonly SubtitlePhraseCard[] {
    const units = [...input.units].sort((first, second) => first.startMs - second.startMs);
    const accumulator = new PhraseAccumulator();
    const candidates: BoundaryCandidate[] = [];
    const cards: SubtitlePhraseCard[] = [];

    const commit = (unitIndex: number, reason: SubtitlePhraseCard['boundaryReason']) => {
      const committed = accumulator.commitThrough(unitIndex);
      if (!committed.length) return;
      cards.push(buildCard(committed, cards.length, reason, input, this.options));
      candidates.splice(0, candidates.length);
    };

    for (let index = 0; index < units.length; index += 1) {
      const unit = units[index];
      const nextUnit = units[index + 1] ?? null;
      const previousUnit = accumulator.getUnits().at(-1);
      if (previousUnit && previousUnit.parentCueId !== unit.parentCueId) {
        commit(accumulator.getUnits().length - 1, 'source-cue-end');
      }
      accumulator.add(unit);

      const snapshot = accumulator.snapshot(this.options.maximumCharactersPerLine);
      const boundary = classifyPhraseBoundary({
        currentText: snapshot.text,
        currentEndMs: snapshot.endMs,
        nextStartMs: nextUnit?.startMs ?? null,
        minimumSilenceMs: this.options.minimumSilenceBoundaryMs,
      });
      if (hasNaturalBoundary(boundary.strength)) {
        candidates.push({
          unitIndex: accumulator.getUnits().length - 1,
          strength: boundary.strength,
          reason: boundary.reason,
        });
      }

      const decision = shouldCommitPhraseCard({
        snapshot,
        boundary,
        nextUnit,
        options: this.options,
      });
      if (!decision.commit) continue;

      if (decision.forced && decision.reason === 'line-capacity') {
        commit(chooseForcedCommitIndex(accumulator, candidates, this.options), decision.reason);
      } else {
        commit(accumulator.getUnits().length - 1, decision.reason ?? boundary.reason);
      }
    }

    if (!accumulator.isEmpty()) {
      commit(accumulator.getUnits().length - 1, 'source-cue-end');
    }

    const rebalanced = rebalancePhraseCards(cards, this.options);
    validatePhraseCards(rebalanced, this.options);
    return rebalanced;
  }
}

export function createEstimatedTimedTextUnits(input: {
  readonly idPrefix: string;
  readonly parentCueId: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly text: string;
}): readonly TimedTextUnit[] {
  const tokens = input.text.match(/\S+/g) ?? [];
  if (!tokens.length) return [];

  const totalWeight = tokens.reduce((sum, token) => sum + Math.max(1, countReadingUnits(token)), 0);
  const durationMs = Math.max(1, input.endMs - input.startMs);
  let cursor = input.startMs;

  return tokens.map((token, index) => {
    const isLast = index === tokens.length - 1;
    const tokenDuration = isLast
      ? input.endMs - cursor
      : Math.max(1, Math.round((durationMs * Math.max(1, countReadingUnits(token))) / totalWeight));
    const startMs = cursor;
    const endMs = isLast ? input.endMs : Math.min(input.endMs, startMs + tokenDuration);
    cursor = endMs;

    return {
      id: `${input.idPrefix}:unit:${index}`,
      parentCueId: input.parentCueId,
      startMs,
      endMs,
      text: token,
    };
  });
}

export function phraseCardFitsText(text: string, options: SubtitlePhraseCardPlannerOptions): boolean {
  return (
    countReadingUnits(text) <= options.maximumWordsPerCard &&
    estimateCaptionLines(text, options.maximumCharactersPerLine) <= options.maximumLines
  );
}
