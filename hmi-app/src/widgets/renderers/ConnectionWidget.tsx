import { Wifi, WifiOff, Clock, AlertCircle, Unplug, type LucideIcon } from 'lucide-react';
import type { ConnectionIndicatorDisplayOptions, WidgetConfig } from '../../domain/admin.types';
import type { EquipmentSummary, ConnectionState } from '../../domain/equipment.types';
import WidgetCenteredContentLayout from '../../components/ui/WidgetCenteredContentLayout';
import WidgetHeader from '../../components/ui/WidgetHeader';
import {
    normalizeSimulatedConnectionState,
    resolveConnectionIndicatorLabel,
} from '../../utils/connectionWidget';

// =============================================================================
// ConnectionWidget
// Renderer canónico para widgets de tipo 'connection-indicator'.
//
// Estructura:
//   glass-panel → WidgetCenteredContentLayout
//     header: WidgetHeader (título + ícono del estado)
//     center: badge lumínico con label del ConnectionState
//     footer: tiempo relativo de última actualización (opcional)
//
// Soporta los 5 estados de ConnectionState con íconos y colores semánticos:
//   online    → Wifi,         --color-status-normal
//   degraded  → AlertCircle,  --color-status-warning
//   stale     → Clock,        --color-accent-blue
//   offline   → WifiOff,      --color-industrial-muted
//   unknown   → Unplug,       --color-industrial-muted
//
// Los labels de cada estado son personalizables via displayOptions.
// =============================================================================

interface ConnectionWidgetProps {
    widget: WidgetConfig;
    equipmentMap: Map<string, EquipmentSummary>;
    className?: string;
}

interface ConnectionStateConfig {
    icon: LucideIcon;
    iconColor: string;
    dotClass: string;
    textClass: string;
}

const CONNECTION_CONFIG: Record<ConnectionState, ConnectionStateConfig> = {
    online: {
        icon: Wifi,
        iconColor: 'var(--color-status-normal)',
        dotClass: 'bg-status-normal animate-pulse-slow',
        textClass: 'text-status-normal',
    },
    degraded: {
        icon: AlertCircle,
        iconColor: 'var(--color-status-warning)',
        dotClass: 'bg-status-warning animate-pulse-slow',
        textClass: 'text-status-warning',
    },
    stale: {
        icon: Clock,
        iconColor: 'var(--color-accent-blue)',
        dotClass: 'bg-accent-blue',
        textClass: 'text-accent-blue',
    },
    offline: {
        icon: WifiOff,
        iconColor: 'var(--color-industrial-muted)',
        dotClass: 'bg-industrial-muted',
        textClass: 'text-industrial-muted',
    },
    unknown: {
        icon: Unplug,
        iconColor: 'var(--color-industrial-muted)',
        dotClass: 'bg-industrial-muted',
        textClass: 'text-industrial-muted',
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

export default function ConnectionWidget({
    widget,
    equipmentMap,
    className,
}: ConnectionWidgetProps) {
    const options = widget.displayOptions as ConnectionIndicatorDisplayOptions | undefined;

    const binding = widget.binding;

    // Resolución: modo simulado → lee simulatedValue como ConnectionState string
    //             modo real     → lee connectionState del equipo vinculado
    const assetId = binding?.assetId;
    const equipment = assetId ? equipmentMap.get(assetId) : undefined;

    const state: ConnectionState = binding?.mode === 'simulated_value'
        ? normalizeSimulatedConnectionState(binding.simulatedValue)
        : (equipment?.connectionState ?? 'unknown');

    const lastUpdateAt = equipment?.lastUpdateAt;

    const config = CONNECTION_CONFIG[state];

    // Label: custom de displayOptions o default canónico.
    const label = resolveConnectionIndicatorLabel(state, options);

    // Footer de tiempo relativo
    const showLastUpdate = options?.showLastUpdate !== false; // default true
    const relativeTime = lastUpdateAt ? formatRelativeTime(lastUpdateAt) : '';

    return (
        <div className={`p-5 glass-panel group w-full h-full ${className ?? ''}`}>
            <WidgetCenteredContentLayout
                header={(
                        <WidgetHeader
                            title={widget.title ?? 'Conexión'}
                            icon={config.icon}
                            iconColor={config.iconColor}
                        />
                    )}
            >
                {/* Badge lumínico centrado — mismo patrón que ConnectionStatusBadge */}
                <span className="inline-flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${config.dotClass}`} />
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${config.textClass}`}>
                        {label}
                    </span>
                </span>
            </WidgetCenteredContentLayout>

            {/* Subtext footer: tiempo de última actualización */}
            {showLastUpdate && relativeTime && (
                <span className="absolute bottom-1 left-0 px-5 text-[9px] font-bold uppercase tracking-widest text-industrial-muted">
                    Actualizado {relativeTime}
                </span>
            )}
        </div>
    );
}
