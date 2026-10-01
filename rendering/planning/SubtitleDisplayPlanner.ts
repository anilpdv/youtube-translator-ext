import type { CaptionCue } from '../../captions/domain/CaptionCue';
import type { TranslatedCue } from '../../translation/domain/TranslationCue';
import type { SubtitleDisplaySlice, DisplayTimingSource } from '../domain/SubtitleDisplaySlice';
import { allocateSliceTimings, type TimedReadableChunk } from './allocateSliceTimings';
import { createRollingWindows } from './createRollingWindows';
import { splitReadableText } from './splitReadableText';
import type { SubtitleDisplayPlannerOptions } from './SubtitleDisplayPlannerOptions';
export class SubtitleDisplayPlanner {
  constructor(private readonly options: SubtitleDisplayPlannerOptions) {}
  plan(input: { readonly sourceCue: CaptionCue; readonly translatedCues: readonly TranslatedCue[]; readonly sourceLanguage: string; readonly targetLanguage: string }): readonly SubtitleDisplaySlice[] {
    let chunks: readonly TimedReadableChunk[]; let timingSource: DisplayTimingSource;
    if (input.sourceCue.timingUnits?.length) {
      chunks = input.sourceCue.timingUnits.map((unit) => ({ text: unit.text, startMs: unit.startMs, endMs: unit.endMs })); timingSource = 'exact-segment';
    } else {
      chunks = allocateSliceTimings(splitReadableText(input.sourceCue.text, input.sourceLanguage, this.options), input.sourceCue.startMs, input.sourceCue.endMs, this.options);
      timingSource = input.sourceCue.sourceBehavior === 'rolling' ? 'rolling-delta' : 'estimated';
    }
    const windows = createRollingWindows(chunks, this.options.rollingWindowSize);
    return windows.map((window, index) => ({
      id: `${input.sourceCue.id}:display:${index}`, parentCueId: input.sourceCue.id, sliceIndex: index,
      startMs: window.startMs, endMs: window.endMs, originalText: window.text,
      translatedText: input.translatedCues.slice(Math.max(0, index - this.options.rollingWindowSize + 1), index + 1).map((cue) => cue.translatedText).filter(Boolean).join('\n') || null,
      sourceLanguage: input.sourceLanguage, targetLanguage: input.targetLanguage, timingSource, cumulativeWindow: index > 0,
    }));
  }
}
