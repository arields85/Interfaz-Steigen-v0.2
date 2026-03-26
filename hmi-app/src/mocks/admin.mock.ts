import type { Dashboard } from '../domain/admin.types';

// =============================================================================
// MOCKS: Admin
// Dashboards configurados para el Modo Administrador.
// Proveen datos simulados para el Gestor de Dashboards y el Builder.
// =============================================================================

export const mockDashboards: Dashboard[] = [
    {
        id: 'dash-global',
        name: 'Dashboard Principal',
        description: 'Visión general de planta y KPIs principales',
        dashboardType: 'global',
        status: 'published',
        isTemplate: false,
        version: 3,
        layout: [
            { widgetId: 'w-oee', x: 0, y: 0, w: 1, h: 1 },
            { widgetId: 'w-prod', x: 1, y: 0, w: 1, h: 1 },
            { widgetId: 'w-alarms', x: 2, y: 0, w: 1, h: 1 },
        ],
        widgets: [
            {
                id: 'w-oee',
                type: 'kpi',
                title: 'OEE GLOBAL',
                position: { x: 0, y: 0 },
                size: { w: 1, h: 1 },
                binding: { mode: 'simulated_value', simulatedValue: 78.4, unit: '%' }
            },
            {
                id: 'w-prod',
                type: 'kpi',
                title: 'PRODUCCIÓN DEL TURNO',
                position: { x: 1, y: 0 },
                size: { w: 1, h: 1 },
                binding: { mode: 'simulated_value', simulatedValue: 142500, formatter: 'number' }
            },
            {
                id: 'w-alarms',
                type: 'kpi',
                title: 'ALARMAS ACTIVAS',
                position: { x: 2, y: 0 },
                size: { w: 1, h: 1 },
                binding: { mode: 'simulated_value', simulatedValue: 3 }
            }
        ]
    },
    {
        id: 'dash-comp-01',
        name: 'Comprimidora FETTE-2090 (Detalle)',
        description: 'Panel de monitoreo detallado para línea de compresión',
        dashboardType: 'equipment',
        status: 'draft',
        isTemplate: false,
        version: 1,
        // Widgets reales mapeando a la Comprimidora del equipo mock principal eq-001
        layout: [
            { widgetId: 'w-eq-status', x: 0, y: 0, w: 1, h: 1 },
            { widgetId: 'w-eq-rpm', x: 0, y: 1, w: 1, h: 1 },
            { widgetId: 'w-eq-kn', x: 1, y: 1, w: 1, h: 1 },
        ],
        widgets: [
            {
                id: 'w-eq-status',
                type: 'status',
                title: 'ESTADO ACTUAL',
                position: { x: 0, y: 0 },
                size: { w: 1, h: 1 },
                binding: { mode: 'real_variable', assetId: 'eq-001' }
            },
            {
                id: 'w-eq-rpm',
                type: 'metric-card',
                title: 'VELOCIDAD',
                position: { x: 0, y: 1 },
                size: { w: 1, h: 1 },
                binding: { mode: 'real_variable', assetId: 'eq-001', variableKey: 'Velocidad', unit: 'RPM' },
                thresholds: [
                    { value: 1900, severity: 'critical' },
                    { value: 1700, severity: 'warning' }
                ]
            },
            {
                id: 'w-eq-kn',
                type: 'metric-card',
                title: 'FUERZA MÁXIMA',
                position: { x: 1, y: 1 },
                size: { w: 1, h: 1 },
                binding: { mode: 'real_variable', assetId: 'eq-001', variableKey: 'Fuerza', unit: 'kN' },
                thresholds: [
                    { value: 32, severity: 'critical' },
                    { value: 28, severity: 'warning' }
                ]
            }
        ]
    }
];
