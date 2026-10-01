import { describe, expect, it } from 'vitest';
import { SessionStore } from '../../app/SessionStore';
import { createInitialState } from '../../app/createInitialState';

describe('navigation activation reset', () => {
  it('never carries activation into the next video', () => {
    const store = new SessionStore(createInitialState({}));
    store.update({ activation: { requested: true, source: 'popup', requestedAt: 1 } });
    store.resetForVideo({ videoId: 'video-b', message: 'idle' });
    expect(store.getSnapshot().activation).toEqual({ requested: false, source: null, requestedAt: null });
    expect(store.getSnapshot().status).toBe('idle');
  });
});
