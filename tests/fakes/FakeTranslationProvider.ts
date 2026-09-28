import type { TranslationBatchInput, ProviderContext, TranslationProvider } from '../../translation/providers/TranslationProvider';
import type { ProviderAvailability } from '../../translation/providers/ProviderAvailability';
import type { ProviderResponse } from '../../translation/providers/ProviderResponse';

export class FakeTranslationProvider implements TranslationProvider {
  readonly id = 'fake';
  readonly calls: TranslationBatchInput[] = [];
  availability: ProviderAvailability = { status: 'available', message: 'ready', modelIds: ['fake-model'] };
  responseFactory: (batch: TranslationBatchInput, context: ProviderContext) => ProviderResponse = (batch) => ({
    rawText: JSON.stringify(batch.cues.map((cue) => ({ id: cue.id, translatedText: `[translated] ${cue.text}` }))),
    modelId: 'fake-model',
  });

  async checkAvailability(): Promise<ProviderAvailability> { return this.availability; }
  async translateBatch(batch: TranslationBatchInput, context: ProviderContext): Promise<ProviderResponse> {
    this.calls.push(batch);
    context.signal.throwIfAborted();
    return this.responseFactory(batch, context);
  }
}
