import { CaptionError } from '../domain/CaptionError';
import type { CaptionCue, RawCaptionCue } from '../domain/CaptionCue';
import type { CaptionLimits } from '../domain/CaptionLimits';
import type { CaptionTextDecoder } from './decodeCaptionText';
import { normalizeWhitespace } from './normalizeWhitespace';

export interface CaptionNormalizerOptions {
  readonly limits: CaptionLimits;
  readonly defaultDurationMs: number;
  readonly minimumDurationMs: number;
}

export class CaptionNormalizer {
  constructor(
    private readonly decoder: CaptionTextDecoder,
    private readonly options: CaptionNormalizerOptions,
  ) {}

  normalize(
    rawCues: readonly RawCaptionCue[],
    signal?: AbortSignal,
  ): readonly CaptionCue[] {
    const normalized: CaptionCue[] = [];
    for (let index = 0; index < rawCues.length; index += 1) {
      signal?.throwIfAborted();
      const raw = rawCues[index];
      const text = normalizeWhitespace(this.decoder.decode(raw.text));
      if (!text) continue;
      if (text.length > this.options.limits.maxCueTextLength) {
        throw new CaptionError({
          code: 'CAPTION_LIMIT_EXCEEDED',
          message: 'A caption cue exceeds the maximum text length.',
          details: { cueIndex: index, textLength: text.length },
        });
      }
      const startMs = Math.max(0, Math.round(raw.startMs));
      const endMs =
        raw.endMs !== undefined
          ? Math.round(raw.endMs)
          : raw.durationMs !== undefined
            ? startMs + Math.round(raw.durationMs)
            : this.inferEnd(rawCues, index, startMs);
      normalized.push({
        id: `cue-${startMs}-${index}`,
        startMs,
        endMs: Math.max(
          startMs + this.options.minimumDurationMs,
          endMs,
        ),
        text,
      });
    }
    return normalized;
  }

  private inferEnd(
    rawCues: readonly RawCaptionCue[],
    index: number,
    startMs: number,
  ): number {
    const next = rawCues[index + 1];
    return next && Number.isFinite(next.startMs) && next.startMs > startMs
      ? Math.round(next.startMs)
      : startMs + this.options.defaultDurationMs;
  }
}
