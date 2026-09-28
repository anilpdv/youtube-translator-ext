export class ConcurrencyLimiter {
  private activeCount = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly limit: number) {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new Error('Concurrency limit must be a positive integer.');
    }
  }

  async run<T>(
    operation: () => Promise<T>,
    signal?: AbortSignal,
  ): Promise<T> {
    await this.acquire(signal);
    try {
      signal?.throwIfAborted();
      return await operation();
    } finally {
      this.release();
    }
  }

  private acquire(signal?: AbortSignal): Promise<void> {
    signal?.throwIfAborted();
    if (this.activeCount < this.limit) {
      this.activeCount += 1;
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const resume = (): void => {
        signal?.removeEventListener('abort', handleAbort);
        this.activeCount += 1;
        resolve();
      };
      const handleAbort = (): void => {
        const index = this.queue.indexOf(resume);
        if (index >= 0) this.queue.splice(index, 1);
        reject(new DOMException('Operation cancelled.', 'AbortError'));
      };
      this.queue.push(resume);
      signal?.addEventListener('abort', handleAbort, { once: true });
    });
  }

  private release(): void {
    this.activeCount -= 1;
    this.queue.shift()?.();
  }
}
