# Data Flows — Quick Reference

> 📚 **Full docs (mermaid diagrams):** [`Documentation/20-data-flows.md`](../Documentation/20-data-flows.md)

## Flows at a Glance

| Flow | Essence |
|---|---|
| **Keystroke → Canvas** | CodeMirror → `diagram-store.setSource` → `usePipelineWorker` debounce (200ms) → worker: lex → parse → ast → validate → layout → stale-guard id check → `applyResult`/`setErrors` → `pushDiagnostics` |
| **Docs embed** | Toolbar → `insertDiagramEmbed` → `DiagramEmbedView` → picker → `updateAttributes(diagramId)` → `runPipelineSync` → read-only SVG |
| **Node drag override** | `setNodePosition(id,x,y)` → `nodeOverrides` → edges fall back to `straightEdgePath`; double-click → `resetNodePosition` |
| **Whiteboard draw** | `setActiveTool` → pointerdown/up → bbox → `addElement` → pushHistory + debounced saveElements |
| **Arrow connect** | `findNearestShapePort` → `getOptimalPortPair` → store from/to element + ports; re-routed on move/resize |
| **SVG/PNG export** | clone → `inlineComputedColors` → strip transform → set viewBox → white bg rect → serialize → download |
| **Undo/redo** | mutating actions push history(prev) + clear future; undo/redo swap stacks |

## Key Facts

- Worker debounce: **200ms**; stale responses dropped via `id !== latestSentId`.
- History cap: **100** entries.
- Whiteboard persistence: `localStorage` key `eraser-whiteboard-elements`, debounced **300ms**.
- `moveSelectedElements` / `resizeElement` do **not** push history (a pure drag never records its own undo entry).
- Save debounce: **500ms** module-level timer in `document-store.saveCurrentDocumentState`.
- Cloud save: PATCH `/api/documents/[id]`; guests get offline stubs — **no DB write**.
- Share: POST `/api/documents/[id]/share`; token = `crypto.randomBytes(24).toString('base64url')`.

## Auth & Cloud Sync (Slice 4)

| Flow | Essence |
|---|---|
| **OAuth sign-in** | `AuthModal`/login page → `signIn(provider)` → NextAuth `/api/auth/[...nextauth]` → PrismaAdapter upserts `User`/`Account` → JWT `token.id` → `session.user.id` |
| **Auth → store sync** | `useAuthSync` (in `whiteboard/page.tsx`) → `useSession().status` → `document-store.setAuthStatus` → refetch `/api/documents` → `mode` = cloud/offline |
| **Doc list** | `fetchDocuments` GET `/api/documents` → `ownerId`-scoped rows (guests: `{documents: [], mode:'offline'}`) |
| **Save** | whiteboard/diagram/docs edit → `saveCurrentDocumentState` (500ms debounce) → PATCH `/api/documents/[id]` → `syncStatus` saving→synced/error |
| **Share** | `ShareModal` → POST `/api/documents/[id]/share` → `isPublic` + `shareToken` → `/share/[token]` page reads via public GET `/api/documents/share/[token]` |
| **Sign-out** | `UserNav` `signOut()` → session null → `setAuthStatus` refetch → cloud list replaced by empty guest list; `activeDocumentId` reset when missing |
| **Profile edit** | `/settings/profile` → GET/PATCH `/api/user/profile` (getUserId-scoped) → `update()` re-runs jwt callback (trigger='update') → fresh name/avatar in header |

> 📚 **Full detail:** [`Documentation/24-authentication-and-database.md`](../Documentation/24-authentication-and-database.md)
