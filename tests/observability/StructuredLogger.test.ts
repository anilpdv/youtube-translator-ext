import { describe, expect, it } from 'vitest';
import { StructuredLogger } from '../../observability/logging/StructuredLogger';
import type { LogEvent } from '../../observability/domain/LogEvent';
describe('StructuredLogger', () => {
  it('filters levels and redacts context', () => {
    const events: LogEvent[] = [];
    const logger = new StructuredLogger([{ write: (event) => { events.push(event); } }], 'warn');
    logger.info('test.info');
    logger.warn('test.warn', { apiKey: 'secret', count: 1 });
    expect(events).toHaveLength(1);
    expect(events[0].context).toEqual({ apiKey: '[REDACTED]', count: 1 });
  });
});
