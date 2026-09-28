import { describe, expect, it } from 'vitest';
import { validateMessageEnvelope } from '../../security/messaging/MessageValidator';

describe('validateMessageEnvelope', () => {
  it('rejects malformed and unsupported protocol messages', () => {
    expect(validateMessageEnvelope({ protocolVersion: 0, requestId: 'x', type: 'test', sentAt: Date.now(), payload: {} })).toBe(false);
    expect(validateMessageEnvelope({ protocolVersion: 1, requestId: 'x', type: 'test', sentAt: Date.now(), payload: {} })).toBe(true);
    expect(validateMessageEnvelope({ protocolVersion: 1, requestId: '', type: 'test', sentAt: Date.now(), payload: {} })).toBe(false);
  });
});
