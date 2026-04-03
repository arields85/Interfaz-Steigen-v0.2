import type { ConnectionStatusDisplayOptions, ConnectionIndicatorDisplayOptions, StatusDisplayOptions, WidgetConfig } from '../../domain/admin.types';
import type {
    ConnectionState,
    EquipmentStatus,
    EquipmentSummary,
} from '../../domain/equipment.types';
import { resolveStatusLabel, normalizeSimulatedEquipmentStatus } from '../../utils/statusWidget';
import {
    normalizeSimulatedConnectionState,
    normalizeSimulatedConnectionStatus,
    resolveConnectionIndicatorLabel,
    resolveConnectionStatusLabel,
} from '../../utils/connectionWidget';

// =============================================================================
// HeaderWidgetRenderer
// Wrapper liviano para renderizar widgets de estado/conexión en el header
// del dashboard. El panel material vive en HeaderWidgetCanvas para mantener
// la misma base visual del grid sin volver a colorear el contenedor general.
// =============================================================================

interface HeaderWidgetRendererProps {
    widget: WidgetConfig;
    equipmentMap: Map<string, EquipmentSummary>;
    align?: 'start' | 'end';
}

const STATUS_COPY: Record<EquipmentStatus, { color: string; pulse?: boolean }> = {
    running: {
        color: 'var(--color-status-normal)',
        pulse: true,
    },
    idle: {
        color: 'var(--color-industrial-muted)',
    },
    warning: {
        color: 'var(--color-status-warning)',
        pulse: true,
    },
    critical: {
        color: 'var(--color-status-critical)',
        pulse: true,
    },
    offline: {
        color: 'var(--color-industrial-muted)',
    },
    maintenance: {
        color: 'var(--color-accent-purple)',
    },
    unknown: {
        color: 'var(--color-industrial-muted)',
    },
};

const CONNECTION_COPY: Record<ConnectionState, { color: string; pulse?: boolean }> = {
    online: {
        color: 'var(--color-status-normal)',
        pulse: true,
    },
    degraded: {
        color: 'var(--color-status-warning)',
        pulse: true,
    },
    stale: {
        color: 'var(--color-accent-blue)',
    },
    offline: {
        color: 'var(--color-industrial-muted)',
    },
    unknown: {
        color: 'var(--color-industrial-muted)',
    },
};

function CompactIndicator({
    label,
    color,
    pulse = false,
    align,
}: {
    label: string;
    color: string;
    pulse?: boolean;
    align: 'start' | 'end';
}) {
    return (
        <div className={`flex items-center gap-2 ${align === 'start' ? 'justify-start' : 'justify-end'}`}>
            <span
                className={`h-2 w-2 shrink-0 rounded-full ${pulse ? 'animate-pulse-slow' : ''}`}
                style={{
                    backgroundColor: color,
                    boxShadow: `0 0 10px color-mix(in srgb, ${color} 45%, transparent)`,
                }}
            />
            <span
                className="truncate text-[10px] font-bold uppercase tracking-[0.18em]"
                style={{ color }}
            >
                {label}
            </span>
        </div>
    );
}

export default function HeaderWidgetRenderer({
    widget,
    equipmentMap,
    align = 'end',
}: HeaderWidgetRendererProps) {
    const alignmentClasses = align === 'start'
        ? 'items-start text-left'
        : 'items-end text-right';

    if (widget.type === 'status') {
        const options = widget.displayOptions as StatusDisplayOptions | undefined;
        const status: EquipmentStatus = widget.binding?.mode === 'simulated_value'
            ? normalizeSimulatedEquipmentStatus(widget.binding.simulatedValue)
            : (() => {
                const assetId = widget.binding?.assetId;
                const equipment = assetId ? equipmentMap.get(assetId) : undefined;
                return equipment?.status ?? 'unknown';
            })();

        const copy = STATUS_COPY[status] ?? STATUS_COPY.unknown;
        const label = resolveStatusLabel(status, options);

        return (
            <div className={`flex flex-col gap-0.5 ${alignmentClasses}`}>
                <CompactIndicator
                    label={label}
                    color={copy.color}
                    pulse={copy.pulse}
                    align={align}
                />
            </div>
        );
    }

    if (widget.type === 'connection-indicator') {
        const options = widget.displayOptions as ConnectionIndicatorDisplayOptions | undefined;

        const binding = widget.binding;
        const assetId = binding?.assetId;
        const equipment = assetId ? equipmentMap.get(assetId) : undefined;

        const state: ConnectionState = binding?.mode === 'simulated_value'
            ? normalizeSimulatedConnectionState(binding.simulatedValue)
            : (equipment?.connectionState ?? 'unknown');

        const baseCopy = CONNECTION_COPY[state] ?? CONNECTION_COPY.unknown;
        const label = resolveConnectionIndicatorLabel(state, options);

        return (
            <div className={`flex flex-col gap-0.5 ${alignmentClasses}`}>
                <CompactIndicator
                    label={label}
                    color={baseCopy.color}
                    pulse={baseCopy.pulse}
                    align={align}
                />
            </div>
        );
    }

    if (widget.type === 'connection-status') {
        const options = widget.displayOptions as ConnectionStatusDisplayOptions | undefined;

        const isConnected = widget.binding?.mode === 'simulated_value'
            ? normalizeSimulatedConnectionStatus(widget.binding?.simulatedValue)
            : (() => {
                const assetId = widget.binding?.assetId;
                const equipment = assetId ? equipmentMap.get(assetId) : undefined;
                return equipment?.connectionState === 'online';
            })();

        const copy = {
            label: resolveConnectionStatusLabel(isConnected, options),
            color: isConnected ? 'var(--color-status-normal)' : 'var(--color-industrial-muted)',
            pulse: isConnected,
        };

        return (
            <div className={`flex flex-col gap-0.5 ${alignmentClasses}`}>
                <CompactIndicator
                    label={copy.label}
                    color={copy.color}
                    pulse={copy.pulse}
                    align={align}
                />
            </div>
        );
    }

    return (
        <div className={`flex flex-col gap-0.5 opacity-40 ${alignmentClasses}`}>
            <span className="text-[9px] font-bold uppercase tracking-widest text-industrial-muted">
                Widget no soportado en header
            </span>
            <span className="text-[9px] font-mono text-industrial-muted/60">
                {widget.type}
            </span>
        </div>
    );
}
