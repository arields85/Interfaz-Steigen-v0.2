import type { WidgetLayout } from '../domain/admin.types';

export type WidgetInteractionType = 'move' | 'resize';

export interface WidgetInteractionMetrics {
    cellWidth: number;
    rowHeight: number;
}

export interface WidgetPixelBounds {
    left: number;
    top: number;
    width: number;
    height: number;
}

export function layoutToPixelBounds(
    layout: Pick<WidgetLayout, 'x' | 'y' | 'w' | 'h'>,
    metrics: WidgetInteractionMetrics,
): WidgetPixelBounds {
    return {
        left: layout.x * metrics.cellWidth,
        top: layout.y * metrics.rowHeight,
        width: layout.w * metrics.cellWidth,
        height: layout.h * metrics.rowHeight,
    };
}

export function pixelBoundsToGridBounds(
    bounds: WidgetPixelBounds,
    metrics: WidgetInteractionMetrics,
): Pick<WidgetLayout, 'x' | 'y' | 'w' | 'h'> {
    return {
        x: metrics.cellWidth > 0 ? Math.round(bounds.left / metrics.cellWidth) : 0,
        y: metrics.rowHeight > 0 ? Math.round(bounds.top / metrics.rowHeight) : 0,
        w: metrics.cellWidth > 0 ? Math.round(bounds.width / metrics.cellWidth) : 1,
        h: metrics.rowHeight > 0 ? Math.round(bounds.height / metrics.rowHeight) : 1,
    };
}

export function applyPointerDeltaToPixelBounds(
    type: WidgetInteractionType,
    startBounds: WidgetPixelBounds,
    deltaX: number,
    deltaY: number,
): WidgetPixelBounds {
    if (type === 'move') {
        return {
            left: startBounds.left + deltaX,
            top: startBounds.top + deltaY,
            width: startBounds.width,
            height: startBounds.height,
        };
    }

    return {
        left: startBounds.left,
        top: startBounds.top,
        width: Math.max(1, startBounds.width + deltaX),
        height: Math.max(1, startBounds.height + deltaY),
    };
}
