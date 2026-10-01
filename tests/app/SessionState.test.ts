import { describe, expect, it } from 'vitest';
import { canTransition } from '../../app/SessionState';

describe('SessionState transitions', () => {
  it('allows caption discovery from idle', () => {
    expect(canTransition('idle', 'discovering-captions')).toBe(true);
  });

  it('allows cancellation while translating', () => {
    expect(canTransition('translating', 'cancelled')).toBe(true);
  });

  it('rejects completion directly from idle', () => {
    expect(canTransition('idle', 'completed')).toBe(false);
  });

  it('allows an unchanged status update', () => {
    expect(canTransition('translating', 'translating')).toBe(true);
  });

  it('allows a new explicit workflow after a terminal attempt', () => {
    expect(canTransition('failed', 'idle')).toBe(true);
    expect(canTransition('partially-completed', 'idle')).toBe(true);
    expect(canTransition('completed', 'idle')).toBe(true);
  });
});
