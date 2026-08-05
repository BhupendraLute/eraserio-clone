import { describe, expect, it } from 'vitest';
import { createRateLimiter, AI_RATE_LIMIT_MAX, AI_RATE_LIMIT_WINDOW_MS } from '@/lib/ai/rate-limit';

describe('createRateLimiter', () => {
  it('allows requests up to the max, then blocks', () => {
    const limit = createRateLimiter({ max: 3, windowMs: 60_000 });
    const now = 1_000_000;

    expect(limit('user-1', now).allowed).toBe(true);
    expect(limit('user-1', now + 10).allowed).toBe(true);
    expect(limit('user-1', now + 20).allowed).toBe(true);
    const blocked = limit('user-1', now + 30);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('reports the remaining allowance', () => {
    const limit = createRateLimiter({ max: 5, windowMs: 60_000 });
    const now = 1_000_000;

    expect(limit('user-1', now).remaining).toBe(4);
    expect(limit('user-1', now + 10).remaining).toBe(3);
    expect(limit('user-1', now + 20).remaining).toBe(2);
  });

  it('resets the window after windowMs elapses', () => {
    const limit = createRateLimiter({ max: 2, windowMs: 60_000 });
    const now = 1_000_000;

    expect(limit('user-1', now).allowed).toBe(true);
    expect(limit('user-1', now + 10).allowed).toBe(true);
    expect(limit('user-1', now + 20).allowed).toBe(false);

    // After the window elapses the budget is restored.
    expect(limit('user-1', now + 60_001).allowed).toBe(true);
    expect(limit('user-1', now + 60_002).remaining).toBe(0);
  });

  it('exposes the retry-after seconds when blocked', () => {
    const limit = createRateLimiter({ max: 1, windowMs: 120_000 });
    const now = 1_000_000;

    limit('user-1', now);
    const blocked = limit('user-1', now + 30_000);
    expect(blocked.allowed).toBe(false);
    // 30s into a 120s window → ~90s remaining.
    expect(blocked.retryAfterSeconds).toBe(90);
  });

  it('keeps per-key state isolated', () => {
    const limit = createRateLimiter({ max: 1, windowMs: 60_000 });
    const now = 1_000_000;

    expect(limit('user-a', now).allowed).toBe(true);
    expect(limit('user-a', now + 10).allowed).toBe(false);
    // A different key starts with a fresh budget.
    expect(limit('user-b', now).allowed).toBe(true);
  });

  it('keeps separate limiter instances isolated', () => {
    const a = createRateLimiter({ max: 1, windowMs: 60_000 });
    const b = createRateLimiter({ max: 1, windowMs: 60_000 });
    const now = 1_000_000;

    expect(a('user-1', now).allowed).toBe(true);
    expect(a('user-1', now + 10).allowed).toBe(false);
    expect(b('user-1', now).allowed).toBe(true);
  });
});

describe('default AI limiter configuration', () => {
  it('exposes positive env-derived defaults', () => {
    expect(AI_RATE_LIMIT_MAX).toBeGreaterThan(0);
    expect(AI_RATE_LIMIT_WINDOW_MS).toBeGreaterThan(0);
  });
});
