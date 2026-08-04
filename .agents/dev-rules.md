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
| 8 | Scope every document query by `ownerId === getUserId()`; sanitize public reads | never leak other users' data (Slice 4) |
| 9 | Validate API bodies with zod (`src/lib/api-validation.ts`) + payload byte caps | protects DB, predictable 400s |
| 10 | Guests get offline stubs — **never** write to the DB without a user | keeps guest mode local-only |
| 11 | Use `safeCallbackUrl()` for any `callbackUrl`; **never** accept raw URLs | prevents open-redirects |

## SSR / Component Rules

| Topic | Rule |
|---|---|
| Tiptap | always `immediatelyRender: false` in `useEditor()` |
| shadcn/Radix | never nest `<Button>` inside `<DropdownMenuTrigger>` without `asChild` |
| Auth UI | read session via `useSession()` from `next-auth/react` only inside `SessionProvider` (root layout) |
| Sync badge | reuse `SyncStatusBadge` for sync status — never re-derive wording/colors |

## Auth & API Rules (Slice 4)

- Server auth helper: `getUserId()` from `src/lib/auth/session.ts` (wraps `getServerSession`).
- API routes use `export const dynamic = 'force-dynamic'`.
- Ownership check pattern: `findUnique` → `doc.ownerId !== userId` → 404 (or sanitized public read).
- Share tokens: `crypto.randomBytes(24).toString('base64url')` — never guessable.
- `proxy.ts` (Next 16 middleware) does **optimistic redirects only** — real authz lives in route handlers.
- Env: `NEXTAUTH_SECRET` must be strong; provider buttons auto-hide when OAuth env vars are empty.

## Testing

> 📚 **Single reference** (workflow + conventions + coverage gate): [`Documentation/22-testing-guide.md`](../Documentation/22-testing-guide.md) · Setup walkthrough: [`Documentation/01-getting-started.md` §8](../Documentation/01-getting-started.md)

| Command | What it does |
|---|---|
| `npm test` | Run the whole Vitest suite once (CI-friendly) |
| `npm run test:watch` | Watch mode — re-runs affected tests on save |
| `npm run test:coverage` | Suite + coverage report (terminal table + `coverage/` HTML) |
| `npx vitest run tests/<file>.test.ts` | Run a single test file while iterating |

### Test layout (`tests/` mirrors `src/`)

| Folder | Covers |
|---|---|
| `tests/dsl/` | lexer, parser, AST, validator, error-messages, run-pipeline-sync, codemirror-language, codemirror-lint (+ diagnostics) |
| `tests/layout/` | dagre-adapter, sequence-layout, text-measure, wrap-text |
| `tests/store/` | workspace-store, diagram-store, diagram-registry, diagram-library-store, whiteboard-store (undo/redo, CRUD, persistence), document-store |
| `tests/render/` | orthogonal-routing, edge-geometry |
| `tests/export/` | svg-export (SVG/PNG serialization & downloads) |

### Conventions & gotchas

- **Explicit imports** — every suite imports `describe`/`expect`/`it`/`vi` from `vitest` (no globals).
- **Node env by default**; DOM-heavy suites opt in with a first-line `// @vitest-environment jsdom` pragma (`tests/export/svg-export.test.ts`, `tests/dsl/codemirror-lint.test.ts`).
- **No `OffscreenCanvas` in node** — `measureTextWidth` falls back to `length × fontSize × 0.55`; pin that math or stub the global.
- **Module singletons** — reset Zustand stores with `useWhiteboardStore.setState({ ...defaults })` (merge keeps actions); use `vi.resetModules()` + dynamic `import()` for fresh module instances.
- **Persistence tests** — `vi.stubGlobal` for `window`/`localStorage` + `vi.useFakeTimers()` for the 300ms debounce.
- **`tsc` covers `tests/`** (tsconfig `**/*.ts`) — keep test files strict-compatible: no `any`, no unchecked `!`.
- **Coverage scope + thresholds** — `vitest.config.ts` instruments `src/lib/{dsl,layout,store,render,export}`; `npm run test:coverage` fails below **70% stmts / 60% branches / 75% funcs / 75% lines** (~86% statements baseline — run it for live numbers).

## Verification

```bash
npm test            # vitest unit tests (see Testing above)
npx tsc --noEmit    # type check (also covers tests/)
npm run lint        # lint
npm run build       # production build validation
```

CI (`.github/workflows/ci.yml`) runs tsc + lint + tests + `test:coverage` (thresholds enforced) on every push/PR.
