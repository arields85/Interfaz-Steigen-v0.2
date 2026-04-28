# user-auth Specification

## Purpose

Define a client-side authentication and authorization contract for viewer/admin navigation in the read-only HMI. This capability gates UI and routes only; it MUST NOT introduce process-control writes.

## Domain Types

```ts
export type Permission = 'viewer:access' | 'admin:access' | (string & {});

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: Role;
}

export interface AuthSession {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loginTimestamp: string | null;
}

export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; error: string };
```

## Service Contract

```ts
export interface AuthService {
  authenticate(username: string, password: string): Promise<AuthResult>;
}
```

- The local service MUST keep hardcoded credentials internal to `services/auth/`.
- The local service MUST provide at least one viewer-only user and one admin user.
- The service MUST return a generic auth failure message and MUST NOT expose passwords or credential metadata.

## Adapter Contract

```ts
export function toAuthSession(
  serviceResult: Extract<AuthResult, { ok: true }>
): AuthSession;
```

- `toAuthSession` MUST map the authenticated `AuthUser` into `AuthSession`.
- It MUST set `isAuthenticated = true` and `loginTimestamp` to the current ISO-8601 string.
- Failed `AuthResult` values MUST NOT create a session.

## Store Contract

```ts
export interface AuthStore {
  session: AuthSession;
  isHydrated: boolean;
  isAuthenticating: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<AuthResult>;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
}
```

- Persistence key MUST be `hmi-auth-session`.
- Persisted state MUST contain `session` only.
- `isHydrated`, `isAuthenticating`, and `error` MUST be runtime-only and MUST reset on reload.
- Hydration MUST complete before route guards or auth-dependent Topbar branches decide access.

## Requirements

### Requirement: Permission-based auth model

The system MUST model authorization through `Role.permissions`; admin access MUST depend on `admin:access`, never on UI booleans such as `isAdmin`.

#### Scenario: Viewer remains non-admin
- GIVEN an authenticated user with only `viewer:access`
- WHEN `hasPermission('admin:access')` is evaluated
- THEN the result is `false`

#### Scenario: Admin grants admin UI access
- GIVEN an authenticated user whose role includes `admin:access`
- WHEN Topbar and route guards evaluate permissions
- THEN admin-only actions become available

### Requirement: Login and logout flow

The User button MUST open an `AnchoredOverlay`. When unauthenticated, the overlay MUST show username and password fields plus submit feedback. Username and password MUST be trimmed for required validation; empty values MUST block submit with inline errors. Invalid credentials MUST show the service error. Successful login MUST close the overlay, clear the password field, persist the session, and keep the user on the current viewer route. Logout MUST clear persisted session; if the current route is under `/admin`, logout MUST redirect to `/`.

#### Scenario: Validation blocks empty submit
- GIVEN the login overlay is open
- WHEN the user submits with an empty username or password
- THEN authentication is not called and inline validation is shown

#### Scenario: Successful admin login from viewer route
- GIVEN the user is on `/explorer`
- WHEN valid admin credentials are submitted
- THEN the overlay closes, the route stays `/explorer`, and admin-only Topbar buttons appear

#### Scenario: Logout from admin route
- GIVEN an authenticated admin on `/admin/dashboards`
- WHEN logout is triggered
- THEN the session is cleared and the user is redirected to `/`

### Requirement: Topbar auth-dependent actions

The Topbar MUST render `Bell + User` for unauthenticated or viewer-only sessions. It MUST render `Bell + Palette + Settings + User` for authenticated admin sessions. The Palette button MUST open the shader panel and replace the old Settings-as-shader behavior. The Settings button MUST navigate to `/admin`. Palette and Settings MUST be hidden when `hasPermission('admin:access')` is false.

#### Scenario: Default action set
- GIVEN no authenticated admin session exists
- WHEN the Topbar renders
- THEN only Bell and User actions are visible on the right side

#### Scenario: Admin action set
- GIVEN an authenticated admin session exists
- WHEN the Topbar renders
- THEN Bell, Palette, Settings, and User are visible in that order

### Requirement: Admin route guarding

`RequirePermission` MUST accept `{ permission, redirectTo?, children }`, wait until auth hydration completes, and redirect with `replace` to `redirectTo ?? '/'` when the permission is missing.

```ts
export interface RequirePermissionProps {
  permission: Permission;
  redirectTo?: string;
  children: React.ReactNode;
}
```

All `/admin/*` routes MUST be guarded with `permission='admin:access'`.

#### Scenario: Direct admin URL without auth
- GIVEN no authenticated admin session exists
- WHEN the user opens `/admin/dashboards`
- THEN the app redirects to `/`

#### Scenario: Direct admin URL with viewer auth
- GIVEN an authenticated viewer session without `admin:access`
- WHEN the user opens `/admin/hierarchy`
- THEN the app redirects to `/`

## Acceptance Criteria

- Domain tests verify the exact shapes of `Permission`, `Role`, `AuthUser`, `AuthSession`, and `AuthResult`.
- Service tests verify success for one admin user, success for one viewer user, and generic failure for invalid credentials.
- Adapter tests verify `toAuthSession` copies the user, sets `isAuthenticated` to `true`, and stamps an ISO timestamp.
- Store tests verify login persistence under `hmi-auth-session`, hydration from storage, `hasPermission`, and logout clearing persisted state.
- UI tests verify User-button trigger, field validation, auth error rendering, success close behavior, and auth-dependent Topbar layouts.
- Routing tests verify every `/admin/*` route requires `admin:access` and redirects unauthorized direct access to `/`.
