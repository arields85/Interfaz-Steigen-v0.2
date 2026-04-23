import { describe, expect, it, vi, afterEach } from 'vitest';

import { useQuery } from '@tanstack/react-query';
import { adaptDataHistory } from '../adapters/dataHistory.adapter';
import { isDataHistoryEnabled } from '../config/dataConnection.config';
import { fetchDataHistory } from '../services/dataHistory.service';
import {
    DATA_HISTORY_QUERY_KEY_PREFIX,
    useDataHistory,
} from './useDataHistory';

vi.mock('@tanstack/react-query', () => ({
    useQuery: vi.fn(),
}));

vi.mock('../config/dataConnection.config', () => ({
    isDataHistoryEnabled: vi.fn(),
}));

vi.mock('../services/dataHistory.service', () => ({
    fetchDataHistory: vi.fn(),
}));

vi.mock('../adapters/dataHistory.adapter', () => ({
    adaptDataHistory: vi.fn(),
}));

describe('useDataHistory', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('disables the query when params are null', () => {
        vi.mocked(isDataHistoryEnabled).mockReturnValue(true);
        vi.mocked(useQuery).mockReturnValue({
            data: undefined,
            isLoading: false,
            isError: false,
            error: null,
        } as never);

        const result = useDataHistory(null);

        expect(DATA_HISTORY_QUERY_KEY_PREFIX).toEqual(['data', 'history']);
        expect(useQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                queryKey: [...DATA_HISTORY_QUERY_KEY_PREFIX, null, null, null],
                enabled: false,
                staleTime: 30_000,
            })
        );
        expect(useQuery).toHaveBeenCalledWith(
            expect.not.objectContaining({
                refetchInterval: expect.anything(),
            })
        );
        expect(result).toEqual({
            data: null,
            isLoading: false,
            isError: false,
            error: null,
            isEnabled: false,
        });
    });

    it('builds the expected query and adapts the fetched payload when enabled', async () => {
        vi.mocked(isDataHistoryEnabled).mockReturnValue(true);
        vi.mocked(useQuery).mockReturnValue({
            data: {
                machineId: 7,
                variableKey: 'pressure',
            },
            isLoading: false,
            isError: false,
            error: null,
        } as never);

        const params = { machineId: 7, variableKey: 'pressure', range: 'dia' as const };
        const raw = { raw: true };
        const adapted = {
            contractVersion: '1.0.0',
            machineId: 7,
            variableKey: 'pressure',
            range: 'dia' as const,
            unit: 'bar',
            series: [],
            summary: { last: null, min: null, max: null, avg: null },
        };

        vi.mocked(fetchDataHistory).mockResolvedValue(raw);
        vi.mocked(adaptDataHistory).mockReturnValue(adapted);

        const result = useDataHistory(params);
        const queryOptions = vi.mocked(useQuery).mock.calls[0]?.[0];

        expect(queryOptions).toEqual(
            expect.objectContaining({
                queryKey: ['data', 'history', 7, 'pressure', 'dia'],
                enabled: true,
                staleTime: 30_000,
            })
        );

        await expect(queryOptions?.queryFn?.()).resolves.toEqual(adapted);
        expect(fetchDataHistory).toHaveBeenCalledWith(params);
        expect(adaptDataHistory).toHaveBeenCalledWith(raw);
        expect(result).toEqual({
            data: { machineId: 7, variableKey: 'pressure' },
            isLoading: false,
            isError: false,
            error: null,
            isEnabled: true,
        });
    });
});
