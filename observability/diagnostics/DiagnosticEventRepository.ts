import type { LogEvent } from '../domain/LogEvent';
export interface DiagnosticEventRepository {
  append(event: LogEvent): Promise<void>;
  listRecent(limit: number): Promise<readonly LogEvent[]>;
  deleteOlderThan(timestamp: number): Promise<number>;
  trimToLimit(maximumEvents: number): Promise<number>;
  clear(): Promise<void>;
}
