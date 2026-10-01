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
      const segments = this.readSegments(event.segs);
      const text = segments.map((segment) => segment.text).join('').trim();
      if (startMs === null || !text.trim()) continue;
      cues.push({
        startMs,
        durationMs,
        endMs: durationMs === null ? null : startMs + durationMs,
        text,
        segments,
        sourceBehavior: segments.some((segment) => segment.offsetMs !== null)
          ? 'segmented' : 'static',
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

  private readSegments(value: unknown) {
    if (!Array.isArray(value)) return [];
    return value.map((entry) => {
      const segment = entry as { utf8?: unknown; tOffsetMs?: unknown };
      const text = typeof segment?.utf8 === 'string' ? segment.utf8 : '';
      const rawOffset = segment?.tOffsetMs;
      const offsetMs = typeof rawOffset === 'number' && Number.isFinite(rawOffset)
        ? Math.max(0, Math.round(rawOffset)) : null;
      return { text, offsetMs };
    }).filter((segment) => segment.text.length > 0);
  }

  private numberValue(value: unknown): number | null {
    const number =
      typeof value === 'number' || typeof value === 'string'
        ? Number(value)
        : Number.NaN;
    return Number.isFinite(number) ? number : null;
  }
}
