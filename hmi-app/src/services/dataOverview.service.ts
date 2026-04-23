// =============================================================================
// Service: Data Overview
// Capa de acceso HTTP a la fuente de datos en tiempo real.
//
// Este servicio NO sabe qué hay detrás del endpoint.
// Solo hace GET a la URL configurada y devuelve el JSON crudo.
// El adapter se encarga de mapearlo al dominio.
//
// Contrato oficial: docs/DATA_CONTRACT.md
// =============================================================================

import { getDataFullUrl } from '../config/dataConnection.config';

export class DataServiceError extends Error {
    public readonly statusCode?: number;

    constructor(message: string, statusCode?: number) {
        super(message);
        this.name = 'DataServiceError';
        this.statusCode = statusCode;
    }
}

/**
 * Fetch crudo al endpoint de datos.
 * Devuelve el JSON tal cual viene — sin transformar ni validar.
 * El adapter downstream es responsable de mapear al dominio.
 */
export async function fetchDataOverview(): Promise<unknown> {
    const url = getDataFullUrl();

    if (!url) {
        throw new DataServiceError('Data connection base URL is not configured');
    }

    let response: Response;

    try {
        response = await fetch(url, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
            },
        });
    } catch (error) {
        throw new DataServiceError(
            `Network error fetching data overview: ${(error as Error).message}`
        );
    }

    if (!response.ok) {
        throw new DataServiceError(
            `Data overview returned ${response.status}: ${response.statusText}`,
            response.status
        );
    }

    return response.json();
}
