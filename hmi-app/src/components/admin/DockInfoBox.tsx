import { AlertCircle, AlertTriangle, Info, type LucideIcon } from 'lucide-react';

interface DockInfoBoxProps {
    text: string;
    variant: 'normal' | 'warning' | 'critical';
}

const VARIANT_CLASS_MAP: Record<
    DockInfoBoxProps['variant'],
    { containerClass: string; icon: LucideIcon; iconClass: string }
> = {
    normal: {
        containerClass: 'border-white/5 bg-white/5',
        icon: Info,
        iconClass: 'text-industrial-muted',
    },
    warning: {
        containerClass: 'border-status-warning/20 bg-[color:color-mix(in_srgb,var(--color-status-warning)_10%,transparent)]',
        icon: AlertTriangle,
        iconClass: 'text-status-warning',
    },
    critical: {
        containerClass: 'border-status-critical/20 bg-[color:color-mix(in_srgb,var(--color-status-critical)_10%,transparent)]',
        icon: AlertCircle,
        iconClass: 'text-status-critical',
    },
};

export default function DockInfoBox({ text, variant }: DockInfoBoxProps) {
    const { containerClass, icon: Icon, iconClass } = VARIANT_CLASS_MAP[variant];

    return (
        <div className={`flex items-start gap-2 rounded border px-2 py-1.5 ${containerClass}`}>
            <Icon size={14} className={`mt-0.5 shrink-0 ${iconClass}`} />
            <span className="text-[10px] font-bold text-industrial-muted">{text}</span>
        </div>
    );
}
