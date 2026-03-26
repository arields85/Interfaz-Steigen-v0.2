import type { WidgetConfig } from '../../domain/admin.types';
import type { EquipmentSummary, ConnectionState } from '../../domain/equipment.types';
import ConnectionBadge from '../../components/ui/ConnectionBadge';

// =============================================================================
// ConnectionWidget
// Renderer para widgets de tipo 'connection-indicator'.
// Traduce WidgetConfig + datos del dominio → ConnectionBadge.
//
// Resuelve ConnectionState + lastUpdateAt del equipo indicado en binding.assetId.
// Todos los valores de ConnectionState están cubiertos:
//   online, degraded, stale, offline, unknown
// =============================================================================

interface ConnectionWidgetProps {
    widget: WidgetConfig;
    equipmentMap: Map<string, EquipmentSummary>;
    className?: string;
}

export default function ConnectionWidget({
    widget,
    equipmentMap,
    className,
}: ConnectionWidgetProps) {
    const assetId = widget.binding?.assetId;
    const equipment = assetId ? equipmentMap.get(assetId) : undefined;

    // Resolución: ConnectionState del equipo o 'unknown' como fallback seguro
    const state: ConnectionState = equipment?.connectionState ?? 'unknown';
    const lastUpdateAt = equipment?.lastUpdateAt;

    return (
        <span className={className}>
            <ConnectionBadge state={state} lastUpdateAt={lastUpdateAt} />
        </span>
    );
}
