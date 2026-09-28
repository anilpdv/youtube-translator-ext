import type { LogEvent } from '../domain/LogEvent';
import type { MetricsSnapshot } from '../metrics/MetricsSnapshot';
import type { ResourceSnapshot } from '../resources/ResourceSnapshot';
import type { BudgetViolation } from '../budgets/BudgetViolation';
export interface DiagnosticBundle {
  readonly schemaVersion: 1;
  readonly generatedAt: number;
  readonly extension: { readonly version: string; readonly buildChannel: 'development' | 'beta' | 'stable' };
  readonly environment: { readonly browser: string; readonly browserVersion: string | null; readonly platform: string; readonly locale: string };
  readonly application: { readonly health: string; readonly sessionStatus: string; readonly featureFlags: Readonly<Record<string, boolean>> };
  readonly caption: Readonly<Record<string, unknown>>;
  readonly translation: Readonly<Record<string, unknown>>;
  readonly rendering: Readonly<Record<string, unknown>>;
  readonly cache: Readonly<Record<string, unknown>>;
  readonly resources: ResourceSnapshot;
  readonly metrics: MetricsSnapshot;
  readonly budgetViolations: readonly BudgetViolation[];
  readonly recentEvents: readonly LogEvent[];
}
