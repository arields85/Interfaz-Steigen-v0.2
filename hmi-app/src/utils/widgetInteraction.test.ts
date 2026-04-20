import { describe, expect, it } from 'vitest';
import {
    applyPointerDeltaToPixelBounds,
    layoutToPixelBounds,
    pixelBoundsToGridBounds,
} from './widgetInteraction';

describe('widgetInteraction', () => {
    it('maps grid layout bounds to pixel bounds from canvas metrics', () => {
        expect(
            layoutToPixelBounds(
                { x: 5, y: 2, w: 3, h: 2 },
                { cellWidth: 60, rowHeight: 75 },
            ),
        ).toEqual({ left: 300, top: 150, width: 180, height: 150 });
    });

    it('converts tentative pixel bounds back into rounded grid units', () => {
        expect(
            pixelBoundsToGridBounds(
                { left: 180, top: 225, width: 240, height: 300 },
                { cellWidth: 60, rowHeight: 75 },
            ),
        ).toEqual({ x: 3, y: 3, w: 4, h: 4 });
    });

    it('applies pointer deltas differently for move and resize interactions', () => {
        const startBounds = { left: 120, top: 75, width: 180, height: 150 };

        expect(applyPointerDeltaToPixelBounds('move', startBounds, -180, 150)).toEqual({
            left: -60,
            top: 225,
            width: 180,
            height: 150,
        });

        expect(applyPointerDeltaToPixelBounds('resize', startBounds, 120, -500)).toEqual({
            left: 120,
            top: 75,
            width: 300,
            height: 1,
        });
    });
});
