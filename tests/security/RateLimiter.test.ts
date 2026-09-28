import { describe, expect, it } from 'vitest';
import { RateLimiter } from '../../background/security/RateLimiter';

describe('RateLimiter', () => {
  it('bounds requests in a time window', () => {
    const limiter = new RateLimiter(2, 1000);
    expect(limiter.allow('session', 100)).toBe(true);
    expect(limiter.allow('session', 200)).toBe(true);
    expect(limiter.allow('session', 300)).toBe(false);
    expect(limiter.allow('session', 1200)).toBe(true);
  });
});
