import type { CaptionDocument } from '../../captions/domain/CaptionDocument';

export function createCaptionDocument(overrides: Partial<CaptionDocument> = {}): CaptionDocument {
  return {
    videoId: 'fixture-video',
    track: {
      id: 'fixture-track', languageCode: 'en', languageName: 'English', kind: 'manual',
      isDefault: true, isTranslatable: true, baseUrl: 'https://fixture.invalid/captions',
    },
    format: 'json3',
    cues: [{ id: 'cue-1', startMs: 0, endMs: 1000, text: 'Hello' }],
    durationMs: 1000, textLength: 5, extractedAt: 0, warnings: [],
    ...overrides,
  };
}
