export interface TraceContext {
  readonly traceId: string;
  readonly sessionIdHash: string | null;
  readonly videoIdHash: string | null;
  readonly operationId?: string;
  readonly parentOperationId?: string;
}
