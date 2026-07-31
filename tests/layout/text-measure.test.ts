import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { measureTextWidth } from '@/lib/layout/text-measure';

describe('fallback heuristic (no OffscreenCanvas)', () => {
  // The node test environment has no OffscreenCanvas, but pin the fallback
  // explicitly so the tests stay deterministic in any environment.
  beforeEach(() => vi.stubGlobal('OffscreenCanvas', undefined));
  afterEach(() => vi.unstubAllGlobals());

  it('estimates width as text.length x fontSize x 0.55', () => {
    expect(measureTextWidth('hello', '13px ui-sans-serif')).toBeCloseTo(35.75, 5);
    expect(measureTextWidth('abc', '20px ui-sans-serif')).toBeCloseTo(33, 5);
  });

  it('parses the font size from the px part of the font string', () => {
    // '13px' -> 13 -> 3 * 13 * 0.55 = 21.45
    expect(measureTextWidth('abc', '13px ui-sans-serif')).toBeCloseTo(21.45, 5);
    expect(measureTextWidth('abc', '30px monospace')).toBeCloseTo(49.5, 5);
  });

  it('defaults to a 13px font size when the string has no px', () => {
    expect(measureTextWidth('abc', 'bold sans-serif')).toBeCloseTo(21.45, 5);
  });

  it('measures empty text as zero width', () => {
    expect(measureTextWidth('', '13px ui-sans-serif')).toBe(0);
  });

  it('keys the cache by font AND text', () => {
    // Same text, different fonts -> different widths.
    expect(measureTextWidth('abc', '13px ui-sans-serif')).toBeCloseTo(21.45, 5);
    expect(measureTextWidth('abc', '20px ui-sans-serif')).toBeCloseTo(33, 5);
  });
});

describe('OffscreenCanvas path', () => {
  it('uses the canvas measurement when OffscreenCanvas is available', async () => {
    vi.resetModules(); // fresh module so sharedCtx is not cached from fallback tests
    class FakeOffscreenCanvas {
      getContext() {
        return {
          font: '',
          measureText: (text: string) => ({ width: text.length * 10 }),
        };
      }
    }
    vi.stubGlobal('OffscreenCanvas', FakeOffscreenCanvas);

    const { measureTextWidth } = await import('@/lib/layout/text-measure');
    expect(measureTextWidth('abc', '13px ui-sans-serif')).toBe(30);

    vi.unstubAllGlobals();
  });

  it('memoizes results by the font::text key', async () => {
    vi.resetModules();
    let calls = 0;
    class FakeOffscreenCanvas {
      getContext() {
        return {
          font: '',
          measureText: () => {
            calls++;
            return { width: 42 };
          },
        };
      }
    }
    vi.stubGlobal('OffscreenCanvas', FakeOffscreenCanvas);

    const { measureTextWidth } = await import('@/lib/layout/text-measure');
    expect(measureTextWidth('abc', '13px ui')).toBe(42);
    expect(measureTextWidth('abc', '13px ui')).toBe(42); // cache hit
    expect(calls).toBe(1);

    expect(measureTextWidth('xyz', '13px ui')).toBe(42); // different text
    expect(calls).toBe(2);

    expect(measureTextWidth('abc', '20px ui')).toBe(42); // different font
    expect(calls).toBe(3);

    vi.unstubAllGlobals();
  });
});
