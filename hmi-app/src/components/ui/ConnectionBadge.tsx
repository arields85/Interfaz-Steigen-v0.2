import { Wifi, WifiOff, Clock, AlertCircle, Unplug } from 'lucide-react';
import type { ConnectionState } from '../../domain/equipment.types';

// =============================================================================
// ConnectionBadge
// Muestra el estado de conectividad y frescura del dato.
// Arquitectura Técnica v1.3 §9.2 — UI Style Guide §11
// =============================================================================

interface ConnectionBadgeProps {
    state: ConnectionState;
    /** ISO string o timestamp legible de la última actualización */
    lastUpdateAt?: string;
    className?: string;
}

const CONNECTION_CONFIG: Record<ConnectionState, {
    label: string;
    icon: React.ElementType;
    colorClass: string;
}> = {
    online: {
        label: 'Online',
        icon: Wifi,
        colorClass: 'text-accent-green',
    },
    degraded: {
        label: 'Degradado',
        icon: AlertCircle,
        colorClass: 'text-accent-amber',
    },
    stale: {
        label: 'Dato desactualizado',
        icon: Clock,
        colorClass: 'text-accent-blue',
    },
    offline: {
        label: 'Sin señal',
        icon: WifiOff,
        colorClass: 'text-industrial-muted',
    },
    unknown: {
        label: 'Sin datos de conexión',
        icon: Unplug,
        colorClass: 'text-industrial-muted',
    },
};

/** Convierte un ISO string a una expresión de frescura relativa (ej. "hace 12s") */
function formatRelativeTime(isoString: string): string {
    try {
        const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
        if (diff < 60) return `hace ${diff}s`;
        if (diff < 3600) return `hace ${Math.floor(diff / 60)}min`;
        return `hace ${Math.floor(diff / 3600)}h`;
    } catch {
        return '';
    }
}

export default function ConnectionBadge({ state, lastUpdateAt, className = '' }: ConnectionBadgeProps) {
    const config = CONNECTION_CONFIG[state] ?? CONNECTION_CONFIG.unknown;
    const Icon = config.icon;
    const relativeTime = lastUpdateAt ? formatRelativeTime(lastUpdateAt) : '';

    return (
        <span className={`inline-flex items-center gap-1.5 ${className}`}>
            <Icon size={12} className={`shrink-0 ${config.colorClass}`} strokeWidth={2} />
            <span className={`uppercase ${config.colorClass}`}>
                {config.label}
                {relativeTime && (
                    <span className="text-industrial-muted ml-1 normal-case">
                        · {relativeTime}
                    </span>
                )}
            </span>
        </span>
    );
}
