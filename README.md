# 🧮 Eraser.io Clone

<div align="center">

**A unified technical documentation & diagramming workbench** — Diagram-as-Code, Markdown Docs, and a Freeform Whiteboard in one app.

[![CI](https://github.com/BhupendraLute/eraserio-clone/actions/workflows/ci.yml/badge.svg)](https://github.com/BhupendraLute/eraserio-clone/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?logo=tailwindcss&logoColor=white)
![Tests](https://img.shields.io/badge/tests-429%20passed-22c55e)
![Coverage](https://img.shields.io/badge/coverage-92%25%20statements-22c55e)
![Status](https://img.shields.io/badge/status-v0.6.0-3b82f6)

</div>

---

## ✨ What It Is

A full-featured clone of [Eraser.io](https://eraser.io) — **three products in one codebase**:

|     | Product                 | Highlights                                                                                                                       |
| --- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 🧩  | **Diagram-as-Code**     | Write flowchart & sequence diagrams in a custom DSL → syntax-highlighted CodeMirror editor → auto-layout via Dagre → live canvas |
| 📝  | **Markdown Docs**       | Tiptap rich-text editor with interactive diagram embeds, slash commands, and a diagram library                                   |
| 🎨  | **Freeform Whiteboard** | Shapes, arrows, pencil, text, cloud icons & comments on an infinite SVG canvas with orthogonal routing                           |

---

## 🧱 Tech Stack

| Category           | Choice                                                                     |
| ------------------ | -------------------------------------------------------------------------- |
| **Framework**      | Next.js 16 (App Router) + React 19 + React Compiler                        |
| **Styling**        | TailwindCSS v4 + shadcn/ui                                                 |
| **Diagram Engine** | Chevrotain (lexer/parser) + Dagre (auto-layout)                            |
| **Code Editor**    | CodeMirror 6 with custom DSL syntax highlighting & linting                 |
| **Rich Text**      | Tiptap (ProseMirror) with diagram embeds + slash commands                  |
| **State**          | Zustand v5 (5 stores) + TanStack React Query                               |
| **Whiteboard**     | Custom SVG canvas, `perfect-freehand` pencil, orthogonal connector routing |
| **Export**         | `html-to-image` (PNG) + `jsPDF`                                            |
| **Testing**        | Vitest 4 + V8 coverage (thresholds enforced in CI)                         |

---

## 🚀 Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the app redirects to `/whiteboard`.

### Routes

| Route         | Description                   |
| ------------- | ----------------------------- |
| `/`           | Redirects to `/whiteboard`    |
| `/whiteboard` | Canvas-only whiteboard view   |
| `/settings`   | Settings & keyboard shortcuts |

---

## 🏛️ System Architecture

The app is split into **four clean layers**. The engine is _pure TypeScript_ — no React, no DOM — so it runs in a Web Worker, on the main thread, and even in Node (tests).

```mermaid
flowchart TB
    subgraph UI["UI Layer — React Components"]
        Pages["Next.js Pages<br/>(/, /whiteboard, /settings)"]
        Shell["AppNav + EraserHeader + EraserWorkspace"]
        Editors["CodeMirror DSL Editor +<br/>Tiptap Docs Editor"]
        WB["Whiteboard Canvas<br/>(elements, overlays, toolbars)"]
    end

    subgraph Stores["State Layer — Zustand (5 stores)"]
        WS["Workspace Store<br/>(view mode, tabs)"]
        DS["Diagram Store<br/>(source, nodes, errors)"]
        Reg["Diagram Registry<br/>(saved diagrams CRUD)"]
        WBS["Whiteboard Store<br/>(elements, tool, undo/redo)"]
    end

    subgraph Engine["Engine Layer — Pure TS"]
        DSL["DSL Engine<br/>lexer → parser → AST → validator"]
        Layout["Layout Engine<br/>dagre-adapter · sequence-layout"]
        Render["Render Helpers<br/>orthogonal-routing · edge-geometry"]
        Export["Export<br/>svg-export"]
    end

    subgraph Worker["Web Worker — off main thread"]
        PW["pipeline.worker.ts<br/>(debounced + stale-guard)"]
    end

    UI --> Stores
    Editors --> DS
    WB --> WBS
    DS --> PW
    PW --> DSL
    DSL --> Layout
    Layout --> Render
    Render --> DS
    WBS -. debounced save .-> LS[("localStorage")]
    Export --> UI
```

**Why a Web Worker?** Parsing + layout run off the main thread (200 ms debounce), so the UI never freezes while you type. Stale worker responses are dropped via a request-id guard.

---

## 🔀 Data Flows

### 1. Keystroke → Diagram Canvas (the DSL pipeline)

```mermaid
sequenceDiagram
    participant E as CodeMirror Editor
    participant S as Diagram Store (Zustand)
    participant H as usePipelineWorker
    participant W as Web Worker
    participant L as Layout Engine
    participant C as Flowchart / Sequence Canvas

    E->>S: setSource(code)
    S->>H: source changed
    H->>H: debounce 200 ms
    H->>W: postMessage({ id, code })
    W->>W: lex → parse → AST → validate
    W->>L: dagre / sequence layout
    W-->>H: postMessage({ id, nodes, edges, errors })
    alt id === latestSentId (not stale)
        H->>S: applyResult / setErrors
        S->>C: re-render nodes & edges
    end
```

### 2. Whiteboard Draw & Undo/Redo

```mermaid
flowchart LR
    T["Select Tool<br/>(rectangle, arrow, pencil…)"] --> P["Pointer down / up"]
    P --> B["Bounding box"]
    B --> A["addElement()"]
    A --> H["pushHistory (cap 100)"]
    H --> D["debounced saveElements (300 ms)"]
    D --> LS[("localStorage")]
    H --> U["undo() / redo()<br/>swap history & future stacks"]
```

### 3. SVG / PNG Export

```mermaid
flowchart LR
    CANVAS["Canvas / Diagram"] --> CLONE["Clone DOM node"]
    CLONE --> COLORS["Inline computed colors"]
    COLORS --> VIEWBOX["Set viewBox"]
    VIEWBOX --> BG["White background rect"]
    BG --> SER["Serialize to SVG"]
    SER --> DL["Download (SVG / PNG via html-to-image)"]
```

---

## 📁 Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── page.tsx          # redirect → /whiteboard
│   ├── whiteboard/       # canvas-only whiteboard
│   └── settings/         # shortcuts & settings
├── components/
│   ├── canvas/           # vertical toolbar, insert popup
│   ├── docs/             # Tiptap embed node + slash commands
│   ├── editor/           # flowchart & sequence canvases
│   ├── whiteboard/       # canvas, elements, overlays, toolbars
│   ├── workspace/        # app shell
│   └── ui/               # shadcn/ui primitives
├── lib/
│   ├── dsl/              # 💎 pure-TS engine: lexer, parser, AST, validator
│   ├── layout/           # 💎 pure-TS: dagre adapter, sequence layout
│   ├── render/           # edge geometry, orthogonal routing
│   ├── export/           # svg-export
│   ├── store/            # 5 Zustand stores
│   ├── hooks/            # usePanZoom, useWhiteboardInteractions, …
│   ├── icons/            # cloud icon catalog
│   └── whiteboard/       # whiteboard types & helpers
├── workers/
│   └── pipeline.worker.ts # DSL pipeline off the main thread
tests/                     # Vitest suites mirroring src/ (dsl, layout, store, render, export)
```

---

## 📊 Project Status

### Delivery Slices

| Slice | Name                                           | Status               |
| ----- | ---------------------------------------------- | -------------------- |
| 1     | Diagram-as-Code Engine (Flowcharts + Sequence) | ✅ **DONE** (v0.2.0) |
| 2     | Markdown Docs Editor + Embedded Diagrams       | ✅ **DONE** (v0.3.0) |
| 3     | Freeform Whiteboard + Eraser.io UI Clone       | ✅ **DONE** (v0.5.0) |
| 4     | Auth, Database & Persistence                   | ✅ **DONE** (v0.6.0) |
| 5     | AI Diagram Generation (Architecta AI)         | ✅ **DONE** (v0.6.0) |
| 6     | Real-Time Multiplayer (Yjs CRDTs)              | ⏳ Planned           |
| 7     | Integrations & Public API                      | ⏳ Planned           |

### Test Coverage

| Area          | Statements | Functions  | Suites (`tests/`)                                                            |
| ------------- | ---------- | ---------- | ---------------------------------------------------------------------------- |
| `dsl`         | 95.98%     | 96%        | lexer, parser, AST, validator, error-messages, run-pipeline-sync, codemirror |
| `layout`      | 97.41%     | 93.75%     | dagre-adapter, sequence-layout, text-measure, wrap-text                      |
| `render`      | 94.25%     | 87.5%      | orthogonal-routing, edge-geometry                                            |
| `export`      | 97.33%     | 93.75%     | svg-export                                                                   |
| `store`       | 82.50%     | 88.50%     | all 6 stores (undo/redo, CRUD, auto-save persistence)                        |
| `icons`       | 98.00%     | 95.00%     | icon-catalog, dynamic keyword search, 80+ architecture icons                 |
| **All files** | **92.15%** | **94.20%** | **429 tests / 30 test files**                                                |

> Thresholds enforced in CI: **70% statements / 60% branches / 75% functions / 75% lines** — `npm run test:coverage` fails on regression.

---

## 🛠️ Development

```bash
npm run dev           # start dev server
npm test              # run the Vitest suite (429 tests)
npm run test:watch    # watch mode
npm run test:coverage # suite + coverage report (thresholds enforced)
npx tsc --noEmit      # type check (also covers tests/)
npm run lint          # lint (CI gate: must stay at 0 errors, 0 warnings)
npm run build         # production build
```

**CI**: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs tsc + lint + tests + `test:coverage` on every push and PR.

---

## 📚 Documentation

Full developer documentation lives in the [`Documentation/`](Documentation/index.md) folder — **21 modular guides** covering every feature with diagrams and code snippets, written for beginners:

- 🧭 Start with [Getting Started](Documentation/01-getting-started.md) and [Architecture Overview](Documentation/02-architecture-overview.md)
- 🧩 Diagram features: [DSL Engine](Documentation/07-dsl-engine.md) · [Worker Pipeline](Documentation/08-worker-pipeline.md) · [Layout Engine](Documentation/10-layout-engine.md)
- 🎨 Whiteboard: [Whiteboard Core](Documentation/14-whiteboard-core.md) · [Canvas & Rendering](Documentation/15-whiteboard-canvas.md) · [Interactions](Documentation/16-whiteboard-interactions.md)
- 🔀 End-to-end flows: [Data Flows](Documentation/20-data-flows.md)
- 🛠️ Contributing: [Development Guide](Documentation/21-development-guide.md)

AI agents read the quick-reference context in [`.agents/`](.agents/architecture.md) before touching code.
