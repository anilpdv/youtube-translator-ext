export class ActiveSessionRegistry {
  private readonly sessions = new Map<string, number>();

  register(sessionId: string): void { this.sessions.set(sessionId, Date.now()); }
  has(sessionId: string): boolean { return this.sessions.has(sessionId); }
  complete(sessionId: string): void { this.sessions.delete(sessionId); }
  clear(): void { this.sessions.clear(); }
}
