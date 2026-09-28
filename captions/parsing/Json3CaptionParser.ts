import { CaptionError } from '../domain/CaptionError';
import type { RawCaptionCue } from '../domain/CaptionCue';
import type { CaptionParser } from './CaptionParser';

export class Json3CaptionParser implements CaptionParser {
  readonly format = 'json3' as const;

  parse(input: string, signal?: AbortSignal): readonly RawCaptionCue[] {
    signal?.throwIfAborted();
    let document: { events?: unknown };
    try {
      document = JSON.parse(input) as { events?: unknown };
    } catch (cause) {
      throw new CaptionError({
        code: 'CAPTION_PARSE_FAILED',
        message: 'The JSON3 caption response is not valid JSON.',
        cause,
      });
    }
    if (!Array.isArray(document.events)) {
      throw new CaptionError({
        code: 'CAPTION_PARSE_FAILED',
        message: 'The JSON3 caption response has no events.',
      });
    }
    const cues: RawCaptionCue[] = [];
    for (const value of document.events) {
      signal?.throwIfAborted();
      if (typeof value !== 'object' || value === null) continue;
      const event = value as {
        tStartMs?: unknown;
        dDurationMs?: unknown;
        segs?: unknown;
      };
      const startMs = this.numberValue(event.tStartMs);
      const durationMs = this.numberValue(event.dDurationMs);
      const text = Array.isArray(event.segs)
        ? event.segs
            .map((segment) =>
              typeof segment === 'object' &&
              segment !== null &&
              typeof (segment as { utf8?: unknown }).utf8 === 'string'
                ? (segment as { utf8: string }).utf8
                : '',
            )
            .join('')
        : '';
      if (startMs === null || !text.trim()) continue;
      cues.push({
        startMs,
        durationMs: durationMs ?? undefined,
        text,
      });
    }
    if (cues.length === 0) {
      throw new CaptionError({
        code: 'CAPTION_PARSE_FAILED',
        message: 'The JSON3 response contains no usable caption cues.',
      });
    }
    return cues;
  }

  private numberValue(value: unknown): number | null {
    const number =
      typeof value === 'number' || typeof value === 'string'
        ? Number(value)
        : Number.NaN;
    return Number.isFinite(number) ? number : null;
  }
}
