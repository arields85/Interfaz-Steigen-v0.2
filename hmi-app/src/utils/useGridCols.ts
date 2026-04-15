import { useRef, useState, useEffect } from 'react';
import { computeGridCols, computeViewerReferenceWidth, LEGACY_COLS, VIEWER_GAP } from './gridConfig';

// =============================================================================
// useGridCols — ResizeObserver-based dynamic column count hook
//
// Observes the element attached via containerRef and recomputes the number of
// grid columns whenever the container width changes.
//
// When useViewerReference = true, columns are computed from the viewer's
// reference width (viewport minus main layout padding) instead of the
// container's own width. This ensures the builder and viewer always produce
// the same column count regardless of chrome (rail, panels, etc.).
// =============================================================================

interface UseGridColsResult {
    containerRef: React.RefObject<HTMLDivElement>;
    cols: number;
    containerWidth: number;
}

/**
 * Measures the width of a container element and returns the number of grid
 * columns that fit, computed via computeGridCols.
 *
 * @param gap               - Gap between columns in pixels (use VIEWER_GAP or BUILDER_GAP)
 * @param useViewerReference - When true, compute cols from the viewer reference width
 *                             (viewport minus main layout padding) instead of the
 *                             container's measured width. Always uses VIEWER_GAP for
 *                             column computation to match the viewer exactly.
 */
export function useGridCols(gap: number, useViewerReference = false): UseGridColsResult {
    const containerRef = useRef<HTMLDivElement>(null);
    const [cols, setCols] = useState(LEGACY_COLS);
    const [containerWidth, setContainerWidth] = useState(0);

    useEffect(() => {
        if (useViewerReference) {
            const update = () => {
                const refWidth = computeViewerReferenceWidth();
                setContainerWidth(refWidth);
                setCols(computeGridCols(refWidth, VIEWER_GAP));
            };
            update();
            window.addEventListener('resize', update);
            return () => window.removeEventListener('resize', update);
        }

        const el = containerRef.current;
        if (!el) return;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            const width = entry.contentRect.width;
            setContainerWidth(width);
            setCols(computeGridCols(width, gap));
        });

        observer.observe(el);
        return () => observer.disconnect();
    }, [gap, useViewerReference]);

    return { containerRef, cols, containerWidth };
}
