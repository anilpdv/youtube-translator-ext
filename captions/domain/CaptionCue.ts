export interface CaptionCue {
  readonly id: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly text: string;
}

export interface RawCaptionCue {
  readonly startMs: number;
  readonly endMs?: number;
  readonly durationMs?: number;
  readonly text: string;
}
