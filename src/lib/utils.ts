import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(prefix = 'el'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Sanitizes a post-auth redirect target against open-redirect attacks.
 * Only same-origin relative paths (starting with a single `/`, not `//`) are
 * allowed; everything else falls back to the given default.
 */
export function safeCallbackUrl(raw: string | null, fallback = '/whiteboard'): string {
  if (raw && raw.startsWith('/') && !raw.startsWith('//')) {
    return raw;
  }
  return fallback;
}
