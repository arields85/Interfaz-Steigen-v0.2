import { describe, expect, it } from 'vitest';

import { authenticate } from './localAuth.service';

describe('localAuth.service', () => {
    it('authenticates the admin user successfully', async () => {
        await expect(authenticate('admin', '7trebol')).resolves.toEqual({
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
        });
    });

    it('authenticates the viewer user successfully', async () => {
        await expect(authenticate('usuario', 'usuario123')).resolves.toEqual({
            ok: true,
            user: {
                id: 'user-viewer',
                username: 'usuario',
                displayName: 'Usuario',
                role: {
                    id: 'role-viewer',
                    name: 'Viewer',
                    permissions: ['viewer:access'],
                },
            },
        });
    });

    it('returns a generic error for invalid credentials without leaking password details', async () => {
        const result = await authenticate('admin', 'wrong-password');

        expect(result).toEqual({ ok: false, error: 'Credenciales inválidas' });

        if (!result.ok) {
            expect(result.error).not.toContain('wrong-password');
            expect(result.error.toLowerCase()).not.toContain('password');
        }
    });

    it('fails when username or password are empty', async () => {
        await expect(authenticate('', '7trebol')).resolves.toEqual({
            ok: false,
            error: 'Credenciales inválidas',
        });

        await expect(authenticate('admin', '')).resolves.toEqual({
            ok: false,
            error: 'Credenciales inválidas',
        });
    });
});
