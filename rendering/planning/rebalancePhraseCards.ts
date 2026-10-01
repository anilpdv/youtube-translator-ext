import type { SubtitlePhraseCard } from '../domain/SubtitlePhraseCard';
import type { SubtitlePhraseCardPlannerOptions } from './SubtitlePhraseCardPlanner';
import { countReadingUnits, estimateCaptionLines, joinCaptionUnitText, wrapCaptionText } from './joinCaptionUnits';

const canMerge = (
  first: SubtitlePhraseCard,
  second: SubtitlePhraseCard,
  options: SubtitlePhraseCardPlannerOptions,
): boolean => {
  const text = joinCaptionUnitText([first.originalText, second.originalText]);
  return (
    countReadingUnits(text) <= options.maximumWordsPerCard &&
    estimateCaptionLines(text, options.maximumCharactersPerLine) <= options.maximumLines
  );
};

const mergeCards = (
  first: SubtitlePhraseCard,
  second: SubtitlePhraseCard,
  options: SubtitlePhraseCardPlannerOptions,
): SubtitlePhraseCard => {
  const originalText = wrapCaptionText(
    joinCaptionUnitText([first.originalText, second.originalText]),
    options.maximumCharactersPerLine,
    options.maximumLines,
  );
  const translatedText =
    first.translatedText || second.translatedText
      ? wrapCaptionText(
          joinCaptionUnitText([first.translatedText ?? '', second.translatedText ?? '']),
          options.maximumCharactersPerLine,
          options.maximumLines,
        )
      : null;

  return {
    ...first,
    id: `${first.id}+${second.id}`,
    parentCueIds: [...new Set([...first.parentCueIds, ...second.parentCueIds])],
    endMs: second.endMs,
    originalText,
    translatedText,
    boundaryReason: second.boundaryReason,
  };
};

const wordsOf = (text: string): string[] => text.replace(/\n/g, ' ').split(/\s+/).filter(Boolean);

const textFits = (text: string, options: SubtitlePhraseCardPlannerOptions): boolean =>
  countReadingUnits(text) <= options.maximumWordsPerCard &&
  estimateCaptionLines(text, options.maximumCharactersPerLine) <= options.maximumLines;

const tryRebalanceWithPrevious = (
  previous: SubtitlePhraseCard,
  current: SubtitlePhraseCard,
  options: SubtitlePhraseCardPlannerOptions,
): readonly [SubtitlePhraseCard, SubtitlePhraseCard] | null => {
  const previousWords = wordsOf(previous.originalText);
  const currentWords = wordsOf(current.originalText);
  if (previousWords.length <= 2 || currentWords.length === 0) return null;

  const previousDuration = previous.endMs - previous.startMs;
  const currentDuration = current.endMs - current.startMs;
  const msPerPreviousWord = previousDuration / previousWords.length;
  const targetDuration =
    currentWords.length <= 2
      ? Math.min(options.preferredCardDurationMs, options.minimumCardDurationMs + 600)
      : options.minimumCardDurationMs;

  for (let moveCount = 1; moveCount < previousWords.length; moveCount += 1) {
    const nextPreviousWords = previousWords.slice(0, previousWords.length - moveCount);
    const nextCurrentWords = [
      ...previousWords.slice(previousWords.length - moveCount),
      ...currentWords,
    ];
    const nextPreviousRaw = nextPreviousWords.join(' ');
    const nextCurrentRaw = nextCurrentWords.join(' ');
    const shiftedMs = Math.round(msPerPreviousWord * moveCount);
    const boundaryMs = Math.max(previous.startMs + 1, previous.endMs - shiftedMs);

    if (
      currentDuration + shiftedMs >= targetDuration &&
      textFits(nextPreviousRaw, options) &&
      textFits(nextCurrentRaw, options)
    ) {
      return [
        {
          ...previous,
          endMs: boundaryMs,
          originalText: wrapCaptionText(
            nextPreviousRaw,
            options.maximumCharactersPerLine,
            options.maximumLines,
          ),
          translatedText: previous.translatedText
            ? wrapCaptionText(nextPreviousRaw, options.maximumCharactersPerLine, options.maximumLines)
            : null,
          boundaryReason: 'line-capacity',
        },
        {
          ...current,
          startMs: boundaryMs,
          originalText: wrapCaptionText(
            nextCurrentRaw,
            options.maximumCharactersPerLine,
            options.maximumLines,
          ),
          translatedText: current.translatedText
            ? wrapCaptionText(nextCurrentRaw, options.maximumCharactersPerLine, options.maximumLines)
            : null,
        },
      ];
    }
  }

  return null;
};

export function rebalancePhraseCards(
  cards: readonly SubtitlePhraseCard[],
  options: SubtitlePhraseCardPlannerOptions,
): readonly SubtitlePhraseCard[] {
  const result: SubtitlePhraseCard[] = [];

  for (const card of cards) {
    const duration = card.endMs - card.startMs;
    const previous = result.at(-1);

    if (
      previous &&
      duration < options.minimumCardDurationMs &&
      canMerge(previous, card, options)
    ) {
      result[result.length - 1] = mergeCards(previous, card, options);
    } else if (previous && duration < options.minimumCardDurationMs) {
      const rebalanced = tryRebalanceWithPrevious(previous, card, options);
      if (rebalanced) {
        result[result.length - 1] = rebalanced[0];
        result.push(rebalanced[1]);
      } else {
        result.push(card);
      }
    } else {
      result.push(card);
    }
  }

  return result;
}
