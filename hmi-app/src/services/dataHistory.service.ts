// =============================================================================
// Service: Data History
// Capa de acceso HTTP al endpoint de histórico.
//
// Este servicio NO sabe qué hay detrás del endpoint.
// Solo hace GET a la URL configurada y devuelve el JSON crudo.
// El adapter se encarga de mapearlo al dominio.
//
// Contrato oficial: docs/DATA_CONTRACT.md
// =============================================================================

import { getDataHistoryUrl } from '../config/dataConnection.config';
import type { HistoryQueryParams } from '../domain/dataContract.types';
import { DataServiceError } from './dataOverview.service';

/**
 * Fetch crudo al endpoint de histórico.
 * Devuelve el JSON tal cual viene — sin transformar ni validar.
 * El adapter downstream es responsable de mapear al dominio.
 */
export async function fetchDataHistory(params: HistoryQueryParams): Promise<unknown> {
    const baseUrl = getDataHistoryUrl();

    if (!baseUrl) {
        throw new DataServiceError('Data history URL is not configured');
    }

    const url = new URL(baseUrl);
    url.searchParams.set('machineId', String(params.machineId));
    url.searchParams.set('variableKey', params.variableKey);
    url.searchParams.set('range', params.range);

    let response: Response;

    try {
        response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                Accept: 'application/json',
            },
        });
    } catch (error) {
        throw new DataServiceError(
            `Network error fetching data history: ${(error as Error).message}`
        );
    }

    if (!response.ok) {
        throw new DataServiceError(
            `Data history returned ${response.status}: ${response.statusText}`,
            response.status
        );
    }

    return response.json();
}
