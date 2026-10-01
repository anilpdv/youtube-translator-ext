import type { SubtitleDisplaySlice } from '../domain/SubtitleDisplaySlice';
import { findCueAtTime } from './findCueAtTime';

export class CueIndex {
  private activeIndex = -1;
  private lastTimeMs = -1;

  constructor(private readonly cues: readonly SubtitleDisplaySlice[]) {}

  find(timeMs: number): number {
    const movedFar = this.lastTimeMs >= 0 && timeMs - this.lastTimeMs > 5_000;
    if (timeMs < this.lastTimeMs || movedFar || this.activeIndex < 0) {
      this.activeIndex = findCueAtTime(this.cues, timeMs);
    } else {
      const current = this.cues[this.activeIndex];
      const next = this.cues[this.activeIndex + 1];
      if (!current || timeMs < current.startMs || timeMs >= current.endMs) {
        this.activeIndex =
          next && timeMs >= next.startMs && timeMs < next.endMs
            ? this.activeIndex + 1
            : findCueAtTime(this.cues, timeMs);
      }
    }
    this.lastTimeMs = timeMs;
    return this.activeIndex;
  }

  reset(): void {
    this.activeIndex = -1;
    this.lastTimeMs = -1;
  }
}
