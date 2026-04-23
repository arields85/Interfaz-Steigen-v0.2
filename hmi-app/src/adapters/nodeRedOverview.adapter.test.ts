import { describe, expect, it } from 'vitest';

import type { DataContractResponse } from '../domain';
import { adaptDataOverview } from './dataOverview.adapter';

describe('dataOverview.adapter', () => {
    it('preserves contract machines with values records', () => {
        const raw: DataContractResponse = {
            contractVersion: '1.0.0',
            timestamp: '2026-04-21T15:00:00Z',
            connection: { globalStatus: 'online', lastSuccess: '2026-04-21T15:00:00Z', ageMs: 0 },
            machines: [
                {
                    unitId: 7,
                    name: 'Compresor 7',
                    status: 'online',
                    lastSuccess: '2026-04-21T15:00:00Z',
                    ageMs: 0,
                    values: {
                        pressure: { value: 12.4, unit: 'bar', timestamp: '2026-04-21T15:00:00Z' },
                    },
                },
            ],
        };

        expect(adaptDataOverview(raw)).toEqual({
            connection: { globalStatus: 'online', lastSuccess: '2026-04-21T15:00:00Z', ageMs: 0 },
            machines: [
                {
                    unitId: 7,
                    name: 'Compresor 7',
                    status: 'online',
                    lastSuccess: '2026-04-21T15:00:00Z',
                    ageMs: 0,
                    values: {
                        pressure: {
                            value: 12.4,
                            unit: 'bar',
                            timestamp: '2026-04-21T15:00:00Z',
                        },
                    },
                },
            ],
        });
    });

    it('returns empty values when a valid machine has no values object', () => {
        const raw = {
            contractVersion: '1.0.0',
            timestamp: '2026-04-21T15:00:00Z',
            connection: { globalStatus: 'online', lastSuccess: '2026-04-21T15:00:00Z', ageMs: 0 },
            machines: [
                {
                    unitId: 3,
                    name: 'Chiller 3',
                    status: 'online',
                    lastSuccess: '2026-04-21T15:00:00Z',
                    ageMs: 0,
                    values: undefined,
                },
            ],
        } as unknown as DataContractResponse;

        expect(adaptDataOverview(raw).machines).toEqual([
            {
                unitId: 3,
                name: 'Chiller 3',
                status: 'online',
                lastSuccess: '2026-04-21T15:00:00Z',
                ageMs: 0,
                values: {},
            },
        ]);
    });

    it('returns an empty list when the overview has no machines array', () => {
        expect(adaptDataOverview({ machines: [] } as unknown as DataContractResponse).machines).toEqual([]);
        expect(adaptDataOverview({} as DataContractResponse).machines).toEqual([]);
    });
});
