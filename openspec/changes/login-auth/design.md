# Design: login-auth

> Architecture design for client-side authentication and authorization in the HMI.
> Follows the existing layered architecture: services → adapters → domain → store → UI.

---

## 1. Layer Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  UI Layer                                                           │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────────────┐ │
│  │ Topbar.tsx    │  │ LoginOverlay.tsx  │  │ RequirePermission.tsx │ │
│  │ (trigger,     │  │ (form, feedback,  │  │ (route guard,        │ │
│  │  conditional  │  │  AnchoredOverlay) │  │  reads store,        │ │
│  │  buttons)     │  │                   │  │  redirects)          │ │
│  └──────┬───────┘  └────────┬──────────┘  └──────────┬───────────┘ │
│         │                   │                        │              │
│         └───────────┬───────┘                        │              │
│                     ▼                                │              │
│  ┌──────────────────────────────────────┐            │              │
│  │ auth.store.ts (Zustand + persist)    │◄───────────┘              │
│  │ session, user, permissions, actions  │                           │
│  └──────────────────┬───────────────────┘                           │
│                     │                                               │
├─────────────────────┼───────────────────────────────────────────────┤
│  Domain Layer       │                                               │
│  ┌──────────────────▼───────────────────┐                           │
│  │ domain/auth/                         │                           │
│  │ Permission, Role, AuthUser,          │                           │
│  │ AuthSession, AuthCredentials         │                           │
│  └──────────────────▲───────────────────┘                           │
│                     │                                               │
├─────────────────────┼───────────────────────────────────────────────┤
│  Adapter Layer      │                                               │
│  ┌──────────────────┴───────────────────┐                           │
│  │ adapters/auth/auth.adapter.ts        │                           │
│  │ Maps service response → AuthSession  │                           │
│  └──────────────────▲───────────────────┘                           │
│                     │                                               │
├─────────────────────┼───────────────────────────────────────────────┤
│  Service Layer      │                                               │
│  ┌──────────────────┴───────────────────┐                           │
│  │ services/auth/localAuth.service.ts   │                           │
│  │ Hardcoded users, credential check    │                           │
│  │ Returns raw service response         │                           │
│  └──────────────────────────────────────┘                           │
└─────────────────────────────────────────────────────────────────────┘
```

**Data direction**: Service (raw) → Adapter (maps) → Domain types → Store (holds session) → UI (reads/reacts).

The UI never imports from `services/` or `adapters/` directly. The store actions call adapter functions, which call service functions. The store exposes domain-typed state to the UI.

---

## 2. File Structure

### New Files

```
hmi-app/src/
├── domain/auth/
│   ├── auth.types.ts          # Permission, Role, AuthUser, AuthSession, AuthCredentials
│   └── index.ts               # Barrel export
│
├── services/auth/
│   └── localAuth.service.ts   # Hardcoded users + validateCredentials()
│
├── adapters/auth/
│   └── auth.adapter.ts        # adaptAuthResponse() → AuthSession
│
├── store/
│   └── auth.store.ts          # Zustand persisted store: session + actions
│
└── components/auth/
    ├── LoginOverlay.tsx        # Login form inside AnchoredOverlay
    └── RequirePermission.tsx   # Route guard wrapper component
```

### Modified Files

| File | Modification |
|------|-------------|
| `domain/index.ts` | Add `export * from './auth/auth.types'` |
| `components/layout/Topbar.tsx` | Wire LoginOverlay, conditional Palette/Settings buttons, icon swap |
| `app/router.tsx` | Wrap `/admin` routes with `RequirePermission` |
| `layouts/AdminLayout.tsx` | Auth-aware logout (clear session + redirect) |

---

## 3. Data Flow Diagrams

### 3.1 Login Flow

```
User clicks [User] button in Topbar
        │
        ▼
LoginOverlay opens (AnchoredOverlay, anchored to User button)
        │
        ▼
User enters username + password, submits
        │
        ▼
auth.store.login(credentials)          ← store action
        │
        ▼
auth.adapter.adaptAuthResponse(        ← adapter maps raw → domain
    localAuth.service.validateCredentials(credentials)  ← service validates
)
        │
        ├── credentials invalid → store sets error message → overlay shows feedback
        │
        └── credentials valid → adapter returns AuthSession
                │
                ▼
        store.setState({ session, status: 'authenticated' })
                │
                ▼
        Zustand persist → localStorage ('interfaz-laboratorio-auth')
                │
                ▼
        UI reacts:
          - LoginOverlay closes
          - Topbar re-renders: Bell + Palette + Settings + User (if admin)
          - User stays on current viewer route
```

### 3.2 Route Guard Flow

```
Navigation to /admin/*
        │
        ▼
RequirePermission reads auth store
        │
        ├── store.status === 'authenticated'
        │   AND session.permissions.includes('admin:access')
        │       │
        │       └── YES → render <Outlet /> (children)
        │
        └── NO → <Navigate to="/" replace />
```

### 3.3 Logout Flow

```
User clicks "Salir al visor" / logout in AdminLayout
        │
        ▼
auth.store.logout()
        │
        ▼
store.setState({ session: null, status: 'unauthenticated' })
        │
        ▼
Zustand persist clears → localStorage key removed
        │
        ▼
UI reacts:
  - If user was inside /admin/* → navigate to "/"
  - Topbar re-renders: Bell + User only
  - AdminLayout unmounts (route guard redirected)
```

### 3.4 Session Hydration Flow

```
App mounts
        │
        ▼
auth.store initializes (Zustand persist middleware)
        │
        ▼
persist.onRehydrateStorage fires
        │
        ├── localStorage has saved session
        │       │
        │       ▼
        │   store.session = deserialized AuthSession
        │   store.status = 'authenticated'
        │       │
        │       ▼
        │   RequirePermission on /admin/* reads store
        │   → session exists + has permission → allow
        │
        └── No saved session
                │
                ▼
            store.status = 'unauthenticated'
            → /admin/* access redirected to "/"
```

---

## 4. Component Architecture

### 4.1 LoginOverlay

**Location**: `components/auth/LoginOverlay.tsx`

**Responsibilities**:
- Renders inside `AnchoredOverlay`, anchored to the Topbar User button ref
- Manages local form state: username, password, error message, loading
- On submit: calls `useAuthStore.getState().login(credentials)`
- Displays validation errors and auth feedback inline
- Closes on successful login, on Escape, or on click-outside (inherited from AnchoredOverlay)

**Props**:
- `triggerRef: RefObject<HTMLElement>` — the User button in Topbar
- `isOpen: boolean`
- `onClose: () => void`

**Design decisions**:
- Form state is LOCAL (useState), not in the auth store — it's ephemeral UI state
- Error messages come from the store's login action return, displayed locally
- No TanStack Query needed — this is a synchronous client-side check (local service)
- AnchoredOverlay alignment: `end` (right-aligned to User button, consistent with Topbar right section)
- `estimatedHeight`: ~280 (username + password + button + error space)

### 4.2 RequirePermission

**Location**: `components/auth/RequirePermission.tsx`

**Responsibilities**:
- Wraps route elements that need permission checks
- Reads `useAuthStore` for session status and permissions
- If authenticated + has required permission → renders `children`
- Otherwise → renders `<Navigate to="/" replace />`

**Props**:
- `permission: Permission` — the required permission (domain type)
- `children: ReactNode`

**Design decisions**:
- This is a WRAPPER component, not a layout. It wraps the `<AdminLayout />` element in router.tsx
- Uses a Zustand selector for minimal re-renders: `useAuthStore(s => s.hasPermission(permission))`
- Does NOT handle loading/hydrating state — Zustand persist hydrates synchronously from localStorage, so there's no flash. If future async hydration is needed, add a `status === 'hydrating'` check that renders null or a spinner.

### 4.3 Topbar Integration

**Current state** (Topbar.tsx:74-94):
- Right section: Bell → Settings (shader panel) → User
- Settings icon opens ShaderSettingsPanel

**New state**:
- Right section: Bell → [Palette] → [Settings] → User
- `Palette` (replaces gear for shader panel) — **admin-only**, hidden when unauthenticated/viewer
- `Settings` (gear icon, new purpose: navigate to /admin) — **admin-only**, hidden when unauthenticated/viewer
- `User` button now toggles `LoginOverlay` via AnchoredOverlay
- User button needs a `useRef` to anchor the overlay
- Topbar reads auth store via selector: `useAuthStore(s => s.session?.permissions ?? [])`
- Conditional rendering: `hasAdminPermission && <PaletteButton /> && <SettingsNavButton />`

**Button layout by auth state**:
| State | Buttons shown |
|-------|--------------|
| Unauthenticated / viewer | Bell, User |
| Admin logged in | Bell, Palette, Settings (gear→nav), User |

### 4.4 AdminLayout Integration

**Current state** (AdminLayout.tsx:65-71):
- "Salir al visor" NavLink navigates to "/"
- Shows "SESION ADMIN ACTIVA" indicator

**New state**:
- "Salir al visor" becomes a button that calls `auth.store.logout()` then navigates to "/"
- The "SESION ADMIN ACTIVA" indicator can show the username: `session.user.displayName`
- Uses `useNavigate()` for programmatic redirect after logout

---

## 5. State Management Design

### 5.1 Auth Store Shape

```
interface AuthState {
    // --- State ---
    session: AuthSession | null;
    status: 'unauthenticated' | 'authenticated';
    loginError: string | null;

    // --- Actions ---
    login: (credentials: AuthCredentials) => void;
    logout: () => void;
    clearError: () => void;

    // --- Derived (computed via selectors, not stored) ---
    // hasPermission(p: Permission): boolean — implemented as a selector helper
}
```

### 5.2 Persistence Strategy

**What gets persisted** (via Zustand `partialize`):
- `session` — the full AuthSession (user identity, role, permissions)

**What does NOT get persisted**:
- `status` — derived from presence/absence of `session` on rehydration
- `loginError` — ephemeral, cleared on next attempt
- Actions — never persisted (Zustand convention)

**localStorage key**: `'interfaz-laboratorio-auth'`

**Hydration**:
- Zustand `persist` middleware with `createJSONStorage(() => localStorage)` — same pattern as existing `ui.store.ts`
- On rehydration: if `session` exists, set `status = 'authenticated'`; otherwise `'unauthenticated'`
- Use `onRehydrateStorage` callback to handle this transition cleanly

### 5.3 Permission Check Pattern

Permission checks use a **selector helper** exported alongside the store, not a method on the store object:

```
// Selector usage in components:
const canAccessAdmin = useAuthStore(s => s.session?.permissions.includes('admin:access') ?? false);

// Or a reusable selector factory:
const selectHasPermission = (p: Permission) => (s: AuthState) =>
    s.session?.permissions.includes(p) ?? false;
```

This approach:
- Keeps Zustand selectors pure and memoizable
- Avoids storing derived state
- Follows existing codebase patterns (no methods on store, just state + actions)

### 5.4 UIStore.isAdminMode — Coexistence Plan

**Current usage**: `ui.store.ts` has `isAdminMode: boolean` + `setAdminMode()` (lines 37-39).
**Current persistence**: NOT persisted — `partialize` only saves `isGridVisible` (line 73).

**Plan**: **Deprecate but coexist in phase 1**.
- The auth store becomes the source of truth for "is the user an admin?"
- `isAdminMode` stays in UIStore for now — it may still be used by other UI logic not related to auth
- Search for all usages of `isAdminMode` / `setAdminMode` before removal
- If no non-auth usages exist, remove in a follow-up cleanup task
- Do NOT couple auth store to UIStore — they are separate concerns

---

## 6. Extensibility Points

### 6.1 Adding a New Role

1. Add the role string to `Role` union type in `domain/auth/auth.types.ts`
2. Define its default permissions array in `services/auth/localAuth.service.ts`
3. Add user entries with that role in the service's hardcoded user list
4. No adapter, store, or UI changes needed — permissions flow through automatically

### 6.2 Adding New Permissions

1. Add the permission string to `Permission` union type in `domain/auth/auth.types.ts`
2. Assign it to the appropriate roles in `services/auth/localAuth.service.ts`
3. Use `RequirePermission` with the new permission string where needed
4. Store, adapter, and existing UI remain untouched

### 6.3 Swapping Local Service for API Service

The **adapter boundary** is the swap point:

```
                    ┌─ localAuth.service.ts  (current: hardcoded)
auth.adapter.ts ◄───┤
                    └─ apiAuth.service.ts    (future: HTTP/tokens)
```

- `auth.adapter.ts` defines the contract: it receives a raw service response and maps to `AuthSession`
- To swap: create `apiAuth.service.ts` with the same response shape, update the adapter import
- Store and UI are completely isolated — they only see `AuthSession`
- If the API response shape differs from the local one, only the adapter mapping changes

### 6.4 Scaling Route Guards to Per-Page Permissions

`RequirePermission` already accepts a `permission` prop:

```
// Current: one guard for all admin
<RequirePermission permission="admin:access">
    <AdminLayout />
</RequirePermission>

// Future: per-section guards
<RequirePermission permission="admin:hierarchy">
    <HierarchyPage />
</RequirePermission>
```

This requires:
- Adding granular permissions to the domain type
- Assigning them per role in the service
- Wrapping individual route elements — no architectural change

---

## 7. Integration Points with Existing Code

### 7.1 Topbar.tsx Modifications

**File**: `hmi-app/src/components/layout/Topbar.tsx`

| Line(s) | Current | Change |
|---------|---------|--------|
| 2 | Imports `Settings` from lucide | Add `Palette` import, keep `Settings` |
| 4 | Imports `ShaderSettingsPanel` | Keep as-is |
| 40 | `shaderPanelOpen` state | Keep as-is |
| — | — | Add: `loginOverlayOpen` state |
| — | — | Add: `userButtonRef` via `useRef` |
| — | — | Add: `useAuthStore` selector for permissions |
| 80-90 | Settings button opens shader panel | Replace `Settings` icon with `Palette` icon; keep same onClick. Wrap in admin-permission conditional. |
| — | — | Add: new `Settings` (gear) button that navigates to `/admin` via `useNavigate()`. Wrap in admin-permission conditional. |
| 91-93 | User button (static) | Add `ref={userButtonRef}`, `onClick` toggles loginOverlayOpen |
| 96-99 | ShaderSettingsPanel render | Keep as-is (still works with Palette button) |
| — | — | Add: `<LoginOverlay triggerRef={userButtonRef} isOpen={loginOverlayOpen} onClose={...} />` |

**New imports needed**: `useRef` (from React), `useNavigate` (from react-router-dom), `Palette` (from lucide-react), `LoginOverlay`, `useAuthStore`

### 7.2 router.tsx Modifications

**File**: `hmi-app/src/app/router.tsx`

| Line(s) | Current | Change |
|---------|---------|--------|
| 41-49 | `/admin` route with `<AdminLayout />` element | Wrap element: `<RequirePermission permission="admin:access"><AdminLayout /></RequirePermission>` |
| 1 | Imports | Add `RequirePermission` import |

The guard wraps at the layout level — all `/admin/*` children are protected by a single guard. Individual children do NOT need their own guards in phase 1.

### 7.3 AdminLayout.tsx Modifications

**File**: `hmi-app/src/layouts/AdminLayout.tsx`

| Line(s) | Current | Change |
|---------|---------|--------|
| 2 | Imports `NavLink, useLocation` | Add `useNavigate` |
| — | — | Add: `useAuthStore` import |
| 60-62 | "SESION ADMIN ACTIVA" static text | Show `session.user.displayName` alongside the indicator |
| 65-71 | `<NavLink to="/">Salir al visor</NavLink>` | Replace with `<button>` that calls `logout()` then `navigate('/')` |

**Logout handler pattern**:
```
const handleLogout = () => {
    useAuthStore.getState().logout();
    navigate('/');
};
```

Using `getState()` outside the render avoids unnecessary selector subscriptions for a one-shot action.

### 7.4 UIStore.isAdminMode Coexistence

**File**: `hmi-app/src/store/ui.store.ts`

- No immediate changes to UIStore
- `isAdminMode` and `setAdminMode` remain in the interface
- A follow-up task should audit all usages of `isAdminMode` across the codebase
- If the only consumer is navigation/auth logic, remove it; if it controls UI-only behavior (e.g., showing edit handles), keep it as a separate concern

---

## Summary of Boundaries

| Layer | Knows about | Does NOT know about |
|-------|-------------|---------------------|
| `localAuth.service.ts` | Raw user data, credential validation | Domain types, store, UI |
| `auth.adapter.ts` | Service response shape, domain types | Store, UI, how credentials are validated |
| `domain/auth/` | Nothing — pure types | Everything else |
| `auth.store.ts` | Domain types, adapter functions | Service internals, UI components |
| `LoginOverlay` | Store actions (login), AnchoredOverlay API | Service, adapter, how auth works internally |
| `RequirePermission` | Store selectors (session, permissions) | Everything else |
| `Topbar` | Store selectors (permissions), LoginOverlay | Auth internals |

Each layer depends only on the layer directly below it. The domain layer depends on nothing.
