import type { EquipmentSummary, Equipment } from '../domain';

// =============================================================================
// ADAPTER: Equipment
// Anti-corruption layer entre fuentes externas y dominio interno.
//
// En producción real, las funciones de este módulo recibirán la respuesta
// cruda del edge/API y la transformarán al modelo tipado interno.
// Actualmente son passthrough porque los mocks ya están tipados.
// =============================================================================

/**
 * Transforma una respuesta cruda de fuente externa a EquipmentSummary.
 * La UI NUNCA procesa `rawSource` directamente.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function adaptEquipmentSummary(rawSource: any): EquipmentSummary {
    return {
        id: String(rawSource.id ?? ''),
        name: String(rawSource.name ?? 'Sin nombre'),
        type: rawSource.type ?? 'unknown',
        status: rawSource.status ?? 'unknown',
        connectionState: rawSource.connectionState ?? 'unknown',
        lastUpdateAt: rawSource.lastUpdateAt ?? undefined,
        alertCount: Number(rawSource.alertCount ?? 0),
        primaryMetrics: Array.isArray(rawSource.primaryMetrics)
            ? rawSource.primaryMetrics
            : [],
    };
}

/**
 * Transforma una respuesta cruda a Equipment completo.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function adaptEquipment(rawSource: any): Equipment {
    return {
        id: String(rawSource.id ?? ''),
        name: String(rawSource.name ?? 'Sin nombre'),
        type: rawSource.type ?? 'unknown',
        status: rawSource.status ?? 'unknown',
        connectionState: rawSource.connectionState ?? 'unknown',
        areaId: String(rawSource.areaId ?? ''),
        lineId: String(rawSource.lineId ?? ''),
        plantId: String(rawSource.plantId ?? ''),
        templateId: rawSource.templateId ?? undefined,
        criticality: rawSource.criticality ?? undefined,
        lastUpdateAt: rawSource.lastUpdateAt ?? undefined,
        tags: Array.isArray(rawSource.tags) ? rawSource.tags : [],
    };
}
