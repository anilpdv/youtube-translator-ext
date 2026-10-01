import type { CaptionDocument } from '../../captions/domain/CaptionDocument';
import type { SourceTranslationCue } from '../domain/TranslationCue';
import {
  createEstimatedTimedTextUnits,
  DEFAULT_SUBTITLE_PHRASE_CARD_OPTIONS,
  SubtitlePhraseCardPlanner,
} from '../../rendering/planning/SubtitlePhraseCardPlanner';

export function createTranslationPhraseCards(
  document: CaptionDocument,
): readonly SourceTranslationCue[] {
  const planner = new SubtitlePhraseCardPlanner(DEFAULT_SUBTITLE_PHRASE_CARD_OPTIONS);
  const result: SourceTranslationCue[] = [];

  for (const sourceCue of document.cues) {
    const hasTiming = Boolean(sourceCue.timingUnits?.length);
    const units = hasTiming
      ? sourceCue.timingUnits!.map((unit, index) => ({
          id: `${sourceCue.id}:unit:${index}`,
          parentCueId: sourceCue.id,
          startMs: unit.startMs,
          endMs: unit.endMs,
          text: unit.text,
        }))
      : createEstimatedTimedTextUnits({
          idPrefix: sourceCue.id,
          parentCueId: sourceCue.id,
          startMs: sourceCue.startMs,
          endMs: sourceCue.endMs,
          text: sourceCue.text,
        });
    const cards = planner.plan({
      units,
      sourceLanguage: document.track.languageCode,
      targetLanguage: document.track.languageCode,
      timingSource: hasTiming ? 'word-timing' : 'estimated',
      idPrefix: `${sourceCue.id}:phrase`,
    });
    cards.forEach((card, sliceIndex) => {
      result.push({
        id: card.id,
        parentCueId: sourceCue.id,
        sliceIndex,
        startMs: card.startMs,
        endMs: card.endMs,
        text: card.originalText,
        timingSource: hasTiming ? 'word-timing' : 'estimated',
        context: {
          previousText: result.at(-1)?.text,
          nextText: undefined,
        },
      });
    });
  }
  return result.map((cue, index, all) => ({
    ...cue,
    context: {
      previousText: all[index - 1]?.text,
      nextText: all[index + 1]?.text,
    },
  }));
}
