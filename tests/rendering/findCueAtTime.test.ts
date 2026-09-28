import { describe, expect, it } from 'vitest';
import { findCueAtTime } from '../../rendering/scheduling/findCueAtTime';
import type { SubtitleRenderCue } from '../../rendering/domain/SubtitleRenderCue';

const cue = (id: string, startMs: number, endMs: number): SubtitleRenderCue => ({
  id,
  startMs,
  endMs,
  originalText: id,
  translatedText: id,
  sourceLanguage: 'en',
  targetLanguage: 'fr',
});

describe('findCueAtTime', () => {
  const cues = [cue('one', 1_000, 2_000), cue('two', 2_500, 4_000)];

  it('uses an exclusive cue end and handles gaps', () => {
    expect(findCueAtTime(cues, 999)).toBe(-1);
    expect(findCueAtTime(cues, 1_000)).toBe(0);
    expect(findCueAtTime(cues, 1_999)).toBe(0);
    expect(findCueAtTime(cues, 2_000)).toBe(-1);
    expect(findCueAtTime(cues, 2_400)).toBe(-1);
    expect(findCueAtTime(cues, 2_500)).toBe(1);
  });

  it('prefers the latest overlapping cue', () => {
    expect(findCueAtTime([cue('one', 0, 3_000), cue('two', 1_000, 2_000)], 1_500)).toBe(1);
  });
});
