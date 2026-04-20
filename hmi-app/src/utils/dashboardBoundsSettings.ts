import type { WidgetLayout } from '../domain/admin.types';
import { clampWidgetBounds } from './gridConfig';

interface PlanDashboardBoundsChangeInput {
    layout: WidgetLayout[];
    nextCols: number;
    nextRows: number;
}

interface DashboardBoundsChangePlan {
    cols: number;
    layout: WidgetLayout[];
    adjustedWidgetCount: number;
}

function isSameLayout(a: Pick<WidgetLayout, 'x' | 'y' | 'w' | 'h'>, b: Pick<WidgetLayout, 'x' | 'y' | 'w' | 'h'>): boolean {
    return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

export function planDashboardBoundsChange(input: PlanDashboardBoundsChangeInput): DashboardBoundsChangePlan {
    const cols = Math.max(1, input.nextCols);

    let adjustedWidgetCount = 0;

    const layout = input.layout.map((item) => {
        const clamped = clampWidgetBounds(item, cols, input.nextRows);

        if (!isSameLayout(item, clamped)) {
            adjustedWidgetCount += 1;
        }

        return {
            ...item,
            ...clamped,
        };
    });

    return {
        cols,
        layout,
        adjustedWidgetCount,
    };
}
