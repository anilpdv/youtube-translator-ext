import { describe, expect, it } from 'vitest';
import { TranslationSession } from '../../app/TranslationSession';

describe('TranslationSession', () => {
  it('owns cancellation and completion state', () => {
    const session = new TranslationSession({
      videoId: 'video-1',
      targetLanguage: 'te',
      providerId: 'gemini',
    });

    expect(session.isActive).toBe(true);
    session.cancel('Video changed');
    expect(session.isActive).toBe(false);
    expect(session.signal.aborted).toBe(true);
    expect(session.finishedAt).not.toBeNull();
  });

  it('cannot be reused after finishing', () => {
    const session = new TranslationSession({
      videoId: 'video-1',
      targetLanguage: 'te',
      providerId: 'gemini',
    });
    session.finish();

    expect(session.isActive).toBe(false);
    expect(() => session.throwIfInactive()).toThrow();
  });
});
