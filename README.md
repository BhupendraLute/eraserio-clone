# Eraser.io Clone

A full-featured clone of [Eraser.io](https://eraser.io) — a unified technical document and diagramming workbench combining Diagram-as-Code, Markdown Docs, and a Freeform Whiteboard.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + React Compiler
- **Styling**: TailwindCSS v4 + shadcn/ui (base-luma)
- **Diagram Engine**: Chevrotain (lexer/parser) + Dagre (auto-layout)
- **Code Editor**: CodeMirror 6 with custom DSL syntax highlighting
- **Rich Text**: Tiptap (ProseMirror) with diagram embeds and slash commands
- **State**: Zustand v5 (4 stores)
- **Whiteboard**: Custom SVG canvas with orthogonal connector routing

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes

| Route | Description |
|---|---|
| `/` | Redirects to `/whiteboard` |
| `/whiteboard` | Canvas-only whiteboard view |

## Development

```bash
npx tsc --noEmit    # Type check
npm run lint        # Lint
npm run build       # Production build
```

## Architecture

See [`.agents/architecture.md`](.agents/architecture.md) for the full system design, module boundaries, and file structure.

## Project Status

See [`.agents/project-status.md`](.agents/project-status.md) for delivery slices and feature inventory.
