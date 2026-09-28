import type { CaptionDocument } from '../../captions/domain/CaptionDocument';

export interface TranslationRequest {
  readonly sessionId: string;
  readonly videoId: string;
  readonly sourceLanguage: string;
  readonly targetLanguage: string;
  readonly providerId: string;
  readonly modelId: string;
  readonly captionDocument: CaptionDocument;
  readonly signal: AbortSignal;
}
