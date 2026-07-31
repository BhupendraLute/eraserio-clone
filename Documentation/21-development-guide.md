# 21 · Development Guide

> **What this document covers**: the rules every contributor must follow — engine isolation,
> worker reloads, SSR safety, export safety, theming, navigation — plus verification commands
> and common pitfalls.

---

## 1. The Golden Rules

| # | Rule | Why |
|---|---|---|
| 1 | `src/lib/dsl/` and `src/lib/layout/` are **pure TypeScript** — no `react`, `next/*`, `document`, `window`, or DOM types | The engine runs in Web Workers, main thread, and future Node.js APIs |
| 2 | Web Workers are created **only inside `useEffect`** | Workers don't exist during SSR |
| 3 | After editing files imported by `pipeline.worker.ts`, **restart `npm run dev`** | The worker bundle doesn't hot-reload |
| 4 | **No `<foreignObject>`** in exported diagram SVG | It taints the canvas and breaks PNG export |
| 5 | Diagram icons use **static SVG paths** (`NodeIcon.tsx`) | Never mount React icon components inside the exported SVG |
| 6 | Theme colors: `text-foreground/40-60` + `stroke="currentColor"`; **never** hardcode `#000`/`#fff` strokes | Keeps light/dark theme working |
| 7 | Navigate with `next/link` `<Link>` or `useRouter()`; **never** `<a href>` / `window.location.href` | Raw navigation reloads the page and loses all Zustand state |

---

## 2. Engine Isolation (Rule 1 in Detail)

**Files affected**: everything under `src/lib/dsl/` and `src/lib/layout/`.

✅ Allowed imports: `chevrotain`, `dagre`, sibling modules within `src/lib`.

❌ Forbidden imports: `react`, `react-dom`, `next/*`, `@/components/*`, `window`, `document`,
`HTMLElement`, `SVGElement`, `localStorage`.

**Why it matters**: `pipeline.worker.ts` imports these modules. If one of them pulls in React, the
worker bundle explodes (or breaks at runtime). The sync preview (`run-pipeline-sync.ts`) also runs
these on the main thread — and someday they'll run in Node.js server-side.

**Test**: before committing, run `npx tsc --noEmit` — type errors will flag DOM/React leaks in
engine files.

---

## 3. Web Worker Rules (Rules 2–3)

### 3.1 Client-only instantiation

```ts
// ✅ Correct — inside useEffect
useEffect(() => {
  const w = new Worker(new URL('../../workers/pipeline.worker.ts', import.meta.url));
  setWorker(w);
  return () => w.terminate();
}, []);
```

### 3.2 Restart required after engine edits

`pipeline.worker.ts` imports:

```
lexer.ts → parser.ts → ast.ts → validator.ts → error-messages.ts
dagre-adapter.ts → text-measure.ts, wrap-text.ts, node-style.ts, text-style.ts
sequence-layout.ts → sequence-types.ts
```

Edit **any** of those → **restart `npm run dev`** (or hard refresh `Ctrl+Shift+R`). This is the
#1 source of "my change doesn't work" bugs in this repo.

---

## 4. React 19 / SSR Hydration (Rule: Tiptap)

### 4.1 Tiptap

Always set `immediatelyRender: false` in `useEditor()`:

```ts
const editor = useEditor({
  extensions: [...],
  immediatelyRender: false,  // ⚠️ required
});
```

### 4.2 shadcn/Radix

Never nest a `<Button>` inside `<DropdownMenuTrigger>` **without `asChild`**:

```tsx
// ✅
<DropdownMenuTrigger asChild>
  <Button variant="ghost">Open</Button>
</DropdownMenuTrigger>

// ❌ <DropdownMenuTrigger><Button/></DropdownMenuTrigger> — breaks accessibility/events
```

---

## 5. Export Safety (Rules 4–5)

The diagram export path (`serializeForExport`) clones the live SVG and inlines computed colors.
For that to work:

- **No `<foreignObject>`** in `FlowchartCanvas`/`SequenceDiagramCanvas` SVG (it can't be
  rasterized to PNG).
- **Icons are static path data** (`NodeIcon.tsx`) — never `<IconifyWrapper/>` or lucide components
  inside the exported SVG.

> ℹ️ The *whiteboard* canvas does use `foreignObject` (icons, code blocks, inline editors) — but
> its export path is html-to-image, which handles foreignObject. Don't copy that pattern into the
> diagram canvases.

---

## 6. Theme Colors (Rule 6)

| Correct | Incorrect |
|---|---|
| `className="text-foreground/60"` + `stroke="currentColor"` | `stroke="#6b7280"` |
| `fill="var(--background)"` | `fill="#ffffff"` |
| `className="text-muted-foreground"` | `color: '#999'` |
| `var(--canvas-accent)` for whiteboard chrome | hardcoded accent hex |

The exception: curated palettes in `node-style.ts` / `whiteboard-types.ts`
(`NODE_COLORS`, `WHITEBOARD_COLORS`) define brand colors — those are the source of truth and are
resolved at render time.

---

## 7. Navigation (Rule 7)

```tsx
// ✅ Client navigation (preserves Zustand state)
<Link href="/settings">Settings</Link>
// or
const router = useRouter(); router.push('/settings');

// ❌ Never
// <a href="/settings">Settings</a>
// window.location.href = '/settings'
```

---

## 8. Verification Commands

```bash
npm test            # Vitest unit tests (tests/ folder — dsl, layout, store, render)
npx tsc --noEmit    # Type-check the entire project (catches DOM leaks in engine files too)
npm run lint        # ESLint
npm run build       # Full production build validation (slowest, most thorough)
```

**Suggested pre-push checklist**:

1. `npx tsc --noEmit` — zero errors.
2. `npm run lint` — zero errors.
3. `npm run build` — passes (catches SSR issues TSC misses).
4. If you touched engine files → restart dev server and manually verify the diagram still parses.
5. If you touched export → export a PNG and confirm it isn't blank/black.

---

## 9. Common Pitfalls & Fixes

| Symptom | Cause | Fix |
|---|---|---|
| "My lexer/parser change doesn't do anything" | Worker bundle not reloaded | Restart `npm run dev` |
| Hydration mismatch warnings in console | Tiptap `immediatelyRender` missing, or theme/whiteboard hydrate timing | Set `immediatelyRender: false`; hydrate in `useEffect` |
| Exported PNG is blank/black | `inlineComputedColors` missed something; `<foreignObject>` present; hardcoded colors | Check for foreignObject in diagram canvases; re-test export |
| Diagram state leaks between files | Forgot to reset store slices | Use `loadDiagram()` which resets overrides/errors/nodes |
| Undo jumps multiple steps | Store action didn't call `pushHistory` | Every mutating action must push history (except move/align which batch differently — check each) |
| Whiteboard elements vanish on refresh | localStorage cleared/quota | Elements persist via debounced `saveElements`; check `localStorage` for `eraser-whiteboard-elements` |
| Type errors about `window`/`document` in `src/lib` | Accidental DOM dependency in engine code | Move DOM-dependent logic into `src/components` or `src/lib/hooks` |
| `'use client'` missing | Component uses hooks/events but is treated as server component | Add `'use client'` at the top of the file |

---

## 10. Code Style Notes

- **Path aliases**: use `@/...` (configured in `tsconfig.json`) instead of relative paths.
- **Class merging**: use `cn()` from `@/lib/utils` (tailwind-merge) for conditional classes.
- **IDs**: `generateId(prefix)` from `@/lib/utils` — used for all whiteboard element ids.
- **Store selectors**: subscribe with `useStore((s) => s.field)`; use `useStore.getState()` outside
  React.
- **Comments**: this codebase values explanatory comments — keep the "why" next to tricky logic.

---

## 11. Where to Find More

| Topic | Doc |
|---|---|
| Set up & run the app | [01-getting-started.md](01-getting-started.md) |
| Full architecture | [02-architecture-overview.md](02-architecture-overview.md) |
| Folder map | [03-project-structure.md](03-project-structure.md) |
| DSL engine | [07-dsl-engine.md](07-dsl-engine.md) |
| Worker pipeline | [08-worker-pipeline.md](08-worker-pipeline.md) |
| Whiteboard internals | [14-whiteboard-core.md](14-whiteboard-core.md) → [19-whiteboard-toolbars.md](19-whiteboard-toolbars.md) |
| End-to-end flows | [20-data-flows.md](20-data-flows.md) |
