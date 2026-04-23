// =============================================================================
// Query: useDataHistory
// Hook centralizado para consumir la capa de datos históricos bajo demanda.
//
// Este es el ÚNICO punto de entrada para leer histórico real.
// Ningún componente debe hacer fetch directo — todos consumen desde aquí.
//
// Expone:
//   - data: respuesta histórica ya adaptada al dominio
//   - isLoading, isError, error, isEnabled
//
// Contrato oficial: docs/DATA_CONTRACT.md
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { adaptDataHistory } from '../adapters/dataHistory.adapter';
import { isDataHistoryEnabled } from '../config/dataConnection.config';
import type { DataHistoryResponse, HistoryQueryParams } from '../domain/dataContract.types';
import { fetchDataHistory } from '../services/dataHistory.service';

export const DATA_HISTORY_QUERY_KEY_PREFIX = ['data', 'history'] as const;

export interface UseDataHistoryResult {
    data: DataHistoryResponse | null;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    isEnabled: boolean;
}

export function useDataHistory(params: HistoryQueryParams | null): UseDataHistoryResult {
    const enabled = params !== null && isDataHistoryEnabled();

    const query = useQuery<DataHistoryResponse>({
        queryKey: [
            ...DATA_HISTORY_QUERY_KEY_PREFIX,
            params?.machineId ?? null,
            params?.variableKey ?? null,
            params?.range ?? null,
        ],
        queryFn: async () => {
            if (!params) {
                throw new Error('History query params are required');
            }

            const raw = await fetchDataHistory(params);
            return adaptDataHistory(raw);
        },
        enabled,
        staleTime: 30_000,
        retry: 2,
        refetchOnWindowFocus: true,
    });

    return {
        data: query.data ?? null,
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error ?? null,
        isEnabled: enabled,
    };
}
