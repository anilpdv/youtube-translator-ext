import { describe, expect, it } from 'vitest';
import { PerformanceBudgetMonitor } from '../../observability/budgets/PerformanceBudgetMonitor';
describe('PerformanceBudgetMonitor', () => {
  it('reports only configured budget violations', () => {
    const monitor = new PerformanceBudgetMonitor([{ metricName: 'stage', threshold: 10, comparison: 'maximum', severity: 'warning', description: 'slow' }]);
    expect(monitor.evaluate('stage', 11)?.severity).toBe('warning');
    expect(monitor.evaluate('stage', 9)).toBeNull();
  });
});
