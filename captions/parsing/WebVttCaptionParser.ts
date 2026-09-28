import { CaptionError } from '../domain/CaptionError';
import type { RawCaptionCue } from '../domain/CaptionCue';
import type { CaptionParser } from './CaptionParser';

const TIMING_PATTERN = /^(?<start>\S+)\s+-->\s+(?<end>\S+)/;

export class WebVttCaptionParser implements CaptionParser {
  readonly format = 'webvtt' as const;

  parse(input: string, signal?: AbortSignal): readonly RawCaptionCue[] {
    signal?.throwIfAborted();
    const blocks = input
      .replace(/^\uFEFF/, '')
      .replace(/\r\n?/g, '\n')
      .split(/\n{2,}/);
    const cues: RawCaptionCue[] = [];
    for (const block of blocks) {
      signal?.throwIfAborted();
      const lines = block.split('\n').map((line) => line.trimEnd());
      const timingIndex = lines.findIndex((line) => line.includes('-->'));
      if (timingIndex < 0) continue;
      const first = lines[0]?.trim() ?? '';
      if (
        first === 'WEBVTT' ||
        first.startsWith('NOTE') ||
        first.startsWith('STYLE') ||
        first.startsWith('REGION')
      ) continue;
      const match = TIMING_PATTERN.exec(lines[timingIndex]);
      if (!match?.groups) continue;
      const startMs = this.parseTimestamp(match.groups.start);
      const endMs = this.parseTimestamp(match.groups.end);
      const text = lines.slice(timingIndex + 1).join('\n').trim();
      if (startMs === null || endMs === null || !text) continue;
      cues.push({ startMs, endMs, text });
    }
    if (cues.length === 0) {
      throw new CaptionError({
        code: 'CAPTION_PARSE_FAILED',
        message: 'The WebVTT response contains no usable cues.',
      });
    }
    return cues;
  }

  private parseTimestamp(value: string): number | null {
    const parts = value.trim().split(/\s/)[0].split(':');
    if (parts.length !== 2 && parts.length !== 3) return null;
    const seconds = Number(parts[parts.length - 1].replace(',', '.'));
    const minutes = Number(parts[parts.length - 2]);
    const hours = parts.length === 3 ? Number(parts[0]) : 0;
    if (
      !Number.isFinite(hours) ||
      !Number.isFinite(minutes) ||
      !Number.isFinite(seconds) ||
      minutes < 0 ||
      minutes >= 60 ||
      seconds < 0 ||
      seconds >= 60
    ) return null;
    return Math.round((hours * 3600 + minutes * 60 + seconds) * 1000);
  }
}
