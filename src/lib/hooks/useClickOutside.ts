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
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        callback();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [callback, enabled]);

  return ref;
}
