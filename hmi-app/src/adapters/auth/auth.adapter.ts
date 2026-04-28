import type { AuthResult, AuthSession } from '../../domain';

export function toAuthSession(result: Extract<AuthResult, { ok: true }>): AuthSession {
    return {
        user: result.user,
        isAuthenticated: true,
        loginTimestamp: new Date().toISOString(),
    };
}
