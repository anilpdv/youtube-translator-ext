import type { CaptionCue } from './CaptionCue';
import type { CaptionFormat } from './CaptionFormat';
import type { CaptionTrack } from './CaptionTrack';

export interface CaptionDocument {
  readonly videoId: string;
  readonly track: CaptionTrack;
  readonly format: CaptionFormat;
  readonly cues: readonly CaptionCue[];
  readonly durationMs: number;
  readonly textLength: number;
  readonly extractedAt: number;
  readonly warnings: readonly string[];
}
