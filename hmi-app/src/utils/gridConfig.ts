import type { CSSProperties } from 'react';

// =============================================================================
// Grid Configuration — Dynamic Column Layout
//
// Pure utilities: no side effects, no React hooks.
// Used by useGridCols, DashboardViewer, and BuilderCanvas.
// =============================================================================

export const MIN_COL_WIDTH = 220;
export const MAX_COLS = 8;
export const MIN_COLS = 1;
export const VIEWER_GAP = 16;  // matches gap-4 (Tailwind)
export const BUILDER_GAP = 24; // matches gap-6 (Tailwind)
export const LEGACY_COLS = 4;  // column count assumed for data without gridVersion

/**
 * Computes the number of grid columns that fit in a container, given a gap size.
 * Formula: floor((containerWidth + gap) / (MIN_COL_WIDTH + gap)), clamped to [1, 8].
 */
export function computeGridCols(containerWidth: number, gap: number): number {
    const cols = Math.floor((containerWidth + gap) / (MIN_COL_WIDTH + gap));
    return Math.min(Math.max(cols, MIN_COLS), MAX_COLS);
}

/**
 * Returns the inline style for a CSS grid container with `cols` equal columns.
 */
export function getGridTemplateStyle(cols: number): CSSProperties {
    return { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` };
}

/**
 * Returns inline styles for a grid item spanning `w` columns and `h` rows.
 * Clamps w to [1, cols] and h to [1, 6].
 */
export function getWidgetSpanStyle(w: number, h: number, cols: number): CSSProperties {
    const clampedW = Math.min(Math.max(w, 1), cols);
    const clampedH = Math.min(Math.max(h, 1), 6);
    return {
        gridColumn: `span ${clampedW} / span ${clampedW}`,
        gridRow: `span ${clampedH} / span ${clampedH}`,
    };
}

/**
 * Scales a widget's column span from one grid size to another.
 * Used at render time to adapt legacy (4-col) layout data to the current col count.
 */
export function migrateLayoutWidth(w: number, fromCols: number, toCols: number): number {
    return Math.max(1, Math.round(w * (toCols / fromCols)));
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
