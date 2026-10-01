import { describe, expect, it } from 'vitest';
import { SubtitleDisplayPlanner } from '../../rendering/planning/SubtitleDisplayPlanner';
import { DEFAULT_SUBTITLE_DISPLAY_PLANNER_OPTIONS } from '../../rendering/planning/SubtitleDisplayPlannerOptions';
describe('SubtitleDisplayPlanner', () => {
  it('splits a long cue into deterministic nonoverlapping windows', () => {
    const planner = new SubtitleDisplayPlanner({ ...DEFAULT_SUBTITLE_DISPLAY_PLANNER_OPTIONS, maxWordsPerSlice: 3 });
    const slices = planner.plan({ sourceCue: { id: 'cue', startMs: 0, endMs: 6000, text: 'one two three four five six seven eight nine', timingUnits: [], sourceBehavior: 'static' }, translatedCues: [], sourceLanguage: 'en', targetLanguage: 'fr' });
    expect(slices.length).toBeGreaterThan(1); expect(slices[0].startMs).toBe(0); expect(slices.at(-1)?.endMs).toBe(6000);
    expect(slices.every((slice, index) => index === 0 || slice.startMs >= slices[index - 1].endMs)).toBe(true);
    expect(slices.every((slice) => slice.endMs - slice.startMs >= 900)).toBe(true);
  });
});
