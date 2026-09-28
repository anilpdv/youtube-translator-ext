import type { PerformanceBudget } from './PerformanceBudget';
import type { BudgetViolation } from './BudgetViolation';
export class PerformanceBudgetMonitor {
  constructor(private readonly budgets: readonly PerformanceBudget[]) {}
  evaluate(metricName: string, value: number): BudgetViolation | null {
    const budget = this.budgets.find((candidate) => candidate.metricName === metricName);
    if (!budget) return null;
    const violated = budget.comparison === 'maximum' ? value > budget.threshold : value < budget.threshold;
    return violated ? { metricName, observedValue: value, threshold: budget.threshold, severity: budget.severity, timestamp: Date.now(), description: budget.description } : null;
  }
}
