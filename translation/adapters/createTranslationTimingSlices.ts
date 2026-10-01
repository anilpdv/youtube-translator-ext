import type { CaptionDocument } from '../../captions/domain/CaptionDocument';
import type { SourceTranslationCue } from '../domain/TranslationCue';
import { DEFAULT_SUBTITLE_DISPLAY_PLANNER_OPTIONS } from '../../rendering/planning/SubtitleDisplayPlannerOptions';
import { splitReadableText } from '../../rendering/planning/splitReadableText';
import { allocateSliceTimings } from '../../rendering/planning/allocateSliceTimings';

export function createTranslationTimingSlices(document: CaptionDocument): readonly SourceTranslationCue[] {
  const raw = document.cues.flatMap((cue) => {
    const timed = (cue.timingUnits?.length ?? 0) > 0
      ? cue.timingUnits!.map((unit) => ({ text: unit.text, startMs: unit.startMs, endMs: unit.endMs }))
      : allocateSliceTimings(
          splitReadableText(cue.text, document.track.languageCode, DEFAULT_SUBTITLE_DISPLAY_PLANNER_OPTIONS),
          cue.startMs, cue.endMs, DEFAULT_SUBTITLE_DISPLAY_PLANNER_OPTIONS,
        );
    return timed.map((slice, sliceIndex) => ({
      id: `${cue.id}:slice:${sliceIndex}`, parentCueId: cue.id, sliceIndex,
      startMs: slice.startMs, endMs: slice.endMs, text: slice.text,
    }));
  });
  return raw.map((cue, index) => ({ ...cue, context: {
    previousText: raw[index - 1]?.text, nextText: raw[index + 1]?.text,
  } }));
}
