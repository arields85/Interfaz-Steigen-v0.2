import {
    clampWidgetBounds,
    computeCanvasReference,
    computeGridCols,
    DEFAULT_COLS,
    DEFAULT_ROWS,
    fitToAspect,
    getRowHeight,
    isTemplateApplicable,
    MAX_COLS,
    MIN_COLS,
} from './gridConfig';

describe('fitToAspect', () => {
    it('fits 16:9 inside a wide viewport', () => {
        const result = fitToAspect(1600, 900, '16:9');

        expect(result.width).toBe(1600);
        expect(result.height).toBe(900);
    });

    it('fits 16:9 inside a tall viewport', () => {
        const result = fitToAspect(1000, 1000, '16:9');

        expect(result.width).toBe(1000);
        expect(result.height).toBeCloseTo(562.5);
    });

    it('fits 21:9 without exceeding usable area', () => {
        const result = fitToAspect(2100, 1000, '21:9');

        expect(result.width).toBeCloseTo(2100);
        expect(result.height).toBeCloseTo(900);
        expect(result.width).toBeLessThanOrEqual(2100);
        expect(result.height).toBeLessThanOrEqual(1000);
    });

    it('fits 4:3 inside a square-ish viewport', () => {
        const result = fitToAspect(1000, 900, '4:3');

        expect(result.width).toBe(1000);
        expect(result.height).toBeCloseTo(750);
    });
});

describe('computeGridCols', () => {
    it('clamps to minimum columns', () => {
        expect(computeGridCols(1)).toBe(MIN_COLS);
    });

    it('returns an intermediate column count', () => {
        expect(computeGridCols(300)).toBe(5);
    });

    it('clamps to max cols with default gap', () => {
        expect(computeGridCols(9999)).toBe(MAX_COLS);
    });

    it('keeps the dashboard default as the current suggestion baseline', () => {
        expect(DEFAULT_COLS).toBe(40);
    });

    it('keeps the dashboard default rows as the canonical baseline', () => {
        expect(DEFAULT_ROWS).toBe(24);
    });
});

describe('getRowHeight', () => {
    it('divides canvas height by rows', () => {
        expect(getRowHeight(1200, 12)).toBe(100);
    });

    it('handles fractional row heights', () => {
        expect(getRowHeight(1000, 3)).toBeCloseTo(333.333, 3);
    });

    it('guards against invalid row counts', () => {
        expect(getRowHeight(500, 0)).toBe(500);
    });
});

describe('clampWidgetBounds', () => {
    it('keeps a valid widget unchanged', () => {
        expect(clampWidgetBounds({ x: 1, y: 1, w: 2, h: 2 }, 6, 6)).toEqual({ x: 1, y: 1, w: 2, h: 2 });
    });

    it('clamps overflow on the right edge', () => {
        expect(clampWidgetBounds({ x: 5, y: 1, w: 2, h: 2 }, 6, 6)).toEqual({ x: 4, y: 1, w: 2, h: 2 });
    });

    it('clamps overflow on the bottom edge', () => {
        expect(clampWidgetBounds({ x: 1, y: 5, w: 2, h: 2 }, 6, 6)).toEqual({ x: 1, y: 4, w: 2, h: 2 });
    });

    it('clamps negative positions', () => {
        expect(clampWidgetBounds({ x: -2, y: -3, w: 2, h: 2 }, 6, 6)).toEqual({ x: 0, y: 0, w: 2, h: 2 });
    });

    it('clamps oversized widgets before clamping position', () => {
        expect(clampWidgetBounds({ x: 4, y: 4, w: 10, h: 10 }, 6, 6)).toEqual({ x: 0, y: 0, w: 6, h: 6 });
    });
});

describe('computeCanvasReference', () => {
    it('subtracts chrome and returns the full usable area width and height', () => {
        const result = computeCanvasReference({
            viewport: { width: 1920, height: 1080 },
            topbarHeight: 80,
            headerHeight: 100,
            paddings: { top: 20, right: 24, bottom: 20, left: 24 },
            aspect: '16:9',
        });

        expect(result).toEqual({
            width: 1872,
            height: 860,
            offsetX: 0,
            offsetY: 0,
        });
    });

    it('anchors the fitted canvas to the top-left of the usable area', () => {
        const result = computeCanvasReference({
            viewport: { width: 1600, height: 900 },
            topbarHeight: 100,
            headerHeight: 100,
            paddings: { top: 0, right: 0, bottom: 0, left: 0 },
            aspect: '21:9',
        });

        expect(result.offsetX).toBe(0);
        expect(result.offsetY).toBe(0);
    });

    it('never exceeds usable area because it is the usable area', () => {
        const result = computeCanvasReference({
            viewport: { width: 800, height: 600 },
            topbarHeight: 50,
            headerHeight: 50,
            paddings: { top: 10, right: 10, bottom: 10, left: 10 },
            aspect: '4:3',
        });

        expect(result.width).toBe(780);
        expect(result.height).toBe(480);
    });
});

describe('isTemplateApplicable', () => {
    it('returns true when aspects match', () => {
        expect(isTemplateApplicable({ aspect: '16:9' }, { aspect: '16:9' })).toBe(true);
    });

    it('returns false when aspects differ', () => {
        expect(isTemplateApplicable({ aspect: '21:9' }, { aspect: '16:9' })).toBe(false);
    });
});
