import type { MetricsRecorder } from './MetricsRecorder';
import type { MetricsSnapshot, HistogramSummary } from './MetricsSnapshot';
export class LocalMetricsRecorder implements MetricsRecorder {
  private readonly counters = new Map<string, number>();
  private readonly gauges = new Map<string, number>();
  private readonly histograms = new Map<string, number[]>();
  constructor(private readonly maximumSamplesPerHistogram = 500) {}
  increment(name: string, value = 1, labels = {}): void { const key = this.key(name, labels); this.counters.set(key, (this.counters.get(key) ?? 0) + value); }
  setGauge(name: string, value: number, labels = {}): void { this.gauges.set(this.key(name, labels), value); }
  recordHistogram(name: string, value: number, labels = {}): void { const values = this.histograms.get(this.key(name, labels)) ?? []; values.push(value); if (values.length > this.maximumSamplesPerHistogram) values.splice(0, values.length - this.maximumSamplesPerHistogram); this.histograms.set(this.key(name, labels), values); }
  snapshot(): MetricsSnapshot {
    const histograms: Record<string, HistogramSummary> = {};
    for (const [key, values] of this.histograms) { const sorted = [...values].sort((a, b) => a - b); const at = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0; histograms[key] = { count: values.length, minimum: sorted[0] ?? 0, maximum: sorted.at(-1) ?? 0, average: values.reduce((a, b) => a + b, 0) / (values.length || 1), p50: at(.5), p95: at(.95), p99: at(.99) }; }
    return { generatedAt: Date.now(), counters: Object.fromEntries(this.counters), gauges: Object.fromEntries(this.gauges), histograms };
  }
  clear(): void { this.counters.clear(); this.gauges.clear(); this.histograms.clear(); }
  private key(name: string, labels: Record<string, string>): string { const suffix = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join(','); return suffix ? `${name}{${suffix}}` : name; }
}
