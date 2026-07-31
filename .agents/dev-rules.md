# Dev Rules — Quick Reference

> 📚 **Full guide (pitfalls + commands):** [`Documentation/21-development-guide.md`](../Documentation/21-development-guide.md)

## Golden Rules

| # | Rule | Why |
|---|---|---|
| 1 | `src/lib/dsl/` + `src/lib/layout/` = **pure TS** (no react/DOM/next) | runs in worker, main thread, Node |
| 2 | Workers created **only inside `useEffect`** | no workers during SSR |
| 3 | Edit worker-imported files → **restart `npm run dev`** | worker bundle has no HMR |
| 4 | **No `<foreignObject>`** in exported SVG | taints canvas, breaks PNG export |
| 5 | Diagram icons = **static SVG paths** (`NodeIcon.tsx`) | export-safe |
| 6 | Theme: `text-foreground/40-60` + `currentColor`; **never** hardcode `#000`/`#fff` strokes | keeps light/dark working |
| 7 | Use `next/link`; **never** `<a href>` / `window.location.href` | preserves Zustand state |

## SSR / Component Rules

| Topic | Rule |
|---|---|
| Tiptap | always `immediatelyRender: false` in `useEditor()` |
| shadcn/Radix | never nest `<Button>` inside `<DropdownMenuTrigger>` without `asChild` |

## Verification

```bash
npm test            # vitest unit tests (tests/ folder)
npx tsc --noEmit    # type check
npm run lint        # lint
npm run build       # production build validation
```
