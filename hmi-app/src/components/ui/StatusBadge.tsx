import type { EquipmentStatus } from '../../domain/equipment.types';

// =============================================================================
// StatusBadge
// Muestra el estado operativo de un equipo con semántica cromática completa.
// Referencia: UI_Style_Guide_Design_System_Base_v1.md §11
// =============================================================================

interface StatusBadgeProps {
    status: EquipmentStatus;
    /** Si true, muestra solo el dot sin el label de texto */
    compact?: boolean;
    className?: string;
}

const STATUS_CONFIG: Record<EquipmentStatus, {
    label: string;
    dotClass: string;
    textClass: string;
    animate: boolean;
}> = {
    running: {
        label: 'En Producción',
        dotClass: 'bg-accent-green',
        textClass: 'text-accent-green',
        animate: true,
    },
    idle: {
        label: 'Stand-by',
        dotClass: 'bg-industrial-muted',
        textClass: 'text-industrial-muted',
        animate: false,
    },
    warning: {
        label: 'Advertencia',
        dotClass: 'bg-accent-amber',
        textClass: 'text-accent-amber',
        animate: true,
    },
    critical: {
        label: 'Crítico',
        dotClass: 'bg-accent-ruby',
        textClass: 'text-accent-ruby',
        animate: true,
    },
    offline: {
        label: 'Offline',
        dotClass: 'bg-[#4a5568]',
        textClass: 'text-[#4a5568]',
        animate: false,
    },
    maintenance: {
        label: 'Mantenimiento',
        dotClass: 'bg-accent-purple',
        textClass: 'text-accent-purple',
        animate: false,
    },
    unknown: {
        label: 'Desconocido',
        dotClass: 'bg-[#64748b]',
        textClass: 'text-[#64748b]',
        animate: false,
    },
};

export default function StatusBadge({ status, compact = false, className = '' }: StatusBadgeProps) {
    const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.unknown;

    return (
        <span className={`inline-flex items-center gap-1.5 ${className}`}>
            <span
                className={`w-2 h-2 rounded-full shrink-0 ${config.dotClass} ${config.animate ? 'animate-pulse-slow' : ''}`}
            />
            {!compact && (
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${config.textClass}`}>
                    {config.label}
                </span>
            )}
        </span>
    );
}
