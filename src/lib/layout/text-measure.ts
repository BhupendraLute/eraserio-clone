// Measures real text width via OffscreenCanvas, which is available in
// both Web Workers and the main thread (unlike a plain <canvas>, which
// needs a DOM). Falls back to a character-width heuristic only if
// OffscreenCanvas genuinely isn't supported — old Safari, some SSR/test
// environments — so layout never throws.

const cache = new Map<string, number>();
let sharedCtx: OffscreenCanvasRenderingContext2D | null | undefined;

function getContext(): OffscreenCanvasRenderingContext2D | null {
  if (sharedCtx !== undefined) return sharedCtx;

  if (typeof OffscreenCanvas === 'undefined') {
    sharedCtx = null;
    return sharedCtx;
  }

  const canvas = new OffscreenCanvas(0, 0);
  sharedCtx = canvas.getContext('2d');
  return sharedCtx;
}

const FALLBACK_CHAR_WIDTH_RATIO = 0.55; // rough average glyph width as a fraction of font size

function fallbackMeasure(text: string, fontSizePx: number): number {
  return text.length * fontSizePx * FALLBACK_CHAR_WIDTH_RATIO;
}

export function measureTextWidth(text: string, font: string): number {
  const cacheKey = `${font}::${text}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;

  const ctx = getContext();
  let width: number;

  if (ctx) {
    ctx.font = font;
    width = ctx.measureText(text).width;
  } else {
    const sizeMatch = font.match(/(\d+)px/);
    const fontSize = sizeMatch ? Number(sizeMatch[1]) : 13;
    width = fallbackMeasure(text, fontSize);
  }

  cache.set(cacheKey, width);
  return width;
}