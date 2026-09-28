export interface LongTaskSample { readonly startedAt: number; readonly durationMs: number; }
export class LongTaskObserver {
  private observer: PerformanceObserver | null = null;
  constructor(private readonly onLongTask: (sample: LongTaskSample) => void) {}
  start(): void {
    if (typeof PerformanceObserver === 'undefined' || !PerformanceObserver.supportedEntryTypes?.includes('longtask')) return;
    this.observer = new PerformanceObserver((list) => list.getEntries().forEach((entry) => this.onLongTask({ startedAt: entry.startTime, durationMs: entry.duration })));
    this.observer.observe({ entryTypes: ['longtask'] });
  }
  dispose(): void { this.observer?.disconnect(); this.observer = null; }
}
