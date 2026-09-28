import { describe, expect, it } from 'vitest';
import type { TranslationProvider } from '../../../translation/providers/TranslationProvider';
import { createTranslationBatch } from '../../factories/createTranslationBatch';

export function runTranslationProviderContract(name: string, provider: TranslationProvider): void {
  describe(`${name} translation provider contract`, () => {
    it('reports availability and returns a response for a valid batch', async () => {
      const availability = await provider.checkAvailability('fake-model');
      expect(availability.status).toBe('available');
      const response = await provider.translateBatch(createTranslationBatch(), {
        sessionId: 'session', sourceLanguage: 'en', targetLanguage: 'fr',
        modelId: 'fake-model', promptVersion: '1', signal: new AbortController().signal,
      });
      expect(response.rawText.trim().length).toBeGreaterThan(0);
    });
  });
}
