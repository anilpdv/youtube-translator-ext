import type { TranslationBatchInput, TranslationProvider, ProviderContext } from '../translation/providers/TranslationProvider';
import type { ProviderAvailability } from '../translation/providers/ProviderAvailability';
import type { ProviderResponse } from '../translation/providers/ProviderResponse';
import type { TranslationBatch } from '../translation/domain/TranslationBatch';

/** Content-side provider. Credentials remain in the background worker. */
export class BackgroundTranslationProvider implements TranslationProvider {
  readonly id = 'gemini';

  async checkAvailability(modelId?: string, signal?: AbortSignal): Promise<ProviderAvailability> {
    signal?.throwIfAborted();
    return modelId?.trim()
      ? { status: 'available', message: 'Gemini selected.', modelIds: [modelId] }
      : { status: 'unsupported', message: 'Select a Gemini model.', modelIds: [] };
  }

  async translateBatch(batch: TranslationBatchInput, context: ProviderContext): Promise<ProviderResponse> {
    context.signal.throwIfAborted();
    const response = await browser.runtime.sendMessage({
      type: 'translation.translate-batch',
      sessionId: context.sessionId,
      videoId: context.videoId ?? context.sessionId,
      providerId: this.id,
      modelId: context.modelId,
      sourceLanguage: context.sourceLanguage,
      targetLanguage: context.targetLanguage,
      promptVersion: context.promptVersion,
      batch: { id: batch.id, index: batch.index, cues: batch.cues } satisfies Pick<TranslationBatch, 'id' | 'index' | 'cues'>,
    }) as { success?: boolean; data?: ProviderResponse; error?: string };
    if (!response?.success || !response.data) {
      throw new Error(response?.error || 'The background translation service failed.');
    }
    return response.data;
  }
}
