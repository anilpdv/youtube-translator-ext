import type { LogEvent } from '../domain/LogEvent';
import type { LogSink } from './LogSink';
export class ConsoleLogSink implements LogSink {
  write(event: LogEvent): void {
    const method = event.level === 'error' ? console.error : event.level === 'warn' ? console.warn : event.level === 'debug' ? console.debug : console.info;
    method(`[Subtitle Translator] ${event.eventName}`, { timestamp: event.timestamp, trace: event.trace, context: event.context });
  }
}
