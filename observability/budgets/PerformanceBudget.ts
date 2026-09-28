export type BudgetSeverity = 'warning' | 'critical';
export interface PerformanceBudget { readonly metricName: string; readonly threshold: number; readonly comparison: 'maximum' | 'minimum'; readonly severity: BudgetSeverity; readonly description: string; }
