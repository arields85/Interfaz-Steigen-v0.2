import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { toAuthSession } from '../adapters/auth/auth.adapter';
import type { AuthResult, AuthSession, Permission } from '../domain';
import { authenticate } from '../services/auth/localAuth.service';

export const AUTH_SESSION_STORAGE_KEY = 'hmi-auth-session';

const UNAUTHENTICATED_SESSION: AuthSession = {
    user: null,
    isAuthenticated: false,
    loginTimestamp: null,
};

interface AuthStore {
    session: AuthSession;
    isHydrated: boolean;
    isAuthenticating: boolean;
    error: string | null;
    login: (username: string, password: string) => Promise<AuthResult>;
    logout: () => void;
    hasPermission: (permission: Permission) => boolean;
}

export const useAuthStore = create<AuthStore>()(
    persist(
        (set, get) => ({
            session: UNAUTHENTICATED_SESSION,
            isHydrated: false,
            isAuthenticating: false,
            error: null,
            login: async (username, password) => {
                set({ isAuthenticating: true, error: null });

                const result = await authenticate(username, password);

                if (!result.ok) {
                    set({
                        session: UNAUTHENTICATED_SESSION,
                        isAuthenticating: false,
                        error: result.error,
                    });

                    return result;
                }

                set({
                    session: toAuthSession(result),
                    isAuthenticating: false,
                    error: null,
                });

                return result;
            },
            logout: () => {
                set({
                    session: UNAUTHENTICATED_SESSION,
                    isAuthenticating: false,
                    error: null,
                });
            },
            hasPermission: (permission) =>
                get().session.user?.role.permissions.includes(permission) ?? false,
        }),
        {
            name: AUTH_SESSION_STORAGE_KEY,
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ session: state.session }),
            onRehydrateStorage: () => (state) => {
                if (!state) {
                    return;
                }

                if (!state.session.user || !state.session.isAuthenticated) {
                    state.session = UNAUTHENTICATED_SESSION;
                }

                state.isHydrated = true;
                state.isAuthenticating = false;
                state.error = null;
            },
        },
    ),
);

// Cross-tab sync: when another tab logs in/out, update this tab's store
if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
        if (event.key !== AUTH_SESSION_STORAGE_KEY) {
            return;
        }

        if (!event.newValue) {
            useAuthStore.setState({
                session: UNAUTHENTICATED_SESSION,
                isAuthenticating: false,
                error: null,
            });
            return;
        }

        try {
            const parsed = JSON.parse(event.newValue) as { state?: { session?: AuthSession } };
            const session = parsed?.state?.session;

            if (session?.user && session.isAuthenticated) {
                useAuthStore.setState({ session, error: null });
            } else {
                useAuthStore.setState({
                    session: UNAUTHENTICATED_SESSION,
                    isAuthenticating: false,
                    error: null,
                });
            }
        } catch {
            useAuthStore.setState({
                session: UNAUTHENTICATED_SESSION,
                isAuthenticating: false,
                error: null,
            });
        }
    });
}
