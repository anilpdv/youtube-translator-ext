import type { TranslationBatch, TranslationBatchResult } from '../domain/TranslationBatch';
import type { TranslationDocument } from '../domain/TranslationDocument';
import { TranslationError } from '../domain/TranslationError';
import type { TranslationLimits } from '../domain/TranslationLimits';
import type { TranslationProgressListener } from '../domain/TranslationProgress';
import type { TranslationRequest } from '../domain/TranslationRequest';
import type { TranslatedCue } from '../domain/TranslationCue';
import type { TranslationProvider } from '../providers/TranslationProvider';
import type { TranslationBatcher } from '../batching/TranslationBatcher';
import type { TranslationResponseParser } from '../validation/TranslationResponseParser';
import type { TranslationResponseValidator } from '../validation/TranslationResponseValidator';
import { ConcurrencyLimiter } from './ConcurrencyLimiter';
import { abortableDelay } from './abortableDelay';
import type { RetryPolicy } from './RetryPolicy';
import { createTimeoutSignal } from './RequestTimeout';

export interface TranslationCoordinatorOptions {
  readonly promptVersion: string;
  readonly limits: TranslationLimits;
  readonly cachedResults?: ReadonlyMap<string, TranslationBatchResult>;
  readonly onBatchCompleted?: (
    batch: TranslationBatch,
    result: TranslationBatchResult,
  ) => Promise<void> | void;
}

export class TranslationCoordinator {
  private readonly concurrency: ConcurrencyLimiter;

  constructor(
    private readonly provider: TranslationProvider,
    private readonly batcher: TranslationBatcher,
    private readonly parser: TranslationResponseParser,
    private readonly validator: TranslationResponseValidator,
    private readonly retryPolicy: RetryPolicy,
    private readonly options: TranslationCoordinatorOptions,
  ) {
    this.concurrency = new ConcurrencyLimiter(
      options.limits.maxConcurrentBatches,
    );
  }

  async translate(
    request: TranslationRequest,
    onProgress?: TranslationProgressListener,
  ): Promise<TranslationDocument> {
    request.signal.throwIfAborted();
    this.validateRequest(request);
    const startedAt = Date.now();
    const batches = this.batcher.createBatches(request.captionDocument);
    const slots: Array<TranslationBatchResult | undefined> =
      new Array(batches.length);
    const translatedById = new Map<string, TranslatedCue>();

    await Promise.all(
      batches.map((batch) =>
        this.concurrency.run(async () => {
          const cached = this.options.cachedResults?.get(batch.id);
          const result = cached ?? await this.executeBatch(batch, request);
          slots[batch.index] = result;
          for (const cue of result.translations) translatedById.set(cue.id, cue);
          if (!cached) await this.options.onBatchCompleted?.(batch, result);
          this.reportProgress(request, batches, slots, onProgress);
        }, request.signal),
      ),
    );
    request.signal.throwIfAborted();
    const batchResults = slots.filter(
      (result): result is TranslationBatchResult => result !== undefined,
    );
    const sourceCues = batches.flatMap((batch) => batch.cues);
    const cues = sourceCues
      .map((cue) => translatedById.get(cue.id))
      .filter((cue): cue is TranslatedCue => cue !== undefined);
    const failedCueCount = sourceCues.length - cues.length;
    return {
      sessionId: request.sessionId,
      videoId: request.videoId,
      sourceLanguage: request.sourceLanguage,
      targetLanguage: request.targetLanguage,
      providerId: request.providerId,
      modelId: request.modelId,
      promptVersion: this.options.promptVersion,
      source: request.captionDocument,
      cues,
      batchResults,
      completion: failedCueCount === 0 ? 'complete' : 'partial',
      translatedCueCount: cues.length,
      failedCueCount,
      startedAt,
      completedAt: Date.now(),
    };
  }

  private async executeBatch(
    batch: TranslationBatch,
    request: TranslationRequest,
  ): Promise<TranslationBatchResult> {
    const startedAt = Date.now();
    let attempts = 0;
    let lastError: TranslationError | null = null;
    while (attempts < this.options.limits.maxAttemptsPerBatch) {
      request.signal.throwIfAborted();
      attempts += 1;
      try {
        const timeout = createTimeoutSignal(
          request.signal,
          this.options.limits.requestTimeoutMs,
        );
        let response;
        try {
          response = await this.provider.translateBatch(batch, {
            sessionId: request.sessionId,
            videoId: request.videoId,
            sourceLanguage: request.sourceLanguage,
            targetLanguage: request.targetLanguage,
            modelId: request.modelId,
            promptVersion: this.options.promptVersion,
            signal: timeout.signal,
          });
        } finally {
          timeout.dispose();
        }
        request.signal.throwIfAborted();
        const items = this.parser.parse(response.rawText);
        const translations = this.validator.validate(batch, items);
        return {
          batchId: batch.id,
          batchIndex: batch.index,
          status: 'completed',
          translations,
          attempts,
          startedAt,
          completedAt: Date.now(),
        };
      } catch (error) {
        if (request.signal.aborted) {
          throw new TranslationError({
            code: 'SESSION_CANCELLED',
            message: 'Translation was cancelled.',
            batchId: batch.id,
            cause: error,
          });
        }
        lastError =
          error instanceof TranslationError
            ? error
            : new TranslationError({
                code:
                  error instanceof DOMException && error.name === 'AbortError'
                    ? 'REQUEST_TIMEOUT'
                    : 'PROVIDER_FAILURE',
                message: 'The translation provider request failed.',
                retryable: true,
                batchId: batch.id,
                cause: error,
              });
        const decision = this.retryPolicy.decide(lastError, attempts);
        if (!decision.shouldRetry) break;
        await abortableDelay(decision.delayMs, request.signal);
      }
    }
    return {
      batchId: batch.id,
      batchIndex: batch.index,
      status: 'failed',
      translations: [],
      attempts,
      startedAt,
      completedAt: Date.now(),
      errorCode: lastError?.code ?? 'RETRY_EXHAUSTED',
    };
  }

  private validateRequest(request: TranslationRequest): void {
    if (request.captionDocument.videoId !== request.videoId) {
      throw new TranslationError({
        code: 'VIDEO_MISMATCH',
        message: 'The caption document belongs to another video.',
      });
    }
    if (!request.sourceLanguage || !request.targetLanguage) {
      throw new TranslationError({
        code: 'INVALID_LANGUAGE',
        message: 'Source and target languages are required.',
      });
    }
    if (request.sourceLanguage === request.targetLanguage) {
      throw new TranslationError({
        code: 'INVALID_LANGUAGE',
        message: 'Source and target languages must be different.',
      });
    }
    if (request.providerId !== this.provider.id) {
      throw new TranslationError({
        code: 'PROVIDER_NOT_FOUND',
        message: 'The requested provider does not match the active provider.',
      });
    }
  }

  private reportProgress(
    request: TranslationRequest,
    batches: readonly TranslationBatch[],
    results: readonly (TranslationBatchResult | undefined)[],
    listener?: TranslationProgressListener,
  ): void {
    if (!listener) return;
    const completed = results.filter((result) => result?.status === 'completed');
    const failed = results.filter((result) => result?.status === 'failed');
    listener({
      sessionId: request.sessionId,
      completedBatches: completed.length,
      failedBatches: failed.length,
      totalBatches: batches.length,
      translatedCues: completed.reduce(
        (count, result) => count + (result?.translations.length ?? 0),
        0,
      ),
      failedCues: failed.reduce(
        (count, result) => count + batches[result!.batchIndex].cues.length,
        0,
      ),
      totalCues: batches.reduce((count, batch) => count + batch.cues.length, 0),
      activeBatchIds: [],
    });
  }
}
