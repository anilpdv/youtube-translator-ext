import { describe, expect, it } from 'vitest';
import { LocalMetricsRecorder } from '../../observability/metrics/LocalMetricsRecorder';
describe('LocalMetricsRecorder', () => {
  it('bounds histogram samples and calculates summaries', () => {
    const metrics = new LocalMetricsRecorder(2);
    metrics.recordHistogram('stage', 1);
    metrics.recordHistogram('stage', 3);
    metrics.recordHistogram('stage', 5);
    const snapshot = metrics.snapshot();
    expect(snapshot.histograms.stage.count).toBe(2);
    expect(snapshot.histograms.stage.minimum).toBe(3);
    expect(snapshot.histograms.stage.maximum).toBe(5);
  });
});
