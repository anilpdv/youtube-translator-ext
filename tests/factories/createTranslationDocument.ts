import type { TranslationDocument } from '../../translation/domain/TranslationDocument';
import { createCaptionDocument } from './createCaptionDocument';

export function createTranslationDocument(overrides: Partial<TranslationDocument> = {}): TranslationDocument {
  return {
    sessionId: 'fixture-session', videoId: 'fixture-video', sourceLanguage: 'en', targetLanguage: 'fr',
    providerId: 'fake', modelId: 'fake-model', promptVersion: '1', source: createCaptionDocument(),
    cues: [{ id: 'cue-1', sourceText: 'Hello', translatedText: 'Bonjour', startMs: 0, endMs: 1000 }],
    batchResults: [], completion: 'complete', translatedCueCount: 1, failedCueCount: 0,
    startedAt: 0, completedAt: 1, ...overrides,
  };
}
