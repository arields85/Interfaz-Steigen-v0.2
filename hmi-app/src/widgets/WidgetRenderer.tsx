import type { WidgetConfig } from '../domain/admin.types';
import type { EquipmentSummary } from '../domain/equipment.types';
import MetricWidget from './renderers/MetricWidget';
import StatusWidget from './renderers/StatusWidget';
import ConnectionWidget from './renderers/ConnectionWidget';
import TrendChartWidget from './renderers/TrendChartWidget';

// =============================================================================
// WidgetRenderer — Dispatcher central
//
// Recibe un WidgetConfig y delega al renderer específico según widget.type.
// Esta es la única interfaz pública que consumen las páginas y el builder.
// Las páginas no importan renderers individuales.
//
// Tipos soportados en Fase 3:
//   'metric-card', 'kpi' → MetricWidget
//   'status'             → StatusWidget
//   'connection-indicator' → ConnectionWidget
//   'trend-chart'        → TrendChartWidget
//
// Arquitectura Técnica v1.3 §16 (niveles de componentes)
// =============================================================================

interface WidgetRendererProps {
    widget: WidgetConfig;
    equipmentMap: Map<string, EquipmentSummary>;
    isLoadingData?: boolean;
    className?: string;
}

export default function WidgetRenderer({
    widget,
    equipmentMap,
    isLoadingData = false,
    className,
}: WidgetRendererProps) {
    switch (widget.type) {
        case 'metric-card':
        case 'kpi':
            return (
                <MetricWidget
                    widget={widget}
                    equipmentMap={equipmentMap}
                    isLoadingData={isLoadingData}
                    className={className}
                />
            );

        case 'status':
            return (
                <StatusWidget
                    widget={widget}
                    equipmentMap={equipmentMap}
                    className={className}
                />
            );

        case 'connection-indicator':
            return (
                <ConnectionWidget
                    widget={widget}
                    equipmentMap={equipmentMap}
                    className={className}
                />
            );

        case 'trend-chart':
            return (
                <TrendChartWidget
                    widget={widget}
                    equipmentMap={equipmentMap}
                    isLoadingData={isLoadingData}
                    className={className}
                />
            );

        // -----------------------------------------------------------------------
        // Tipos pendientes de implementación — placeholder elegante.
        // No lanza error: el builder puede incluir tipos futuros en una config
        // sin romper la renderización del dashboard actual.
        // -----------------------------------------------------------------------
        default:
            return (
                <UnsupportedWidget type={widget.type} title={widget.title} />
            );
    }
}

// -----------------------------------------------------------------------------
// UnsupportedWidget — placeholder para tipos no implementados aún
// -----------------------------------------------------------------------------
function UnsupportedWidget({ type, title }: { type: string; title?: string }) {
    return (
        <div className="glass-panel p-4 flex flex-col gap-1 opacity-50">
            <span className="text-[9px] font-black uppercase tracking-widest text-industrial-muted">
                Widget no implementado
            </span>
            <span className="text-xs text-industrial-muted font-mono">
                type: {type}
            </span>
            {title && (
                <span className="text-xs text-slate-500">{title}</span>
            )}
        </div>
    );
}
