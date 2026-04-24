import { Activity, BarChart2, Gauge, History, LineChart, PlugZap, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { WidgetType } from '../../domain/admin.types';
import HoverTooltip from '../ui/HoverTooltip';

interface WidgetCatalogRailProps {
    onAddWidget: (type: WidgetType) => void;
}

interface RailAction {
    type: WidgetType;
    label: string;
    icon: LucideIcon;
}

const ACTIONS: RailAction[] = [
    { type: 'kpi', label: 'Indicador (KPI)', icon: Gauge },
    { type: 'machine-activity', label: 'Actividad de Máquina', icon: Activity },
    { type: 'metric-card', label: 'Tarjeta de Métrica', icon: BarChart2 },
    { type: 'trend-chart', label: 'Gráfico de Tendencia', icon: TrendingUp },
    { type: 'prod-history', label: 'Producción Histórica', icon: LineChart },
    { type: 'status', label: 'Estado de Equipo', icon: Activity },
    { type: 'connection-status', label: 'Estado de Conexión', icon: PlugZap },
    { type: 'alert-history', label: 'Histórico de Alertas', icon: History },
];

export default function WidgetCatalogRail({ onAddWidget }: WidgetCatalogRailProps) {
    return (
        <div className="h-full w-full flex flex-col items-center py-3 gap-1">
            {ACTIONS.map(({ type, label, icon: Icon }) => (
                <HoverTooltip key={type} label={label} position="right" className="flex">
                    <button
                        type="button"
                        aria-label={label}
                        onClick={() => onAddWidget(type)}
                        className="h-9 w-9 inline-flex items-center justify-center rounded-md text-industrial-muted transition-colors hover:bg-white/5 hover:text-white"
                    >
                        <Icon size={18} />
                    </button>
                </HoverTooltip>
            ))}
        </div>
    );
}
