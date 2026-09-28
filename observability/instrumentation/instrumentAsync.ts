import type { Logger } from '../logging/Logger';
import type { MetricsRecorder } from '../metrics/MetricsRecorder';
import type { TraceContext } from '../domain/TraceContext';
export async function instrumentAsync<T>(options: {
  operationName: string; logger: Logger; metrics: MetricsRecorder; trace?: TraceContext;
  startContext?: Record<string, unknown>; completeContext?: (result: T) => Record<string, unknown>;
  errorCode?: (error: unknown) => string;
}, operation: () => Promise<T>): Promise<T> {
  const startedAt = performance.now();
  options.logger.info(`${options.operationName}.started`, options.startContext, options.trace);
  try {
    const result = await operation();
    const durationMs = performance.now() - startedAt;
    options.metrics.recordHistogram(`${options.operationName}.duration_ms`, durationMs);
    options.logger.info(`${options.operationName}.completed`, { durationMs, ...(options.completeContext?.(result) ?? {}) }, options.trace);
    return result;
  } catch (error) {
    const durationMs = performance.now() - startedAt;
    options.metrics.increment(`${options.operationName}.failed`);
    options.logger.error(`${options.operationName}.failed`, { durationMs, errorCode: options.errorCode?.(error) ?? 'UNKNOWN_ERROR' }, options.trace);
    throw error;
  }
}
