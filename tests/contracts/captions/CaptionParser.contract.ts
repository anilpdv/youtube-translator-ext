import { describe, expect, it } from 'vitest';
import type { CaptionParser } from '../../../captions/parsing/CaptionParser';

export function runCaptionParserContract(name: string, parser: CaptionParser, fixture: string): void {
  describe(`${name} caption parser contract`, () => {
    it('returns finite, ordered cues with text', () => {
      const cues = parser.parse(fixture);
      expect(cues.length).toBeGreaterThan(0);
      for (let index = 0; index < cues.length; index += 1) {
        expect(Number.isFinite(cues[index].startMs)).toBe(true);
        expect(cues[index].text.trim().length).toBeGreaterThan(0);
        if (index > 0) expect(cues[index].startMs).toBeGreaterThanOrEqual(cues[index - 1].startMs);
      }
    });
  });
}
