import type { Disposable, DisposeFunction } from './Disposable';

export class DisposableStack implements Disposable {
  private readonly disposables: DisposeFunction[] = [];
  private disposed = false;

  get isDisposed(): boolean {
    return this.disposed;
  }

  add<T extends Disposable>(disposable: T): T {
    this.use(() => disposable.dispose());
    return disposable;
  }

  use(dispose: DisposeFunction): DisposeFunction {
    if (this.disposed) {
      void dispose();
      return dispose;
    }
    this.disposables.push(dispose);
    return dispose;
  }

  addEventListener(
    target: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions | boolean,
  ): void {
    target.addEventListener(type, listener, options);
    this.use(() => target.removeEventListener(type, listener, options));
  }

  addTimeout(callback: () => void, delayMs: number): ReturnType<typeof setTimeout> {
    const timeoutId = setTimeout(callback, delayMs);
    this.use(() => clearTimeout(timeoutId));
    return timeoutId;
  }

  addInterval(callback: () => void, delayMs: number): ReturnType<typeof setInterval> {
    const intervalId = setInterval(callback, delayMs);
    this.use(() => clearInterval(intervalId));
    return intervalId;
  }

  addObserver(observer: MutationObserver): MutationObserver {
    this.use(() => observer.disconnect());
    return observer;
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;

    for (const dispose of [...this.disposables].reverse()) {
      try {
        await dispose();
      } catch (error) {
        console.warn('[AI Subtitles] Resource cleanup failed.', error);
      }
    }
    this.disposables.length = 0;
  }
}
