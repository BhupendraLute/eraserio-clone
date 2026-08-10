/**
 * Simple in-memory fixed-window rate limiter for the AI endpoint.
 *
 * State lives inside the factory closure so tests can create isolated
 * limiters, while the module-level `aiRateLimiter` instance is configured
 * from environment variables.
 *
 * NOTE: in-memory state is per server process — adequate for a single Node
 * instance. For horizontally-scaled deployments, swap this for a shared
 * store (e.g. Redis/Upstash) without changing the call site.
 */

export interface RateLimitOptions {
  /** Maximum allowed requests per window. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Requests still available in the current window. */
  remaining: number;
  /** Seconds until the current window resets (for Retry-After). */
  retryAfterSeconds: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

/** Cap on tracked keys; expired buckets are pruned once the map reaches it. */
const MAX_BUCKETS = 10_000;

export function createRateLimiter(options: RateLimitOptions) {
  const { max, windowMs } = options;
  const buckets = new Map<string, Bucket>();

  return function checkRateLimit(key: string, now: number = Date.now()): RateLimitResult {
    const bucket = buckets.get(key);

    // New key, or the current window has elapsed — start a fresh window.
    if (!bucket || now >= bucket.resetAt) {
      if (buckets.size >= MAX_BUCKETS) {
        for (const [k, b] of buckets) {
          if (now >= b.resetAt) buckets.delete(k);
        }
      }
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return {
        allowed: true,
        remaining: Math.max(0, max - 1),
        retryAfterSeconds: Math.ceil(windowMs / 1000),
      };
    }

    if (bucket.count >= max) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      };
    }

    bucket.count += 1;
    return {
      allowed: true,
      remaining: Math.max(0, max - bucket.count),
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  };
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Requests allowed per user per window. Override with AI_RATE_LIMIT_MAX. */
export const AI_RATE_LIMIT_MAX = envInt('AI_RATE_LIMIT_MAX', 20);
/** Window length in ms. Override with AI_RATE_LIMIT_WINDOW_MS. */
export const AI_RATE_LIMIT_WINDOW_MS = envInt('AI_RATE_LIMIT_WINDOW_MS', 60_000);

/** Default limiter used by `/api/ai/generate`. */
export const aiRateLimiter = createRateLimiter({
  max: AI_RATE_LIMIT_MAX,
  windowMs: AI_RATE_LIMIT_WINDOW_MS,
});
