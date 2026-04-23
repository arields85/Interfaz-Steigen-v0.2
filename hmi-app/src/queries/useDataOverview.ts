// =============================================================================
// Query: useDataOverview
// Hook centralizado para consumir la capa de datos en tiempo real.
//
// Este es el ÚNICO punto de entrada para leer datos reales.
// Ningún componente debe hacer fetch directo — todos consumen desde aquí.
//
// Expone:
//   - connection: health global de la capa de datos
//   - machines: máquinas con status, values, lastSuccess, ageMs
//   - isLoading, isError, error, dataUpdatedAt, isEnabled
//
// Contrato oficial: docs/DATA_CONTRACT.md
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { adaptDataOverview, type AdaptedDataOverview } from '../adapters/dataOverview.adapter';
import {
    isDataConnectionEnabled,
    DATA_DEFAULT_REFETCH_INTERVAL,
    DATA_DEFAULT_STALE_TIME,
} from '../config/dataConnection.config';
import type { ConnectionHealth, ContractMachine } from '../domain/dataContract.types';
import { fetchDataOverview } from '../services/dataOverview.service';

export const DATA_OVERVIEW_QUERY_KEY = ['data', 'overview'] as const;

export interface UseDataOverviewResult {
    connection: ConnectionHealth;
    machines: ContractMachine[];
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    dataUpdatedAt: number;
    isEnabled: boolean;
}

const DEFAULT_CONNECTION: ConnectionHealth = {
    globalStatus: 'unknown',
    lastSuccess: null,
    ageMs: null,
};

export function useDataOverview(): UseDataOverviewResult {
    const enabled = isDataConnectionEnabled();

    const query = useQuery<AdaptedDataOverview>({
        queryKey: DATA_OVERVIEW_QUERY_KEY,
        queryFn: async () => {
            const raw = await fetchDataOverview();
            return adaptDataOverview(raw);
        },
        enabled,
        refetchInterval: DATA_DEFAULT_REFETCH_INTERVAL,
        staleTime: DATA_DEFAULT_STALE_TIME,
        retry: 2,
        refetchOnWindowFocus: true,
    });

    return {
        connection: query.data?.connection ?? DEFAULT_CONNECTION,
        machines: query.data?.machines ?? [],
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        dataUpdatedAt: query.dataUpdatedAt,
        isEnabled: enabled,
    };
}
