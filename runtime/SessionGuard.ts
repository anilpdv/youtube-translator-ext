import type { TranslationSession } from '../app/TranslationSession';

export class SessionGuard {
  private activeSession: TranslationSession | null = null;

  start(session: TranslationSession): void {
    this.cancelActive('Replaced by a new session');
    this.activeSession = session;
  }

  getActive(): TranslationSession | null {
    return this.activeSession;
  }

  isCurrent(sessionId: string): boolean {
    return this.activeSession?.id === sessionId && this.activeSession.isActive;
  }

  assertCurrent(sessionId: string): void {
    if (!this.isCurrent(sessionId)) {
      throw new DOMException(
        'The operation belongs to an inactive session.',
        'AbortError',
      );
    }
  }

  complete(sessionId: string): void {
    if (this.activeSession?.id !== sessionId) return;
    this.activeSession.finish();
    this.activeSession = null;
  }

  cancelActive(reason = 'Active session cancelled'): void {
    this.activeSession?.cancel(reason);
    this.activeSession = null;
  }
}
