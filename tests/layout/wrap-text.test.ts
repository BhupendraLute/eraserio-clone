import { describe, expect, it } from 'vitest';
import { wrapLabel } from '@/lib/layout/wrap-text';

// In the node test environment measureTextWidth falls back to
// text.length x fontSize x 0.55, so at '13px' every character is 7.15px.

describe('wrapLabel', () => {
  it('keeps short labels on a single line', () => {
    expect(wrapLabel('hello', '13px ui-sans-serif', 240)).toEqual(['hello']);
  });

  it('breaks greedily when the next word would overflow', () => {
    // 'hello' = 35.75, 'hello world' = 71.5 > maxWidth 40
    expect(wrapLabel('hello world', '13px ui-sans-serif', 40)).toEqual([
      'hello',
      'world',
    ]);
  });

  it('packs as many words as fit on each line', () => {
    // 'a b' = 21.45 fits, 'a b c' = 35.75 > 30
    expect(wrapLabel('a b c', '13px ui-sans-serif', 30)).toEqual(['a b', 'c']);
  });

  it('breaks a single word that is wider than maxWidth at character boundaries', () => {
    // 'supercalifragilistic' = 20 chars; 3 chars = 21.45 > 20 -> chunks of 2
    const lines = wrapLabel('supercalifragilistic', '13px ui-sans-serif', 20);
    expect(lines.join('')).toBe('supercalifragilistic');
    expect(lines).toHaveLength(10);
    expect(lines.every((l) => l.length === 2)).toBe(true);
  });

  it('packs a short word onto the tail of a broken long word', () => {
    // 'abcdefghijkl' -> ['ab','cd','ef','gh','ij','kl'] with 'kl' as the live line;
    // 'x' doesn't fit after it (35.75 > 20) so it starts a new line.
    const lines = wrapLabel('abcdefghijkl x', '13px ui-sans-serif', 20);
    expect(lines.join('')).toBe('abcdefghijklx');
    expect(lines).toEqual(['ab', 'cd', 'ef', 'gh', 'ij', 'kl', 'x']);
  });

  it('returns a single empty line for an empty label', () => {
    expect(wrapLabel('', '13px ui-sans-serif', 240)).toEqual(['']);
    expect(wrapLabel('   ', '13px ui-sans-serif', 240)).toEqual(['']);
  });

  it('trims and normalizes runs of whitespace between words', () => {
    expect(wrapLabel('   spaced   out   ', '13px ui-sans-serif', 100)).toEqual([
      'spaced out',
    ]);
  });

  it('collapses explicit newlines into a single space', () => {
    // wrapLabel splits on /\s+/, so '\n' is treated like any other whitespace.
    expect(wrapLabel('a\nb', '13px ui-sans-serif', 100)).toEqual(['a b']);
  });
});
