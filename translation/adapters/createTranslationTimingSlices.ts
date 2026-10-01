import type { CaptionDocument } from '../../captions/domain/CaptionDocument';
import type { SourceTranslationCue } from '../domain/TranslationCue';
import { DEFAULT_SUBTITLE_DISPLAY_PLANNER_OPTIONS } from '../../rendering/planning/SubtitleDisplayPlannerOptions';
import { SubtitleDisplayPlanner } from '../../rendering/planning/SubtitleDisplayPlanner';

export function createTranslationTimingSlices(document: CaptionDocument): readonly SourceTranslationCue[] {
  const planner = new SubtitleDisplayPlanner(DEFAULT_SUBTITLE_DISPLAY_PLANNER_OPTIONS);
  const raw = document.cues.flatMap((cue) =>
    planner
      .plan({
        sourceCue: cue,
        translatedCues: [],
        sourceLanguage: document.track.languageCode,
        targetLanguage: document.track.languageCode,
      })
      .map((slice) => ({
        id: slice.id,
        parentCueId: cue.id,
        sliceIndex: slice.sliceIndex,
        startMs: slice.startMs,
        endMs: slice.endMs,
        text: slice.originalText.replace(/\n/g, ' '),
      })),
  );
  return raw.map((cue, index) => ({ ...cue, context: {
    previousText: raw[index - 1]?.text, nextText: raw[index + 1]?.text,
  } }));
}
