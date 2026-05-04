import type { TranslatedSegment } from './types';

/**
 * Finds the index of the active subtitle cue using binary search with ±0.12s tolerance.
 * Falls back to check if the last known active index is still valid to optimize sequential playback.
 */
export function findActiveCue(
  track: TranslatedSegment[],
  time: number,
  lastIndex = 0,
  syncOffsetMs = 0
): number {
  if (!track || track.length === 0) return -1;

  const offsetSec = syncOffsetMs / 1000;

  // Fast path: check if last active cue is still playing
  const isMatch = (i: number) => {
    if (i < 0 || i >= track.length) return false;
    const cue = track[i];
    const adjustedStart = cue.start + offsetSec;
    const adjustedEnd = cue.start + cue.dur + offsetSec;
    return time >= adjustedStart - 0.12 && time < adjustedEnd;
  };

  if (isMatch(lastIndex)) return lastIndex;

  // Binary search for matching cue
  let lo = 0;
  let hi = track.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const cue = track[mid];
    const adjustedStart = cue.start + offsetSec;
    const adjustedEnd = cue.start + cue.dur + offsetSec;

    if (time < adjustedStart - 0.12) {
      hi = mid - 1;
    } else if (time >= adjustedEnd) {
      lo = mid + 1;
    } else {
      return mid;
    }
  }

  return -1;
}

/**
 * RunGuard produces monotonic run IDs and AbortSignals to invalidate asynchronous work
 * (e.g. background translation batches, DOM extraction loops) across YouTube video navigations.
 */
export class RunGuard {
  private currentId = 0;
  private currentController: AbortController | null = null;

  next(): { id: number; signal: AbortSignal } {
    if (this.currentController) {
      this.currentController.abort();
    }
    this.currentId += 1;
    this.currentController = new AbortController();
    return { id: this.currentId, signal: this.currentController.signal };
  }

  valid(id: number): boolean {
    return id === this.currentId && (!this.currentController || !this.currentController.signal.aborted);
  }

  get signal(): AbortSignal | undefined {
    return this.currentController?.signal;
  }

  cancel(): void {
    if (this.currentController) {
      this.currentController.abort();
      this.currentController = null;
    }
    this.currentId += 1;
  }
}
