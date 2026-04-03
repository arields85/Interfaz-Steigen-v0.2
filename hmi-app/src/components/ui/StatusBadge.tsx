import type { EquipmentStatus } from '../../domain/equipment.types';
import { DEFAULT_STATUS_LABELS } from '../../utils/statusWidget';

// =============================================================================
// StatusBadge
// Muestra el estado operativo de un equipo con semántica cromática completa.
// Referencia: UI_Style_Guide_Design_System_Base_v1.md §11
// =============================================================================

interface StatusBadgeProps {
    status: EquipmentStatus;
    label?: string;
    /** Si true, muestra solo el dot sin el label de texto */
    compact?: boolean;
    className?: string;
}

const STATUS_CONFIG: Record<EquipmentStatus, {
    dotClass: string;
    textClass: string;
    animate: boolean;
}> = {
    running: {
        dotClass: 'bg-accent-green',
        textClass: 'text-accent-green',
        animate: true,
    },
    idle: {
        dotClass: 'bg-industrial-muted',
        textClass: 'text-industrial-muted',
        animate: false,
    },
    warning: {
        dotClass: 'bg-accent-amber',
        textClass: 'text-accent-amber',
        animate: true,
    },
    critical: {
        dotClass: 'bg-accent-ruby',
        textClass: 'text-accent-ruby',
        animate: true,
    },
    offline: {
        dotClass: 'bg-industrial-muted',
        textClass: 'text-industrial-muted',
        animate: false,
    },
    maintenance: {
        dotClass: 'bg-accent-purple',
        textClass: 'text-accent-purple',
        animate: false,
    },
    unknown: {
        dotClass: 'bg-industrial-muted',
        textClass: 'text-industrial-muted',
        animate: false,
    },
};

export default function StatusBadge({ status, label, compact = false, className = '' }: StatusBadgeProps) {
    const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.unknown;
    const resolvedLabel = label?.trim() || DEFAULT_STATUS_LABELS[status];

    return (
        <span className={`inline-flex items-center gap-1.5 ${className}`}>
            <span
                className={`w-2 h-2 rounded-full shrink-0 ${config.dotClass} ${config.animate ? 'animate-pulse-slow' : ''}`}
            />
            {!compact && (
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${config.textClass}`}>
                    {resolvedLabel}
                </span>
            )}
        </span>
    );
}
