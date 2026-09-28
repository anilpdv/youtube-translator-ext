import type { LogEvent } from '../domain/LogEvent';
export interface LogSink { write(event: LogEvent): void | Promise<void>; }
