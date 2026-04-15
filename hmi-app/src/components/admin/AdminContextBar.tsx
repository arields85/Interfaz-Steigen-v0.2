import type { ReactNode } from 'react';

interface AdminContextBarProps {
    children: ReactNode;
    rail?: ReactNode;
    panel?: ReactNode;
    railWidth: string;
    sidePanelWidth: string;
}

export default function AdminContextBar({
    children,
    rail,
    panel,
    railWidth,
    sidePanelWidth,
}: AdminContextBarProps) {
    return (
        <header
            className="grid h-12 min-h-12 shrink-0 overflow-visible border-b border-industrial-border bg-industrial-surface"
            style={{
                gridTemplateColumns: `${railWidth} ${sidePanelWidth} minmax(0, 1fr)`,
            }}
        >
            <div className="flex h-full items-center justify-center border-r border-industrial-border">
                {rail ?? null}
            </div>
            <div className="flex h-full min-w-0 items-center border-r border-industrial-border">
                {panel ?? null}
            </div>
            <div className="flex h-full min-w-0 items-center overflow-visible">
                {children}
            </div>
        </header>
    );
}
