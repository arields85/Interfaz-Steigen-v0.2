# Proposal: login-auth

## Problem Statement

The HMI has admin routes and a visible user entry point, but no authentication, no authorization model, and no viewer-to-admin navigation flow. This blocks controlled access to `/admin/*` and leaves future auth growth without a domain contract.

## Proposed Solution

- Add extensible domain types in `hmi-app/src/domain/auth/` for `Permission`, `Role`, `AuthUser`, and `AuthSession`; model route access by permissions, not `isAdmin` booleans.
- Add a persisted Zustand auth store for session state only (identity, role, granted permissions, login/logout, hydration). Keep server state out of Zustand.
- Implement a Topbar login panel using `AnchoredOverlay` on the existing user button, with username/password fields, validation, and auth feedback.
- Keep initial hardcoded credentials in a service-layer source such as `src/services/auth/localAuth.service.ts`, mapped through an adapter so a future backend can replace the source without changing UI/store contracts.
- Protect `/admin/*` with a route-guard wrapper that checks hydrated auth state and required permissions; viewer routes stay public/read-only.
- Topbar icon changes: replace the current `Settings` (gear) icon that opens the shader panel with `Palette` (same function); repurpose `Settings` (gear) as the "Ir a admin" button that navigates to `/admin`. Both `Palette` and `Settings` buttons are **hidden by default** and only rendered when the logged-in user has admin permissions. Topbar button layout: unauthenticated/viewer = `Bell` + `User`; admin = `Bell` + `Palette` + `Settings` + `User`.
- On successful admin login from viewer context, the admin-only Topbar buttons appear; the user stays on the current viewer route and uses the new gear button to navigate to `/admin`. Direct `/admin/*` access without permission redirects to `/`.
- Logout clears persisted session, hides admin-only Topbar buttons, and returns the user to `/` if they were inside admin.

## Alternatives Considered

1. **Boolean-only auth (`isAdmin`)**  
   Simpler now, but kills extensibility for future granular permissions.
2. **Router loaders as auth gate**  
   Centralized with React Router, but adds more routing coupling for a fully client-side first step.
3. **AdminDialog instead of AnchoredOverlay**  
   Stronger focus, but worse fit for the existing Topbar affordance and heavier interaction for quick login.

## Scope

### In Scope
- Client-side login/logout flow
- Extensible auth domain model + persisted session store
- Admin route protection and post-login viewer-to-admin transition
- Topbar icon restructure (Palette for shader, Settings for admin nav, both admin-only)
- Hardcoded local users behind a swappable service boundary

### Out of Scope
- Backend auth, tokens, refresh, or API integration
- Fine-grained per-widget/per-dashboard permissions UI
- Password recovery, user management, audit trail, or SSO

## Capabilities

### New Capabilities
- `user-auth`: Client-side authentication and authorization for viewer/admin access.

### Modified Capabilities
- None.

## Files Affected

| Area | Impact | Description |
|------|--------|-------------|
| `hmi-app/src/domain/auth/` | New | Auth types and permission model |
| `hmi-app/src/services/auth/` | New | Hardcoded credential source |
| `hmi-app/src/adapters/auth/` | New | Mapping service data to domain/session |
| `hmi-app/src/store/auth.store.ts` | New | Persisted auth session store |
| `hmi-app/src/components/layout/Topbar.tsx` | Modified | Login trigger + overlay wiring + icon restructure (Palette/Settings visibility) |
| `hmi-app/src/app/router.tsx` | Modified | Protected admin routing |
| `hmi-app/src/layouts/AdminLayout.tsx` | Modified | Auth-aware exit/logout behavior |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Persisted stale session leaks admin UI | Med | Hydration checks + permission-based guards on every admin entry |
| Client-only auth is bypassable | High | Treat as UX gating only; keep scope explicit until backend exists |
| Auth/store boundaries drift into UI booleans | Med | Centralize permission checks in domain/store helpers |

## Rollback Plan

Remove auth route guards, auth store, and Topbar overlay wiring; restore open admin navigation and delete the new `user-auth` capability artifacts.

## Dependencies

- Existing `AnchoredOverlay`
- Zustand persist middleware
- React Router 7 route wrappers/navigation

## Success Criteria

- [ ] Viewer user can log in and cannot access `/admin/*`.
- [ ] Admin user can log in, navigate from viewer to admin, and stay blocked after logout.
- [ ] Auth types and service boundary support adding roles/permissions without redesign.
- [ ] Topbar shows only Bell + User when not admin; shows Bell + Palette + Settings + User when admin is logged in.
