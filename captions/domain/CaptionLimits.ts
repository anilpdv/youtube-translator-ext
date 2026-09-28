export interface CaptionLimits {
  readonly maxCueCount: number;
  readonly maxCueTextLength: number;
  readonly maxTotalTextLength: number;
  readonly maxTrackDurationMs: number;
  readonly maxResponseBytes: number;
  readonly maxOverlapMs: number;
}

export const DEFAULT_CAPTION_LIMITS: CaptionLimits = {
  maxCueCount: 25_000,
  maxCueTextLength: 2_000,
  maxTotalTextLength: 2_000_000,
  maxTrackDurationMs: 24 * 60 * 60 * 1_000,
  maxResponseBytes: 10 * 1024 * 1024,
  maxOverlapMs: 5_000,
};
