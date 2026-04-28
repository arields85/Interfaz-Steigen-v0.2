import { describe, expect, it, vi } from 'vitest';

import type { AuthResult } from '../../domain';
import { toAuthSession } from './auth.adapter';

describe('auth.adapter', () => {
    it('maps the authenticated user into the session correctly', () => {
        const result: Extract<AuthResult, { ok: true }> = {
            ok: true,
            user: {
                id: 'user-admin',
                username: 'admin',
                displayName: 'Administrador',
                role: {
                    id: 'role-admin',
                    name: 'Admin',
                    permissions: ['viewer:access', 'admin:access'],
                },
            },
        };

        expect(toAuthSession(result).user).toEqual(result.user);
    });

    it('sets isAuthenticated to true', () => {
        const result: Extract<AuthResult, { ok: true }> = {
            ok: true,
            user: {
                id: 'user-viewer',
                username: 'usuario',
                displayName: 'Visualizador',
                role: {
                    id: 'role-viewer',
                    name: 'Viewer',
                    permissions: ['viewer:access'],
                },
            },
        };

        expect(toAuthSession(result).isAuthenticated).toBe(true);
    });

    it('stamps the login timestamp as an ISO-8601 string', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-04-28T15:00:00.000Z'));

        const result: Extract<AuthResult, { ok: true }> = {
            ok: true,
            user: {
                id: 'user-admin',
                username: 'admin',
                displayName: 'Administrador',
                role: {
                    id: 'role-admin',
                    name: 'Admin',
                    permissions: ['viewer:access', 'admin:access'],
                },
            },
        };

        expect(toAuthSession(result).loginTimestamp).toBe('2026-04-28T15:00:00.000Z');

        vi.useRealTimers();
    });
});
