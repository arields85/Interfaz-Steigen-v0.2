// =============================================================================
// DOMAIN: Alert
// Eventos, alarmas y condiciones observadas de proceso.
// La plataforma es read-only: los alerts se OBSERVAN, nunca se accionan.
// =============================================================================

export type AlertSeverity = 'info' | 'warning' | 'critical';

export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

/**
 * Representa una alerta, evento o condición relevante observada en un equipo.
 * No implica acción de control: es únicamente informativa y descriptiva.
 */
export interface AlertEvent {
    id: string;
    equipmentId: string;
    title: string;
    description?: string;
    severity: AlertSeverity;
    status: AlertStatus;
    createdAt: string;   // ISO 8601
    updatedAt?: string;  // ISO 8601
    source?: string;     // ej: 'edge.c2.sensor_001' o 'system'
}
