// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  computeFlowchartBounds,
  downloadPng,
  downloadSvg,
  serializeForExport,
} from '@/lib/export/svg-export';
import type { LaidOutNode } from '@/lib/layout/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function node(x: number, y: number, width: number, height: number, id = 'n'): LaidOutNode {
  return { id, label: id, attrs: {}, x, y, width, height, lines: [] };
}

// A minimal live SVG that mimics the editor canvas: a classed root, a
// pan/zoom transform on the content group, and a child rect.
function makeSvg(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'diagram-canvas');
  svg.setAttribute('viewBox', '0 0 500 500');

  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('transform', 'translate(100, 200)');

  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', '10');
  rect.setAttribute('y', '20');
  g.appendChild(rect);
  svg.appendChild(g);
  return svg;
}

// jsdom does not implement URL.createObjectURL, so swap in spies.
function stubBlobUrl() {
  const createObjectURL = vi.fn(() => 'blob:mock');
  const revokeObjectURL = vi.fn();
  vi.stubGlobal('URL', { createObjectURL, revokeObjectURL } as unknown as typeof URL);
  return { createObjectURL, revokeObjectURL };
}

// An Image that fires onload synchronously when its src is set, so the
// downloadPng promise resolves without any real loading.
class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_value: string) {
    this.onload?.();
  }
}

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// computeFlowchartBounds (pure)
// ---------------------------------------------------------------------------

describe('computeFlowchartBounds', () => {
  it('returns the default 400x300 box for an empty diagram', () => {
    expect(computeFlowchartBounds([])).toEqual({ minX: 0, minY: 0, width: 400, height: 300 });
  });

  it('returns the tight bounds of a single node', () => {
    expect(computeFlowchartBounds([node(10, 20, 100, 60)])).toEqual({
      minX: 10,
      minY: 20,
      width: 100,
      height: 60,
    });
  });

  it('spans every node, including negative coordinates', () => {
    const bounds = computeFlowchartBounds([
      node(0, 0, 100, 60),
      node(200, 150, 50, 40),
      node(-50, -30, 100, 60),
    ]);
    // minX -50, maxX 250, minY -30, maxY 190
    expect(bounds).toEqual({ minX: -50, minY: -30, width: 300, height: 220 });
  });
});

// ---------------------------------------------------------------------------
// serializeForExport (DOM)
// ---------------------------------------------------------------------------

describe('serializeForExport', () => {
  it('sets the viewBox and dimensions from bounds with 40px padding', () => {
    const out = serializeForExport(makeSvg(), { minX: 0, minY: 0, width: 100, height: 60 });
    expect(out).toContain('viewBox="-40 -40 180 140"');
    expect(out).toContain('width="180"');
    expect(out).toContain('height="140"');
  });

  it('strips the pan/zoom transform from the root group', () => {
    const out = serializeForExport(makeSvg(), { minX: 0, minY: 0, width: 100, height: 60 });
    expect(out).not.toContain('translate(100, 200)');
  });

  it('drops the Tailwind class and prepends a white background rect', () => {
    const out = serializeForExport(makeSvg(), { minX: 0, minY: 0, width: 100, height: 60 });
    expect(out).not.toContain('class=');
    expect(out).toContain('<rect x="-40" y="-40" width="180" height="140" fill="#ffffff"');
    // background rect is the first child, before the content group
    expect(out.indexOf('<rect')).toBeLessThan(out.indexOf('<g'));
  });

  it('inlines resolved computed colors onto the clone', () => {
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      fill: '#ff0000',
      stroke: '#00ff00',
    } as CSSStyleDeclaration);
    const out = serializeForExport(makeSvg(), { minX: 0, minY: 0, width: 100, height: 60 });
    expect(out).toContain('fill="#ff0000"');
    expect(out).toContain('stroke="#00ff00"');
  });

  it('skips colors that resolve to none', () => {
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      fill: 'none',
      stroke: 'none',
    } as CSSStyleDeclaration);
    const out = serializeForExport(makeSvg(), { minX: 0, minY: 0, width: 100, height: 60 });
    expect(out).not.toContain('fill="none"');
    expect(out).not.toContain('stroke="none"');
  });

  it('works when the svg has no transform group', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const out = serializeForExport(svg, { minX: 0, minY: 0, width: 100, height: 60 });
    expect(out).toContain('viewBox="-40 -40 180 140"');
  });
});

// ---------------------------------------------------------------------------
// downloadSvg (DOM + blob)
// ---------------------------------------------------------------------------

describe('downloadSvg', () => {
  it('triggers a download with an SVG blob and the requested filename', () => {
    const { createObjectURL, revokeObjectURL } = stubBlobUrl();
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    const appendSpy = vi.spyOn(document.body, 'appendChild');

    downloadSvg('<svg></svg>', 'diagram.svg');

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'image/svg+xml;charset=utf-8' })
    );

    expect(clickSpy).toHaveBeenCalledTimes(1);
    const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.download).toBe('diagram.svg');
    expect(anchor.href).toBe('blob:mock');
    expect(revokeObjectURL).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// downloadPng (DOM + canvas)
// ---------------------------------------------------------------------------

describe('downloadPng', () => {
  it('rasterizes at 2x scale and triggers a download', async () => {
    const { revokeObjectURL } = stubBlobUrl();
    vi.stubGlobal('Image', FakeImage);
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    const appendSpy = vi.spyOn(document.body, 'appendChild');

    const drawImage = vi.fn();
    const toBlob = vi.fn((cb: (b: Blob | null) => void) =>
      cb(new Blob(['png'], { type: 'image/png' }))
    );
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage }),
      toBlob,
    };
    const realCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(
      ((tag: string) =>
        tag === 'canvas'
          ? (fakeCanvas as unknown as HTMLCanvasElement)
          : realCreateElement(tag)) as typeof document.createElement
    );

    await downloadPng('<svg></svg>', 100, 50, 'out.png', 2);

    expect(fakeCanvas.width).toBe(200); // 100 x scale 2
    expect(fakeCanvas.height).toBe(100); // 50 x scale 2
    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(appendSpy.mock.calls[0][0]).toMatchObject({ download: 'out.png' });
    expect(revokeObjectURL).toHaveBeenCalled();
  });

  it('rejects when the canvas 2D context is unavailable', async () => {
    stubBlobUrl();
    vi.stubGlobal('Image', FakeImage);

    // jsdom's real canvas returns null from getContext('2d').
    await expect(downloadPng('<svg></svg>', 100, 50, 'out.png')).rejects.toThrow(
      'Canvas 2D context not available'
    );
  });
});
