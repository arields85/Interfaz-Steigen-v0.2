import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrendChartWidgetConfig } from '../../domain/admin.types';
import type { DataHistoryResponse, ContractMachine } from '../../domain/dataContract.types';
import { isDataHistoryEnabled } from '../../config/dataConnection.config';
import { useDataHistory } from '../../queries/useDataHistory';
import TrendChartWidget from './TrendChartWidget';

vi.mock('../../config/dataConnection.config', () => ({
    isDataHistoryEnabled: vi.fn(),
}));

vi.mock('../../queries/useDataHistory', () => ({
    useDataHistory: vi.fn(),
}));

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

function makeWidget(binding?: TrendChartWidgetConfig['binding']): TrendChartWidgetConfig {
    return {
        id: 'trend-1',
        type: 'trend-chart',
        title: 'Temperatura',
        position: { x: 0, y: 0 },
        size: { w: 6, h: 4 },
        binding: binding ?? {
            mode: 'real_variable',
            bindingVersion: 'node-red-v1',
            machineId: 101,
            variableKey: 'temperature',
        },
    };
}

function makeMachines(value: number | null): ContractMachine[] {
    return [{
        unitId: 101,
        name: 'Extrusora 101',
        status: 'online',
        lastSuccess: '2026-04-22T12:00:00.000Z',
        ageMs: 0,
        values: {
            temperature: {
                value,
                unit: '°C',
                timestamp: '2026-04-22T12:00:00.000Z',
            },
        },
    }];
}

function makeHistoryResponse(): DataHistoryResponse {
    return {
        contractVersion: '1.0.0',
        machineId: 101,
        variableKey: 'temperature',
        range: 'hora',
        unit: '°C',
        series: [
            { timestamp: '2026-04-22T10:00:00.000Z', value: 45 },
            { timestamp: '2026-04-22T11:00:00.000Z', value: null },
            { timestamp: '2026-04-22T12:00:00.000Z', value: 52 },
        ],
        summary: {
            last: 52,
            min: 45,
            max: 52,
            avg: 48.5,
        },
    };
}

describe('TrendChartWidget', () => {
    beforeEach(() => {
        vi.stubGlobal('ResizeObserver', MockResizeObserver);
        vi.mocked(isDataHistoryEnabled).mockReturnValue(true);
        vi.mocked(useDataHistory).mockReturnValue({
            data: null,
            isLoading: false,
            isError: false,
            error: null,
            isEnabled: true,
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    it('renders the range selector and updates the history range query', () => {
        vi.mocked(useDataHistory).mockReturnValue({
            data: makeHistoryResponse(),
            isLoading: false,
            isError: false,
            error: null,
            isEnabled: true,
        });

        render(
            <TrendChartWidget
                widget={makeWidget()}
                equipmentMap={equipmentMap}
                machines={makeMachines(50)}
            />,
        );

        expect(screen.getByRole('button', { name: 'Hora' })).toHaveAttribute('aria-pressed', 'true');
        expect(useDataHistory).toHaveBeenLastCalledWith({
            machineId: 101,
            variableKey: 'temperature',
            range: 'hora',
        });

        fireEvent.click(screen.getByRole('button', { name: 'Día' }));

        expect(useDataHistory).toHaveBeenLastCalledWith({
            machineId: 101,
            variableKey: 'temperature',
            range: 'dia',
        });
        expect(screen.getByRole('button', { name: 'Día' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('prefers real history data, filters null points, and shows summary stats', () => {
        vi.mocked(useDataHistory).mockImplementation((params) => ({
            data: params?.range === 'dia'
                ? { ...makeHistoryResponse(), range: 'dia' }
                : makeHistoryResponse(),
            isLoading: false,
            isError: false,
            error: null,
            isEnabled: true,
        }));

        render(
            <TrendChartWidget
                widget={makeWidget()}
                equipmentMap={equipmentMap}
                machines={makeMachines(50)}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Día' }));

        expect(screen.getByText(/22\/04/)).toBeInTheDocument();
        expect(screen.getByText('Min 45')).toBeInTheDocument();
        expect(screen.getByText('Max 52')).toBeInTheDocument();
        expect(screen.getByText('Avg 49')).toBeInTheDocument();
        expect(screen.queryByText('--')).not.toBeInTheDocument();
    });

    it('shows the loading skeleton while history is loading', () => {
        vi.mocked(useDataHistory).mockReturnValue({
            data: null,
            isLoading: true,
            isError: false,
            error: null,
            isEnabled: true,
        });

        render(
            <TrendChartWidget
                widget={makeWidget()}
                equipmentMap={equipmentMap}
                machines={makeMachines(50)}
            />,
        );

        expect(screen.getByText('Cargando datos...')).toBeInTheDocument();
    });

    it('shows empty state when history is disabled and binding is real', () => {
        vi.mocked(isDataHistoryEnabled).mockReturnValue(false);

        render(
            <TrendChartWidget
                widget={makeWidget()}
                equipmentMap={equipmentMap}
                machines={makeMachines(50)}
            />,
        );

        expect(useDataHistory).toHaveBeenCalledWith(null);
        expect(screen.queryByText('Cargando datos...')).not.toBeInTheDocument();
        expect(screen.getByText('--')).toBeInTheDocument();
        expect(screen.getByText('Sin datos')).toBeInTheDocument();
    });

    it('falls back to simulated data when binding mode is simulated_value', () => {
        vi.mocked(isDataHistoryEnabled).mockReturnValue(true);

        render(
            <TrendChartWidget
                widget={makeWidget({
                    mode: 'simulated_value',
                    simulatedValue: 50,
                })}
                equipmentMap={equipmentMap}
                machines={makeMachines(50)}
            />,
        );

        expect(useDataHistory).toHaveBeenCalledWith(null);
        expect(screen.queryByText('Cargando datos...')).not.toBeInTheDocument();
        expect(screen.queryByText('--')).not.toBeInTheDocument();
        expect(screen.queryByText('Sin datos')).not.toBeInTheDocument();
    });
});
