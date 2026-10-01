import type { SubtitlePhraseCardPlannerOptions } from './SubtitlePhraseCardPlanner';
import { DEFAULT_SUBTITLE_PHRASE_CARD_OPTIONS } from './SubtitlePhraseCardPlanner';

export interface SubtitleDisplayPlannerOptions extends SubtitlePhraseCardPlannerOptions {
  readonly maxLines: number;
  readonly maxCharactersPerLine: number;
  readonly maxWordsPerSlice: number;
  readonly minimumSliceDurationMs: number;
  readonly preferredSliceDurationMs: number;
  readonly maximumSliceDurationMs: number;
  readonly rollingWindowSize: number;
}

export const DEFAULT_SUBTITLE_DISPLAY_PLANNER_OPTIONS: SubtitleDisplayPlannerOptions = {
  ...DEFAULT_SUBTITLE_PHRASE_CARD_OPTIONS,
  maxLines: DEFAULT_SUBTITLE_PHRASE_CARD_OPTIONS.maximumLines,
  maxCharactersPerLine: DEFAULT_SUBTITLE_PHRASE_CARD_OPTIONS.maximumCharactersPerLine,
  maxWordsPerSlice: DEFAULT_SUBTITLE_PHRASE_CARD_OPTIONS.maximumWordsPerCard,
  minimumSliceDurationMs: DEFAULT_SUBTITLE_PHRASE_CARD_OPTIONS.minimumCardDurationMs,
  preferredSliceDurationMs: DEFAULT_SUBTITLE_PHRASE_CARD_OPTIONS.preferredCardDurationMs,
  maximumSliceDurationMs: DEFAULT_SUBTITLE_PHRASE_CARD_OPTIONS.maximumCardDurationMs,
  rollingWindowSize: 1,
};
