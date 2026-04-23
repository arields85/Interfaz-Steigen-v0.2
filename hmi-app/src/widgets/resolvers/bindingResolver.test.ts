import { describe, expect, it } from 'vitest';
import { resolveBinding } from './bindingResolver';
import type { EquipmentSummary } from '../../domain/equipment.types';
import type { ContractMachine } from '../../domain/dataContract.types';
import { makeWidget } from '../../test/fixtures/dashboard.fixture';

function makeEquipmentMap(): Map<string, EquipmentSummary> {
    return new Map([
        ['asset-1', {
            id: 'asset-1',
            name: 'Extrusora legacy',
            type: 'machine',
            status: 'running',
            connectionState: 'online',
            lastUpdateAt: '2026-04-21T12:00:00.000Z',
            primaryMetrics: [
                {
                    id: 'temperature',
                    label: 'temperature',
                    value: 42,
                    unit: '°C',
                    status: 'normal',
                    timestamp: '2026-04-21T12:00:00.000Z',
                },
            ],
        }],
    ]);
}

function makeMachines(): ContractMachine[] {
    return [{
        unitId: 101,
        name: 'Extrusora 101',
        status: 'online',
        lastSuccess: '2026-04-21T13:00:00.000Z',
        ageMs: 0,
        values: {
            temperature: {
                value: 88,
                unit: '°C',
                timestamp: '2026-04-21T13:00:00.000Z',
            },
        },
    }];
}

describe('resolveBinding backward compatibility', () => {
    it('keeps the legacy two-argument call working exactly as before', () => {
        const widget = makeWidget({
            thresholds: [{ value: 40, severity: 'warning' }],
            binding: {
                mode: 'real_variable',
                assetId: 'asset-1',
                variableKey: 'temperature',
            },
        });

        const result = resolveBinding(widget, makeEquipmentMap());

        expect(result).toMatchObject({
            value: 42,
            unit: '°C',
            status: 'warning',
            source: 'real',
            connectionState: 'online',
            lastUpdateAt: '2026-04-21T12:00:00.000Z',
        });
    });

    it('keeps simulated mode unchanged when contract machines are also provided', () => {
        const widget = makeWidget({
            thresholds: [{ value: 50, severity: 'warning' }],
            binding: {
                mode: 'simulated_value',
                simulatedValue: 77,
                unit: '%',
            },
        });

        const result = resolveBinding(widget, makeEquipmentMap(), makeMachines());

        expect(result).toEqual({
            value: 77,
            unit: '%',
            status: 'warning',
            source: 'simulated',
        });
    });

    it('resolves node-red-v1 bindings from contract machines', () => {
        const widget = makeWidget({
            thresholds: [{ value: 80, severity: 'warning' }],
            binding: {
                mode: 'real_variable',
                bindingVersion: 'node-red-v1',
                machineId: 101,
                variableKey: 'temperature',
                unit: 'legacy-unit',
            },
        });

        const result = resolveBinding(widget, makeEquipmentMap(), makeMachines());

        expect(result).toEqual({
            value: 88,
            unit: '°C',
            status: 'warning',
            source: 'real',
            lastUpdateAt: '2026-04-21T13:00:00.000Z',
        });
    });

    it('resolves real-variable-v1 bindings from contract machines', () => {
        const widget = makeWidget({
            thresholds: [{ value: 80, severity: 'warning' }],
            binding: {
                mode: 'real_variable',
                bindingVersion: 'real-variable-v1',
                machineId: 101,
                variableKey: 'temperature',
                unit: 'legacy-unit',
            },
        });

        const result = resolveBinding(widget, makeEquipmentMap(), makeMachines());

        expect(result).toEqual({
            value: 88,
            unit: '°C',
            status: 'warning',
            source: 'real',
            lastUpdateAt: '2026-04-21T13:00:00.000Z',
        });
    });

    it('returns no-data fallback when the contract machine is missing', () => {
        const widget = makeWidget({
            binding: {
                mode: 'real_variable',
                bindingVersion: 'node-red-v1',
                machineId: 999,
                variableKey: 'temperature',
            },
        });

        const result = resolveBinding(widget, makeEquipmentMap(), makeMachines());

        expect(result).toEqual({
            value: null,
            status: 'no-data',
            source: 'real',
        });
    });

    it('returns no-data fallback when the contract variable key is missing', () => {
        const widget = makeWidget({
            binding: {
                mode: 'real_variable',
                bindingVersion: 'node-red-v1',
                machineId: 101,
                variableKey: 'pressure',
            },
        });

        const result = resolveBinding(widget, makeEquipmentMap(), makeMachines());

        expect(result).toEqual({
            value: null,
            status: 'no-data',
            source: 'real',
        });
    });

    it('falls through to the legacy equipmentMap path when machines are undefined', () => {
        const widget = makeWidget({
            thresholds: [{ value: 40, severity: 'warning' }],
            binding: {
                mode: 'real_variable',
                bindingVersion: 'node-red-v1',
                machineId: 101,
                assetId: 'asset-1',
                variableKey: 'temperature',
            },
        });

        const result = resolveBinding(widget, makeEquipmentMap(), undefined);

        expect(result).toMatchObject({
            value: 42,
            unit: '°C',
            status: 'warning',
            source: 'real',
            connectionState: 'online',
        });
    });

    it('keeps legacy real bindings on the equipmentMap path even when contract machines are provided', () => {
        const widget = makeWidget({
            binding: {
                mode: 'real_variable',
                assetId: 'asset-1',
                variableKey: 'temperature',
            },
        });

        const result = resolveBinding(widget, makeEquipmentMap(), makeMachines());

        expect(result).toMatchObject({
            value: 42,
            unit: '°C',
            status: 'normal',
            source: 'real',
            connectionState: 'online',
        });
    });
});
