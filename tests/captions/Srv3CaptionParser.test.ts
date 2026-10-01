import { describe, expect, it } from 'vitest';
import { Srv3CaptionParser } from '../../captions/parsing/Srv3CaptionParser';

describe('Srv3CaptionParser', () => {
  it('parses seconds-based text elements', () => {
    const cues = new Srv3CaptionParser().parse(
      '<transcript><text start="1.25" dur="2.5">Hello &amp; world</text></transcript>',
    );
    expect(cues).toEqual([
      { startMs: 1250, durationMs: 2500, endMs: 3750, text: 'Hello & world' },
    ]);
  });

  it('parses millisecond p elements', () => {
    const cues = new Srv3CaptionParser().parse(
      '<timedtext><p t="1000" d="1500">Hello</p></timedtext>',
    );
    expect(cues).toEqual([
      { startMs: 1000, durationMs: 1500, endMs: 2500, text: 'Hello' },
    ]);
  });
});
