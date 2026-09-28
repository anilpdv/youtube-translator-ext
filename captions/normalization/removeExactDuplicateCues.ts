import type { CaptionCue } from '../domain/CaptionCue';

export function removeExactDuplicateCues(
  cues: readonly CaptionCue[],
  toleranceMs = 25,
): readonly CaptionCue[] {
  const result: CaptionCue[] = [];
  for (const cue of cues) {
    const previous = result[result.length - 1];
    const duplicate =
      previous &&
      previous.text === cue.text &&
      Math.abs(previous.startMs - cue.startMs) <= toleranceMs &&
      Math.abs(previous.endMs - cue.endMs) <= toleranceMs;
    if (!duplicate) result.push(cue);
  }
  return result;
}
