export interface ResourceSnapshot {
  readonly capturedAt: number; readonly activeSessions: number; readonly activeListeners: number; readonly activeObservers: number;
  readonly activeTimers: number; readonly activeAnimationFrames: number; readonly activeReactRoots: number; readonly activeOverlays: number;
  readonly activeSchedulers: number; readonly activePlayerAdapters: number; readonly activeProviderRequests: number; readonly pendingCacheWrites: number;
}
