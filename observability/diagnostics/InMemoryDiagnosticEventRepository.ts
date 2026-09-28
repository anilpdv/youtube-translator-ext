import type { LogEvent } from '../domain/LogEvent';
import type { DiagnosticEventRepository } from './DiagnosticEventRepository';
export class InMemoryDiagnosticEventRepository implements DiagnosticEventRepository {
  constructor(private readonly maximumEvents = 2000, private readonly events: LogEvent[] = []) {}
  async append(event: LogEvent): Promise<void> { this.events.push(event); while (this.events.length > this.maximumEvents) this.events.shift(); }
  async listRecent(limit: number): Promise<readonly LogEvent[]> { return this.events.slice(-Math.max(0, limit)).reverse(); }
  async deleteOlderThan(timestamp: number): Promise<number> {
    const before = this.events.length;
    const retained = this.events.filter((event) => event.timestamp >= timestamp);
    this.events.splice(0, this.events.length, ...retained);
    return before - retained.length;
  }
  async trimToLimit(maximumEvents: number): Promise<number> {
    const removed = Math.max(0, this.events.length - maximumEvents);
    if (removed) this.events.splice(0, removed);
    return removed;
  }
  async clear(): Promise<void> { this.events.length = 0; }
}
