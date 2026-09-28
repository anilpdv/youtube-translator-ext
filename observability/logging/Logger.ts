import type { TraceContext } from '../domain/TraceContext';
export interface Logger {
  debug(eventName: string, context?: Record<string, unknown>, trace?: TraceContext): void;
  info(eventName: string, context?: Record<string, unknown>, trace?: TraceContext): void;
  warn(eventName: string, context?: Record<string, unknown>, trace?: TraceContext): void;
  error(eventName: string, context?: Record<string, unknown>, trace?: TraceContext): void;
}
