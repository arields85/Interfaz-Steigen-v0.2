import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { Permission } from '../../domain';
import { useAuthStore } from '../../store/auth.store';

interface RequirePermissionProps {
    permission: Permission;
    redirectTo?: string;
    children: ReactNode;
}

export default function RequirePermission({ permission, redirectTo, children }: RequirePermissionProps) {
    const isHydrated = useAuthStore((state) => state.isHydrated);
    const session = useAuthStore((state) => state.session);
    const hasPermission = useAuthStore((state) => state.hasPermission(permission));

    if (!isHydrated) {
        return null;
    }

    if (session.isAuthenticated && hasPermission) {
        return <>{children}</>;
    }

    return <Navigate to={redirectTo ?? '/'} replace />;
}
