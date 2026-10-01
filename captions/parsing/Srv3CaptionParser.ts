import { CaptionError } from '../domain/CaptionError';
import type { RawCaptionCue } from '../domain/CaptionCue';
import type { CaptionParser } from './CaptionParser';

/** Parses YouTube's XML timed-text (srv3) response. */
export class Srv3CaptionParser implements CaptionParser {
  readonly format = 'srv3' as const;

  parse(input: string, signal?: AbortSignal): readonly RawCaptionCue[] {
    signal?.throwIfAborted();
    const document = new DOMParser().parseFromString(input, 'text/xml');
    if (document.querySelector('parsererror')) {
      throw new CaptionError({
        code: 'CAPTION_PARSE_FAILED',
        message: 'The srv3 caption response is not valid XML.',
      });
    }
    const nodes = [
      ...Array.from(document.getElementsByTagName('p')),
      ...Array.from(document.getElementsByTagName('text')),
    ];
    const cues: RawCaptionCue[] = [];
    for (const node of nodes) {
      signal?.throwIfAborted();
      const start = this.numberAttribute(node, ['t', 'start']);
      if (start === null) continue;
      const duration = this.numberAttribute(node, ['d', 'dur']);
      const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (!text) continue;
      const startMs = node.tagName === 'p' ? start : Math.round(start * 1000);
      const durationMs = node.tagName === 'p'
        ? duration
        : duration === null ? null : Math.round(duration * 1000);
      cues.push({
        startMs,
        durationMs,
        endMs: durationMs === null ? null : startMs + durationMs,
        text,
      });
    }
    if (cues.length === 0) {
      throw new CaptionError({
        code: 'CAPTION_PARSE_FAILED',
        message: 'The srv3 response contains no usable caption cues.',
      });
    }
    return cues;
  }

  private numberAttribute(
    node: Element,
    names: readonly string[],
  ): number | null {
    for (const name of names) {
      const value = node.getAttribute(name);
      if (value === null || value.trim() === '') continue;
      const number = Number(value);
      if (Number.isFinite(number)) return number;
    }
    return null;
  }
}
