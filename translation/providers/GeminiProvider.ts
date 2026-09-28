import { TranslationError } from '../domain/TranslationError';
import type { TranslationBatchInput } from './TranslationProvider';
import type { ProviderAvailability } from './ProviderAvailability';
import type { ProviderContext, TranslationProvider } from './TranslationProvider';
import type { ProviderResponse } from './ProviderResponse';
import type { TranslationPromptBuilder } from '../prompts/TranslationPromptBuilder';
import { SafeFetch } from '../../security/network/SafeFetch';
import type { RequestPolicy } from '../../security/network/RequestPolicy';

export interface ProviderCredentialReader {
  getApiKey(providerId: string): Promise<string | null>;
}

export class GeminiProvider implements TranslationProvider {
  readonly id = 'gemini';

  constructor(
    private readonly credentials: ProviderCredentialReader,
    private readonly prompts: TranslationPromptBuilder,
    private readonly endpoint = 'https://generativelanguage.googleapis.com/v1beta',
    private readonly safeFetch = new SafeFetch(),
  ) {}

  async checkAvailability(
    modelId?: string,
    signal?: AbortSignal,
  ): Promise<ProviderAvailability> {
    signal?.throwIfAborted();
    if (!modelId?.trim()) {
      return {
        status: 'unsupported',
        message: 'A Gemini model must be selected explicitly.',
        modelIds: [],
      };
    }
    const apiKey = await this.credentials.getApiKey(this.id);
    return apiKey
      ? {
          status: 'available',
          message: 'The translation provider is configured.',
          modelIds: [modelId],
        }
      : {
          status: 'missing-credentials',
          message: 'A provider API key is required.',
          modelIds: [],
        };
  }

  async translateBatch(
    batch: TranslationBatchInput,
    context: ProviderContext,
  ): Promise<ProviderResponse> {
    context.signal.throwIfAborted();
    const apiKey = await this.credentials.getApiKey(this.id);
    if (!apiKey) {
      throw new TranslationError({
        code: 'INVALID_CREDENTIALS',
        message: 'The translation provider API key is missing.',
        batchId: batch.id,
      });
    }
    const prompt = this.prompts.build({
      batch,
      sourceLanguage: context.sourceLanguage,
      targetLanguage: context.targetLanguage,
    });
    const url = new URL(
      `${this.endpoint}/models/${encodeURIComponent(context.modelId)}:generateContent`,
    );
    const policy: RequestPolicy = {
      allowedOrigins: [new URL(this.endpoint).origin],
      allowedMethods: ['POST'],
      timeoutMs: 45_000,
      maxRequestBytes: 256 * 1024,
      maxResponseBytes: 2 * 1024 * 1024,
      allowRedirects: false,
      maximumRedirects: 0,
    };
    const response = await this.safeFetch.execute({
      url,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
      signal: context.signal,
      policy,
    });
    if (!response.ok) {
      const status = response.status;
      throw new TranslationError({
        code: status === 429 ? 'RATE_LIMITED' : status >= 500 ? 'PROVIDER_FAILURE' : status === 401 || status === 403 ? 'INVALID_CREDENTIALS' : 'PROVIDER_FAILURE',
        message: 'The translation provider rejected the request.',
        retryable: status === 429 || status >= 500,
        batchId: batch.id,
        details: { status },
      });
    }
    const raw = response.body;
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch (cause) {
      throw new TranslationError({
        code: 'MALFORMED_RESPONSE',
        message: 'The translation provider returned invalid JSON.',
        retryable: true,
        batchId: batch.id,
        cause,
      });
    }
    const text = this.readText(data);
    if (!text) {
      throw new TranslationError({
        code: 'MALFORMED_RESPONSE',
        message: 'The translation provider returned an empty response.',
        retryable: true,
        batchId: batch.id,
      });
    }
    return { rawText: text, modelId: context.modelId };
  }

  private readText(value: unknown): string {
    if (typeof value !== 'object' || value === null) return '';
    const candidates = (value as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>;
    }).candidates;
    const text = candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === 'string' ? text : '';
  }
}
