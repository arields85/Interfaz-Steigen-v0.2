import { describe, expect, it } from 'vitest';
import { makeLayout } from '../test/fixtures/dashboard.fixture';
import { planDashboardBoundsChange } from './dashboardBoundsSettings';

describe('planDashboardBoundsChange', () => {
    it('keeps layout unchanged when the new cols and rows still fit every widget', () => {
        const result = planDashboardBoundsChange({
            layout: [makeLayout({ widgetId: 'widget-1', x: 0, y: 0, w: 4, h: 3 })],
            nextCols: 20,
            nextRows: 12,
        });

        expect(result.cols).toBe(20);
        expect(result.adjustedWidgetCount).toBe(0);
        expect(result.layout).toEqual([
            makeLayout({ widgetId: 'widget-1', x: 0, y: 0, w: 4, h: 3 }),
        ]);
    });

    it('counts and clamps widgets that would overflow the new rows', () => {
        const result = planDashboardBoundsChange({
            layout: [makeLayout({ widgetId: 'widget-1', x: 0, y: 10, w: 4, h: 3 })],
            nextCols: 20,
            nextRows: 6,
        });

        expect(result.cols).toBe(20);
        expect(result.adjustedWidgetCount).toBe(1);
        expect(result.layout).toEqual([
            makeLayout({ widgetId: 'widget-1', x: 0, y: 3, w: 4, h: 3 }),
        ]);
    });

    it('counts and clamps widgets that would overflow the new cols', () => {
        const result = planDashboardBoundsChange({
            layout: [makeLayout({ widgetId: 'widget-1', x: 16, y: 0, w: 6, h: 3 })],
            nextCols: 18,
            nextRows: 12,
        });

        expect(result.cols).toBe(18);
        expect(result.adjustedWidgetCount).toBe(1);
        expect(result.layout).toEqual([
            makeLayout({ widgetId: 'widget-1', x: 12, y: 0, w: 6, h: 3 }),
        ]);
    });
});
