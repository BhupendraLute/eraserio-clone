# 01 · Getting Started

> **What this document covers**: how to install, run, and explore the Eraser.io Clone project.
> Perfect for a first-time contributor.

---

## 1. Prerequisites

Before you start, make sure you have:

| Tool | Version | Why you need it |
|---|---|---|
| **Node.js** | 20.x or newer | Runs the Next.js dev server & build tools |
| **npm** | 9.x or newer | Installs dependencies (comes with Node) |
| **Git** | any | Clone the repository & manage changes |
| **VS Code** (optional) | any | Best-in-class editor experience |

Check your versions:

```bash
node --version   # e.g. v20.11.0
npm --version    # e.g. 10.2.4
```

---

## 2. Install & Run

```bash
# 1. Clone the repository (if you haven't already)
git clone <repository-url>
cd eraserio-clone

# 2. Install all dependencies
npm install

# 3. Start the development server
npm run dev
```

Open **http://localhost:3000** in your browser. The home page (`/`) automatically
redirects to **/whiteboard** where the canvas lives.

> ⚠️ **First-run note**: the diagram engine runs in a **Web Worker**. When you edit any file
> imported by `src/workers/pipeline.worker.ts` (that's `lexer.ts`, `parser.ts`, `dagre-adapter.ts`,
> `sequence-layout.ts`, and friends), Next.js does **not** hot-reload the worker bundle. You must
> **restart `npm run dev`** (or hard-refresh with `Ctrl+Shift+R`) to see your changes. See
> [08-worker-pipeline.md](08-worker-pipeline.md).

---

## 3. Available Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Create an optimized production build |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint over the whole codebase |
| `npm test` | Run the unit-test suite once (see [section 8](#8-running-the-tests)) |
| `npm run test:watch` | Run Vitest in watch mode — re-runs on every save |
| `npx tsc --noEmit` | Type-check the whole project (not a script, but the standard check) |

Use `npm test`, `npx tsc --noEmit`, and `npm run lint` before pushing changes.

---

## 4. What You Can Do in the App

This app is a clone of **Eraser.io** and combines three tools in one UI shell:

```mermaid
flowchart LR
    subgraph App["Eraser.io Clone"]
        A["🖼️ Whiteboard<br/>(freeform canvas)"]
        B["📐 Diagram-as-Code<br/>(type DSL → diagram)"]
        C["📝 Docs Editor<br/>(rich text + embedded diagrams)"]
    end

    A <--> B
    B <--> C
```

| Feature | How to try it |
|---|---|
| **Whiteboard** | Open `/whiteboard`. Pick a shape from the left toolbar and drag on the canvas. |
| **Diagram-as-Code** | Click the "Diagram-as-Code" tab in the left nav. Type `flowchart` DSL in the left panel and watch the diagram render on the right. |
| **Docs editor** | Click the "Markdown Docs" tab. Type `/` to open the slash-command menu. |

---

## 5. Keyboard Shortcuts (Whiteboard)

These are handy while developing the canvas:

| Shortcut | Action |
|---|---|
| `V` / `R` / `O` / `A` / `L` / `P` / `T` / `F` / `C` | Select / Rectangle / Circle / Arrow / Line / Pencil / Text / Frame / Comment |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo |
| `Ctrl+C` / `Ctrl+V` / `Ctrl+D` | Copy / Paste / Duplicate |
| `Ctrl+G` / `Ctrl+Shift+G` | Group / Ungroup |
| `Delete` / `Backspace` | Delete selection |
| `Space + drag` | Pan the canvas |
| `Ctrl + scroll` | Zoom in/out |
| `Tab` | Spawn a connected node from the selected shape |
| `Ctrl+K` | Command palette |

---

## 6. Recommended Reading Order

```mermaid
flowchart TD
    A["01 Getting Started<br/>(you are here)"] --> B["02 Architecture Overview"]
    B --> C["03 Project Structure"]
    C --> D["06 State Management"]
    D --> E["Pick a feature area:"]
    E --> F["07-12 · Diagram Engine"]
    E --> G["13 · Docs Editor"]
    E --> H["14-19 · Whiteboard"]
    F & G & H --> I["20 Data Flows"]
    I --> J["21 Development Guide"]
```

---

## 7. Common First Questions

- **"Where does the diagram rendering happen?"** → `src/components/editor/FlowchartCanvas.tsx` and `SequenceDiagramCanvas.tsx` (see [11-diagram-rendering.md](11-diagram-rendering.md)).
- **"Where is the whiteboard state?"** → `src/lib/store/whiteboard-store.ts` (see [14-whiteboard-core.md](14-whiteboard-core.md)).
- **"How does the DSL become a diagram?"** → the Web Worker pipeline, see [07-dsl-engine.md](07-dsl-engine.md) and [08-worker-pipeline.md](08-worker-pipeline.md).
- **"Where is the app layout?"** → `src/components/workspace/EraserWorkspace.tsx` (see [05-app-shell-navigation.md](05-app-shell-navigation.md)).

---

## 8. Running the Tests

> **What this covers**: how to run the unit-test suite and how to add tests for new code.
> The project uses [Vitest](https://vitest.dev).
> 📚 The consolidated testing reference — commands, conventions, and the coverage gate — lives in
> [22-testing-guide.md](22-testing-guide.md).

### 8.1 Commands

| Command | What it does |
|---|---|
| `npm test` | Run the whole suite once (CI-friendly, exits when done) |
| `npm run test:watch` | Watch mode — re-runs affected tests on every file save |
| `npm run test:coverage` | Run the suite with a coverage report (terminal table + HTML in `coverage/`); **fails if coverage regresses below the thresholds** (see §8.2) |
| `npx vitest run tests/<file>.test.ts` | Run a single test file while developing |

### 8.2 Where the tests live

All tests live in the root **`tests/`** folder, mirroring the `src/` structure:

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

Everything is wired up in `vitest.config.ts`:

- **Node environment** — tests run without a DOM, which is exactly right for the pure-TS core.
- **Include pattern** — only files matching `tests/**/*.test.ts` are collected.
- **`@/` alias** — maps to `src/`, so tests import real code the same way the app does
  (e.g. `import { validate } from '@/lib/dsl/validator'`).
- **Coverage thresholds** — `npm run test:coverage` fails the run when the tracked areas
  (`src/lib/{dsl,layout,store,render,export}`) drop below **70% statements / 60% branches / 75%
  functions / 75% lines**. Current baseline is ~86% statements (run the command for live numbers).

### 8.3 Adding a new test suite

1. Create a file at `tests/<area>/<module>.test.ts` — mirror the folder you're testing, so
   `tests/layout/wrap-text.test.ts` tests `src/lib/layout/wrap-text.ts`.
2. Import Vitest explicitly (no global `describe`/`it`/`expect`):

   ```ts
   import { describe, expect, it } from 'vitest';
   import { wrapLabel } from '@/lib/layout/wrap-text';
   ```

3. Run just your file while iterating:

   ```bash
   npx vitest run tests/layout/wrap-text.test.ts
   ```

4. Before pushing, run the full gate:

   ```bash
   npm test && npx tsc --noEmit && npm run lint && npm run test:coverage
   ```

   > ⚠️ **The coverage gate** — only `npm run test:coverage` enforces coverage (plain `npm test`
   > does **not**). It fails the run when the tracked areas
   > (`src/lib/{dsl,layout,store,render,export}`) drop below **70% statements / 60% branches /
   > 75% functions / 75% lines** (see §8.2). What that means when you add a suite:
   >
   > - **New suites only raise coverage** — writing tests for a tracked file can only push the
   >   numbers up, so the gate is a floor, not a ceiling.
   > - **Uncovered files drag the aggregate down** — if a new file lands inside a tracked area
   >   without tests, the gate can fail. Either add a small suite for it or, if it's UI/React
   >   code, move it out of `src/lib/{dsl,layout,store,render,export}` (those areas are pure-TS
   >   and intentionally fully testable).
   > - **Check the terminal table** — the coverage run prints per-file percentages and
   >   un-covered line numbers; grep for the area you touched to see exactly what's still
   >   uncovered.

### 8.4 Conventions & gotchas (learned from the existing suites)

- **Fixtures via factories** — build minimal valid elements with a factory function and override
  only what a test needs (see `rect()` in `tests/store/whiteboard-store.test.ts`).
- **No DOM in tests** — the node environment has no `OffscreenCanvas`, so `measureTextWidth`
  falls back to its char-width heuristic. Tests either pin that math or stub the global (see
  `tests/layout/text-measure.test.ts`). Two suites opt into a real DOM with a
  `// @vitest-environment jsdom` pragma (jsdom is a devDependency):
  `tests/export/svg-export.test.ts` (SVG serialization & downloads) and
  `tests/dsl/codemirror-lint.test.ts` (a live CodeMirror `EditorView` to verify pushed
  diagnostics land in the lint state).
- **Module singletons** — the whiteboard store and the text-measure cache keep module-level
  state. Reset a Zustand store between tests with `useWhiteboardStore.setState({ ...defaults })`
  (a merge preserves the actions); use `vi.resetModules()` + a dynamic `import()` when you need
  a fresh module instance.
- **Persistence tests** — stub `window`/`localStorage` with `vi.stubGlobal(...)` and control the
  300ms debounce with `vi.useFakeTimers()` (see the store suite).
- **Typechecking includes tests** — tsconfig's `**/*.ts` covers `tests/`, so `npx tsc --noEmit`
  validates test files too. Keep them strict-compatible (no `any`, no unchecked `!`).
