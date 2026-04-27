import type React from 'react';

export interface ContextBarNoticeProps {
    /** Lucide icon component to render */
    icon: React.ComponentType<{ size?: number; className?: string }>;
    /** Text label to display */
    label: string;
    /** Optional extra className */
    className?: string;
}

export default function ContextBarNotice({ icon: Icon, label, className }: ContextBarNoticeProps) {
    return (
        <div
            className={`flex items-center gap-1.5 rounded bg-[color:color-mix(in_srgb,var(--color-status-warning)_10%,transparent)] px-2 py-1 uppercase text-status-warning${className ? ` ${className}` : ''}`}
        >
            <Icon size={12} />
            {label}
        </div>
    );
}
