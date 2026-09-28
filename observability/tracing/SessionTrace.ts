import type { TraceContext } from '../domain/TraceContext';
export interface SessionTrace { readonly traceId: string; readonly sessionIdHash: string; readonly videoIdHash: string; readonly startedAt: number; readonly context: TraceContext; }
