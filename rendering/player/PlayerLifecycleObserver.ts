import { DisposableStack } from '../../runtime/DisposableStack';
import type { LocatedPlayer, PlayerLocator } from './PlayerLocator';

export interface PlayerLifecycleCallbacks {
  readonly onPlayerAvailable: (player: LocatedPlayer) => void;
  readonly onPlayerRemoved: () => void;
}

export class PlayerLifecycleObserver {
  private readonly resources = new DisposableStack();
  private currentVideo: HTMLVideoElement | null = null;
  private pendingFrame: number | null = null;

  constructor(
    private readonly locator: PlayerLocator,
    private readonly callbacks: PlayerLifecycleCallbacks,
  ) {}

  start(): void {
    const observer = new MutationObserver(this.scheduleCheck);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    this.resources.addObserver(observer);
    this.check();
  }

  async dispose(): Promise<void> {
    if (this.pendingFrame !== null) cancelAnimationFrame(this.pendingFrame);
    this.pendingFrame = null;
    this.currentVideo = null;
    await this.resources.dispose();
  }

  private readonly scheduleCheck = (): void => {
    if (this.pendingFrame !== null) return;
    this.pendingFrame = requestAnimationFrame(() => {
      this.pendingFrame = null;
      this.check();
    });
  };

  private check(): void {
    try {
      const located = this.locator.locate();
      if (located.videoElement === this.currentVideo) return;
      if (this.currentVideo) this.callbacks.onPlayerRemoved();
      this.currentVideo = located.videoElement;
      this.callbacks.onPlayerAvailable(located);
    } catch {
      if (!this.currentVideo) return;
      this.currentVideo = null;
      this.callbacks.onPlayerRemoved();
    }
  }
}
