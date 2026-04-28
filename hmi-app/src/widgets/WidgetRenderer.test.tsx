import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ContractMachine } from '../domain/dataContract.types';
import type { MachineActivityWidgetConfig } from '../domain/admin.types';
import WidgetRenderer from './WidgetRenderer';

const equipmentMap = new Map();

const widget: MachineActivityWidgetConfig = {
    id: 'machine-activity-1',
    type: 'machine-activity',
    title: 'Actividad de Máquina',
    position: { x: 0, y: 0 },
    size: { w: 1, h: 2 },
    binding: {
        mode: 'real_variable',
        bindingVersion: 'node-red-v1',
        machineId: 101,
        variableKey: 'activePower',
        unit: 'kW',
    },
    displayOptions: {
        icon: 'Activity',
        kpiMode: 'circular',
        thresholdStopped: 0.15,
        thresholdProducing: 0.25,
        hysteresis: 0.05,
        confirmationTime: 2000,
        smoothingWindow: 5,
        powerMin: 0,
        powerMax: 1,
        showStateSubtitle: true,
        showPowerSubtext: true,
        showDynamicColor: true,
        showStateAnimation: true,
        labelStopped: 'Detenida',
        labelCalibrating: 'Setup',
        labelProducing: 'Produciendo',
    },
};

const machines: ContractMachine[] = [{
    unitId: 101,
    name: 'Extrusora 101',
    status: 'online',
    lastSuccess: '2026-04-23T22:00:00.000Z',
    ageMs: 0,
    values: {
        activePower: {
            value: 0.35,
            unit: 'kW',
            timestamp: '2026-04-23T22:00:00.000Z',
        },
    },
}];

describe('WidgetRenderer', () => {
    it('dispatches machine-activity widgets to the dedicated renderer', () => {
        render(
            <WidgetRenderer
                widget={widget}
                equipmentMap={equipmentMap}
                machines={machines}
                isLoadingData={false}
            />,
        );

        expect(screen.getByText('Actividad de Máquina')).toBeInTheDocument();
        expect(screen.getByText('0')).toBeInTheDocument();
        expect(screen.getByText('0.35 kW')).toBeInTheDocument();
        expect(screen.getByTestId('gauge-circular')).toBeInTheDocument();
    });
});
