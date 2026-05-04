import { describe, it, expect } from 'vitest';
import { findActiveCue, RunGuard } from '../../utils/subtitleRuntime';
import type { TranslatedSegment } from '../../utils/types';

describe('subtitleRuntime - findActiveCue', () => {
  const track: TranslatedSegment[] = [
    { start: 1.0, dur: 2.0, text: 'Hello', translatedText: 'Bonjour' },
    { start: 3.5, dur: 2.5, text: 'World', translatedText: 'Monde' },
    { start: 7.0, dur: 3.0, text: 'Test cue', translatedText: 'Indice de test' },
  ];

  it('returns -1 for empty track', () => {
    expect(findActiveCue([], 1.5)).toBe(-1);
  });

  it('finds exact active cue by timestamp', () => {
    expect(findActiveCue(track, 1.5)).toBe(0);
    expect(findActiveCue(track, 4.0)).toBe(1);
    expect(findActiveCue(track, 8.0)).toBe(2);
  });

  it('respects 0.12s lookahead window', () => {
    // 0.90s is within 1.0 - 0.12 = 0.88s tolerance
    expect(findActiveCue(track, 0.90)).toBe(0);
    expect(findActiveCue(track, 0.80)).toBe(-1);
  });

  it('returns -1 for gaps between cues', () => {
    expect(findActiveCue(track, 3.1)).toBe(-1);
    expect(findActiveCue(track, 6.5)).toBe(-1);
  });

  it('uses lastIndex fast path when consecutive time updates hit same cue', () => {
    expect(findActiveCue(track, 1.8, 0)).toBe(0);
    expect(findActiveCue(track, 2.2, 0)).toBe(0);
  });

  it('applies live sync offset without mutating underlying track data', () => {
    // Cue 0 is 1.0 - 3.0.
    // If sync offset is -500ms (-0.5s), effective time for video at 0.6s is 0.6 - (-0.5) = 1.1s -> matches Cue 0!
    expect(findActiveCue(track, 0.6, -1, -500)).toBe(0);

    // If sync offset is +500ms (+0.5s), effective time for video at 1.2s is 1.2 - 0.5 = 0.7s -> does not match Cue 0 yet!
    expect(findActiveCue(track, 1.2, -1, 500)).toBe(-1);
    // At video time 1.6s with +500ms offset -> effective time 1.1s -> matches Cue 0!
    expect(findActiveCue(track, 1.6, -1, 500)).toBe(0);

    // Verify underlying track was not modified
    expect(track[0].start).toBe(1.0);
    expect(track[0].dur).toBe(2.0);
  });
});

describe('subtitleRuntime - RunGuard', () => {
  it('generates sequential run IDs and validates only latest ID', () => {
    const guard = new RunGuard();
    const run1 = guard.next();
    expect(run1.id).toBe(1);
    expect(run1.signal.aborted).toBe(false);
    expect(guard.valid(run1.id)).toBe(true);

    const run2 = guard.next();
    expect(run2.id).toBe(2);
    expect(run1.signal.aborted).toBe(true);
    expect(run2.signal.aborted).toBe(false);
    expect(guard.valid(run1.id)).toBe(false);
    expect(guard.valid(run2.id)).toBe(true);
  });

  it('cancels active run ID and aborts signal on cancel()', () => {
    const guard = new RunGuard();
    const run = guard.next();
    expect(guard.valid(run.id)).toBe(true);
    expect(run.signal.aborted).toBe(false);

    guard.cancel();
    expect(guard.valid(run.id)).toBe(false);
    expect(run.signal.aborted).toBe(true);
  });
});
