import type { ApplicationMessage } from './ApplicationMessages';

const nonEmpty = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export function validateApplicationMessage(value: unknown): value is ApplicationMessage {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  if (typeof record.type !== 'string') return false;
  switch (record.type) {
    case 'application.get-state':
    case 'application.discover-tracks':
    case 'application.clear-translation':
      return true;
    case 'application.cancel-translation':
      return nonEmpty(record.sessionId);
    case 'application.start-translation':
      return nonEmpty(record.captionTrackId) && nonEmpty(record.targetLanguage) &&
        nonEmpty(record.providerId) && nonEmpty(record.modelId);
    case 'application.retry-failed-batches':
      return nonEmpty(record.sessionId) && Array.isArray(record.batchIds) &&
        record.batchIds.every(nonEmpty);
    case 'application.set-subtitles-enabled':
      return typeof record.enabled === 'boolean';
    case 'application.update-subtitle-settings':
      return typeof record.settings === 'object' && record.settings !== null;
    case 'provider.test-connection':
      return nonEmpty(record.providerId) && nonEmpty(record.modelId);
    default:
      return false;
  }
}
