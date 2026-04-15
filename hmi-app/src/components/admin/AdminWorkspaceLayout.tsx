import type { CSSProperties, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import AdminContextBar from './AdminContextBar';
import { getAdminSectionByPath } from '../../utils/adminNavigation';

interface AdminWorkspaceLayoutProps {
    contextBar: ReactNode;
    contextBarPanel?: ReactNode;
    rail?: ReactNode;
    sidePanel?: ReactNode;
    children: ReactNode;
    railWidth?: string;
    sidePanelWidth?: string;
    mainScrollable?: boolean;
}

export default function AdminWorkspaceLayout({
    contextBar,
    contextBarPanel,
    rail,
    sidePanel,
    children,
    railWidth = '52px',
    sidePanelWidth = '280px',
    mainScrollable = false,
}: AdminWorkspaceLayoutProps) {
    const location = useLocation();
    const activeSection = getAdminSectionByPath(location.pathname);
    const ActiveSectionIcon = activeSection?.icon;

    const layoutVariables: CSSProperties = {
        ['--admin-workspace-rail-width' as string]: railWidth,
        ['--admin-workspace-panel-width' as string]: sidePanelWidth,
    };

    return (
        <section className="flex h-full min-h-0 w-full flex-col overflow-hidden">
            <AdminContextBar
                rail={ActiveSectionIcon ? <ActiveSectionIcon size={18} className="text-admin-accent" /> : undefined}
                panel={contextBarPanel}
                railWidth={railWidth}
                sidePanelWidth={sidePanelWidth}
            >
                {contextBar}
            </AdminContextBar>

            <div
                className="grid min-h-0 flex-1 grid-cols-[var(--admin-workspace-rail-width)_var(--admin-workspace-panel-width)_minmax(0,1fr)] overflow-hidden"
                style={layoutVariables}
            >
                <WorkspaceColumn>{rail}</WorkspaceColumn>
                <WorkspaceColumn>{sidePanel}</WorkspaceColumn>

                <main className={`flex h-full min-h-0 flex-col bg-industrial-bg ${mainScrollable ? 'overflow-y-auto hmi-scrollbar' : 'overflow-hidden'}`}>
                    {children}
                </main>
            </div>
        </section>
    );
}

function WorkspaceColumn({ children }: { children?: ReactNode }) {
    return (
        <aside className="flex h-full min-h-0 flex-col overflow-hidden border-r border-industrial-border bg-industrial-surface">
            <div className="h-full min-h-0">{children ?? null}</div>
        </aside>
    );
}
