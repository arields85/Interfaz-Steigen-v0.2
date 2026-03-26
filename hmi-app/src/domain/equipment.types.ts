// =============================================================================
// DOMAIN: Equipment
// Entidades base para activos industriales observables.
// Esta capa es el corazón del dominio interno. NUNCA debe acoplarse a
// estructuras crudas de PLCs, tags, gateways ni APIs externas.
// =============================================================================

export type EquipmentStatus =
    | 'running'
    | 'idle'
    | 'warning'
    | 'critical'
    | 'offline'
    | 'maintenance'
    | 'unknown';

export type ConnectionState =
    | 'online'
    | 'degraded'
    | 'offline'
    | 'stale'
    | 'unknown';

export type EquipmentType =
    | 'comprimidora'
    | 'mezcladora'
    | 'recubridora'
    | 'empaquetadora'
    | 'granuladora'
    | 'secador'
    | (string & Record<never, never>); // permite strings arbitrarios sin perder tipado de los literales

export interface MetricValue {
    label: string;
    value: number | string | null;
    unit?: string;
}

/**
 * Entidad completa de un equipo industrial.
 * Usada en la pantalla de detalle y en el modelo de administración.
 */
export interface Equipment {
    id: string;
    name: string;
    type: EquipmentType;
    status: EquipmentStatus;
    areaId: string;
    lineId: string;
    plantId: string;
    templateId?: string;
    criticality?: 'low' | 'medium' | 'high';
    lastUpdateAt?: string;  // ISO 8601
    connectionState: ConnectionState;
    tags?: string[];
}

/**
 * Versión resumida para dashboard y listados de navegación.
 * Nunca incluye datos de telemetría completa, solo métricas de cabecera.
 */
export interface EquipmentSummary {
    id: string;
    name: string;
    type: EquipmentType;
    status: EquipmentStatus;
    primaryMetrics: MetricValue[];
    alertCount?: number;
    lastUpdateAt?: string;  // ISO 8601
    connectionState: ConnectionState;
}
