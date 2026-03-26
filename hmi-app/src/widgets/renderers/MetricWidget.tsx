import type { WidgetConfig } from '../../domain/admin.types';
import type { EquipmentSummary } from '../../domain/equipment.types';
import MetricCard from '../../components/ui/MetricCard';
import ConnectionBadge from '../../components/ui/ConnectionBadge';
import { resolveBinding } from '../resolvers/bindingResolver';
import { toCardStatus } from '../resolvers/thresholdEvaluator';
import { Gauge, Activity, Thermometer, Zap, Droplet, Wind, Settings, type LucideIcon } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
    'Gauge': Gauge,
    'Activity': Activity,
    'Thermometer': Thermometer,
    'Zap': Zap,
    'Droplet': Droplet,
    'Wind': Wind,
    'Settings': Settings
};
// =============================================================================
// MetricWidget
// Renderer para widgets de tipo 'metric-card' y 'kpi'.
// Traduce WidgetConfig + datos del dominio → props de MetricCard.
//
// Esta capa es responsable de:
// - Resolver el binding (real o simulado) vía bindingResolver
// - Mapear ResolvedBinding → props de MetricCard
// - Gestionar los estados stale y no-data sin acoplar lógica al componente base
// - Mostrar ConnectionBadge cuando la fuente tiene estado de conectividad relevante
//
// MetricCard NO sabe de dónde vienen los datos. Solo renderiza lo que recibe.
// =============================================================================

interface MetricWidgetProps {
    widget: WidgetConfig;
    equipmentMap: Map<string, EquipmentSummary>;
    isLoadingData?: boolean;
    className?: string;
}

export default function MetricWidget({
    widget,
    equipmentMap,
    isLoadingData = false,
    className,
}: MetricWidgetProps) {
    if (isLoadingData) {
        return <MetricCard label={widget.title ?? '—'} value={undefined} isLoading className={className} />;
    }

    const resolved = resolveBinding(widget, equipmentMap);
    const cardStatus = toCardStatus(resolved.status);

    // --- Construcción del subtext ---
    // Añade contexto de frescura si el dato está stale sin ser totalmente inválido.
    // "stale" se comunica por subtext + ConnectionBadge, no coloreando el valor.
    let subtext: string | undefined;

    if (resolved.status === 'stale') {
        subtext = 'Dato posiblemente desactualizado';
    }

    if (typeof widget.displayOptions?.subtext === 'string') {
        // La config puede definir un subtext adicional (ej. "Límite: 45°C")
        const configSubtext = widget.displayOptions.subtext;
        subtext = subtext ? `${subtext} · ${configSubtext}` : configSubtext;
    }

    // --- Inferir ícono desde displayOptions si está configurado ---
    const iconName = typeof widget.displayOptions?.icon === 'string' ? widget.displayOptions.icon : 'Gauge';
    const Icon = ICON_MAP[iconName] || Gauge;

    const showConnectionBadge =
        resolved.connectionState !== undefined &&
        resolved.connectionState !== 'online';

    return (
        <div className={`flex flex-col gap-1.5 h-full ${className ?? ''}`}>
            <MetricCard
                label={widget.title ?? '—'}
                value={resolved.value}
                unit={resolved.unit}
                status={cardStatus}
                icon={Icon}
                subtext={subtext}
                isError={resolved.source === 'error' && resolved.status === 'no-data'}
            />
            {showConnectionBadge && resolved.connectionState && (
                <div className="px-1">
                    <ConnectionBadge
                        state={resolved.connectionState}
                        lastUpdateAt={resolved.lastUpdateAt}
                    />
                </div>
            )}
        </div>
    );
}
