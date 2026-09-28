export interface ProviderTranslationItem {
  readonly id: string;
  readonly translation: string;
}

export interface ProviderResponse {
  readonly rawText: string;
  readonly modelId: string;
  readonly requestId?: string;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
}
