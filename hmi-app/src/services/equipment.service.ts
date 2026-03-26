import type { EquipmentSummary, Equipment } from '../domain';
import { mockEquipmentList, mockEquipmentDetail } from '../mocks';

// =============================================================================
// SERVICE: Equipment
// Capa de acceso a datos de equipos. Actualmente usa mocks.
// Para migrar a datos reales: reemplazar solo la implementación de estas
// funciones. Los tipos de retorno permanecen intactos.
// =============================================================================

/** Simula latencia de red (ms) */
const MOCK_DELAY = 400;

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export interface EquipmentListFilters {
    areaId?: string;
    status?: string;
    type?: string;
}

/** Obtiene resúmenes de todos los equipos (para dashboard y listas) */
export async function getEquipmentList(
    filters?: EquipmentListFilters
): Promise<EquipmentSummary[]> {
    await delay(MOCK_DELAY);
    let list = [...mockEquipmentList];
    if (filters?.status) {
        list = list.filter((e) => e.status === filters.status);
    }
    if (filters?.type) {
        list = list.filter((e) => e.type === filters.type);
    }
    return list;
}

/** Obtiene el detalle completo de un equipo por ID */
export async function getEquipmentDetail(id: string): Promise<Equipment | null> {
    await delay(MOCK_DELAY);
    return mockEquipmentDetail[id] ?? null;
}
