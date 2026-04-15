import { useEffect, useState } from 'react';
import { Copy, Trash2, ArrowUp, LayoutDashboard } from 'lucide-react';
import { WidgetRenderer } from '../../widgets';
import type { WidgetConfig, WidgetLayout } from '../../domain/admin.types';
import type { EquipmentSummary } from '../../domain/equipment.types';
import type { HierarchyContext } from '../../widgets/resolvers/hierarchyResolver';
import GridSelectionFrame from '../ui/GridSelectionFrame';
import WidgetHoverActions from '../ui/WidgetHoverActions';
import {
    HEADER_WIDGET_DRAG_MIME,
    HEADER_WIDGET_SLOT_COUNT,
    type HeaderWidgetDragPayload,
    serializeHeaderWidgetDragPayload,
    isHeaderCompatibleWidget,
} from '../../utils/headerWidgets';
import AdminEmptyState from './AdminEmptyState';
import { useGridCols } from '../../utils/useGridCols';
import {
    getGridTemplateStyle,
    getWidgetSpanStyle,
    computeCellWidth,
    BUILDER_GAP,
} from '../../utils/gridConfig';

interface BuilderCanvasProps {
    widgets: WidgetConfig[];
    layout: WidgetLayout[];
    equipmentMap: Map<string, EquipmentSummary>;
    hierarchyContext?: HierarchyContext;
    onWidgetSelect?: (widgetId: string) => void;
    selectedWidgetId?: string;
    onReorder?: (startIndex: number, endIndex: number) => void;
    onResize?: (widgetId: string, w: number, h: number) => void;
    onDelete?: (widgetId: string) => void;
    onDuplicate?: (widgetId: string) => void;
    onWidgetDragChange?: (payload: HeaderWidgetDragPayload | null) => void;
    /**
     * IDs de widgets asignados al header del dashboard.
     * Estos widgets se excluyen del grid para evitar duplicación con el header.
     * Espeja la misma prop de DashboardViewer.
     */
    headerWidgetIds?: Set<string>;
    /**
     * Número de slots del header actualmente ocupados (0-3).
     * Cuando es menor que HEADER_WIDGET_SLOT_COUNT y el widget es compatible,
     * se muestra el ícono de "subir al header".
     */
    headerOccupiedSlotCount?: number;
    /**
     * Callback para mover un widget del grid al header.
     * Invocado al hacer click en el ícono ArrowUp del widget.
     */
    onPromoteToHeader?: (widgetId: string) => void;
}

// =============================================================================
// BuilderCanvas
// Área de trabajo central del Modo Administrador.
// Itera sobre el layout del dashboard y renderiza cada WidgetConfig usando
// el WidgetRenderer de la Fase 3, demostrando la separación entre el 
// builder visual y los componentes presentacionales.
//
// Especificación Funcional Modo Admin §8
// =============================================================================

function ResizeHandle({ 
    widgetId, 
    currentW, 
    currentH,
    cellWidth,
    maxCols,
    onResize 
}: { 
    widgetId: string; 
    currentW: number; 
    currentH: number;
    cellWidth: number;
    maxCols: number;
    onResize?: (id: string, w: number, h: number) => void; 
}) {
    const handlePointerDown = (e: React.PointerEvent) => {
        if (!onResize) return;
        e.stopPropagation();
        e.preventDefault();
        
        const startX = e.clientX;
        const startY = e.clientY;
        const startW = currentW;
        const startH = currentH;
        
        const CELL_HEIGHT = 160; // aprox height px per row (140 + gap)
        
        let lastNewW = startW;
        let lastNewH = startH;

        const handlePointerMove = (moveEv: PointerEvent) => {
            const deltaX = moveEv.clientX - startX;
            const deltaY = moveEv.clientY - startY;
            
            let newW = startW + Math.round(deltaX / cellWidth);
            let newH = startH + Math.round(deltaY / CELL_HEIGHT);
            
            newW = Math.max(1, Math.min(newW, maxCols));
            newH = Math.max(1, Math.min(newH, 6)); // Límite de alto 6 filas
            
            if (newW !== lastNewW || newH !== lastNewH) {
                lastNewW = newW;
                lastNewH = newH;
                onResize(widgetId, newW, newH);
            }
        };
        
        const handlePointerUp = () => {
            document.body.style.cursor = '';
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
        
        document.body.style.cursor = 'se-resize';
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };

    return (
        <div 
            onPointerDown={handlePointerDown}
            className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-end justify-end p-1.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md"
            title="Arrastrar para cambiar tamaño"
        >
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--color-admin-selection-to)', clipPath: 'polygon(100% 0, 0% 100%, 100% 100%)' }} />
        </div>
    );
}

export default function BuilderCanvas({ 
    widgets, 
    layout, 
    equipmentMap,
    hierarchyContext,
    onWidgetSelect,
    selectedWidgetId,
    onReorder,
    onResize,
    onDelete,
    onDuplicate,
    onWidgetDragChange,
    headerWidgetIds,
    headerOccupiedSlotCount = 0,
    onPromoteToHeader,
}: BuilderCanvasProps) {
    // Debe mantenerse sincronizado con `.glass-panel { border-radius: 1.5rem }` en hmi-app/src/index.css
    const widgetCornerRadius = '1.5rem';
    
    const widgetMap = new Map(widgets.map(w => [w.id, w]));

    // Dynamic columns: computed from viewer reference width so builder and viewer
    // always produce the same column count regardless of the admin chrome (rail, panels).
    const { containerRef, cols, containerWidth } = useGridCols(BUILDER_GAP, true);

    // Cell width for the resize handle delta calculation.
    // Falls back to 280 until the first ResizeObserver measurement arrives.
    const cellWidth = containerWidth > 0
        ? computeCellWidth(containerWidth, cols, BUILDER_GAP)
        : 280;

    // Estados efímeros de Drag & Drop
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    // Si cambia el conjunto de widgets visibles del grid (por ejemplo, uno se mueve
    // al header y luego vuelve), cualquier índice efímero de drag previo deja de
    // ser válido. Si no se limpia, el índice zombie sigue aplicando `opacity-40`
    // al item que reaparece en esa posición.
    useEffect(() => {
        setDraggedIndex(null);
        setHoveredIndex(null);
    }, [headerWidgetIds, layout.length]);

    // Handlers de Drag & Drop HTML5
    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        const layoutItem = layout[index];
        const draggedWidget = layoutItem ? widgetMap.get(layoutItem.widgetId) : undefined;

        // Set drag ghost image data
        e.dataTransfer.effectAllowed = 'move';
        // Hack for Firefox support
        e.dataTransfer.setData('text/plain', index.toString());

        if (draggedWidget) {
            const payload: HeaderWidgetDragPayload = {
                widgetId: draggedWidget.id,
                widgetType: draggedWidget.type,
                source: 'builder-grid',
            };

            e.dataTransfer.setData(
                HEADER_WIDGET_DRAG_MIME,
                serializeHeaderWidgetDragPayload(payload),
            );
            onWidgetDragChange?.(payload);
        } else {
            onWidgetDragChange?.(null);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Requiere preventDefault para permitir onDrop
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDragEnter = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        setHoveredIndex(index);
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (draggedIndex !== null && draggedIndex !== dropIndex && onReorder) {
            onReorder(draggedIndex, dropIndex);
        }
        setDraggedIndex(null);
        setHoveredIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setHoveredIndex(null);
        onWidgetDragChange?.(null);
    };

    // Grilla con CSS Grid. auto-rows-[140px] define el alto base de H=1.
    return (
        <div ref={containerRef} className="w-full p-8 overflow-x-auto">
            <div
                className="grid gap-6 auto-rows-[140px]"
                style={{
                    ...getGridTemplateStyle(cols),
                    ...(containerWidth > 0 && {
                        width: `${containerWidth}px`,
                        minWidth: `${containerWidth}px`,
                    }),
                }}
            >
                {layout.map((item, index) => {
                    // Excluir del grid los widgets asignados al header (igual que DashboardViewer)
                    if (headerWidgetIds?.has(item.widgetId)) return null;

                    const widget = widgetMap.get(item.widgetId);
                    
                    // Si el widget referenciado en el layout no existe en config, se ignora
                    if (!widget) return null;

                    const isSelected = selectedWidgetId === widget.id;

                    return (
                        <div 
                            key={widget.id}
                            className={`relative group cursor-grab active:cursor-grabbing rounded-xl transition-opacity duration-200 ${
                                draggedIndex === index ? 'opacity-40' : 'opacity-100'
                            }`}
                            style={getWidgetSpanStyle(item.w || 1, item.h || 1, cols)}
                            onClick={() => onWidgetSelect?.(widget.id)}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={handleDragOver}
                            onDragEnter={(e) => handleDragEnter(e, index)}
                            onDrop={(e) => handleDrop(e, index)}
                            onDragEnd={handleDragEnd}
                        >
                            <GridSelectionFrame
                                isSelected={isSelected}
                                isHighlighted={hoveredIndex === index && draggedIndex !== index}
                                radius={widgetCornerRadius}
                            />

                            <WidgetHoverActions
                                actions={[
                                    // La flecha de "subir al header" aparece solo si:
                                    // 1) El widget es compatible con header
                                    // 2) Hay al menos un slot libre en el header
                                    ...(isHeaderCompatibleWidget(widget) && headerOccupiedSlotCount < HEADER_WIDGET_SLOT_COUNT
                                        ? [{
                                            label: 'Subir al header',
                                            icon: ArrowUp,
                                            onClick: () => onPromoteToHeader?.(widget.id),
                                          }]
                                        : []
                                    ),
                                    {
                                        label: 'Duplicar widget',
                                        icon: Copy,
                                        onClick: () => onDuplicate?.(widget.id),
                                    },
                                    {
                                        label: 'Eliminar widget',
                                        icon: Trash2,
                                        onClick: () => onDelete?.(widget.id),
                                    },
                                ]}
                            />
                            
                            {/* Manejador de Redimensionamiento (esquina inf-der) */}
                            {isSelected && (
                                <ResizeHandle 
                                    widgetId={widget.id} 
                                    currentW={item.w} 
                                    currentH={item.h || 1}
                                    cellWidth={cellWidth}
                                    maxCols={cols}
                                    onResize={onResize} 
                                />
                            )}
                            
                            {/* Renderizado real del widget delegando al dispatcher de la Fase 3 */}
                            <div className="relative w-full h-full z-0 pointer-events-none">
                                <WidgetRenderer 
                                    widget={widget} 
                                    equipmentMap={equipmentMap} 
                                    isLoadingData={false} 
                                    siblingWidgets={widgets}
                                    hierarchyContext={hierarchyContext}
                                    className="w-full h-full"
                                />
                            </div>
                        </div>
                    );
                })}

                {/* Dropzone visual sutil si el canvas está vacío */}
                {layout.filter(item => !headerWidgetIds?.has(item.widgetId)).length === 0 && (
                    <div style={{ gridColumn: '1 / -1' }} className="h-64 px-6">
                        <AdminEmptyState
                            icon={LayoutDashboard}
                            message="El dashboard está vacío"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
