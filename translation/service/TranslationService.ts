import type { TranslationDocument } from '../domain/TranslationDocument';
import { TranslationError } from '../domain/TranslationError';
import type { TranslationProgressListener } from '../domain/TranslationProgress';
import type { TranslationRequest } from '../domain/TranslationRequest';
import type { TranslationProvider } from '../providers/TranslationProvider';
import type { TranslationCoordinator } from '../execution/TranslationCoordinator';

export interface TranslationCoordinatorFactory {
  create(provider: TranslationProvider): TranslationCoordinator;
}

export class TranslationService {
  constructor(
    private readonly providers: ReadonlyMap<string, TranslationProvider>,
    private readonly coordinatorFactory: TranslationCoordinatorFactory,
  ) {}

  async translate(
    request: TranslationRequest,
    onProgress?: TranslationProgressListener,
  ): Promise<TranslationDocument> {
    request.signal.throwIfAborted();
    const provider = this.providers.get(request.providerId);
    if (!provider) {
      throw new TranslationError({
        code: 'PROVIDER_NOT_FOUND',
        message: 'The selected translation provider is not available.',
      });
    }
    const availability = await provider.checkAvailability(
      request.modelId,
      request.signal,
    );
    if (availability.status !== 'available') {
      throw new TranslationError({
        code:
          availability.status === 'missing-credentials'
            ? 'INVALID_CREDENTIALS'
            : 'PROVIDER_UNAVAILABLE',
        message: availability.message,
      });
    }
    return this.coordinatorFactory
      .create(provider)
      .translate(request, onProgress);
  }
}
