import { useState } from 'react';
import { WidgetRenderer } from '../../widgets';
import type { WidgetConfig, WidgetLayout } from '../../domain/admin.types';
import type { EquipmentSummary } from '../../domain/equipment.types';

interface BuilderCanvasProps {
    widgets: WidgetConfig[];
    layout: WidgetLayout[];
    equipmentMap: Map<string, EquipmentSummary>;
    onWidgetSelect?: (widgetId: string) => void;
    selectedWidgetId?: string;
    onReorder?: (startIndex: number, endIndex: number) => void;
    onResize?: (widgetId: string, w: number, h: number) => void;
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
    onResize 
}: { 
    widgetId: string; 
    currentW: number; 
    currentH: number; 
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
        
        const CELL_WIDTH = 280; // aprox width px per col 
        const CELL_HEIGHT = 160; // aprox height px per row (140 + gap)
        
        let lastNewW = startW;
        let lastNewH = startH;

        const handlePointerMove = (moveEv: PointerEvent) => {
            const deltaX = moveEv.clientX - startX;
            const deltaY = moveEv.clientY - startY;
            
            let newW = startW + Math.round(deltaX / CELL_WIDTH);
            let newH = startH + Math.round(deltaY / CELL_HEIGHT);
            
            newW = Math.max(1, Math.min(newW, 4));
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
    onWidgetSelect,
    selectedWidgetId,
    onReorder,
    onResize
}: BuilderCanvasProps) {
    
    const widgetMap = new Map(widgets.map(w => [w.id, w]));

    // Estados efímeros de Drag & Drop
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    // Handlers de Drag & Drop HTML5
    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        // Set drag ghost image data
        e.dataTransfer.effectAllowed = 'move';
        // Hack for Firefox support
        e.dataTransfer.setData('text/plain', index.toString());
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
    };

    // Grilla con CSS Grid. Auto-rows-[140px] define el alto base de H=1.
    return (
        <div className="w-full h-full p-8 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-4 gap-6 auto-rows-[140px]">
                
                {layout.map((item, index) => {
                    const widget = widgetMap.get(item.widgetId);
                    
                    // Si el widget referenciado en el layout no existe en config, se ignora
                    if (!widget) return null;

                    const isSelected = selectedWidgetId === widget.id;

                    // Mapeo básico: col-span según w
                    const colSpan = item.w === 4 ? 'col-span-4' : 
                                    item.w === 3 ? 'col-span-3' : 
                                    item.w === 2 ? 'col-span-2' : 
                                    'col-span-1';

                    const rowSpanClasses = ['', 'row-span-1', 'row-span-2', 'row-span-3', 'row-span-4', 'row-span-5', 'row-span-6'];
                    const rowSpan = rowSpanClasses[item.h || 1] || 'row-span-1';

                    return (
                        <div 
                            key={widget.id}
                            className={`${colSpan} ${rowSpan} relative group cursor-grab active:cursor-grabbing transition-opacity duration-200 ${
                                draggedIndex === index ? 'opacity-40' : 'opacity-100'
                            }`}
                            onClick={() => onWidgetSelect?.(widget.id)}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={handleDragOver}
                            onDragEnter={(e) => handleDragEnter(e, index)}
                            onDrop={(e) => handleDrop(e, index)}
                            onDragEnd={handleDragEnd}
                        >
                            {/* Borde de selección para el modo editor */}
                            <div 
                                className={`absolute -inset-2 rounded-xl transition-all z-10 pointer-events-none ${
                                    isSelected 
                                        ? '' 
                                        : 'border-2 border-transparent group-hover:border-white/10'
                                } ${
                                    hoveredIndex === index && draggedIndex !== index 
                                        ? 'border-2 scale-[1.02]' 
                                        : ''
                                }`} 
                                style={isSelected ? {
                                    padding: '2px',
                                    background: `linear-gradient(to right, var(--color-admin-selection-from), var(--color-admin-selection-to))`,
                                    boxShadow: `0 0 20px color-mix(in srgb, var(--color-admin-selection-to) 15%, transparent)`,
                                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                    WebkitMaskComposite: 'xor',
                                    maskComposite: 'exclude'
                                } : (hoveredIndex === index && draggedIndex !== index) ? {
                                    borderColor: `color-mix(in srgb, var(--color-admin-selection-from) 50%, transparent)`,
                                    backgroundColor: `color-mix(in srgb, var(--color-admin-selection-from) 10%, transparent)`,
                                } : {}}
                            />
                            
                            {/* Manejador de Redimensionamiento (esquina inf-der) */}
                            {isSelected && (
                                <ResizeHandle 
                                    widgetId={widget.id} 
                                    currentW={item.w} 
                                    currentH={item.h || 1} 
                                    onResize={onResize} 
                                />
                            )}
                            
                            {/* Renderizado real del widget delegando al dispatcher de la Fase 3 */}
                            <div className="relative w-full h-full z-0 pointer-events-none">
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

                {/* Dropzone visual sutil si el canvas está vacío */}
                {layout.length === 0 && (
                    <div className="col-span-4 h-64 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center text-sm font-bold text-industrial-muted uppercase tracking-widest">
                        El Dashboard está vacío
                    </div>
                )}
            </div>
        </div>
    );
}
