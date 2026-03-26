import type { AlertEvent } from '../domain';
import { mockAlerts } from '../mocks';

// =============================================================================
// SERVICE: Alerts
// =============================================================================

const MOCK_DELAY = 350;
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export interface AlertFilters {
    equipmentId?: string;
    severity?: string;
    status?: string;
}

/** Obtiene alertas filtradas por equipo, severidad o estado */
export async function getAlerts(filters?: AlertFilters): Promise<AlertEvent[]> {
    await delay(MOCK_DELAY);
    let list = [...mockAlerts];
    if (filters?.equipmentId) {
        list = list.filter((a) => a.equipmentId === filters.equipmentId);
    }
    if (filters?.severity) {
        list = list.filter((a) => a.severity === filters.severity);
    }
    if (filters?.status) {
        list = list.filter((a) => a.status === filters.status);
    }
    return list;
}
