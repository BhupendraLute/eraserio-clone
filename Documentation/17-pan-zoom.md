# 17 · Pan & Zoom

> **What this document covers**: `usePanZoom.ts` — the hook powering panning, zooming,
> pinch gestures, and fit-to-content for both the diagram canvases and the whiteboard.

---

## 1. What It Provides

```ts
export function usePanZoom(initial: PanZoomState = { scale: 1, x: 0, y: 0 }) {
  // returns:
  {
    transform,      // { scale, x, y }
    svgRef,         // attach to the <svg>
    setTransform,
    handlers: { onWheel, onPointerDown, onPointerMove, onPointerUp },
    zoomIn, zoomOut,
    reset,
    fitToContent,   // fit a node list
    fitBounds,      // fit a width×height box
  }
}
```

The canvas renders a `<g>` translated & scaled by `transform`:

```tsx
<g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
```

---

## 2. The Transform Math

`transform = { scale, x, y }` maps **canvas coords** to **screen coords**:

```
screenX = canvasX * scale + x
screenY = canvasY * scale + y
```

And the reverse (used everywhere when converting pointer events):

```
canvasX = (screenX - x) / scale
canvasY = (screenY - y) / scale
```

**Zooming at a point** (keep the point under the cursor fixed) is the classic formula:

```ts
const nextScale = clampScale(prev.scale - e.deltaY * ZOOM_SENSITIVITY * prev.scale);
// point in diagram space currently under the cursor
const diagramX = (pointerX - prev.x) / prev.scale;
const diagramY = (pointerY - prev.y) / prev.scale;
// recompute pan so that same point stays under the cursor
const nextX = pointerX - diagramX * nextScale;
const nextY = pointerY - diagramY * nextScale;
```

---

## 3. Scroll Behavior

- **Ctrl/Cmd + scroll** → zoom (snap, no smoothing).
- **Plain scroll** → smooth pan with easing (`ensureSmoothScroll` + `requestAnimationFrame`).

```ts
const onWheel = useCallback((e) => {
  e.preventDefault();
  if (e.ctrlKey || e.metaKey) { /* zoom at pointer (see above) */ return; }
  // smooth pan
  const base = scrollRafRef.current !== null ? scrollTargetRef.current : transformRef.current;
  scrollTargetRef.current = { scale: base.scale, x: base.x - e.deltaX * 1.5, y: base.y - e.deltaY * 1.5 };
  ensureSmoothScroll();
}, []);
```

### Smooth scroll engine

```ts
function ensureSmoothScroll() {
  if (scrollRafRef.current !== null) return; // already animating
  const animate = () => {
    setTransform((prev) => {
      const target = scrollTargetRef.current;
      const dist = Math.hypot(target.x - prev.x, target.y - prev.y);
      if (dist < SCROLL_SNAP_THRESHOLD) { scrollRafRef.current = null; return { ...prev, x: target.x, y: target.y }; }
      const ease = Math.min(0.2, SCROLL_EASE_LERP + dist * 0.003); // adaptive ease
      scrollRafRef.current = requestAnimationFrame(animate);
      return { ...prev, x: prev.x + dx * ease, y: prev.y + dy * ease };
    });
  };
  scrollRafRef.current = requestAnimationFrame(animate);
}
```

---

## 4. Pointer Panning

Left-drag pans (the whiteboard wires this to middle-click/space/hand separately in
`useWhiteboardInteractions`):

```ts
const onPointerDown = (e) => {
  if (e.button !== 0) return;
  cancelSmoothScroll();
  isPanning.current = true;
  lastPointer.current = { x: e.clientX, y: e.clientY };
  (e.target as Element).setPointerCapture(e.pointerId);
};

const onPointerMove = (e) => {
  if (!isPanning.current || !lastPointer.current) return;
  const dx = e.clientX - lastPointer.current.x;
  const dy = e.clientY - lastPointer.current.y;
  lastPointer.current = { x: e.clientX, y: e.clientY };
  setTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
};
```

---

## 5. Touch Gestures (pinch zoom + two-finger pan)

Direct, **non-passive** listeners are attached to the SVG (React synthetic events can't call
`preventDefault()` reliably for touch):

```ts
useEffect(() => {
  const svg = svgRef.current;
  svg.addEventListener('touchstart', handleTouchStart, { passive: false });
  svg.addEventListener('touchmove',  handleTouchMove,  { passive: false });
  svg.addEventListener('touchend',   handleTouchEnd,   { passive: true });
  return () => { /* remove all three */ };
}, [handlers]);
```

`handleTouchMove` computes the pinch distance ratio and re-pans so the canvas point under the
initial midpoint stays under the current midpoint:

```ts
const scaleFactor = dist / state.initialPinchDist;
const newScale = clampScale(state.initialScale * scaleFactor);
const canvasPointX = (state.initialMidX - rect.left - state.initialX) / state.initialScale;
const newX = midX - rect.left - canvasPointX * newScale;
// ...same for Y
setTransform({ scale: newScale, x: newX, y: newY });
```

---

## 6. Animated Transitions (fit / reset / buttons)

`animateTo(target)` smoothly interpolates `transform` toward a target using a **distance-based
adaptive ease**:

```ts
function animateTo(target: PanZoomState) {
  cancelSmoothScroll(); cancelAnim();
  animTargetRef.current = target;
  const step = () => {
    setTransform((prev) => {
      const t = animTargetRef.current;
      const dist = Math.hypot(t.x - prev.x, t.y - prev.y, (t.scale - prev.scale) * 500);
      if (dist < ANIM_SNAP_THRESHOLD) { /* snap to target, stop */ }
      const ease = Math.min(0.25, ANIM_LERP + dist * 0.002);
      return { scale: prev.scale + ds * ease, x: prev.x + dx * ease, y: prev.y + dy * ease };
    });
  };
  animRafRef.current = requestAnimationFrame(step);
}
```

`reset()` → `animateTo({ scale: 1, x: 0, y: 0 })`.

---

## 7. Fit-to-Content

Two variants:

- **`fitToContent(nodes: LaidOutNode[])`** — computes the bounding box of nodes, scales to fit the
  viewport minus `FIT_PADDING` (60px), capped at `FIT_MAX_SCALE` (2×), and centers it:

```ts
const rawScale = Math.min(availableWidth / contentWidth, availableHeight / contentHeight, FIT_MAX_SCALE);
const scale = clampScale(rawScale);
const x = viewport.width / 2 - contentCenterX * scale;
const y = viewport.height / 2 - contentCenterY * scale;
animateTo({ scale, x, y });
```

- **`fitBounds(width, height)`** — same math but takes an explicit content box (used by sequence
  diagrams, which produce overall width/height rather than a node list).

---

## 8. Constants

```ts
const MIN_SCALE = 0.2;          // can't zoom out beyond 20%
const MAX_SCALE = 3;            // can't zoom in beyond 300%
const ZOOM_SENSITIVITY = 0.001;
const FIT_PADDING = 60;
const FIT_MAX_SCALE = 2;
const ANIM_LERP = 0.12;
const ANIM_SNAP_THRESHOLD = 0.3;
```

---

## 9. Consumers

| Consumer | Which API it uses |
|---|---|
| `FlowchartCanvas` | `fitToContent(nodes)` on first render + zoom buttons |
| `SequenceDiagramCanvas` | `fitBounds(width, height)` |
| `WhiteboardCanvas` | everything; passes handlers into `useWhiteboardInteractions` |
| `ZoomPanMenu` | `onZoomIn/Out/FitContent/FitSelection/Reset` props |

---

## 10. Gotchas

- Always **cancel in-flight animations** before starting a new one (both smooth scroll and
  animated transitions) or they'll fight each other.
- `fitToContent` guards against zero-area content (`Math.max(..., 10)`) to avoid `Infinity`/`NaN`.
- Keep `transformRef` in sync (a `useEffect` writes `transform` into it) — wheel handlers read the
  ref, not stale state.
