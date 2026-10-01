import type { CaptionCue } from '../../captions/domain/CaptionCue';
import type { TranslatedCue } from '../../translation/domain/TranslationCue';
import type { SubtitleDisplaySlice, DisplayTimingSource } from '../domain/SubtitleDisplaySlice';
import {
  createEstimatedTimedTextUnits,
  SubtitlePhraseCardPlanner,
  type SubtitlePhraseCardPlannerOptions,
} from './SubtitlePhraseCardPlanner';
import type { SubtitleDisplayPlannerOptions } from './SubtitleDisplayPlannerOptions';

export class SubtitleDisplayPlanner {
  constructor(private readonly options: SubtitleDisplayPlannerOptions) {}

  plan(input: {
    readonly sourceCue: CaptionCue;
    readonly translatedCues: readonly TranslatedCue[];
    readonly sourceLanguage: string;
    readonly targetLanguage: string;
  }): readonly SubtitleDisplaySlice[] {
    let timingSource: DisplayTimingSource;
    let units;

    if (input.sourceCue.timingUnits?.length) {
      units = input.sourceCue.timingUnits.map((unit, index) => ({
        id: `${input.sourceCue.id}:unit:${index}`,
        parentCueId: input.sourceCue.id,
        text: unit.text,
        startMs: unit.startMs,
        endMs: unit.endMs,
      }));
      timingSource = 'word-timing';
    } else {
      units = createEstimatedTimedTextUnits({
        idPrefix: input.sourceCue.id,
        parentCueId: input.sourceCue.id,
        startMs: input.sourceCue.startMs,
        endMs: input.sourceCue.endMs,
        text: input.sourceCue.text,
      });
      timingSource = input.sourceCue.sourceBehavior === 'rolling' ? 'rolling-delta' : 'estimated';
    }

    const phraseOptions: SubtitlePhraseCardPlannerOptions = {
      minimumCardDurationMs: this.options.minimumCardDurationMs,
      preferredCardDurationMs: this.options.preferredCardDurationMs,
      maximumCardDurationMs: this.options.maximumCardDurationMs,
      maximumWordsPerCard: Math.min(this.options.maximumWordsPerCard, this.options.maxWordsPerSlice),
      preferredWordsPerCard: Math.min(this.options.preferredWordsPerCard, this.options.maxWordsPerSlice),
      maximumCharactersPerLine: Math.min(this.options.maximumCharactersPerLine, this.options.maxCharactersPerLine),
      maximumLines: Math.min(this.options.maximumLines, this.options.maxLines),
      phraseBoundaryGraceMs: this.options.phraseBoundaryGraceMs,
      minimumSilenceBoundaryMs: this.options.minimumSilenceBoundaryMs,
    };
    const planner = new SubtitlePhraseCardPlanner(phraseOptions);
    const cards = planner.plan({
      units,
      sourceLanguage: input.sourceLanguage,
      targetLanguage: input.targetLanguage,
      timingSource: timingSource === 'word-timing' ? 'word-timing' : 'estimated',
      idPrefix: `${input.sourceCue.id}:display`,
    });

    return cards.map((card, index) => {
      const translatedCue =
        input.translatedCues.find((cue) => cue.id === card.id) ??
        input.translatedCues.find((cue) => cue.sliceIndex === index) ??
        (cards.length === 1 ? input.translatedCues[0] : undefined);

      return {
        id: card.id,
        parentCueId: input.sourceCue.id,
        sliceIndex: index,
        startMs: card.startMs,
        endMs: card.endMs,
        originalText: card.originalText,
        translatedText: translatedCue?.translatedText ?? null,
        sourceLanguage: input.sourceLanguage,
        targetLanguage: input.targetLanguage,
        timingSource,
        cumulativeWindow: false,
      };
    });
  }
}
