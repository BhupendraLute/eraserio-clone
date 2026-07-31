'use client';

import { useEffect, type RefObject } from 'react';

/**
 * Custom hook that triggers a callback when a pointerdown or mousedown event
 * occurs outside of the specified container element.
 *
 * @param ref - React ref object referencing the container element
 * @param handler - Callback function invoked on outside click
 * @param enabled - Boolean flag to activate/deactivate the listener (default: true)
 */
export function useOnClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  handler: (event: PointerEvent | MouseEvent) => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return;

    const listener = (event: PointerEvent | MouseEvent) => {
      const el = ref.current;
      if (!el || el.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };

    window.addEventListener('pointerdown', listener);
    return () => {
      window.removeEventListener('pointerdown', listener);
    };
  }, [ref, handler, enabled]);
}
