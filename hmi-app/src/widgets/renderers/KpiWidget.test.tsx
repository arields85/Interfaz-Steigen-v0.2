import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ContractMachine } from '../../domain/dataContract.types';
import type { KpiWidgetConfig } from '../../domain/admin.types';
import KpiWidget from './KpiWidget';

const equipmentMap = new Map();

function makeWidget(overrides?: Partial<KpiWidgetConfig>): KpiWidgetConfig {
    return {
        id: 'kpi-1',
        type: 'kpi',
        title: 'Potencia',
        position: { x: 0, y: 0 },
        size: { w: 2, h: 2 },
        binding: {
            mode: 'real_variable',
            bindingVersion: 'node-red-v1',
            machineId: 101,
            variableKey: 'activePower',
            unit: 'kW',
        },
        displayOptions: {
            kpiMode: 'circular',
            min: 0,
            max: 10,
        },
        ...overrides,
    };
}

function makeMachines(value: number): ContractMachine[] {
    return [{
        unitId: 101,
        name: 'Extrusora 101',
        status: 'online',
        lastSuccess: '2026-04-23T22:00:00.000Z',
        ageMs: 0,
        values: {
            activePower: {
                value,
                unit: 'kW',
                timestamp: '2026-04-23T22:00:00.000Z',
            },
        },
    }];
}

describe('KpiWidget', () => {
    it('renders circular gauge as a direct sibling of the centered value overlay', () => {
        render(
            <KpiWidget
                widget={makeWidget()}
                equipmentMap={equipmentMap}
                machines={makeMachines(1.1)}
            />,
        );

        const gauge = screen.getByTestId('gauge-circular');
        const value = screen.getByText('1.1');
        const gaugeLayer = gauge.parentElement;
        const valueLayer = value.parentElement;

        expect(gaugeLayer).toHaveClass('relative', 'flex', 'items-center', 'justify-center', 'w-full', 'h-full', 'min-h-[140px]');
        expect(valueLayer).toHaveClass('absolute', 'inset-0', 'flex', 'flex-col', 'items-center', 'justify-center');
        expect(gaugeLayer).toBe(valueLayer?.parentElement);
        expect(gauge).toHaveClass('w-full', 'h-full');
        expect(gauge.style.width).toBe('');
        expect(gauge.style.height).toBe('');
    });

    it('uses the custom unit when unitOverride is enabled', () => {
        render(
            <KpiWidget
                widget={makeWidget({
                    displayOptions: {
                        kpiMode: 'circular',
                        min: 0,
                        max: 10,
                        unitOverride: true,
                        unit: '%',
                    },
                })}
                equipmentMap={equipmentMap}
                machines={makeMachines(1.1)}
            />,
        );

        expect(screen.getByText('%')).toBeInTheDocument();
        expect(screen.queryByText('kW')).not.toBeInTheDocument();
    });

    it('uses the simulated binding unit for the widget and bar scale labels even if a stale custom unit exists', () => {
        render(
            <KpiWidget
                widget={makeWidget({
                    binding: {
                        mode: 'simulated_value',
                        simulatedValue: 1200,
                        machineId: 101,
                        variableKey: 'activePower',
                        bindingVersion: 'node-red-v1',
                        unit: 'RPM',
                    },
                    displayOptions: {
                        kpiMode: 'bar',
                        min: 0,
                        max: 2000,
                        unitOverride: true,
                        unit: '°C',
                    },
                })}
                equipmentMap={equipmentMap}
                machines={makeMachines(1.1)}
            />,
        );

        expect(screen.getAllByText('RPM')).toHaveLength(1);
        expect(screen.getByText('0 RPM')).toBeInTheDocument();
        expect(screen.getByText('2000 RPM')).toBeInTheDocument();
        expect(screen.queryByText('°C')).not.toBeInTheDocument();
        expect(screen.queryByText('0 °C')).not.toBeInTheDocument();
    });
});
