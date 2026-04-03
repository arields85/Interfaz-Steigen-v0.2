import {
    Activity,
    Gauge,
    History,
    LayoutTemplate,
    PlusSquare,
    TrendingUp,
    Wifi,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { WidgetType } from '../../domain/admin.types';

interface CatalogSidebarProps {
    onAddWidget: (type: WidgetType) => void;
}

// =============================================================================
// CatalogSidebar
// Panel izquierdo del Dashboard Builder. Enumera los widgets disponibles y 
// permite instanciarlos agregándolos al canvas.
// =============================================================================

export default function CatalogSidebar({ onAddWidget }: CatalogSidebarProps) {
    const availableWidgets: { type: WidgetType; label: string; icon: LucideIcon }[] = [
        { type: 'kpi', label: 'Indicador (KPI)', icon: Gauge },
        { type: 'metric-card', label: 'Tarjeta de Métrica', icon: LayoutTemplate },
        { type: 'trend-chart', label: 'Gráfico de Tendencia', icon: TrendingUp },
        { type: 'status', label: 'Estado de Equipo', icon: Activity },
        { type: 'connection-indicator', label: 'Indicador Conexión', icon: Wifi },
        { type: 'connection-status', label: 'Estado Conexión', icon: Wifi },
        { type: 'alert-history', label: 'Histórico de Alertas', icon: History },
    ];

    return (
        <aside className="flex-1 flex flex-col pt-4 overflow-y-auto hmi-scrollbar min-h-0">
            <div className="px-4 mb-3 text-[10px] font-black uppercase tracking-widest text-industrial-muted flex items-center gap-2">
                <PlusSquare size={12} /> Catálogo de Widgets
            </div>
            
            <div className="px-3 space-y-2 pb-4">
                {availableWidgets.map(({ type, label, icon: ItemIcon }) => (
                    <div 
                        key={type} 
                        onClick={() => onAddWidget(type)}
                        className="p-3 border border-white/5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20 cursor-pointer transition-colors flex items-start gap-3 group"
                    >
                        <ItemIcon className="w-5 h-5 text-industrial-muted group-hover:text-admin-accent transition-colors shrink-0" />
                        <div>
                            <h4 className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">{label}</h4>
                            <p className="text-[10px] text-industrial-muted leading-tight mt-1 group-hover:text-industrial-muted/80 transition-colors">Click para añadir</p>
                        </div>
                    </div>
                ))}
            </div>
        </aside>
    );
}
