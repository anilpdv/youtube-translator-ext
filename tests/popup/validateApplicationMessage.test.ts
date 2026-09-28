import { describe, expect, it } from 'vitest';
import { validateApplicationMessage } from '../../background/messages/validateApplicationMessage';

describe('validateApplicationMessage', () => {
  it('accepts supported workflow messages', () => {
    expect(validateApplicationMessage({ type: 'application.get-state' })).toBe(true);
    expect(validateApplicationMessage({
      type: 'application.start-translation',
      captionTrackId: 'track',
      targetLanguage: 'French',
      providerId: 'gemini',
      modelId: 'gemini-2.5-flash',
    })).toBe(true);
  });

  it('rejects malformed or incomplete messages', () => {
    expect(validateApplicationMessage({ type: 'application.start-translation' })).toBe(false);
    expect(validateApplicationMessage({ type: 'application.cancel-translation', sessionId: '' })).toBe(false);
    expect(validateApplicationMessage({ type: 'application.unknown' })).toBe(false);
  });
});
