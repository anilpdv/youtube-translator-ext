import type { LogLevel } from './LogLevel';
import type { TraceContext } from './TraceContext';

export interface LogEvent {
  readonly eventName: string;
  readonly level: LogLevel;
  readonly timestamp: number;
  readonly trace: TraceContext | null;
  readonly context: Readonly<Record<string, unknown>>;
}
