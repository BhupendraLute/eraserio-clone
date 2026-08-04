# 23 · Shared UI Primitives

> **What this document covers**: the small reusable components that sit on top of the shadcn/ui
> primitives — `AppButton`, `StatusDot`, and `SyncStatusBadge` — and the **emerald / amber / red
> color-coding language** they share, so sync state reads consistently across the app.

---

## 1. Why shared primitives?

Three product areas (Diagram-as-Code, Docs, Whiteboard) plus the auth/account chrome all need the
same small visual jobs: a branded call-to-action, a "something happened" dot on an avatar, and a
"is my work saved?" indicator. Without shared components, each feature re-implements them slightly
differently — different wording, different shades, and drift between light and dark mode.

These three components are the **canonical implementations**. If you need one of these jobs, use
the shared component — do not hand-roll a new one.

| Component | File | Job |
|---|---|---|
| `AppButton` | `src/components/ui/app-button.tsx` | Branded CTA layered on the shadcn `Button` |
| `StatusDot` | `src/components/ui/status-dot.tsx` | Tiny status dot on an avatar / icon corner |
| `SyncStatusBadge` | `src/components/workspace/SyncStatusBadge.tsx` | "Cloud sync" / "Local only" status label |

---

## 2. `AppButton` — branded, customizable button

**File**: `src/components/ui/app-button.tsx`

Wraps the shadcn `Button` and adds an `appearance` prop for brand-specific treatments, plus
convenience `icon` / `iconPosition` / `label` props. Every standard shadcn `variant` and `size`
still works, and arbitrary props (`onClick`, `disabled`, `className`, ...) pass straight through.

```tsx
import { AppButton } from '@/components/ui/app-button';

// Gradient CTA (the default look when you pass appearance="brand")
<AppButton appearance="brand" label="Get Started" icon={<UserPlus />} />

// Ghost button — pass NO appearance so it stays a plain shadcn ghost
<AppButton variant="ghost" label="Sign In" icon={<LogIn />} />

// Outline variants for colored backgrounds
<AppButton appearance="brand-outline" label="Create Account" />
<AppButton appearance="light-outline" label="Create Account" />
```

### Appearance presets

| `appearance` | Used for | Classes |
|---|---|---|
| `brand` | Primary gradient CTA | `bg-gradient-to-r from-blue-600 to-indigo-600`, white text, blue shadow |
| `brand-outline` | Quiet outline on dark surfaces (landing hero) | slate border + dark translucent bg |
| `light-outline` | Outline on colored/gradient banners (footer CTA) | `border-white/30 text-white hover:bg-white/10` |
| *(omitted)* | Plain shadcn styling — `variant` decides the look | no extra classes |

> 💡 **Gotcha**: `appearance` is **opt-in**. There is no `defaultVariants` for it — if you omit it,
> the button renders with only the shadcn `variant` classes. This is deliberate: a ghost "Sign In"
> button must stay a ghost, not silently become a gradient CTA.

---

## 3. `StatusDot` — status dot on an avatar / icon corner

**File**: `src/components/ui/status-dot.tsx`

A tiny (10px) decorative dot that anchors to the bottom-right corner of its `relative` parent —
typically an avatar. It is `aria-hidden`, so pair it with a `title`/tooltip or visible text where
the meaning matters.

```tsx
import { StatusDot } from '@/components/ui/status-dot';

<span className="relative">
  <Avatar />
  {/* Emerald = cloud-synced */}
  <StatusDot color="emerald" />
</span>
```

### Color variants

| `color` | Used for |
|---|---|
| `emerald` (default) | Cloud-synced / healthy |
| `amber` | Local-only / transient saving |
| `red` | Error / failure |
| `blue`, `sky`, `violet`, `slate` | Reserved for future statuses |

The dot uses a `border-background` ring, so it adapts to both light and dark themes. Pass
`className` to override positioning if the default corner anchor isn't right.

---

## 4. `SyncStatusBadge` — "Cloud sync" vs "Local only"

**File**: `src/components/workspace/SyncStatusBadge.tsx`

The single source of truth for sync status wording and color. Both the header `DocumentSwitcher`
badge and the `UserNav` avatar dropdown render this component, so they can never contradict each
other.

It takes two props straight from the document store:

```tsx
import { SyncStatusBadge } from '@/components/workspace/SyncStatusBadge';
import { useDocumentStore } from '@/lib/store/document-store';

const mode = useDocumentStore((s) => s.mode);        // 'cloud' | 'offline'
const syncStatus = useDocumentStore((s) => s.syncStatus); // 'synced' | 'saving' | 'offline' | 'error'

// Header badge (default 11px sizing):
<SyncStatusBadge mode={mode} syncStatus={syncStatus} />

// Inside a dropdown menu — pass className to match the menu font size:
<SyncStatusBadge mode={mode} syncStatus={syncStatus} className="text-xs" />
```

### State → visual mapping

| Condition | Icon | Text | Color |
|---|---|---|---|
| `syncStatus === 'saving'` | Spinner | Saving... | amber |
| `syncStatus === 'error'` | CloudOff | Sync failed | red |
| `mode === 'offline'` | CloudOff | Local only | amber |
| `syncStatus === 'offline'` | CloudOff | Offline | muted |
| else (cloud, synced) | CheckCircle2 | Cloud sync | emerald |

Precedence matters: `saving` and `error` are checked **before** `mode`, so a cloud user mid-save
sees "Saving..." (not "Local only"), and a guest with a failed save sees the more informative
"Sync failed".

---

## 5. The color-coding language

These three components deliberately share one consistent, theme-aware palette. **Follow it**:

| Meaning | Color | Where it appears |
|---|---|---|
| Cloud-synced / healthy | emerald | `StatusDot` on signed-in avatar, `SyncStatusBadge` "Cloud sync" |
| Local-only / guest / transient saving | amber | `StatusDot` on guest avatar, `SyncStatusBadge` "Local only" / "Saving..." |
| Error / failure | red | `SyncStatusBadge` "Sync failed" |
| Neutral / offline | muted (`text-muted-foreground`) | `SyncStatusBadge` "Offline" |

**Rules of thumb:**

- Use the **same color for the same meaning** everywhere — never emerald for "local" in one place
  and amber in another.
- Always include a `dark:` variant (`dark:text-emerald-400`, `dark:bg-amber-400`, ...) for the
  foreground/background colors you introduce.
- Never hardcode `#hex` colors; use Tailwind theme utilities so light/dark mode stays coherent
  (see [21-development-guide.md](21-development-guide.md) Rule 6).

---

## 6. Summary

- **`AppButton`** = branded CTAs; `appearance` is opt-in so ghost buttons stay ghost.
- **`StatusDot`** = corner status dot for avatars/icons; `aria-hidden`, theme-safe ring.
- **`SyncStatusBadge`** = the single sync-status indicator used by the header and avatar menu,
  driven entirely by the document store.
- All three share one emerald/amber/red **color-coding language** — reuse them, don't reinvent.
