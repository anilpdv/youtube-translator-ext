import { TranslationError } from '../translation/domain/TranslationError';
import type { ProviderResponse } from '../translation/providers/ProviderResponse';
import type { TranslationProvider } from '../translation/providers/TranslationProvider';
import type { TranslateBatchMessage } from './messages/TranslationMessages';

export class TranslationGateway {
  private readonly activeControllers = new Map<string, AbortController>();

  constructor(
    private readonly providers: ReadonlyMap<string, TranslationProvider>,
  ) {}

  async translateBatch(message: TranslateBatchMessage): Promise<ProviderResponse> {
    const provider = this.providers.get(message.providerId);
    if (!provider) {
      throw new TranslationError({
        code: 'PROVIDER_NOT_FOUND',
        message: 'The selected translation provider is not available.',
        batchId: message.batch.id,
      });
    }
    const existing = this.activeControllers.get(message.sessionId);
    const controller = existing ?? new AbortController();
    this.activeControllers.set(message.sessionId, controller);
    try {
      return await provider.translateBatch(message.batch, {
        sessionId: message.sessionId,
        sourceLanguage: message.sourceLanguage,
        targetLanguage: message.targetLanguage,
        modelId: message.modelId,
        promptVersion: message.promptVersion,
        signal: controller.signal,
      });
    } finally {
      if (this.activeControllers.get(message.sessionId) === controller) {
        this.activeControllers.delete(message.sessionId);
      }
    }
  }

  cancelSession(sessionId: string): void {
    this.activeControllers.get(sessionId)?.abort('Translation session cancelled.');
    this.activeControllers.delete(sessionId);
  }
}
