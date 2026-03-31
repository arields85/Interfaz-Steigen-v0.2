import { WidgetRenderer } from '../../widgets';
import type { WidgetConfig, WidgetLayout } from '../../domain/admin.types';
import type { EquipmentSummary } from '../../domain/equipment.types';

interface DashboardViewerProps {
    widgets: WidgetConfig[];
    layout: WidgetLayout[];
    equipmentMap: Map<string, EquipmentSummary>;
}

// =============================================================================
// DashboardViewer
// Renderizador estático para el Visor Público.
// Replica el grid de BuilderCanvas pero elimina toda interacción de
// arrastrar, soltar, seleccionar o reordenar.
//
// Especificación Funcional Modo Admin §11
// =============================================================================

export default function DashboardViewer({ 
    widgets, 
    layout, 
    equipmentMap 
}: DashboardViewerProps) {
    
    const widgetMap = new Map(widgets.map(w => [w.id, w]));

    return (
        <div className="w-full h-full p-4 overflow-y-auto overflow-x-hidden">
            <div className="grid grid-cols-4 gap-4 auto-rows-[140px] w-full">
                {layout.map((item) => {
                    const widget = widgetMap.get(item.widgetId);
                    if (!widget) return null;

                    const colSpan = item.w === 4 ? 'col-span-4' : 
                                    item.w === 3 ? 'col-span-3' : 
                                    item.w === 2 ? 'col-span-2' : 
                                    'col-span-1';

                    const rowSpanClasses = ['', 'row-span-1', 'row-span-2', 'row-span-3', 'row-span-4', 'row-span-5', 'row-span-6'];
                    const rowSpan = rowSpanClasses[item.h || 1] || 'row-span-1';

                    return (
                        <div 
                            key={widget.id}
                            className={`${colSpan} ${rowSpan} min-h-[140px] relative`}
                        >
                            <div className="relative w-full h-full z-0">
                                <WidgetRenderer 
                                    widget={widget} 
                                    equipmentMap={equipmentMap} 
                                    isLoadingData={false} 
                                    className="w-full h-full"
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
