import type { SubtitleDisplaySlice } from './SubtitleDisplaySlice';

export interface ActiveSubtitleSnapshot {
  readonly videoId: string;
  readonly sessionId: string;
  readonly playbackTimeMs: number;
  readonly sliceIndex: number;
  readonly slice: SubtitleDisplaySlice | null;
  readonly playing: boolean;
}
