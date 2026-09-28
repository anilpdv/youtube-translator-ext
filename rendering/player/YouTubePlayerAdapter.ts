import { DisposableStack } from '../../runtime/DisposableStack';
import type { LocatedPlayer } from './PlayerLocator';
import type { PlayerAdapter } from './PlayerAdapter';
import type { PlaybackSnapshot } from './PlayerEvents';

export class YouTubePlayerAdapter implements PlayerAdapter {
  private readonly resources = new DisposableStack();
  private readonly listeners = new Set<(snapshot: PlaybackSnapshot) => void>();
  private pendingFrame: number | null = null;

  constructor(private readonly located: LocatedPlayer) {
    this.attachListeners();
  }

  getVideoElement(): HTMLVideoElement {
    return this.located.videoElement;
  }

  getOverlayContainer(): HTMLElement {
    return this.located.overlayContainer;
  }

  getSnapshot(): PlaybackSnapshot {
    const video = this.located.videoElement;
    return {
      currentTimeMs: Math.max(0, Math.round(video.currentTime * 1_000)),
      durationMs: Number.isFinite(video.duration) ? Math.round(video.duration * 1_000) : 0,
      paused: video.paused,
      playbackRate: video.playbackRate,
      fullscreen: document.fullscreenElement !== null,
    };
  }

  subscribe(listener: (snapshot: PlaybackSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  isConnected(): boolean {
    return this.located.playerElement.isConnected && this.located.videoElement.isConnected;
  }

  async dispose(): Promise<void> {
    if (this.pendingFrame !== null) cancelAnimationFrame(this.pendingFrame);
    this.pendingFrame = null;
    this.listeners.clear();
    await this.resources.dispose();
  }

  private attachListeners(): void {
    for (const eventName of [
      'play',
      'pause',
      'seeking',
      'seeked',
      'ratechange',
      'loadedmetadata',
      'durationchange',
      'emptied',
    ]) {
      this.resources.addEventListener(this.located.videoElement, eventName, this.scheduleEmit);
    }
    this.resources.addEventListener(document, 'fullscreenchange', this.scheduleEmit);
  }

  private readonly scheduleEmit = (): void => {
    if (this.pendingFrame !== null) return;
    this.pendingFrame = requestAnimationFrame(() => {
      this.pendingFrame = null;
      const snapshot = this.getSnapshot();
      for (const listener of this.listeners) listener(snapshot);
    });
  };
}
