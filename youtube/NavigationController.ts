import type { Disposable } from '../runtime/Disposable';
import { DisposableStack } from '../runtime/DisposableStack';
import { getYouTubeVideoId } from './getYouTubeVideoId';

export interface NavigationChange {
  previousVideoId: string | null;
  videoId: string | null;
  url: string;
}

export interface NavigationCallbacks {
  onNavigationStart(): void;
  onVideoChanged(change: NavigationChange): void;
}

export class NavigationController implements Disposable {
  private readonly resources = new DisposableStack();
  private currentVideoId: string | null;
  private started = false;

  constructor(
    private readonly callbacks: NavigationCallbacks,
    private readonly getCurrentUrl: () => string = () => window.location.href,
  ) {
    this.currentVideoId = getYouTubeVideoId(this.getCurrentUrl());
  }

  start(): void {
    if (this.started) return;
    this.started = true;

    this.resources.addEventListener(
      document,
      'yt-navigate-start',
      this.handleNavigationStart,
    );
    this.resources.addEventListener(
      document,
      'yt-navigate-finish',
      this.handleNavigationFinish,
    );
    this.resources.addEventListener(
      window,
      'popstate',
      this.handleNavigationFinish,
    );
  }

  getCurrentVideoId(): string | null {
    return this.currentVideoId;
  }

  async dispose(): Promise<void> {
    await this.resources.dispose();
    this.started = false;
  }

  private readonly handleNavigationStart = (): void => {
    this.callbacks.onNavigationStart();
  };

  private readonly handleNavigationFinish = (): void => {
    queueMicrotask(() => this.emitIfChanged());
  };

  private emitIfChanged(): void {
    const nextVideoId = getYouTubeVideoId(this.getCurrentUrl());
    if (nextVideoId === this.currentVideoId) return;

    const previousVideoId = this.currentVideoId;
    this.currentVideoId = nextVideoId;
    this.callbacks.onVideoChanged({
      previousVideoId,
      videoId: nextVideoId,
      url: this.getCurrentUrl(),
    });
  }
}
