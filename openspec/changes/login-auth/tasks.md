# Tasks: login-auth

## Phase 1: Domain Layer

- [x] **T1 (1.1)** Add `hmi-app/src/domain/auth/auth.types.test.ts` with type-shape assertions for `Permission`, `Role`, `AuthUser`, `AuthSession`, `AuthResult`. Files: `auth.types.test.ts`. Depends: none. TDD: no. Check: test encodes the exact spec contract.
- [x] **T2 (1.2)** Create `hmi-app/src/domain/auth/auth.types.ts`, `hmi-app/src/domain/auth/index.ts`, and export from `hmi-app/src/domain/index.ts`. Files: those 3. Depends: T1. TDD: no. Check: domain imports resolve only through `src/domain/`.

## Phase 2: Service Layer (TDD)

- [x] **T3 (2.1)** Write RED tests for `hmi-app/src/services/auth/localAuth.service.test.ts`: admin success, viewer success, generic invalid-credentials failure. Files: `localAuth.service.test.ts`. Depends: T2. TDD: yes. Check: tests fail before implementation.
- [x] **T4 (2.2)** Implement `hmi-app/src/services/auth/localAuth.service.ts` with 2 internal hardcoded users and `authenticate(username, password)`. Files: `localAuth.service.ts`. Depends: T3. TDD: yes. Check: service tests pass without exposing credential metadata.

## Phase 3: Adapter Layer (TDD)

- [x] **T5 (3.1)** Write RED tests for `hmi-app/src/adapters/auth/auth.adapter.test.ts` covering user copy, `isAuthenticated=true`, and ISO timestamp creation. Files: `auth.adapter.test.ts`. Depends: T4. TDD: yes. Check: tests fail before mapper exists.
- [x] **T6 (3.2)** Implement `hmi-app/src/adapters/auth/auth.adapter.ts` with `toAuthSession()` for successful auth results only. Files: `auth.adapter.ts`. Depends: T5. TDD: yes. Check: adapter tests pass and no failure result creates a session.

## Phase 4: Store Layer (TDD)

- [x] **T7 (4.1)** Write RED tests for `hmi-app/src/store/auth.store.test.ts`: login persistence, hydration, `hasPermission`, runtime-only flags reset, logout cleanup. Files: `auth.store.test.ts`. Depends: T6. TDD: yes. Check: tests assert storage key `hmi-auth-session`.
- [x] **T8 (4.2)** Implement `hmi-app/src/store/auth.store.ts` with Zustand persist, `login`, `logout`, `hasPermission`, hydration tracking, and `partialize` for `session` only. Files: `auth.store.ts`. Depends: T7. TDD: yes. Check: store tests pass and persisted JSON contains only `session`.

## Phase 5: UI Components

- [x] **T9 (5.1)** Create `hmi-app/src/components/auth/LoginOverlay.tsx` using `AnchoredOverlay`, local form state, inline validation, store login call, success close/reset behavior. Files: `LoginOverlay.tsx`. Depends: T8. TDD: no. Check: overlay blocks empty trimmed submit and surfaces auth errors.
- [x] **T10 (5.2)** Create `hmi-app/src/components/auth/RequirePermission.tsx` with hydration wait, permission check, and redirect fallback. Files: `RequirePermission.tsx`. Depends: T8. TDD: no. Check: unauthorized state returns `<Navigate replace>` to `/` or `redirectTo`.

## Phase 6: Integration

- [x] **T11 (6.1)** Update `hmi-app/src/components/layout/Topbar.tsx` to wire User-triggered `LoginOverlay`, admin-only `Palette` + `Settings`, and keep shader panel on `Palette`. Files: `Topbar.tsx`. Depends: T9, T10. TDD: no. Check: unauth/viewer shows Bell+User; admin shows Bell+Palette+Settings+User.
- [x] **T12 (6.2)** Update `hmi-app/src/app/router.tsx` to guard `/admin/*` with `RequirePermission permission="admin:access"`. Files: `router.tsx`. Depends: T10. TDD: no. Check: all admin children inherit a single layout guard.
- [x] **T13 (6.3)** Update `hmi-app/src/layouts/AdminLayout.tsx` to show session display name and logout via store + `navigate('/')`. Files: `AdminLayout.tsx`. Depends: T8, T12. TDD: no. Check: logout from `/admin/*` clears session and returns to `/`.

## Phase 7: Smoke Tests

- [x] **T14 (7.1)** Add route-guard smoke test covering direct `/admin/dashboards` and `/admin/hierarchy` access without admin permission. Files: `hmi-app/src/app/router.test.tsx` or nearest routing test file. Depends: T12, T13. TDD: yes. Check: unauthorized direct access redirects to `/`.
- [x] **T15 (7.2)** Add login-flow UI smoke test covering User trigger, validation, auth error, successful admin login from `/explorer`, and Topbar action swap. Files: `hmi-app/src/components/layout/Topbar.test.tsx` or auth integration test file. Depends: T11, T13. TDD: yes. Check: overlay closes on success, route stays viewer-side, admin buttons appear.
