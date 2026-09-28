import { SECURITY_PROTOCOL_VERSION, type MessageEnvelope } from './MessageEnvelope';

export function validateMessageEnvelope(value: unknown): value is MessageEnvelope {
  if (!value || typeof value !== 'object') return false;
  const envelope = value as Partial<MessageEnvelope>;
  return envelope.protocolVersion === SECURITY_PROTOCOL_VERSION &&
    typeof envelope.requestId === 'string' && envelope.requestId.length > 0 && envelope.requestId.length <= 128 &&
    typeof envelope.type === 'string' && envelope.type.length > 0 && envelope.type.length <= 128 &&
    typeof envelope.sentAt === 'number' && 'payload' in envelope;
}
