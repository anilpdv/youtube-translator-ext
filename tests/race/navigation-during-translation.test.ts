import { describe, expect, it } from 'vitest';
import { SessionGuard } from '../../runtime/SessionGuard';
import { TranslationSession } from '../../app/TranslationSession';

describe('navigation during translation', () => {
  it('cancels the previous session before accepting a replacement', () => {
    const guard = new SessionGuard();
    const first = new TranslationSession({ id: 'first', videoId: 'one', sourceLanguage: 'en', targetLanguage: 'fr', providerId: 'fake' });
    const second = new TranslationSession({ id: 'second', videoId: 'two', sourceLanguage: 'en', targetLanguage: 'fr', providerId: 'fake' });
    guard.start(first);
    guard.start(second);
    expect(first.signal.aborted).toBe(true);
    expect(guard.isCurrent(second.id)).toBe(true);
  });
});
