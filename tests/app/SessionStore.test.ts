import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../app/createInitialState';
import { ApplicationError } from '../../app/ApplicationError';
import { SessionStore } from '../../app/SessionStore';

describe('SessionStore', () => {
  it('notifies subscribers and merges nested progress', () => {
    const store = new SessionStore(createInitialState({ subtitlesEnabled: true }));
    const statuses: string[] = [];
    const unsubscribe = store.subscribe((state) => statuses.push(state.status));

    store.transition('discovering-captions', {
      progress: { totalCues: 4 },
    });
    unsubscribe();
    store.transition('captions-ready', {
      progress: { completedCues: 2 },
    });

    expect(store.getSnapshot().progress).toMatchObject({
      totalCues: 4,
      completedCues: 2,
    });
    expect(statuses).toEqual(['idle', 'discovering-captions']);
  });

  it('rejects invalid transitions', () => {
    const store = new SessionStore(createInitialState({ subtitlesEnabled: true }));

    expect(() => store.transition('completed')).toThrow(ApplicationError);
  });

  it('resets to a clean state', () => {
    const store = new SessionStore(createInitialState({ subtitlesEnabled: true }));
    store.transition('discovering-captions');
    store.reset(createInitialState({ subtitlesEnabled: false }));

    expect(store.getSnapshot().status).toBe('idle');
    expect(store.getSnapshot().subtitlesEnabled).toBe(false);
  });
});
