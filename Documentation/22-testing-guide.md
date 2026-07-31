# 22 · Testing Guide

> **What this document covers**: everything about testing in one place — the commands, where
> suites live, how the coverage gate works, the conventions and gotchas learned from the existing
> suites, and a step-by-step walkthrough for adding new tests.
>
> This is the **single reference** for the test workflow. The quick-reference version lives in
> [`.agents/dev-rules.md`](../.agents/dev-rules.md) → Testing; the setup walkthrough is in
> [01-getting-started.md §8](01-getting-started.md).
>
> 💡 **Keep this doc canonical** — when the test workflow changes, update this file first, then
> refresh the short summaries in `01-getting-started.md §8` and `.agents/dev-rules.md` so the
> quick references never drift from the full guide.

---

## 1. When to Read This

| Situation | What to do |
|---|---|
| "How do I run the tests?" | Jump to [§2 Commands](#2-commands-at-a-glance) |
| "Where should my new test file go?" | Jump to [§3 Where Tests Live](#3-where-tests-live) |
| "CI is red on coverage" | Jump to [§4 The Coverage Gate](#4-the-coverage-gate) + [§9 Troubleshooting](#9-troubleshooting) |
| "How do I write a good test here?" | Read [§5 Conventions](#5-conventions) + [§6 Gotchas](#6-gotchas), then [§7 Adding a New Suite](#7-adding-a-new-suite) |
| "I changed behavior — anything else?" | Read [§8 Coverage Report: How to Read It](#8-coverage-report-how-to-read-it) |

---

## 2. Commands at a Glance

| Command | What it does |
|---|---|
| `npm test` | Run the whole Vitest suite **once** (CI-friendly, exits when done) |
| `npm run test:watch` | Watch mode — re-runs affected tests on every file save |
| `npm run test:coverage` | Suite + coverage report (terminal table + browsable HTML in `coverage/`); **fails if coverage regresses below the thresholds** (§4) |
| `npx vitest run tests/<file>.test.ts` | Run a single test file while iterating |
| `npx vitest run --coverage tests/<area>/` | Coverage for one area while iterating |

> ⚠️ **The #1 gotcha**: plain `npm test` does **not** enforce coverage. Only
> `npm run test:coverage` checks the thresholds. If CI runs coverage, always validate with
> `npm run test:coverage` before pushing.

---

## 3. Where Tests Live

All tests live in the root **`tests/`** folder, **mirroring the `src/` structure** — one test file
per module:

```
tests/
├── dsl/      # lexer, parser, AST, validator, error-messages, run-pipeline-sync,
│             #   codemirror-language (highlighting), codemirror-lint + diagnostics (lint bridge)
├── layout/   # dagre-adapter, sequence-layout, text-measure, wrap-text
├── store/    # workspace-store, diagram-store, diagram-registry, diagram-library-store,
│             #   whiteboard-store (undo/redo, element CRUD, persistence)
├── render/   # orthogonal-routing, edge-geometry
└── export/   # svg-export (SVG/PNG serialization & downloads)
```

| You're testing | Test file goes in | Example |
|---|---|---|
| `src/lib/dsl/*.ts` | `tests/dsl/` | `tests/dsl/lexer.test.ts` |
| `src/lib/layout/*.ts` | `tests/layout/` | `tests/layout/wrap-text.test.ts` |
| `src/lib/store/*.ts` | `tests/store/` | `tests/store/whiteboard-store.test.ts` |
| `src/lib/render/*.ts` | `tests/render/` | `tests/render/orthogonal-routing.test.ts` |
| `src/lib/export/*.ts` | `tests/export/` | `tests/export/svg-export.test.ts` |

**How it's wired up** (`vitest.config.ts`):

- **Node environment by default** — the pure-TS core needs no DOM; two suites opt into a real DOM
  with a `// @vitest-environment jsdom` pragma (§6).
- **Include pattern** — only `tests/**/*.test.ts` files are collected.
- **`@/` alias** — maps to `src/`, so tests import real code exactly like the app does:
  `import { validate } from '@/lib/dsl/validator'`.
- **Coverage scope** — the instrumented (tracked) areas are exactly
  `src/lib/{dsl,layout,store,render,export}` — the pure-TS core.

---

## 4. The Coverage Gate

`npm run test:coverage` fails the run when the **tracked areas** drop below:

| Metric | Threshold |
|---|---|
| Statements | **70%** |
| Branches | **60%** |
| Functions | **75%** |
| Lines | **75%** |

Current baseline (run `npm run test:coverage` for live numbers):

| Area | Statements | Functions | Suites |
|---|---|---|---|
| `dsl` | 95.98% | 96% | 8 suites |
| `layout` | 97.41% | 93.75% | 4 suites |
| `render` | 94.25% | 87.5% | 2 suites |
| `export` | 97.33% | 93.75% | 1 suite |
| `store` | 78.33% | 87.37% | 5 suites (undo/redo paths are the branch-heavy low point) |
| **All files** | **86.47%** | **89.52%** | **258 tests / 20 files** |

> `diagram-store.ts` is at 100%; the `store` area has the lowest branch coverage (53.86% — the
> undo/redo history paths).

### How the gate behaves

- **New suites only raise coverage** — writing tests for a tracked file can only push the numbers
  up. The gate is a **floor**, not a ceiling.
- **Uncovered files drag the aggregate down** — if a new file lands inside a tracked area without
  tests, the gate can fail. Either add a small suite for it or, if it's UI/React code, keep it
  **out** of `src/lib/{dsl,layout,store,render,export}` — those areas are pure-TS and
  intentionally fully testable.
- **Thresholds are global, not per-file** — a single new 0%-covered file won't trip the gate by
  itself; a broad regression across the areas will.

### The gate in CI

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs `tsc` + `lint` + `npm test` +
`npm run test:coverage` on **every push and PR**. A coverage regression therefore turns CI red —
fix it before merging (see §9).

---

## 5. Conventions

Follow these to keep new suites consistent with the existing ones:

| Convention | Rule | Example |
|---|---|---|
| **Explicit imports** | Every suite imports `describe`/`expect`/`it`/`vi` from `vitest` — no globals | `import { describe, expect, it } from 'vitest';` |
| **One module per file** | `tests/<area>/<module>.test.ts` tests `src/lib/<area>/<module>.ts` | `tests/layout/wrap-text.test.ts` → `src/lib/layout/wrap-text.ts` |
| **Fixtures via factories** | Build minimal valid elements with a factory and override only what the test needs | `rect()` in `tests/store/whiteboard-store.test.ts` |
| **`@/` imports** | Import real code through the alias, never relative paths into `src` | `import { wrapLabel } from '@/lib/layout/wrap-text';` |
| **Strict-compatible** | `tsc` type-checks `tests/` too — no `any`, no unchecked `!` | Keep types tight |

### Example suite skeleton

```ts
import { describe, expect, it } from 'vitest';
import { wrapLabel } from '@/lib/layout/wrap-text';

describe('wrapLabel', () => {
  it('wraps a long line to the given width', () => {
    const lines = wrapLabel('a'.repeat(100), 40);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.every((l) => l.length <= 40)).toBe(true);
  });
});
```

---

## 6. Gotchas (learned from the existing suites)

- **No `OffscreenCanvas` in node** — `measureTextWidth` falls back to `length × fontSize × 0.55`.
  Either pin that math in your assertions or stub the global (`tests/layout/text-measure.test.ts`).
- **DOM-heavy suites opt in explicitly** — a first-line `// @vitest-environment jsdom` pragma
  (jsdom is a devDependency). Currently used by:
  - `tests/export/svg-export.test.ts` — SVG serialization & downloads.
  - `tests/dsl/codemirror-lint.test.ts` — a live CodeMirror `EditorView` to verify pushed
    diagnostics land in the lint state.
- **Module singletons** — the whiteboard store and the text-measure cache keep module-level state.
  - Reset a Zustand store between tests:
    `useWhiteboardStore.setState({ ...defaults })` — the merge preserves the actions.
  - For a truly fresh module instance:
    `vi.resetModules()` + a dynamic `import()`.
- **Persistence tests** — stub `window`/`localStorage` with `vi.stubGlobal(...)` and control the
  300 ms debounce with `vi.useFakeTimers()` (see the store suite).
- **Typechecking includes tests** — tsconfig's `**/*.ts` covers `tests/`, so `npx tsc --noEmit`
  validates test files too. Keep them strict-compatible.

---

## 7. Adding a New Suite

1. **Create the file** — mirror the folder you're testing:
   `tests/layout/wrap-text.test.ts` tests `src/lib/layout/wrap-text.ts`.
2. **Import Vitest explicitly** (no globals) and import the real module via `@/`:

   ```ts
   import { describe, expect, it } from 'vitest';
   import { wrapLabel } from '@/lib/layout/wrap-text';
   ```

3. **Iterate on just your file**:

   ```bash
   npx vitest run tests/layout/wrap-text.test.ts
   ```

4. **Run the full gate before pushing**:

   ```bash
   npm test && npx tsc --noEmit && npm run lint && npm run test:coverage
   ```

   If the coverage run fails, look at the terminal table (§8) to see exactly which files in the
   areas you touched are still uncovered.

---

## 8. Coverage Report: How to Read It

`npm run test:coverage` prints a **terminal table** and writes a browsable HTML report to
`coverage/` (open `coverage/index.html`).

```
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #
-------------------|---------|----------|---------|---------|-------------------
 whiteboard-store  |   74.4  |   50.77  |  83.56  |  75.79  | 94,852,864-868
```

- **Uncovered Line #** — the exact lines to target next. Add tests that hit them.
- **grep for your area** — `npm run test:coverage 2>&1 | grep store` shows just the store rows.
- Percentages are **aggregate across the tracked globs** (`src/lib/{dsl,layout,store,render,export}`).

---

## 9. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| "CI failed but `npm test` passes locally" | Plain `npm test` doesn't enforce coverage | Run `npm run test:coverage` locally and check the thresholds (§4) |
| "Coverage dropped after my change" | A new file landed in a tracked area without tests, or a refactor removed tested paths | Add a suite for the new file, or check `Uncovered Line #` and cover those lines |
| "My test can't find `window`/`localStorage`" | Node environment has no DOM | Add `// @vitest-environment jsdom` as the first line, or `vi.stubGlobal(...)` |
| "State leaks between tests" | Module-level singletons (stores, caches) | `useWhiteboardStore.setState({ ...defaults })` or `vi.resetModules()` + dynamic import |
| "`OffscreenCanvas` is not defined" | Node has no canvas | Pin the char-width fallback math or stub the global |
| "tsc errors inside my test file" | `tsc --noEmit` type-checks `tests/` too | Keep tests strict-compatible (no `any`, no unchecked `!`) |
| "Timers don't advance in my persistence test" | The 300 ms debounce is real | `vi.useFakeTimers()` + `vi.advanceTimersByTime(300)` |

---

## 10. Where to Find More

| Topic | Doc |
|---|---|
| Setup & first steps | [01-getting-started.md §8](01-getting-started.md) |
| Engine internals to test | [07-dsl-engine.md](07-dsl-engine.md) · [08-worker-pipeline.md](08-worker-pipeline.md) · [10-layout-engine.md](10-layout-engine.md) |
| Store internals to test | [06-state-management.md](06-state-management.md) · [14-whiteboard-core.md](14-whiteboard-core.md) |
| Verification + pre-push checklist | [21-development-guide.md §8](21-development-guide.md) |
| Coverage numbers at a glance | [`.agents/project-status.md`](../.agents/project-status.md) → Test Coverage |
| Quick reference for AI agents | [`.agents/dev-rules.md`](../.agents/dev-rules.md) → Testing |
