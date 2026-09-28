export class RateLimiter {
  private readonly requests = new Map<string, number[]>();

  constructor(private readonly maxRequests: number, private readonly windowMs: number) {}

  allow(key: string, now = Date.now()): boolean {
    const recent = (this.requests.get(key) ?? []).filter((time) => now - time < this.windowMs);
    if (recent.length >= this.maxRequests) {
      this.requests.set(key, recent);
      return false;
    }
    recent.push(now);
    this.requests.set(key, recent);
    return true;
  }
}
