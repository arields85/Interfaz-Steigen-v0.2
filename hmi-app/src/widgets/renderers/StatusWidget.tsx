import type { WidgetConfig } from '../../domain/admin.types';
import type { EquipmentSummary, EquipmentStatus } from '../../domain/equipment.types';
import StatusBadge from '../../components/ui/StatusBadge';

// =============================================================================
// StatusWidget
// Renderer para widgets de tipo 'status'.
// Traduce WidgetConfig + datos del dominio → StatusBadge.
//
// El binding para StatusWidget es semánticamente diferente al de MetricWidget:
// no resuelve un valor numérico — resuelve un EquipmentStatus directamente
// desde el equipo indicado en binding.assetId.
//
// Si assetId no está en equipmentMap → StatusBadge status="unknown".
// =============================================================================

interface StatusWidgetProps {
    widget: WidgetConfig;
    equipmentMap: Map<string, EquipmentSummary>;
    compact?: boolean;
    className?: string;
}

export default function StatusWidget({
    widget,
    equipmentMap,
    compact = false,
    className,
}: StatusWidgetProps) {
    const assetId = widget.binding?.assetId;
    const equipment = assetId ? equipmentMap.get(assetId) : undefined;

    // Resolución directa: EquipmentStatus del equipo o 'unknown' si no se encuentra
    const status: EquipmentStatus = equipment?.status ?? 'unknown';

    return (
        <span className={className}>
            <StatusBadge status={status} compact={compact} />
        </span>
    );
}
