import type { BudgetSeverity } from './PerformanceBudget';
export interface BudgetViolation { readonly metricName: string; readonly observedValue: number; readonly threshold: number; readonly severity: BudgetSeverity; readonly timestamp: number; readonly description: string; }
