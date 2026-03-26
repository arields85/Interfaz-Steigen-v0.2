import type { AlertEvent } from '../domain';

// =============================================================================
// ADAPTER: Alerts
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function adaptAlertEvent(rawSource: any): AlertEvent {
    return {
        id: String(rawSource.id ?? ''),
        equipmentId: String(rawSource.equipmentId ?? ''),
        title: String(rawSource.title ?? 'Alerta sin título'),
        description: rawSource.description ?? undefined,
        severity: rawSource.severity ?? 'info',
        status: rawSource.status ?? 'active',
        createdAt: rawSource.createdAt ?? new Date().toISOString(),
        updatedAt: rawSource.updatedAt ?? undefined,
        source: rawSource.source ?? undefined,
    };
}
