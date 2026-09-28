import { describe, expect, it } from 'vitest';
import { hashCaptionDocument } from '../../cache/hashing/CaptionDocumentHasher';
import type { CaptionDocument } from '../../captions/domain/CaptionDocument';

const document = (text: string): CaptionDocument => ({
  videoId: 'video',
  track: {
    id: 'track', languageCode: 'en', languageName: 'English', kind: 'manual',
    isDefault: true, isTranslatable: true, baseUrl: 'https://example.invalid',
  },
  format: 'json3',
  cues: [{ id: 'cue-1', startMs: 0, endMs: 1000, text }],
  durationMs: 1000, textLength: text.length, extractedAt: 0, warnings: [],
});

describe('hashCaptionDocument', () => {
  it('is stable and changes when source captions change', async () => {
    expect(await hashCaptionDocument(document('hello')))
      .toBe(await hashCaptionDocument(document('hello')));
    expect(await hashCaptionDocument(document('hello')))
      .not.toBe(await hashCaptionDocument(document('bonjour')));
  });
});
