import type { SubtitleRenderCue } from './SubtitleRenderCue';

export interface ActiveSubtitleSnapshot {
  readonly videoId: string;
  readonly sessionId: string;
  readonly playbackTimeMs: number;
  readonly cueIndex: number;
  readonly cue: SubtitleRenderCue | null;
  readonly playing: boolean;
}
