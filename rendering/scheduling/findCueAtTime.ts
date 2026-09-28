import type { SubtitleRenderCue } from '../domain/SubtitleRenderCue';

export function findCueAtTime(
  cues: readonly SubtitleRenderCue[],
  timeMs: number,
): number {
  let low = 0;
  let high = cues.length - 1;
  let candidate = -1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (cues[middle].startMs <= timeMs) {
      candidate = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return candidate >= 0 && timeMs < cues[candidate].endMs ? candidate : -1;
}
