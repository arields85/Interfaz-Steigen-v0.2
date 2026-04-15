import { LayoutDashboard, Network, type LucideIcon } from 'lucide-react';

export interface AdminSectionDefinition {
    key: string;
    label: string;
    navTo: string;
    icon: LucideIcon;
    matchPrefixes: string[];
}

export const ADMIN_SECTIONS: AdminSectionDefinition[] = [
    {
        key: 'hierarchy',
        label: 'Jerarquía de Planta',
        navTo: '/admin/hierarchy',
        icon: Network,
        matchPrefixes: ['/admin/hierarchy'],
    },
    {
        key: 'dashboards',
        label: 'Dashboards',
        navTo: '/admin/dashboards',
        icon: LayoutDashboard,
        matchPrefixes: ['/admin/dashboards', '/admin/builder'],
    },
];

function matchesPrefix(pathname: string, prefix: string) {
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function getAdminSectionByPath(pathname: string): AdminSectionDefinition | undefined {
    return ADMIN_SECTIONS.find((section) => section.matchPrefixes.some((prefix) => matchesPrefix(pathname, prefix)));
}
