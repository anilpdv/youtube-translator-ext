import type { PlayerAdapter } from '../../rendering/player/PlayerAdapter';
import type { PlaybackSnapshot } from '../../rendering/player/PlayerEvents';

export class FakePlayerAdapter implements PlayerAdapter {
  private time = 0;
  private paused = false;
  private readonly listeners = new Set<(snapshot: PlaybackSnapshot) => void>();
  private readonly video = document.createElement('video');
  private readonly overlay = document.createElement('div');
  getVideoElement(): HTMLVideoElement { return this.video; }
  getOverlayContainer(): HTMLElement { return this.overlay; }
  getSnapshot(): PlaybackSnapshot {
    return { currentTimeMs: this.time, durationMs: 0, paused: this.paused, playbackRate: 1, fullscreen: false };
  }
  subscribe(listener: (snapshot: PlaybackSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  isConnected(): boolean { return true; }
  dispose(): void { this.listeners.clear(); }
  setTime(time: number): void { this.time = time; this.emit(); }
  setPaused(paused: boolean): void { this.paused = paused; this.emit(); }
  private emit(): void { this.listeners.forEach((listener) => listener(this.getSnapshot())); }
}
