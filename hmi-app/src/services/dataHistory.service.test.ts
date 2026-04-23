import { afterEach, describe, expect, it, vi } from 'vitest';

import * as dataConnectionConfig from '../config/dataConnection.config';
import type { DataHistoryResponse } from '../domain/dataContract.types';
import { DataServiceError } from './dataOverview.service';
import { fetchDataHistory } from './dataHistory.service';

describe('dataHistory.service', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('throws a typed error when the history url is not configured', async () => {
        vi.spyOn(dataConnectionConfig, 'getDataHistoryUrl').mockReturnValue(null);

        await expect(
            fetchDataHistory({ machineId: 7, variableKey: 'pressure', range: 'hora' })
        ).rejects.toEqual(new DataServiceError('Data history URL is not configured'));
    });

    it('fetches the configured history endpoint with the expected query params', async () => {
        vi.spyOn(dataConnectionConfig, 'getDataHistoryUrl').mockReturnValue(
            'https://api.local/api/hmi/history'
        );

        const payload: DataHistoryResponse = {
            contractVersion: '1.0.0',
            machineId: 7,
            variableKey: 'flow rate',
            range: 'hora',
            unit: 'L/min',
            series: [{ timestamp: '2026-04-22T10:00:00Z', value: 12.5 }],
            summary: { last: 12.5, min: 10, max: 13, avg: 11.8 },
        };

        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue(payload),
        });

        vi.stubGlobal('fetch', fetchMock);

        await expect(
            fetchDataHistory({ machineId: 7, variableKey: 'flow rate', range: 'hora' })
        ).resolves.toEqual(payload);

        expect(fetchMock).toHaveBeenCalledWith(
            'https://api.local/api/hmi/history?machineId=7&variableKey=flow+rate&range=hora',
            {
                method: 'GET',
                headers: { Accept: 'application/json' },
            }
        );
    });

    it('wraps network failures in a typed service error', async () => {
        vi.spyOn(dataConnectionConfig, 'getDataHistoryUrl').mockReturnValue(
            'https://api.local/api/hmi/history'
        );
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('socket hang up')));

        await expect(
            fetchDataHistory({ machineId: 7, variableKey: 'pressure', range: 'hora' })
        ).rejects.toEqual(
            new DataServiceError('Network error fetching data history: socket hang up')
        );
    });

    it('exposes the upstream status code when the history fetch fails', async () => {
        vi.spyOn(dataConnectionConfig, 'getDataHistoryUrl').mockReturnValue(
            'https://api.local/api/hmi/history'
        );
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: false,
                status: 503,
                statusText: 'Service Unavailable',
            })
        );

        await expect(
            fetchDataHistory({ machineId: 7, variableKey: 'pressure', range: 'hora' })
        ).rejects.toEqual(new DataServiceError('Data history returned 503: Service Unavailable', 503));
    });
});
