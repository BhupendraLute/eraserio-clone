# 24 · Authentication, Database & Cloud Persistence

> **What this document covers**: the auth + persistence layer (Slice 4) — NextAuth.js OAuth,
> the Prisma/Neon database schema, the document API routes, the public share flow, the proxy
> middleware, and how the app switches between cloud (signed-in) and offline (guest) modes.

---

## 1. Big Picture

The app supports two modes, driven by whether the visitor is signed in:

| Mode | Who | Documents | Sync status |
|---|---|---|---|
| **Cloud** | Signed-in user | Stored in Neon Postgres, scoped to the user | `mode: 'cloud'` |
| **Offline / guest** | Not signed in | Local-only "stub" docs, never written to DB | `mode: 'offline'` |

The UI reflects the mode with the emerald/amber color language (see
[23-shared-ui-primitives.md](23-shared-ui-primitives.md)): **emerald = cloud-synced**,
**amber = local-only**.

```mermaid
flowchart LR
    U["User"] -->|OAuth sign in| NA["NextAuth /api/auth/[...nextauth]"]
    NA -->|PrismaAdapter| DB[("Neon Postgres<br/>Prisma")]

    C["Whiteboard UI"] -->|getServerSession| NA
    C -->|fetch /api/documents| API["Document API routes"]
    API --> DB
    API -->|getUserId()| AUTH["auth/session.ts"]
```

---

## 2. NextAuth.js (v4) Setup

### 2.1 Config — `src/lib/auth.ts`

The single NextAuth config lives in `src/lib/auth.ts`:

```ts
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 }, // 30 days
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: '/login', error: '/login' },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;   // persist DB user id into the JWT on sign-in
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.id === 'string') session.user.id = token.id;
      return session;
    },
  },
};
```

Key decisions:

- **JWT session strategy** (not database sessions) — stateless, no DB session lookup per
  request. Ideal for serverless (Neon) and low latency.
- **Prisma adapter** persists `User`/`Account` rows so OAuth identities are linked to the user.
- **Providers are conditional** — GitHub/Google are only registered when their env vars are
  present. `getProviders()` therefore automatically hides unconfigured provider buttons in the UI.
- **`token.id`** carries the DB user id through the JWT and is exposed as `session.user.id`, which
  API routes use for ownership scoping.

### 2.2 Route handler — `src/app/api/auth/[...nextauth]/route.ts`

```ts
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### 2.3 Provider on the client

`src/components/providers/AuthProvider.tsx` wraps the app with `next-auth/react`'s
`<SessionProvider>`. It's mounted in the root layout:

```tsx
<ThemeProvider ...>
  <AuthProvider>
    <QueryProvider>
      <main ...>{children}</main>
    </QueryProvider>
  </AuthProvider>
</ThemeProvider>
```

Client components use `useSession()` (e.g. `UserNav`, `ShareModal`, `DocumentSwitcher`) and
`signIn()`/`signOut()` from `next-auth/react`.

### 2.4 Type augmentation — `src/types/next-auth.d.ts`

Extends NextAuth's `Session.user` and `JWT` types with `id: string` so
`session.user.id` and `token.id` are typed.

---

## 3. Prisma Schema & Database Client

### 3.1 Schema — `prisma/schema.prisma`

```prisma
datasource db { provider = "postgresql" }

model User {
  id            String      @id @default(cuid())
  name          String?
  email         String?     @unique
  emailVerified DateTime?
  image         String?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  accounts      Account[]
  sessions      Session[]
  workspaces    Workspace[]
  documents     Document[]
}

model Account { /* OAuth account links (NextAuth) */ }
model Session { /* used if DB sessions are ever enabled */ }
model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  createdAt  DateTime @default(now())   // ⚠️ present for NextAuth v4 compatibility
  @@unique([identifier, token])
}

model Workspace {
  id        String     @id @default(cuid())
  name      String
  ownerId   String
  documents Document[]
}

model Document {
  id             String     @id @default(cuid())
  title          String     @default("Untitled Document")
  ownerId        String?    // null → orphaned/legacy; ownership scoping uses this
  workspaceId    String?
  whiteboardData String     @db.Text   // JSON string of whiteboard elements
  diagramSource  String     @db.Text   // DSL source
  docContent     String     @db.Text   // Tiptap HTML
  isPublic       Boolean    @default(false)
  shareToken     String?    @unique    // set only when isPublic
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt
}
```

> ⚠️ **Prisma 7 + Neon**: the client uses the **driver adapter** pattern (`PrismaPg` + `pg`
> `Pool`) — see `src/lib/db/prisma.ts`. There is no binary engine; `DATABASE_URL` should use the
> Neon **pooled** connection string, and `DIRECT_URL` the direct one for migrations.

### 3.2 Client — `src/lib/db/prisma.ts`

```ts
const pool = new Pool({
  connectionString,
  ssl: connectionString?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
});
const adapter = new PrismaPg(pool);
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter, log: [...] });
```

It reuses a single pooled client across hot reloads (global cache pattern) and normalizes
`sslmode=require` → `sslmode=verify-full` to silence the `pg-connection-string` security warning.

---

## 4. Server-Side Auth Helper

**File**: `src/lib/auth/session.ts`

```ts
export async function getUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions);
    return session?.user?.id ?? null;
  } catch {
    return null; // auth not configured (e.g. missing NEXTAUTH_SECRET) → treat as guest
  }
}
```

Every **authenticated-scoped** document route calls `getUserId()` first; `null` means
guest/offline mode. The one exception is `/api/documents/share/[token]`, which is intentionally
public (no auth) — see §5.

---

## 5. Document API Routes

All routes are under `src/app/api/documents/`, marked `export const dynamic = 'force-dynamic'`.

| Route | Methods | Behavior |
|---|---|---|
| `/api/documents` | GET | List the signed-in user's docs (owned only). Guests get `{ documents: [], mode: 'offline' }` — **never other users' data** |
| `/api/documents` | POST | Create a doc. Guests get a local-only `offlineDocStub` (no DB write) |
| `/api/documents/[id]` | GET | Owner read, or sanitized **public** read (no owner/workspace internals) |
| `/api/documents/[id]` | PATCH | Owner-only update; guests get an "acknowledged offline" response |
| `/api/documents/[id]` | DELETE | Owner-only delete; guests no-op |
| `/api/documents/[id]/share` | POST | Toggle `isPublic` + generate `shareToken` (owner only, auth required) |
| `/api/documents/share/[token]` | GET | **Public** read-only fetch by share token (no auth) — powers `/share/[token]` |

### 5.1 Ownership scoping (security)

The single most important security rule: **every query is scoped by `ownerId === userId`**:

```ts
const doc = await prisma.document.findUnique({ where: { id } });
if (!doc || doc.ownerId !== userId) {
  if (!doc?.isPublic) return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  // public read → return sanitized payload
}
```

### 5.2 Public read sanitization

When a guest reads a public doc, the route returns a hand-picked payload — `ownerId` and
`workspaceId` are **never** exposed. The dedicated `/share/[token]` endpoint similarly selects
only safe fields.

### 5.3 Share tokens

`shareToken` is generated with `crypto.randomBytes(24).toString('base64url')` — cryptographically
secure and unguessable. `isPublic` and `shareToken` are toggled together (a private doc always
clears its token).

---

## 6. Request Validation (zod)

**File**: `src/lib/api-validation.ts`

```ts
export const MAX_WHITEBOARD_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_DIAGRAM_BYTES = 512 * 1024;          // 512 KB
export const MAX_DOC_BYTES = 512 * 1024;
export const MAX_TITLE_LENGTH = 200;
```

- `createDocumentSchema` / `updateDocumentSchema` validate `title` (trimmed, ≤ 200 chars) and the
  three content fields.
- A `jsonString(maxBytes)` transformer accepts a string **or** object/array, stringifies it, and
  **rejects payloads over the byte limit** — protecting the DB from abuse.
- `shareDocumentSchema` validates `isPublic` is a boolean.
- Invalid bodies → `400` with `details: parsed.error.flatten().fieldErrors`.

---

## 7. Proxy (Middleware) — `src/proxy.ts`

Next.js 16 renamed middleware to **proxy**. The file does two things:

1. **Optimistic auth redirects**: signed-in users visiting `/login` or `/signup` are redirected to
   `/whiteboard` (via `getToken` from `next-auth/jwt`).
2. **Baseline security headers**: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
   `Referrer-Policy: strict-origin-when-cross-origin`, `X-DNS-Prefetch-Control: off`.

```ts
export async function proxy(request: NextRequest) { ... }
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
```

> ⚠️ **Route protection is NOT here.** The proxy only does UX redirects. Real authorization
> happens inside each API route handler via `getServerSession`/`getUserId`.

---

## 8. Client-Side Auth Sync — `src/hooks/useAuthSync.ts`

```ts
export function useAuthSync() {
  const { status } = useSession();
  const setAuthStatus = useDocumentStore((s) => s.setAuthStatus);
  useEffect(() => {
    setAuthStatus(status);
  }, [status, setAuthStatus]);
}
```

Called from `whiteboard/page.tsx`. It bridges NextAuth session state into the **document store**,
so the app automatically switches cloud ⇄ offline modes and refetches the user's documents on
sign-in/sign-out.

---

## 9. The Auth-Aware Document Store — `src/lib/store/document-store.ts`

The 6th Zustand store (see [06-state-management.md](06-state-management.md)). Holds:

| Field | Type | Meaning |
|---|---|---|
| `documents` | `DocumentMetadata[]` | Current document list |
| `activeDocumentId` / `activeDocumentTitle` | `string \| null` / `string` | Active selection |
| `syncStatus` | `'synced' \| 'saving' \| 'offline' \| 'error'` | Save lifecycle |
| `isPublic` / `shareToken` | `boolean` / `string \| null` | Share state |
| `mode` | `'cloud' \| 'offline'` | Persistence mode |
| `authStatus` | `'loading' \| 'authenticated' \| 'unauthenticated'` | Auth state |

Actions: `setAuthStatus`, `fetchDocuments`, `createDocument`, `selectDocument`,
`renameDocument`, `deleteDocument`, `saveCurrentDocumentState` (500ms debounce), and
`togglePublicShare`.

Notable behaviors:

- `fetchDocuments` resets `activeDocumentId` when the active doc no longer exists (e.g. after
  sign-out the cloud list is replaced by an empty guest list).
- All writes debounce and fall back gracefully on network failure (`syncStatus: 'error'`).
- `saveCurrentDocumentState` uses a 500ms module-level debounce timer.

The `SyncStatusBadge` component (see [23-shared-ui-primitives.md](23-shared-ui-primitives.md))
renders `mode` + `syncStatus` consistently in the header and avatar menu.

---

## 10. Auth UI

| Component / page | File | Purpose |
|---|---|---|
| Auth modal (OAuth + guest) | `src/components/auth/AuthModal.tsx` | Inline sign-in/sign-up dialog with provider buttons, loading states, guest option |
| User nav / avatar menu | `src/components/auth/UserNav.tsx` | Signed-in dropdown (profile, sign out) vs guest avatar menu (sign in / create account) |
| OAuth icons | `src/components/auth/OAuthIcons.tsx` | Inline SVG brand icons (GitHub/Google) — lucide-react has no brand icons |
| Login page | `src/app/login/page.tsx` | Full-page OAuth sign-in, Suspense-wrapped `useSearchParams`, `safeCallbackUrl` |
| Signup page | `src/app/signup/page.tsx` | Full-page OAuth sign-up, same safeguards |
| Share page | `src/app/share/[token]/page.tsx` | Public read-only view of a shared document (uses `/api/documents/share/[token]`) |

- The auth modal's guest flow keeps documents **local in the browser** (offline mode).
- `safeCallbackUrl` in `src/lib/utils.ts` prevents open-redirects — only same-origin paths are
  accepted as `callbackUrl`.

---

## 11. Environment Variables (`.env`)

See `.env.example`. Required:

| Variable | Required? | Purpose |
|---|---|---|
| `DATABASE_URL` | yes (for cloud) | Neon **pooled** connection string, `sslmode=verify-full` |
| `DIRECT_URL` | yes (for `prisma migrate`/`db push`) | Neon **direct** connection string |
| `NEXTAUTH_SECRET` | yes | Strong random secret — generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `NEXTAUTH_URL` | dev | e.g. `http://localhost:3000` |
| `GITHUB_ID` / `GITHUB_SECRET` | optional | GitHub OAuth (button hidden when empty) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | optional | Google OAuth (button hidden when empty) |

> ⚠️ **Security**: never commit a real `NEXTAUTH_SECRET`. A weak/placeholder secret makes JWTs
> forgeable.

---

## 12. Setup Commands

```bash
# 1. Install deps (includes @prisma/client, @prisma/adapter-pg, next-auth, @next-auth/prisma-adapter)
npm install

# 2. Copy .env.example → .env and fill in DATABASE_URL / DIRECT_URL / NEXTAUTH_SECRET

# 3. Create the schema in Neon
#    (the datasource URL is read from prisma.config.ts → DATABASE_URL/DIRECT_URL)
npx prisma db push          # dev — or use migrations in production

# 4. Generate the Prisma client (required after schema changes)
npx prisma generate

# 5. Run the app
npm run dev
```

---

## 13. Security Checklist (Slice 4)

- [ ] Every document query scoped by `ownerId === userId` (`getUserId()`).
- [ ] Public reads sanitized — no `ownerId`/`workspaceId` in responses.
- [ ] `shareToken` generated with `crypto.randomBytes(24)`.
- [ ] Zod validation + payload byte limits on all document APIs.
- [ ] Guests never write to the DB (offline stubs only).
- [ ] Strong `NEXTAUTH_SECRET` in production.
- [ ] `safeCallbackUrl` used on login/signup to prevent open redirects.
- [ ] Security headers applied in `proxy.ts`.
