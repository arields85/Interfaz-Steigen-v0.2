import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthSession, Permission } from '../../domain';
import RequirePermission from './RequirePermission';

type AuthStoreState = {
    session: AuthSession;
    isHydrated: boolean;
    hasPermission: (permission: Permission) => boolean;
};

const unauthenticatedSession: AuthSession = {
    user: null,
    isAuthenticated: false,
    loginTimestamp: null,
};

const authStoreMock = vi.hoisted(() => {
    let state: AuthStoreState = {
        session: {
            user: null,
            isAuthenticated: false,
            loginTimestamp: null,
        },
        isHydrated: true,
        hasPermission: () => false,
    };

    const store = Object.assign(
        vi.fn(<T,>(selector: (currentState: AuthStoreState) => T) => selector(state)),
        {
            getState: () => state,
            setState: (nextState: AuthStoreState) => {
                state = nextState;
            },
        },
    );

    return { store };
});

vi.mock('../../store/auth.store', () => ({
    useAuthStore: authStoreMock.store,
}));

function renderGuard() {
    return render(
        <MemoryRouter initialEntries={['/admin']}>
            <Routes>
                <Route path="/" element={<div>Inicio</div>} />
                <Route
                    path="/admin"
                    element={
                        <RequirePermission permission="admin:access">
                            <div>Panel admin</div>
                        </RequirePermission>
                    }
                />
            </Routes>
        </MemoryRouter>,
    );
}

describe('RequirePermission', () => {
    beforeEach(() => {
        authStoreMock.store.setState({
            session: unauthenticatedSession,
            isHydrated: true,
            hasPermission: () => false,
        });
    });

    it('renders children when user has the required permission', () => {
        authStoreMock.store.setState({
            session: {
                user: {
                    id: 'admin',
                    username: 'admin',
                    displayName: 'Administrador',
                    role: {
                        id: 'role-admin',
                        name: 'Admin',
                        permissions: ['viewer:access', 'admin:access'],
                    },
                },
                isAuthenticated: true,
                loginTimestamp: '2026-04-28T18:00:00.000Z',
            },
            isHydrated: true,
            hasPermission: (permission) => permission === 'admin:access',
        });

        renderGuard();

        expect(screen.getByText('Panel admin')).toBeInTheDocument();
        expect(screen.queryByText('Inicio')).not.toBeInTheDocument();
    });

    it('redirects when the user lacks the required permission', () => {
        authStoreMock.store.setState({
            session: {
                user: {
                    id: 'viewer',
                    username: 'usuario',
                    displayName: 'Visualizador',
                    role: {
                        id: 'role-viewer',
                        name: 'Viewer',
                        permissions: ['viewer:access'],
                    },
                },
                isAuthenticated: true,
                loginTimestamp: '2026-04-28T18:00:00.000Z',
            },
            isHydrated: true,
            hasPermission: () => false,
        });

        renderGuard();

        expect(screen.getByText('Inicio')).toBeInTheDocument();
        expect(screen.queryByText('Panel admin')).not.toBeInTheDocument();
    });

    it('redirects when the user is not authenticated', () => {
        renderGuard();

        expect(screen.getByText('Inicio')).toBeInTheDocument();
        expect(screen.queryByText('Panel admin')).not.toBeInTheDocument();
    });

    it('renders nothing until hydration completes', () => {
        authStoreMock.store.setState({
            session: unauthenticatedSession,
            isHydrated: false,
            hasPermission: () => false,
        });

        const { container } = renderGuard();

        expect(container).toBeEmptyDOMElement();
        expect(screen.queryByText('Inicio')).not.toBeInTheDocument();
    });
});
