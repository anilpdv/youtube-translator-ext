export interface CompletedOperation { readonly operationName: string; readonly startedAt: number; readonly completedAt: number; readonly durationMs: number; }
export class OperationTimer {
  private readonly startedAt = performance.now();
  constructor(readonly operationName: string) {}
  complete(): CompletedOperation { const completedAt = performance.now(); return { operationName: this.operationName, startedAt: this.startedAt, completedAt, durationMs: completedAt - this.startedAt }; }
}
