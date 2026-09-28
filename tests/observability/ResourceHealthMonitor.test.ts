import { describe, expect, it } from 'vitest';
import { ResourceHealthMonitor } from '../../observability/resources/ResourceHealthMonitor';
describe('ResourceHealthMonitor', () => {
  it('detects duplicate overlays and cache backlog', () => {
    const issues = new ResourceHealthMonitor().evaluate({
      capturedAt: 0, activeSessions: 1, activeListeners: 0, activeObservers: 0, activeTimers: 0,
      activeAnimationFrames: 0, activeReactRoots: 0, activeOverlays: 2, activeSchedulers: 1,
      activePlayerAdapters: 1, activeProviderRequests: 0, pendingCacheWrites: 21,
    });
    expect(issues.map((issue) => issue.code)).toEqual(['DUPLICATE_OVERLAY', 'CACHE_WRITE_BACKLOG']);
  });
});
