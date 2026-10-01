import { describe, expect, it } from 'vitest';
import { createSubtitleRenderTrack } from '../../rendering/adapters/createSubtitleRenderTrack';
import type { TranslationDocument } from '../../translation/domain/TranslationDocument';

const document = (completion: 'complete' | 'partial' = 'partial'): TranslationDocument => ({
  sessionId: 'session',
  videoId: 'video',
  sourceLanguage: 'en',
  targetLanguage: 'fr',
  providerId: 'gemini',
  modelId: 'model',
  promptVersion: 'v1',
  source: {
    videoId: 'video',
    track: {
      id: 'track',
      languageCode: 'en',
      languageName: 'English',
      kind: 'manual',
      isDefault: true,
      isTranslatable: true,
      baseUrl: 'https://youtube.com',
    },
    format: 'json3',
    cues: [
      { id: 'a', startMs: 0, endMs: 1_000, text: 'Hello' },
      { id: 'b', startMs: 1_000, endMs: 2_000, text: 'World' },
    ],
    durationMs: 2_000,
    textLength: 10,
    extractedAt: 1,
    warnings: [],
  },
  cues: [
    { id: 'a', sourceText: 'Hello', translatedText: 'Bonjour', startMs: 0, endMs: 1_000 },
  ],
  batchResults: [],
  completion,
  translatedCueCount: 1,
  failedCueCount: 1,
  startedAt: 1,
  completedAt: 2,
});

describe('createSubtitleRenderTrack', () => {
  it('preserves source cues when translation is partial', () => {
    const track = createSubtitleRenderTrack(document());
    expect(track.slices.map((slice) => slice.translatedText)).toEqual(['Bonjour', null]);
    expect(track.planningVersion).toBe('display-planning-v1');
  });
});
