import type { CaptionTimingUnit } from './CaptionTimingUnit';

export type CaptionSourceBehavior = 'static' | 'segmented' | 'rolling';

export interface CaptionCue {
  readonly id: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly text: string;
  readonly timingUnits?: readonly CaptionTimingUnit[];
  readonly sourceBehavior?: CaptionSourceBehavior;
}

export interface RawCaptionSegment {
  readonly text: string;
  readonly offsetMs: number | null;
}

export interface RawCaptionCue {
  readonly startMs: number;
  readonly endMs?: number | null;
  readonly durationMs?: number | null;
  readonly text: string;
  readonly segments?: readonly RawCaptionSegment[];
  readonly sourceBehavior?: CaptionSourceBehavior;
}
