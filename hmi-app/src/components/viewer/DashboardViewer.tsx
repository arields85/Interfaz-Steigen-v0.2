import { useState, useEffect, useMemo } from 'react';
import { WidgetRenderer } from '../../widgets';
import type { WidgetConfig, WidgetLayout } from '../../domain/admin.types';
import type { EquipmentSummary } from '../../domain/equipment.types';
import type { HierarchyContext } from '../../widgets/resolvers/hierarchyResolver';
import { useGridCols } from '../../utils/useGridCols';
import {
    getGridTemplateStyle,
    getWidgetSpanStyle,
    VIEWER_GAP,
} from '../../utils/gridConfig';

const MIN_ROW_H = 60; // prevents unusable widgets

interface DashboardViewerProps {
    widgets: WidgetConfig[];
    layout: WidgetLayout[];
    equipmentMap: Map<string, EquipmentSummary>;
    /**
     * IDs de widgets asignados al header del dashboard.
     * Estos widgets son EXCLUSIVOS del header y se omiten del grid.
     * Viene de `dashboard.headerConfig.widgetSlots`.
     */
    headerWidgetIds?: Set<string>;
    hierarchyContext?: HierarchyContext;
    /**
     * Grid version from the dashboard record.
     * Absent means the layout was authored for the legacy 4-column grid —
     * widget widths are migrated at render time via migrateLayoutWidth.
     */
    gridVersion?: number;
}

// =============================================================================
// DashboardViewer
// Renderizador estático para el Visor Público.
// Replica el grid de BuilderCanvas pero elimina toda interacción de
// arrastrar, soltar, seleccionar o reordenar.
//
// Los widgets asignados al header (headerWidgetIds) se excluyen del grid
// para evitar duplicación: el header los renderiza vía DashboardHeader.
//
// La altura de las filas se calcula dinámicamente via ResizeObserver para
// que el grid llene el viewport exactamente — sin scroll (HMI single-screen).
// El número de columnas se calcula via useGridCols sobre el mismo contenedor.
//
// Especificación Funcional Modo Admin §11
// =============================================================================

export default function DashboardViewer({ 
    widgets, 
    layout, 
    equipmentMap,
    headerWidgetIds,
    hierarchyContext,
}: DashboardViewerProps) {

    // Columns: measured from the outer container via ResizeObserver.
    const { containerRef, cols } = useGridCols(VIEWER_GAP);

    // Row height: derived from the container's available height so the grid
    // fills the viewport exactly with no scroll (single-screen HMI constraint).
    const [rowHeight, setRowHeight] = useState(140);

    const widgetMap = new Map(widgets.map(w => [w.id, w]));

    // Simulate CSS grid auto-placement (dense packing, left-to-right) to count
    // how many rows the current layout occupies.
    // x/y in WidgetLayout are NOT used for placement — widgets render in array
    // order, with col-span (w) and row-span (h) only.
    const maxRows = useMemo(() => {
        const visible = layout.filter(item => !headerWidgetIds?.has(item.widgetId));
        if (visible.length === 0) return 1;

        // colTops[c] = next available row index for column c
        const colTops = new Array(cols).fill(0);

        for (const item of visible) {
            const rawW = item.w || 1;
            const w = Math.min(rawW, cols);
            const h = item.h || 1;

            // Find the leftmost column span where the widget can be placed earliest
            let bestRow = Infinity;
            let bestCol = 0;
            for (let col = 0; col <= cols - w; col++) {
                const startRow = Math.max(...colTops.slice(col, col + w));
                if (startRow < bestRow) {
                    bestRow = startRow;
                    bestCol = col;
                }
            }

            for (let col = bestCol; col < bestCol + w; col++) {
                colTops[col] = bestRow + h;
            }
        }

        return Math.max(...colTops, 1);
    }, [layout, headerWidgetIds, cols]);

    // Measure the container's available height and compute the row height that
    // makes the grid fill it exactly with no leftover space or scroll.
    // The same containerRef used by useGridCols is observed here for height —
    // two separate ResizeObserver instances on the same element is valid.
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            // contentRect already excludes the container's own padding
            const available = entry.contentRect.height;
            const computed = (available - (maxRows - 1) * VIEWER_GAP) / maxRows;
            setRowHeight(Math.max(computed, MIN_ROW_H));
        });

        observer.observe(container);
        return () => observer.disconnect();
    }, [maxRows]);

    return (
        <div ref={containerRef} className="w-full h-full p-4 overflow-hidden">
            <div
                className="grid gap-4 w-full"
                style={{
                    ...getGridTemplateStyle(cols),
                    gridAutoRows: `${rowHeight}px`,
                }}
            >
                {layout.map((item) => {
                    // Excluir del grid los widgets asignados al header
                    if (headerWidgetIds?.has(item.widgetId)) return null;

                    const widget = widgetMap.get(item.widgetId);
                    if (!widget) return null;

                    const rawW = item.w || 1;
                    const effectiveW = Math.min(rawW, cols);

                    return (
                        <div
                            key={widget.id}
                            className="h-full relative"
                            style={getWidgetSpanStyle(effectiveW, item.h || 1, cols)}
                        >
                            <div className="relative w-full h-full z-0">
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
            </div>
        </div>
    );
}
