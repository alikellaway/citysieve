import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateLimiter } from '@/lib/rate-limit';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests under the limit', () => {
    const limiter = new RateLimiter({ maxRequests: 3, windowMs: 1000 });

    expect(limiter.check('ip-1')).toBe(true);
    expect(limiter.check('ip-1')).toBe(true);
    expect(limiter.check('ip-1')).toBe(true);
  });

  it('blocks requests over the limit', () => {
    const limiter = new RateLimiter({ maxRequests: 2, windowMs: 1000 });

    expect(limiter.check('ip-1')).toBe(true);
    expect(limiter.check('ip-1')).toBe(true);
    expect(limiter.check('ip-1')).toBe(false); // 3rd request blocked
    expect(limiter.check('ip-1')).toBe(false); // still blocked
  });

  it('tracks different keys independently', () => {
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 1000 });

    expect(limiter.check('ip-a')).toBe(true);
    expect(limiter.check('ip-b')).toBe(true);

    // Both are now at their limit
    expect(limiter.check('ip-a')).toBe(false);
    expect(limiter.check('ip-b')).toBe(false);
  });

  it('resets the bucket after the window expires', () => {
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 5000 });

    expect(limiter.check('ip-1')).toBe(true);
    expect(limiter.check('ip-1')).toBe(false); // blocked

    // Advance time past the window
    vi.advanceTimersByTime(5001);

    // Should be allowed again
    expect(limiter.check('ip-1')).toBe(true);
    expect(limiter.check('ip-1')).toBe(false); // new window, blocked again
  });

  it('does not reset the bucket before the window expires', () => {
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 5000 });

    expect(limiter.check('ip-1')).toBe(true);
    expect(limiter.check('ip-1')).toBe(false);

    // Advance time, but not past the window
    vi.advanceTimersByTime(3000);

    expect(limiter.check('ip-1')).toBe(false); // still blocked
  });

  it('handles a single-request limit correctly', () => {
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 100 });

    expect(limiter.check('ip-1')).toBe(true);
    expect(limiter.check('ip-1')).toBe(false);

    vi.advanceTimersByTime(101);
    expect(limiter.check('ip-1')).toBe(true);
  });

  it('handles high concurrency without errors', () => {
    const limiter = new RateLimiter({ maxRequests: 100, windowMs: 1000 });

    let allowed = 0;
    let blocked = 0;

    for (let i = 0; i < 150; i++) {
      if (limiter.check('ip-1')) {
        allowed++;
      } else {
        blocked++;
      }
    }

    expect(allowed).toBe(100);
    expect(blocked).toBe(50);
  });
});
