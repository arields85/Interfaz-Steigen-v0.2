import type { WidgetConfig } from '../domain/admin.types';
import type { EquipmentSummary } from '../domain/equipment.types';
import type { HierarchyContext } from './resolvers/hierarchyResolver';
import MetricWidget from './renderers/MetricWidget';
import StatusWidget from './renderers/StatusWidget';
import ConnectionWidget from './renderers/ConnectionWidget';
import ConnectionStatusWidget from './renderers/ConnectionStatusWidget';
import TrendChartWidget from './renderers/TrendChartWidget';
import KpiWidget from './renderers/KpiWidget';
import AlertHistoryWidget from './renderers/AlertHistoryWidget';
import OeeProductionTrendWidget from './renderers/OeeProductionTrendWidget';
import ProdHistoryWidget from './renderers/ProduccionHistoricaWidget';

// =============================================================================
// WidgetRenderer — Dispatcher central
//
// Recibe un WidgetConfig y delega al renderer específico según widget.type.
// Esta es la única interfaz pública que consumen las páginas y el builder.
// Las páginas no importan renderers individuales.
//
// Tipos soportados:
//   'metric-card', 'kpi'        → MetricWidget / KpiWidget
//   'status'                    → StatusWidget
//   'connection-indicator'      → ConnectionWidget
//   'connection-status'         → ConnectionStatusWidget
//   'trend-chart'               → TrendChartWidget
//   'oee-production-trend'      → OeeProductionTrendWidget
//   'prod-history'              → ProdHistoryWidget
//   'alert-history'             → AlertHistoryWidget
//
// Para 'alert-history' se necesita la prop opcional `siblingWidgets`
// con los demás widgets del mismo dashboard para detectar cambios de estado.
//
// Arquitectura Técnica v1.3 §16 (niveles de componentes)
// =============================================================================

interface WidgetRendererProps {
    widget: WidgetConfig;
    equipmentMap: Map<string, EquipmentSummary>;
    isLoadingData?: boolean;
    className?: string;
    /**
     * Todos los widgets del mismo dashboard.
     * Requerido para que AlertHistoryWidget pueda evaluar a sus hermanos.
     * Ignorado por todos los demás renderers.
     */
    siblingWidgets?: WidgetConfig[];
    /**
     * Contexto jerárquico para resolver widgets en modo jerárquico.
     * Contiene todos los nodos, dashboards y el nodo actual.
     * Ignorado por renderers que no soportan modo jerárquico.
     */
    hierarchyContext?: HierarchyContext;
}

export default function WidgetRenderer({
    widget,
    equipmentMap,
    isLoadingData = false,
    className,
    siblingWidgets,
    hierarchyContext,
}: WidgetRendererProps) {
    switch (widget.type) {
        case 'metric-card':
            return (
                <MetricWidget
                    widget={widget}
                    equipmentMap={equipmentMap}
                    isLoadingData={isLoadingData}
                    className={className}
                    hierarchyContext={hierarchyContext}
                />
            );

        case 'kpi':
            return (
                <KpiWidget
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

        case 'connection-status':
            return (
                <ConnectionStatusWidget
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

        case 'oee-production-trend':
            return (
                <OeeProductionTrendWidget
                    widget={widget}
                    equipmentMap={equipmentMap}
                    isLoadingData={isLoadingData}
                    className={className}
                />
            );

        case 'prod-history':
            return (
                <ProdHistoryWidget
                    widget={widget}
                    equipmentMap={equipmentMap}
                    isLoadingData={isLoadingData}
                    className={className}
                />
            );

        case 'alert-history':
            return (
                <AlertHistoryWidget
                    widget={widget}
                    equipmentMap={equipmentMap}
                    siblingWidgets={siblingWidgets}
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
