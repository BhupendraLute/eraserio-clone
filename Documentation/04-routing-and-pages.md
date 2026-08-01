# 04 · Routing & Pages

> **What this document covers**: how Next.js App Router wires the routes together, what each page
> does, and how pages talk to the Zustand stores.

---

## 1. Route Map

```mermaid
flowchart LR
    ROOT["/ (Landing page)"] -->|CTA| WB["/whiteboard"]
    ROOT -->|Auth modal| AUTH["OAuth sign in / up"]
    WB --> SET["/settings"]
    LOGIN["/login"] -->|OAuth| WB
    SIGNUP["/signup"] -->|OAuth| WB
    SHARE["/share/[token]"] -->|public read| API["/api/documents/share/[token]"]

    WB -->|renders| HDR["EraserHeader"]
    WB -->|renders| WS["EraserWorkspace"]
    SET -->|renders| TOGGLE["ThemeToggle"]
```

| Route | File | What it shows |
|---|---|---|
| `/` | `src/app/page.tsx` | The **Architecta landing page**: hero, features, auth CTA buttons that open the auth modal |
| `/whiteboard` | `src/app/whiteboard/page.tsx` | The main app: header + workspace (canvas-focused); runs `useAuthSync` |
| `/login` | `src/app/login/page.tsx` | Full-page OAuth sign-in (also NextAuth's `pages.signIn` target) |
| `/signup` | `src/app/signup/page.tsx` | Full-page OAuth sign-up |
| `/share/[token]` | `src/app/share/[token]/page.tsx` | Public read-only view of a shared document |
| `/settings` | `src/app/settings/page.tsx` | Theme settings + keyboard shortcut reference |
| `/api/auth/[...nextauth]` | `src/app/api/auth/[...nextauth]/route.ts` | NextAuth route handler (GET/POST) |
| `/api/documents` | `src/app/api/documents/route.ts` | List + create documents (auth-scoped) |
| `/api/documents/[id]` | `src/app/api/documents/[id]/route.ts` | Read / update / delete one document |
| `/api/documents/[id]/share` | `src/app/api/documents/[id]/share/route.ts` | Toggle public share + token |
| `/api/documents/share/[token]` | `src/app/api/documents/share/[token]/route.ts` | Public fetch by share token |

---

## 2. Root Layout — `src/app/layout.tsx`

This wraps **every** page. It sets up fonts, providers, and the persistent left sidebar.

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased font-sans">
      <body className="h-screen w-screen overflow-hidden flex flex-row bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>           {/* 👈 next-auth SessionProvider */}
            <QueryProvider>
              <main className="flex flex-1 flex-col h-full w-full overflow-hidden">
                {children}
              </main>
            </QueryProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

**Key points for beginners:**

- The provider stack is `ThemeProvider → AuthProvider → QueryProvider`; the page content renders
  inside `<main>`. (The legacy `AppNav` left sidebar is no longer part of the layout — the
  landing page and whiteboard each render their own headers.)
- `ThemeProvider` (from `next-themes`) gives us `useTheme()` anywhere — the whiteboard uses it to
  pick light/dark cursor art.
- `AuthProvider` mounts NextAuth's `SessionProvider` — gives every client component `useSession()`, `signIn()`, `signOut()`. Without it, auth calls fail.
- `QueryProvider` mounts a React Query client used by icon search.
- `suppressHydrationWarning` is on `<html>`/`<body>` because the theme class is applied on the
  client — this avoids a hydration mismatch flash.

---

## 3. Home Page — `src/app/page.tsx` (Landing Page)

`/` is now the **Architecta marketing landing page** (client component), not a redirect. It shows
hero content, feature grid, an interactive demo preview, and auth CTAs:

```tsx
const [authModalOpen, setAuthModalOpen] = useState(false);
const [authDefaultTab, setAuthDefaultTab] = useState<'login' | 'signup'>('signup');

const openAuth = (tab: 'login' | 'signup') => {
  setAuthDefaultTab(tab);   // Sign In → login tab, Get Started → signup tab
  setAuthModalOpen(true);
};

// ...
<AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} defaultTab={authDefaultTab} />
```

The modal (and `UserNav`) is the primary auth entry point; the standalone `/login` and `/signup`
pages exist as fallbacks and as NextAuth's `pages.signIn` target.

---

## 4. Whiteboard Page — `src/app/whiteboard/page.tsx`

This is a **client component** (`'use client'`) that assembles the main experience:

```tsx
export default function WhiteboardPage() {
  useAuthSync();                  // 👈 bridges NextAuth session into the document store
  const setViewMode = useWorkspaceStore((s) => s.setViewMode);
  const hydrate = useWhiteboardStore((s) => s.hydrate);

  useEffect(() => {
    setViewMode('canvas');        // 👈 force the "Canvas" view mode
  }, [setViewMode]);

  useEffect(() => {
    hydrate();                    // 👈 load saved elements from localStorage
  }, [hydrate]);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <EraserHeader />
      <EraserWorkspace />
    </div>
  );
}
```

**What's happening:**

1. `useAuthSync()` — pushes `useSession().status` into the document store's `authStatus`, which
   refetches documents and switches cloud/offline mode on sign-in/sign-out.
2. `setViewMode('canvas')` — tells the workspace store to show the canvas-only layout.
3. `hydrate()` — reads the last-session whiteboard elements from `localStorage` (key
   `'eraser-whiteboard-elements'`) into the whiteboard store. This runs **after mount** to avoid
   SSR/hydration mismatches.
4. Renders the header + workspace shell.

---

## 5. Settings Page — `src/app/settings/page.tsx`

A mostly-static page that shows:

- A **Theme** section using `ThemeToggle` (see [19-whiteboard-toolbars.md](19-whiteboard-toolbars.md))
- A **Keyboard Shortcuts** reference, built from a `SHORTCUT_GROUPS` array.

```tsx
const SHORTCUT_GROUPS = [
  {
    title: 'Drawing Tools',
    icon: MousePointer,
    shortcuts: [
      { keys: 'V', label: 'Select Tool' },
      { keys: 'R', label: 'Rectangle' },
      // ... more
    ],
  },
  // Actions, Navigation & View groups...
];
```

> 💡 **Beginner tip**: if you add a new keyboard shortcut in
> `useWhiteboardInteractions.ts`, add it to this page too so users can discover it.

---

## 6. How Pages Connect to State

Pages never hold state themselves (except local UI state). They read/write **Zustand stores**:

```mermaid
sequenceDiagram
    participant P as whiteboard/page.tsx
    participant WS as useWorkspaceStore
    participant WBS as useWhiteboardStore
    participant C as WhiteboardCanvas

    P->>WS: setViewMode('canvas')
    P->>WBS: hydrate()
    WBS-->>C: elements now loaded
    P->>C: render <EraserHeader/> <EraserWorkspace/>
```

The stores are the *single source of truth* — components subscribe with selectors like
`useWorkspaceStore((s) => s.viewMode)` and re-render only when that slice changes.

---

## 7. Adding a New Page

1. Create a folder + `page.tsx` under `src/app/` (e.g. `src/app/about/page.tsx`).
2. If it's interactive, add `'use client'` at the top.
3. The root layout (sidebar + providers) automatically wraps it.
4. To navigate to it, use Next's `<Link>` (see `EraserHeader.tsx` for an example) — **never**
   `window.location.href`, which would lose all Zustand state.

> ⚠️ **Navigation rule** (from the dev guide): always use `next/link`'s `<Link>` or
> `useRouter().push()` for client-side routing. Raw `<a href>` / `window.location` reloads the page
> and resets every store.
