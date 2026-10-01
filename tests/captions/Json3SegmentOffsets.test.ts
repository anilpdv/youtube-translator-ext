import { describe, expect, it } from 'vitest';
import { Json3CaptionParser } from '../../captions/parsing/Json3CaptionParser';
import { CaptionNormalizer } from '../../captions/normalization/CaptionNormalizer';
import { DEFAULT_CAPTION_LIMITS } from '../../captions/domain/CaptionLimits';
describe('JSON3 segment offsets', () => {
  it('preserves exact offsets as absolute timing units', () => {
    const raw = new Json3CaptionParser().parse(JSON.stringify({ events: [{ tStartMs: 1000, dDurationMs: 3000, segs: [{ utf8: 'Hello ', tOffsetMs: 0 }, { utf8: 'world', tOffsetMs: 1200 }] }] }));
    const cues = new CaptionNormalizer({ decode: (text) => text }, { limits: DEFAULT_CAPTION_LIMITS, defaultDurationMs: 1000, minimumDurationMs: 1 }).normalize(raw);
    expect(cues[0].timingUnits).toEqual([{ id: 'cue-1000-0:unit:0', startMs: 1000, endMs: 2200, text: 'Hello' }, { id: 'cue-1000-0:unit:1', startMs: 2200, endMs: 4000, text: 'world' }]);
  });
});
