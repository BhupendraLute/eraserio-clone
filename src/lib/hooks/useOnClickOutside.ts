'use client';

import { useEffect, useRef, type RefObject } from 'react';

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
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) return;

    const listener = (event: PointerEvent | MouseEvent) => {
      const el = ref.current;
      if (!el || el.contains(event.target as Node)) {
        return;
      }
      handlerRef.current(event);
    };

    window.addEventListener('pointerdown', listener);
    return () => {
      window.removeEventListener('pointerdown', listener);
    };
  }, [ref, enabled]);
}
