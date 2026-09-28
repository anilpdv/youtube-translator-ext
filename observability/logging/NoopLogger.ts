import type { TraceContext } from '../domain/TraceContext';
import type { Logger } from './Logger';
export class NoopLogger implements Logger {
  debug(_eventName: string, _context?: Record<string, unknown>, _trace?: TraceContext): void {}
  info(_eventName: string, _context?: Record<string, unknown>, _trace?: TraceContext): void {}
  warn(_eventName: string, _context?: Record<string, unknown>, _trace?: TraceContext): void {}
  error(_eventName: string, _context?: Record<string, unknown>, _trace?: TraceContext): void {}
}
