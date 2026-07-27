'use client';

import { useEffect, useRef, type RefObject } from 'react';

/**
 * Calls `callback` when a mousedown event occurs outside `ref`'s element.
 * @param enabled - Only attach the listener when this is true (default: true).
 */
export function useClickOutside<T extends HTMLElement>(
  callback: () => void,
  enabled = true
): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const handleClickOutside = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        callback();
      }
    };
    document.addEventListener('pointerdown', handleClickOutside, true);
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside, true);
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [callback, enabled]);

  return ref;
}
