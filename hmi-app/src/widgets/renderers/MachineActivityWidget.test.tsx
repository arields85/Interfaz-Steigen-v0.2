import '@testing-library/jest-dom/vitest';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ContractMachine } from '../../domain/dataContract.types';
import type { MachineActivityWidgetConfig } from '../../domain/admin.types';
import MachineActivityWidget from './MachineActivityWidget';

const equipmentMap = new Map();

function makeWidget(overrides?: Partial<MachineActivityWidgetConfig>): MachineActivityWidgetConfig {
    return {
        id: 'machine-activity-1',
        type: 'machine-activity',
        title: 'Actividad de Máquina',
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
            showStateSubtitle: true,
            showPowerSubtext: true,
            showDynamicColor: true,
            showStateAnimation: true,
        },
        ...overrides,
    };
}

function makeMachines(value: number | null): ContractMachine[] {
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

describe('MachineActivityWidget', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders with valid power data', () => {
        render(
            <MachineActivityWidget
                widget={makeWidget()}
                equipmentMap={equipmentMap}
                machines={makeMachines(0.1)}
            />,
        );

        expect(screen.getByText('Actividad de Máquina')).toBeInTheDocument();
        expect(screen.getByText('0')).toBeInTheDocument();
        expect(screen.getByText('0.10 kW')).toBeInTheDocument();
        expect(screen.getByText('Detenida')).toBeInTheDocument();
        const gauge = screen.getByTestId('gauge-circular');
        const value = screen.getByText('0');
        const gaugeLayer = gauge.parentElement;
        const valueLayer = value.parentElement;

        expect(gauge).toBeInTheDocument();
        expect(gaugeLayer).toHaveClass('relative', 'flex', 'items-center', 'justify-center', 'w-full', 'h-full', 'min-h-[140px]');
        expect(valueLayer).toHaveClass('absolute', 'inset-0', 'flex', 'flex-col', 'items-center', 'justify-center');
        expect(gaugeLayer).toBe(valueLayer?.parentElement);
        expect(gauge).toHaveClass('w-full', 'h-full');
        expect(gauge.style.width).toBe('');
        expect(gauge.style.height).toBe('');
    });

    it('renders invalid/no data state', () => {
        render(
            <MachineActivityWidget
                widget={makeWidget({ binding: undefined })}
                equipmentMap={equipmentMap}
                machines={makeMachines(null)}
            />,
        );

        expect(screen.getByText('Actividad de Máquina')).toBeInTheDocument();
        expect(screen.getByText('--')).toBeInTheDocument();
        expect(screen.getByText('Sin datos')).toBeInTheDocument();
        expect(screen.getByText('-- kW')).toBeInTheDocument();
    });

    it('can transition from loading to loaded without violating hook ordering', () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

        const { rerender } = render(
            <MachineActivityWidget
                widget={makeWidget()}
                equipmentMap={equipmentMap}
                machines={makeMachines(0.1)}
                isLoadingData
            />,
        );

        expect(screen.getByText((_, element) => element?.className.includes('animate-pulse') ?? false)).toBeInTheDocument();

        expect(() => {
            rerender(
                <MachineActivityWidget
                    widget={makeWidget()}
                    equipmentMap={equipmentMap}
                    machines={makeMachines(0.3)}
                    isLoadingData={false}
                />,
            );
        }).not.toThrow();

        expect(screen.getByText('Actividad de Máquina')).toBeInTheDocument();
        expect(screen.getByText('0')).toBeInTheDocument();
        expect(consoleError).not.toHaveBeenCalled();

        consoleError.mockRestore();
    });

    it('uses the custom unit only for the center value when unitOverride is enabled', () => {
        render(
            <MachineActivityWidget
                widget={makeWidget({
                    displayOptions: {
                        kpiMode: 'circular',
                        showStateSubtitle: true,
                        showPowerSubtext: true,
                        showDynamicColor: true,
                        showStateAnimation: true,
                        unitOverride: true,
                        unit: '%',
                    },
                })}
                equipmentMap={equipmentMap}
                machines={makeMachines(0.1)}
            />,
        );

        expect(screen.getByText('%')).toBeInTheDocument();
        expect(screen.getByText('0.10 kW')).toBeInTheDocument();
        expect(screen.queryByText('0.10 %')).not.toBeInTheDocument();
    });

    it('refreshes the live unit when the bound variable changes and unitOverride is disabled', () => {
        const { rerender } = render(
            <MachineActivityWidget
                widget={makeWidget({
                    displayOptions: {
                        kpiMode: 'circular',
                        unitOverride: false,
                        unit: '%',
                    },
                })}
                equipmentMap={equipmentMap}
                machines={[{
                    unitId: 101,
                    name: 'Extrusora 101',
                    status: 'online',
                    lastSuccess: '2026-04-23T22:00:00.000Z',
                    ageMs: 0,
                    values: {
                        activePower: {
                            value: 0.1,
                            unit: 'kW',
                            timestamp: '2026-04-23T22:00:00.000Z',
                        },
                        frequency: {
                            value: 0.1,
                            unit: 'Hz',
                            timestamp: '2026-04-23T22:00:00.000Z',
                        },
                    },
                }]}
            />,
        );

        expect(screen.getByText('kW')).toBeInTheDocument();

        rerender(
            <MachineActivityWidget
                widget={makeWidget({
                    binding: {
                        mode: 'real_variable',
                        bindingVersion: 'node-red-v1',
                        machineId: 101,
                        variableKey: 'frequency',
                        unit: 'kW',
                    },
                    displayOptions: {
                        kpiMode: 'circular',
                        unitOverride: false,
                        unit: '%',
                    },
                })}
                equipmentMap={equipmentMap}
                machines={[{
                    unitId: 101,
                    name: 'Extrusora 101',
                    status: 'online',
                    lastSuccess: '2026-04-23T22:00:00.000Z',
                    ageMs: 0,
                    values: {
                        activePower: {
                            value: 0.1,
                            unit: 'kW',
                            timestamp: '2026-04-23T22:00:00.000Z',
                        },
                        frequency: {
                            value: 0.1,
                            unit: 'Hz',
                            timestamp: '2026-04-23T22:00:00.000Z',
                        },
                    },
                }]}
            />,
        );

        expect(screen.getByText('Hz')).toBeInTheDocument();
        expect(screen.queryByText('%')).not.toBeInTheDocument();
    });

    it('uses the simulated binding unit for both center and subtext even if a stale custom unit exists', () => {
        render(
            <MachineActivityWidget
                widget={makeWidget({
                    binding: {
                        mode: 'simulated_value',
                        simulatedValue: 0.12,
                        machineId: 101,
                        variableKey: 'activePower',
                        bindingVersion: 'node-red-v1',
                        unit: '%',
                    },
                    displayOptions: {
                        kpiMode: 'circular',
                        showStateSubtitle: true,
                        showPowerSubtext: true,
                        showDynamicColor: true,
                        showStateAnimation: true,
                        unitOverride: true,
                        unit: 'kW',
                    },
                })}
                equipmentMap={equipmentMap}
                machines={makeMachines(0.1)}
            />,
        );

        expect(screen.getAllByText('%')).toHaveLength(1);
        expect(screen.getByText('0.12 %')).toBeInTheDocument();
        expect(screen.queryByText('0.12 kW')).not.toBeInTheDocument();
        expect(screen.queryByText('kW')).not.toBeInTheDocument();
    });

    it('resets machine activity processing when switching from a real binding to a simulated value', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-04-24T12:30:00.000Z'));

        const { rerender } = render(
            <MachineActivityWidget
                widget={makeWidget({
                    displayOptions: {
                        kpiMode: 'circular',
                        showStateSubtitle: true,
                        showPowerSubtext: true,
                        showDynamicColor: true,
                        showStateAnimation: true,
                        powerMin: 0,
                        powerMax: 40,
                    },
                })}
                equipmentMap={equipmentMap}
                machines={makeMachines(1)}
            />, 
        );

        rerender(
            <MachineActivityWidget
                widget={makeWidget({
                    displayOptions: {
                        kpiMode: 'circular',
                        showStateSubtitle: true,
                        showPowerSubtext: true,
                        showDynamicColor: true,
                        showStateAnimation: true,
                        powerMin: 0,
                        powerMax: 40,
                    },
                })}
                equipmentMap={equipmentMap}
                machines={makeMachines(1)}
            />,
        );

        act(() => {
            vi.advanceTimersByTime(2000);
        });

        rerender(
            <MachineActivityWidget
                widget={makeWidget({
                    displayOptions: {
                        kpiMode: 'circular',
                        showStateSubtitle: true,
                        showPowerSubtext: true,
                        showDynamicColor: true,
                        showStateAnimation: true,
                        powerMin: 0,
                        powerMax: 40,
                    },
                })}
                equipmentMap={equipmentMap}
                machines={makeMachines(1)}
            />,
        );

        expect(screen.getByText('3')).toBeInTheDocument();

        rerender(
            <MachineActivityWidget
                widget={makeWidget({
                    binding: {
                        mode: 'simulated_value',
                        simulatedValue: 30,
                        unit: '°F',
                        machineId: 101,
                        variableKey: 'activePower',
                        bindingVersion: 'node-red-v1',
                    },
                    displayOptions: {
                        kpiMode: 'circular',
                        showStateSubtitle: true,
                        showPowerSubtext: true,
                        showDynamicColor: true,
                        showStateAnimation: true,
                        powerMin: 0,
                        powerMax: 40,
                    },
                })}
                equipmentMap={equipmentMap}
                machines={makeMachines(1)}
            />,
        );

        expect(screen.getByText('75')).toBeInTheDocument();
        expect(screen.getByText('30.00 °F')).toBeInTheDocument();
        expect(screen.getByText('°F')).toBeInTheDocument();
    });
});
