import type { RawCaptionCue } from '../domain/CaptionCue';
import type { CaptionFormat } from '../domain/CaptionFormat';

export interface CaptionParser {
  readonly format: CaptionFormat;
  parse(input: string, signal?: AbortSignal): readonly RawCaptionCue[];
}
