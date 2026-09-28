import type { LogLevel } from '../domain/LogLevel';
import type { TraceContext } from '../domain/TraceContext';
import type { Logger } from './Logger';
import type { LogSink } from './LogSink';
import { redactObject } from '../../security/redaction/SecretRedactor';

const rank: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export class StructuredLogger implements Logger {
  constructor(private readonly sinks: readonly LogSink[], private readonly minimumLevel: LogLevel = 'info') {}
  debug(name: string, context = {}, trace?: TraceContext): void { this.write('debug', name, context, trace); }
  info(name: string, context = {}, trace?: TraceContext): void { this.write('info', name, context, trace); }
  warn(name: string, context = {}, trace?: TraceContext): void { this.write('warn', name, context, trace); }
  error(name: string, context = {}, trace?: TraceContext): void { this.write('error', name, context, trace); }
  private write(level: LogLevel, eventName: string, context: Record<string, unknown>, trace?: TraceContext): void {
    if (rank[level] < rank[this.minimumLevel]) return;
    const event = { eventName, level, timestamp: Date.now(), trace: trace ?? null, context: redactObject(context) as Record<string, unknown> };
    for (const sink of this.sinks) {
      try { void sink.write(event); } catch { /* logging cannot break application work */ }
    }
  }
}
