import { beforeEach, describe, expect, it, vi } from 'vitest';

const AUTH_STORAGE_KEY = 'hmi-auth-session';

async function loadFreshAuthStore() {
    vi.resetModules();
    return import('./auth.store');
}

describe('useAuthStore', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.resetModules();
    });

    it('starts unauthenticated by default', async () => {
        const { useAuthStore } = await loadFreshAuthStore();

        expect(useAuthStore.getState().session).toEqual({
            user: null,
            isAuthenticated: false,
            loginTimestamp: null,
        });
        expect(useAuthStore.getState().error).toBeNull();
        expect(useAuthStore.getState().isAuthenticating).toBe(false);
    });

    it('logs in with valid credentials and persists only the session', async () => {
        const { useAuthStore } = await loadFreshAuthStore();

        const result = await useAuthStore.getState().login('admin', '7trebol');

        expect(result.ok).toBe(true);
        expect(useAuthStore.getState().session.user?.username).toBe('admin');
        expect(useAuthStore.getState().session.isAuthenticated).toBe(true);
        expect(useAuthStore.getState().error).toBeNull();

        expect(localStorage.getItem(AUTH_STORAGE_KEY)).toMatch(
            /^\{"state":\{"session":\{.*\}\},"version":0\}$/,
        );
    });

    it('hydrates the persisted session but resets runtime-only flags on reload', async () => {
        const { useAuthStore } = await loadFreshAuthStore();

        await useAuthStore.getState().login('usuario', 'usuario123');

        const { useAuthStore: reloadedAuthStore } = await loadFreshAuthStore();
        await reloadedAuthStore.persist.rehydrate();

        expect(reloadedAuthStore.getState().session.user?.username).toBe('usuario');
        expect(reloadedAuthStore.getState().session.isAuthenticated).toBe(true);
        expect(reloadedAuthStore.getState().isHydrated).toBe(true);
        expect(reloadedAuthStore.getState().error).toBeNull();
        expect(reloadedAuthStore.getState().isAuthenticating).toBe(false);
    });

    it('stores the generic error when credentials are invalid', async () => {
        const { useAuthStore } = await loadFreshAuthStore();

        const result = await useAuthStore.getState().login('admin', 'wrong-password');

        expect(result).toEqual({ ok: false, error: 'Credenciales inválidas' });
        expect(useAuthStore.getState().error).toBe('Credenciales inválidas');
        expect(useAuthStore.getState().session).toEqual({
            user: null,
            isAuthenticated: false,
            loginTimestamp: null,
        });
    });

    it('clears the session and persisted storage on logout', async () => {
        const { useAuthStore } = await loadFreshAuthStore();

        await useAuthStore.getState().login('admin', '7trebol');
        useAuthStore.getState().logout();

        expect(useAuthStore.getState().session).toEqual({
            user: null,
            isAuthenticated: false,
            loginTimestamp: null,
        });
        expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBe(
            JSON.stringify({
                state: {
                    session: {
                        user: null,
                        isAuthenticated: false,
                        loginTimestamp: null,
                    },
                },
                version: 0,
            }),
        );
    });

    it('evaluates permissions from the authenticated role', async () => {
        const { useAuthStore } = await loadFreshAuthStore();

        await useAuthStore.getState().login('usuario', 'usuario123');

        expect(useAuthStore.getState().hasPermission('viewer:access')).toBe(true);
        expect(useAuthStore.getState().hasPermission('admin:access')).toBe(false);

        await useAuthStore.getState().login('admin', '7trebol');

        expect(useAuthStore.getState().hasPermission('admin:access')).toBe(true);
    });

    it('uses the required persistence key', async () => {
        const { useAuthStore } = await loadFreshAuthStore();

        await useAuthStore.getState().login('usuario', 'usuario123');

        expect(useAuthStore.persist.getOptions().name).toBe(AUTH_STORAGE_KEY);
        expect(localStorage.getItem(AUTH_STORAGE_KEY)).not.toBeNull();
        expect(localStorage.getItem('interfaz-laboratorio-auth')).toBeNull();
    });
});
