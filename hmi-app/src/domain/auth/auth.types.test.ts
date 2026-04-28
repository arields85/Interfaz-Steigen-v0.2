import { describe, expect, expectTypeOf, it } from 'vitest';

import type { AuthResult, AuthSession, AuthUser, Permission, Role } from './auth.types';

describe('auth.types', () => {
    it('matches the permission, role, user, and session contracts from the spec', () => {
        const viewerPermission: Permission = 'viewer:access';
        const customPermission: Permission = 'custom:permission';

        const role: Role = {
            id: 'role-viewer',
            name: 'Viewer',
            permissions: [viewerPermission, customPermission],
        };

        const user: AuthUser = {
            id: 'user-1',
            username: 'usuario',
            displayName: 'Viewer User',
            role,
        };

        const session: AuthSession = {
            user,
            isAuthenticated: true,
            loginTimestamp: '2026-04-28T10:00:00.000Z',
        };

        expect(role.permissions).toEqual(['viewer:access', 'custom:permission']);
        expect(session).toEqual({
            user,
            isAuthenticated: true,
            loginTimestamp: '2026-04-28T10:00:00.000Z',
        });
    });

    it('matches the AuthResult success and failure union shape exactly', () => {
        const success: AuthResult = {
            ok: true,
            user: {
                id: 'admin-1',
                username: 'admin',
                displayName: 'Admin User',
                role: {
                    id: 'role-admin',
                    name: 'Admin',
                    permissions: ['viewer:access', 'admin:access'],
                },
            },
        };

        const failure: AuthResult = {
            ok: false,
            error: 'Credenciales inválidas',
        };

        expect(success.ok).toBe(true);
        expect(success.user.role.permissions).toContain('admin:access');
        expect(failure).toEqual({ ok: false, error: 'Credenciales inválidas' });

        expectTypeOf<Extract<AuthResult, { ok: true }>['user']>().toEqualTypeOf<AuthUser>();
        expectTypeOf<Extract<AuthResult, { ok: false }>['error']>().toEqualTypeOf<string>();
    });
});
