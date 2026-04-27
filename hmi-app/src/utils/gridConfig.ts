import type { CSSProperties } from 'react';
import type { Dashboard, DashboardAspect, Template, WidgetLayout } from '../domain/admin.types';

// =============================================================================
// Grid Configuration — Dynamic Column Layout
//
// Pure utilities: no side effects, no React hooks.
// Used by useGridCols, DashboardViewer, and BuilderCanvas.
// =============================================================================

export const MIN_COL_WIDTH = 60;
export const MAX_COLS = 20;
export const MIN_COLS = 1;
export const VIEWER_GAP = 16;  // matches gap-4 (Tailwind)
export const BUILDER_GAP = 24; // matches gap-6 (Tailwind)
export const DEFAULT_COLS = 40;
export const DEFAULT_ROWS = 24;

const ASPECT_RATIOS: Record<DashboardAspect, number> = {
    '16:9': 16 / 9,
    '21:9': 21 / 9,
    '4:3': 4 / 3,
};

/**
 * Suggestion helper only.
 * Canvas sizing no longer derives cols from measured width; dashboards persist cols explicitly.
 */
export function computeGridCols(containerWidth: number): number {
    const cols = Math.floor(containerWidth / MIN_COL_WIDTH);
    return Math.min(Math.max(cols, MIN_COLS), MAX_COLS);
}

export function fitToAspect(usableW: number, usableH: number, aspect: DashboardAspect): { width: number; height: number } {
    const safeWidth = Math.max(0, usableW);
    const safeHeight = Math.max(0, usableH);
    const ratio = ASPECT_RATIOS[aspect];

    if (safeWidth === 0 || safeHeight === 0) {
        return { width: 0, height: 0 };
    }

    const widthLimitedHeight = safeWidth / ratio;

    if (widthLimitedHeight <= safeHeight) {
        return { width: safeWidth, height: widthLimitedHeight };
    }

    return { width: safeHeight * ratio, height: safeHeight };
}

export function getRowHeight(canvasHeight: number, rows: number): number {
    const safeRows = Math.max(1, rows);
    const safeHeight = Math.max(0, canvasHeight);
    return safeHeight / safeRows;
}

export function clampWidgetBounds(layout: Pick<WidgetLayout, 'x' | 'y' | 'w' | 'h'>, cols: number, rows: number): Pick<WidgetLayout, 'x' | 'y' | 'w' | 'h'> {
    const safeCols = Math.max(1, cols);
    const safeRows = Math.max(1, rows);
    const clampedW = Math.min(Math.max(layout.w, 1), safeCols);
    const clampedH = Math.min(Math.max(layout.h, 1), safeRows);

    return {
        x: Math.min(Math.max(layout.x, 0), safeCols - clampedW),
        y: Math.min(Math.max(layout.y, 0), safeRows - clampedH),
        w: clampedW,
        h: clampedH,
    };
}

interface ComputeCanvasReferenceInput {
    viewport: { width: number; height: number };
    topbarHeight: number;
    headerHeight: number;
    paddings: { top: number; right: number; bottom: number; left: number };
    aspect: DashboardAspect;
}

export function computeCanvasReference(input: ComputeCanvasReferenceInput): { width: number; height: number; offsetX: number; offsetY: number } {
    const usableWidth = Math.max(0, input.viewport.width - input.paddings.left - input.paddings.right);
    const usableHeight = Math.max(0, input.viewport.height - input.topbarHeight - input.headerHeight - input.paddings.top - input.paddings.bottom);

    return {
        width: usableWidth,
        height: usableHeight,
        offsetX: 0,
        offsetY: 0,
    };
}

export function isTemplateApplicable(template: Pick<Template, 'aspect'>, dashboard: Pick<Dashboard, 'aspect'>): boolean {
    return template.aspect === dashboard.aspect;
}

/**
 * Returns the inline style for a CSS grid container with `cols` equal columns.
 */
export function getGridTemplateStyle(cols: number): CSSProperties {
    return { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` };
}

/**
 * Returns inline styles for a grid item spanning `w` columns and `h` rows.
 * Clamps w to [1, cols] and h to [1, DEFAULT_ROWS].
 */
export function getWidgetSpanStyle(w: number, h: number, cols: number): CSSProperties {
    const clampedW = Math.min(Math.max(w, 1), cols);
    const clampedH = Math.min(Math.max(h, 1), DEFAULT_ROWS);
    return {
        gridColumn: `span ${clampedW} / span ${clampedW}`,
        gridRow: `span ${clampedH} / span ${clampedH}`,
    };
}

/**
 * Computes the pixel width of a single grid cell given the container width,
 * column count, and gap size.
 */
export function computeCellWidth(containerWidth: number, cols: number, gap: number): number {
    return (containerWidth - (cols - 1) * gap) / cols;
}

/**
 * Compute the reference width that the viewer would use.
 * This is the viewport width minus the main layout padding.
 * Both builder and viewer use this to ensure column parity.
 *
 * MainLayout has p-4 (16px) on mobile, md:p-6 (24px) on desktop.
 * At desktop (md+), total horizontal padding = 24px * 2 = 48px.
 * On mobile, total horizontal padding = 16px * 2 = 32px.
 */
export function computeViewerReferenceWidth(): number {
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const mainPadding = viewportWidth >= 768 ? 48 : 32;
    return viewportWidth - mainPadding;
}
