import { describe, expect, it } from 'vitest';
import { TranslationSession } from '../../app/TranslationSession';
import { SessionGuard } from '../../runtime/SessionGuard';

function createSession(videoId: string): TranslationSession {
  return new TranslationSession({
    videoId,
    targetLanguage: 'te',
    providerId: 'gemini',
  });
}

describe('SessionGuard', () => {
  it('cancels the old session when a new one starts', () => {
    const guard = new SessionGuard();
    const first = createSession('video-1');
    const second = createSession('video-2');

    guard.start(first);
    guard.start(second);

    expect(first.signal.aborted).toBe(true);
    expect(guard.isCurrent(first.id)).toBe(false);
    expect(guard.isCurrent(second.id)).toBe(true);
  });

  it('rejects inactive session results', () => {
    const guard = new SessionGuard();
    const session = createSession('video-1');
    guard.start(session);
    guard.cancelActive();

    expect(() => guard.assertCurrent(session.id)).toThrow();
  });
});
