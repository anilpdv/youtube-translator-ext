export const SECURITY_PROTOCOL_VERSION = 1;

export interface MessageEnvelope<T = unknown> {
  readonly protocolVersion: number;
  readonly requestId: string;
  readonly type: string;
  readonly sentAt: number;
  readonly payload: T;
}

export function isFreshMessage(envelope: MessageEnvelope, now = Date.now(), maxAgeMs = 30_000): boolean {
  return Number.isFinite(envelope.sentAt) && Math.abs(now - envelope.sentAt) <= maxAgeMs;
}
