import type { SessionTrace } from './SessionTrace';
export class TraceManager {
  private readonly traces = new Map<string, SessionTrace>();
  register(sessionId: string, trace: SessionTrace): void { this.traces.set(sessionId, trace); }
  get(sessionId: string): SessionTrace | null { return this.traces.get(sessionId) ?? null; }
  complete(sessionId: string): void { this.traces.delete(sessionId); }
  get activeCount(): number { return this.traces.size; }
}
