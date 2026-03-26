import type { AlertEvent } from '../domain';

// =============================================================================
// MOCKS: Alerts
// Escenarios de alertas por severidad y estado.
// =============================================================================

export const mockAlerts: AlertEvent[] = [
    {
        id: 'alert-001',
        equipmentId: 'eq-001',
        title: 'Presión de compactación inestable',
        description: 'La presión principal excede el límite de tolerancia definido en receta ASRP-500mg.',
        severity: 'critical',
        status: 'active',
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // hace 5 min
        source: 'edge.c1.pressure_sensor_main',
    },
    {
        id: 'alert-002',
        equipmentId: 'eq-002',
        title: 'Temperatura de lecho supera umbral de advertencia',
        description: 'Temperatura actual: 42.8°C. Umbral de alerta: 40°C.',
        severity: 'warning',
        status: 'active',
        createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(), // hace 20 min
        source: 'edge.c2.temp_sensor_bed',
    },
    {
        id: 'alert-003',
        equipmentId: 'eq-002',
        title: 'Nivel de tolva bajo (20%)',
        description: 'El nivel de tolva de alimentación se encuentra en 20%. Se recomienda revisión.',
        severity: 'warning',
        status: 'active',
        createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        source: 'edge.c2.hopper_level_sensor',
    },
    {
        id: 'alert-004',
        equipmentId: 'eq-003',
        title: 'Fallo en sistema de spray de recubrimiento',
        description: 'No se recibe señal del sensor de presión de spray. Verificar bomba peristáltica.',
        severity: 'critical',
        status: 'active',
        createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // hace 2 min
        source: 'edge.c3.spray_pressure',
    },
    {
        id: 'alert-005',
        equipmentId: 'eq-001',
        title: 'Vibración anómala detectada en punzones',
        description: 'Vibración fuera de rango detectada. Revisar estado de punzones superiores.',
        severity: 'info',
        status: 'acknowledged',
        createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(), // hace 1.5h
        updatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        source: 'edge.c1.vibration_sensor',
    },
];
