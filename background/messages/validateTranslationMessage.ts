import type {
  CancelTranslationMessage,
  TranslateBatchMessage,
  TranslationMessage,
} from './TranslationMessages';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateTranslationMessage(
  value: unknown,
): TranslationMessage | null {
  if (typeof value !== 'object' || value === null) return null;
  const message = value as Record<string, unknown>;
  if (message.type === 'translation.cancel-session') {
    return isNonEmptyString(message.sessionId)
      ? (message as unknown as CancelTranslationMessage)
      : null;
  }
  if (
    message.type !== 'translation.translate-batch' ||
    !isNonEmptyString(message.sessionId) ||
    !isNonEmptyString(message.videoId) ||
    !isNonEmptyString(message.providerId) ||
    !isNonEmptyString(message.modelId) ||
    !isNonEmptyString(message.sourceLanguage) ||
    !isNonEmptyString(message.targetLanguage) ||
    !isNonEmptyString(message.promptVersion) ||
    !isValidBatch(message.batch)
  ) {
    return null;
  }
  return message as unknown as TranslateBatchMessage;
}

function isValidBatch(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const batch = value as Record<string, unknown>;
  return (
    isNonEmptyString(batch.id) &&
    Number.isInteger(batch.index) &&
    Array.isArray(batch.cues) &&
    batch.cues.length > 0 &&
    batch.cues.every((cue) => {
      if (typeof cue !== 'object' || cue === null) return false;
      const item = cue as Record<string, unknown>;
      return (
        isNonEmptyString(item.id) &&
        isNonEmptyString(item.text) &&
        Number.isInteger(item.startMs) &&
        Number.isInteger(item.endMs) &&
        (item.endMs as number) >= (item.startMs as number)
      );
    })
  );
}
