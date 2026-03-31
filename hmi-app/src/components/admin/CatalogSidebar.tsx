import { LayoutTemplate, PlusSquare } from 'lucide-react';
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
    const availableWidgets: { type: WidgetType; label: string }[] = [
        { type: 'kpi', label: 'Indicador (KPI)' },
        { type: 'metric-card', label: 'Tarjeta de Métrica' },
        { type: 'status', label: 'Estado de Equipo' },
        { type: 'connection-indicator', label: 'Estado Conexión' },
        { type: 'kpi', label: 'Indicador de Rango (KPI)' },
    ];

    return (
        <aside className="w-64 border-r border-white/5 bg-industrial-bg/50 flex flex-col pt-4 overflow-y-auto shrink-0 z-10">
            <div className="px-4 mb-3 text-[10px] font-black uppercase tracking-widest text-industrial-muted flex items-center gap-2">
                <PlusSquare size={12} /> Catálogo de Widgets
            </div>
            
            <div className="px-3 space-y-2 pb-4">
                {availableWidgets.map(w => (
                    <div 
                        key={w.type} 
                        onClick={() => onAddWidget(w.type)}
                        className="p-3 border border-white/5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20 cursor-pointer transition-colors flex items-start gap-3 group"
                    >
                        <LayoutTemplate className="w-5 h-5 text-industrial-muted group-hover:text-admin-accent transition-colors shrink-0" />
                        <div>
                            <h4 className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">{w.label}</h4>
                            <p className="text-[10px] text-industrial-muted leading-tight mt-1 group-hover:text-industrial-muted/80 transition-colors">Click para añadir</p>
                        </div>
                    </div>
                ))}
            </div>
        </aside>
    );
}
