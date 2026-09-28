export interface PlaybackSnapshot {
  readonly currentTimeMs: number;
  readonly durationMs: number;
  readonly paused: boolean;
  readonly playbackRate: number;
  readonly fullscreen: boolean;
}
