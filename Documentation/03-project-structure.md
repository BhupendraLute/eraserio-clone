# 03 · Project Structure

> **What this document covers**: the complete `src/` folder tree, explained folder-by-folder,
> so you always know where to look.

---

## 1. Top-Level Layout

```
eraserio-clone/
├── .agents/                  # Agent context files (architecture, dataflows, dev-rules, status)
├── .gitignore
├── AGENTS.md                 # Instructions for AI agents working in this repo
├── Documentation/            # 👈 YOU ARE HERE — developer docs
├── components.json           # shadcn/ui config
├── eslint.config.mjs         # ESLint flat config
├── next.config.ts            # Next.js config
├── package.json              # Dependencies & scripts
├── postcss.config.mjs        # TailwindCSS v4 PostCSS config
├── public/                   # Static assets (fonts, cursors, icons)
├── tsconfig.json             # TypeScript config
└── src/                      # 👈 ALL application code lives here
```

---

## 2. The `src/` Tree (Annotated)

```mermaid
flowchart TD
    SRC["src/"]
    SRC --> APP["app/ — Next.js pages"]
    SRC --> COMP["components/ — React UI"]
    SRC --> LIB["lib/ — logic, stores, engine"]
    SRC --> WORKERS["workers/ — Web Worker"]

    APP --> LAYOUT["layout.tsx<br/>root layout"]
    APP --> PAGE["page.tsx<br/>redirects to /whiteboard"]
    APP --> WB["whiteboard/page.tsx"]
    APP --> SET["settings/page.tsx"]
    APP --> SETP["settings/profile/page.tsx"]

    COMP --> UI["ui/ — shadcn primitives"]
    COMP --> WORKSPACE["workspace/EraserWorkspace.tsx"]
    COMP --> CANVAS["canvas/ — toolbar + insert popup"]
    COMP --> EDITOR["editor/ — code editor + SVG canvases"]
    COMP --> DOCS["docs/ — Tiptap editor components"]
    COMP --> WBC["whiteboard/ — canvas, overlays, toolbars"]

    LIB --> DSL["dsl/ — lexer, parser, ast, validator"]
    LIB --> LAYOUT2["layout/ — dagre + sequence layout"]
    LIB --> RENDER["render/ — node/edge style helpers"]
    LIB --> EXPORT["export/ — svg-export.ts"]
    LIB --> STORE["store/ — 5 Zustand stores"]
    LIB --> HOOKS["hooks/ — usePanZoom, usePipelineWorker, ..."]
    LIB --> ICONS["icons/ — icon-catalog.ts"]
    LIB --> WB2["whiteboard/ — types, routing, tools"]

    WORKERS --> PW["pipeline.worker.ts"]
```

### 2.1 `src/app/` — Next.js App Router Pages

| File | Purpose |
|---|---|
| `layout.tsx` | Root layout: fonts, `ThemeProvider`, `AuthProvider`, `QueryProvider` |
| `page.tsx` | Landing page: hero, features, demo, auth modal CTAs |
| `dashboard/[tab]/page.tsx` | Document dashboard: folder browsing (`/dashboard/folder-[id]`), archive tab (`/dashboard/archive`), private files (`/dashboard/private`), view mode toggle, batch actions |
| `whiteboard/page.tsx` | The canvas page: `useAuthSync`, sets view mode to `canvas`, hydrates whiteboard, renders header + workspace |
| `login/page.tsx` | Full-page OAuth sign-in (also NextAuth's `pages.signIn` target) |
| `signup/page.tsx` | Full-page OAuth sign-up |
| `share/[token]/page.tsx` | Public read-only view of a shared document |
| `settings/page.tsx` | Settings page: theme switch + keyboard shortcuts reference; header has a Settings \| Profile switcher |
| `settings/profile/page.tsx` | Profile settings: edit display name + avatar URL, view provider/member-since, sign out (see [24-authentication-and-database.md](24-authentication-and-database.md) §6) |
| `globals.css` | Tailwind import + global styles |
| `api/auth/[...nextauth]/route.ts` | NextAuth route handler (GET/POST) |
| `api/documents/route.ts` + `api/documents/[...]` | Document CRUD + duplicate + share API (auth-scoped, see [24-authentication-and-database.md](24-authentication-and-database.md)) |
| `api/workspaces/route.ts` + `api/workspaces/[...]` | Workspace team CRUD + role invites + team member management |
| `api/user/profile/route.ts` | The signed-in user's own profile: GET + PATCH (display name / avatar), scoped by `getUserId()` |

### 2.2 `src/components/` — React UI

| Folder | Purpose |
|---|---|
| `ui/` | shadcn/ui primitives (`button`, `dialog`, `dropdown-menu`, `skeleton`, ...) + shared primitives (`AppButton`, `StatusDot`, `SyncStatusBadge`) |
| `dashboard/` | `DashboardSidebar.tsx`, `DashboardHeader.tsx`, `DocumentTable.tsx`, `ActionCardsGrid.tsx`, `skeletons/` (folder/table/grid loading states), `modals/` (`CreateFolderModal.tsx`, `DeleteFolderModal.tsx`, `ManageTeamModal.tsx`, `CreateWorkspaceModal.tsx`, `AIDiagramModal.tsx`) |
| `auth/` | `AuthModal.tsx`, `UserNav.tsx`, `OAuthIcons.tsx`, `ImportGuestDocsModal.tsx` — sign-in modal, avatar menu, OAuth brand icons |
| `providers/` | `AuthProvider.tsx` (next-auth SessionProvider), `ThemeProvider.tsx` (client theme wrapper), `QueryProvider.tsx` |
| `workspace/` | `EraserWorkspace.tsx` — the shared tabbed shell + AI sidebar; `DocumentSwitcher.tsx`, `ShareModal.tsx`, `SyncStatusBadge.tsx` |
| `canvas/` | `CanvasVerticalToolbar.tsx` (left tool palette) + `InsertItemPopup.tsx` (insert catalog) |
| `editor/` | Diagram-as-Code: `CodeEditor.tsx`, `FlowchartCanvas.tsx`, `SequenceDiagramCanvas.tsx`, `NodeIcon.tsx`, `DiagramEditorView.tsx` |
| `docs/` | Tiptap: `diagram-embed-extension.ts`, `DiagramEmbedView.tsx`, `DiagramPickerDialog.tsx`, `DiagramPreview.tsx`, `DocBottomToolbar.tsx`, `slash-command-extension.ts`, `SlashMenuList.tsx` |
| `whiteboard/` | The freeform canvas: `WhiteboardCanvas.tsx`, `WhiteboardElements.tsx`, `WhiteboardOverlays.tsx`, `CommentThread.tsx`, `ContextMenu.tsx`, `CommandPalette.tsx`, `ExportMenu.tsx`, `InlineTextEditor.tsx`, `ZoomPanMenu.tsx`, `ThemeToggle.tsx`, `CloudIconPicker.tsx`, plus `toolbars/` and `ui/` subfolders |
| `AppNav.tsx` (legacy, unused — see [05-app-shell-navigation.md](05-app-shell-navigation.md)), `EraserHeader.tsx`, `providers/` | App chrome |

### 2.3 `src/lib/` — Logic, Stores, Engine (no React components, mostly pure TS)

| Folder | Purpose |
|---|---|
| `dsl/` | **Diagram DSL engine**: `lexer.ts` (Chevrotain tokens), `parser.ts` (CST), `ast.ts` (CST→AST), `validator.ts` (semantic errors), `error-messages.ts`, `run-pipeline-sync.ts`, `codemirror-language.ts`, `codemirror-lint.ts`, `diagnostics.ts` |
| `layout/` | **Auto-layout**: `dagre-adapter.ts`, `sequence-layout.ts`, `types.ts`, `sequence-types.ts`, `text-measure.ts` (OffscreenCanvas), `wrap-text.ts` |
| `render/` | **SVG helpers**: `node-style.ts` (colors/icons), `edge-geometry.ts` (edge paths), `text-style.ts` (font constants) |
| `export/` | `svg-export.ts` — SVG/PNG download |
| `store/` | The 6 Zustand stores (incl. `document-store.ts` — auth-aware persistence) |
| `auth/` | `session.ts` — `getUserId()` (getServerSession wrapper) |
| `db/` | `prisma.ts` — PrismaClient + PrismaPg/pg Pool adapter (Neon) |
| `hooks/` | `usePipelineWorker.ts`, `usePanZoom.ts`, `useWhiteboardInteractions.ts`, `useIconSearch.ts`, `useOnClickOutside.ts`, `useAuthSync.ts` |
| `api-validation.ts` | Zod schemas + payload size limits for the document API and profile edits (`updateProfileSchema`) |
| `icons/` | `icon-catalog.ts` — system-design icon registry (Iconify + react-icons) |
| `whiteboard/` | `whiteboard-types.ts` (element types), `orthogonal-routing.ts` (elbow paths), `tool-definitions.ts`, `code-highlighter.tsx` |
| `utils.ts` | `cn()` (tailwind-merge) + `generateId()` + `safeCallbackUrl()` (open-redirect guard) |

### 2.4 `src/workers/` + root `src/` extras

| File | Purpose |
|---|---|
| `src/workers/pipeline.worker.ts` | Web Worker entry: receives `{id, source}`, runs lex→parse→ast→validate→layout, posts back the result |
| `src/proxy.ts` | Next.js 16 **proxy** (middleware): auth redirects + security headers (see [24-authentication-and-database.md](24-authentication-and-database.md)) |
| `src/types/next-auth.d.ts` | NextAuth type augmentation (`session.user.id`, `token.id`) |

---

## 3. Dependency Flow (what imports what)

```mermaid
flowchart LR
    subgraph Leaf["Pure TS (leaf modules)"]
        L1["lib/dsl/lexer.ts"]
        L2["lib/layout/text-measure.ts"]
        L3["lib/render/node-style.ts"]
    end

    subgraph Mid["Mid-level"]
        M1["lib/dsl/parser.ts"]
        M2["lib/layout/dagre-adapter.ts"]
        M3["workers/pipeline.worker.ts"]
    end

    subgraph Top["UI layer"]
        T1["components/editor/FlowchartCanvas.tsx"]
        T2["components/editor/CodeEditor.tsx"]
    end

    M1 --> L1
    M2 --> L2
    M2 --> L3
    M3 --> M1
    M3 --> M2
    T1 --> M2
    T2 --> M1
```

**Key rule of thumb**: `components/*` can import from `lib/*`, but `lib/dsl` and `lib/layout` must
never import from `components/*` or `react`.

---

## 4. "I need to change X — where is it?"

| Task | Look in |
|---|---|
| Change how flowcharts render | `src/components/editor/FlowchartCanvas.tsx` |
| Add a new DSL token / syntax | `src/lib/dsl/lexer.ts` + `parser.ts` |
| Change node colors/icons | `src/lib/render/node-style.ts` |
| Change layout spacing | `src/lib/layout/dagre-adapter.ts` (or `sequence-layout.ts`) |
| Add a whiteboard tool | `src/lib/whiteboard/whiteboard-types.ts` + `tool-definitions.ts` |
| Change keyboard shortcuts | `src/lib/hooks/useWhiteboardInteractions.ts` |
| Change how elements are stored | `src/lib/store/whiteboard-store.ts` |
| Add a Tiptap command | `src/components/docs/slash-command-extension.ts` + `SlashMenuList.tsx` |
| Change pan/zoom behavior | `src/lib/hooks/usePanZoom.ts` |
| Edit the profile settings page / API | `src/app/settings/profile/page.tsx` + `src/app/api/user/profile/route.ts` |
| Change which profile fields are editable | `src/lib/api-validation.ts` (`updateProfileSchema`) |
