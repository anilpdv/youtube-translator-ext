import { describe, expect, it } from 'vitest';
import { SrtExporter } from '../../export/srt/SrtExporter';
import { isValidSrt } from '../../export/srt/SrtValidator';
import type { TranslationDocument } from '../../translation/domain/TranslationDocument';

const translation = {
  sessionId: 'session', videoId: 'video', sourceLanguage: 'en', targetLanguage: 'fr',
  providerId: 'gemini', modelId: 'model', promptVersion: '1', source: {} as never,
  cues: [{
    id: 'cue-1', sourceText: 'Hello', translatedText: 'Bonjour', startMs: 0, endMs: 1250,
  }],
  batchResults: [], completion: 'complete', translatedCueCount: 1, failedCueCount: 0,
  startedAt: 0, completedAt: 1,
} satisfies TranslationDocument;

describe('SrtExporter', () => {
  it('exports canonical translated cues as validated SRT', () => {
    const result = new SrtExporter().export(translation);
    expect(result.content).toContain('00:00:00,000 --> 00:00:01,250');
    expect(isValidSrt(result.content)).toBe(true);
  });
});
