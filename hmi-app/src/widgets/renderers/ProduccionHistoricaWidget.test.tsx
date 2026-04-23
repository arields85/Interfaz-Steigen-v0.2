import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProdHistoryWidgetConfig } from '../../domain/admin.types';
import ProduccionHistoricaWidget from './ProduccionHistoricaWidget';

class MockResizeObserver implements ResizeObserver {
    public constructor(private readonly callback: ResizeObserverCallback) {}

    public observe(target: Element): void {
        this.callback([
            {
                target,
                contentRect: {
                    width: 320,
                    height: 180,
                    top: 0,
                    left: 0,
                    bottom: 180,
                    right: 320,
                    x: 0,
                    y: 0,
                    toJSON: () => ({}),
                },
            } as ResizeObserverEntry,
        ], this);
    }

    public unobserve(): void {}

    public disconnect(): void {}
}

const equipmentMap = new Map();

function makeWidget(): ProdHistoryWidgetConfig {
    return {
        id: 'prod-history-1',
        type: 'prod-history',
        title: 'Producción Histórica',
        position: { x: 0, y: 0 },
        size: { w: 6, h: 4 },
        displayOptions: {
            defaultTemporalGrouping: 'hour',
            defaultShowOee: true,
        },
    };
}

describe('ProduccionHistoricaWidget', () => {
    beforeEach(() => {
        vi.stubGlobal('ResizeObserver', MockResizeObserver);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('renders the bucket selector with pressed state and keeps the OEE toggle below it', () => {
        render(<ProduccionHistoricaWidget widget={makeWidget()} equipmentMap={equipmentMap} />);

        const hourButton = screen.getByRole('button', { name: 'Hora' });
        const dayButton = screen.getByRole('button', { name: 'Día' });
        const oeeButton = screen.getByRole('button', { name: /oee/i });

        expect(hourButton).toHaveAttribute('aria-pressed', 'true');
        expect(dayButton).toHaveAttribute('aria-pressed', 'false');
        expect(oeeButton).toBeInTheDocument();
    });

    it('updates the pressed bucket button after selection changes', () => {
        render(<ProduccionHistoricaWidget widget={makeWidget()} equipmentMap={equipmentMap} />);

        fireEvent.click(screen.getByRole('button', { name: 'Día' }));

        expect(screen.getByRole('button', { name: 'Día' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'Hora' })).toHaveAttribute('aria-pressed', 'false');
    });
});
