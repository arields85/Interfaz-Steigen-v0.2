import type { AuthResult, AuthUser } from '../../domain';

interface InternalUserRecord {
    user: AuthUser;
    password: string;
}

const AUTH_FAILURE_MESSAGE = 'Credenciales inválidas';

const INTERNAL_USERS: InternalUserRecord[] = [
    {
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
        password: 'usuario123',
    },
    {
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
        password: '7trebol',
    },
];

export async function authenticate(username: string, password: string): Promise<AuthResult> {
    if (!username || !password) {
        return { ok: false, error: AUTH_FAILURE_MESSAGE };
    }

    const matchedUser = INTERNAL_USERS.find(
        (candidate) => candidate.user.username === username && candidate.password === password,
    );

    if (!matchedUser) {
        return { ok: false, error: AUTH_FAILURE_MESSAGE };
    }

    return { ok: true, user: matchedUser.user };
}
