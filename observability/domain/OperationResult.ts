export type OperationOutcome = 'success' | 'partial' | 'cancelled' | 'failed';
export interface OperationResult {
  readonly outcome: OperationOutcome;
  readonly durationMs: number;
  readonly errorCode?: string;
  readonly warningCount?: number;
}
