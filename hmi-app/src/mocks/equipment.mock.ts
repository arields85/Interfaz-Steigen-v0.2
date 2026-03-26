import type {
    Equipment,
    EquipmentSummary,
} from '../domain';

// =============================================================================
// MOCKS: Equipment
// 5 escenarios distintos cubriendo todos los estados semánticos del sistema.
// Usar estos mocks en services durante desarrollo previo a integración real.
// =============================================================================

export const mockEquipmentList: EquipmentSummary[] = [
    {
        id: 'eq-001',
        name: 'Comprimidora FETTE-2090',
        type: 'comprimidora',
        status: 'running',
        connectionState: 'online',
        lastUpdateAt: new Date(Date.now() - 12000).toISOString(), // hace 12s
        alertCount: 0,
        primaryMetrics: [
            { label: 'Velocidad', value: 1250, unit: 'RPM' },
            { label: 'Fuerza', value: 24.5, unit: 'kN' },
        ],
    },
    {
        id: 'eq-002',
        name: 'Mezcladora Glatt-600',
        type: 'mezcladora',
        status: 'warning',
        connectionState: 'online',
        lastUpdateAt: new Date(Date.now() - 45000).toISOString(), // hace 45s
        alertCount: 2,
        primaryMetrics: [
            { label: 'Temp. Lecho', value: 42.8, unit: '°C' },
            { label: 'Velocidad', value: 850, unit: 'RPM' },
        ],
    },
    {
        id: 'eq-003',
        name: 'Recubridora Driacoater',
        type: 'recubridora',
        status: 'critical',
        connectionState: 'online',
        lastUpdateAt: new Date(Date.now() - 8000).toISOString(),
        alertCount: 3,
        primaryMetrics: [
            { label: 'Presión Spray', value: null, unit: 'bar' },
            { label: 'Temp. Aire', value: 68.4, unit: '°C' },
        ],
    },
    {
        id: 'eq-004',
        name: 'Empaquetadora IMA-C250',
        type: 'empaquetadora',
        status: 'offline',
        connectionState: 'offline',
        lastUpdateAt: new Date(Date.now() - 1800000).toISOString(), // hace 30 min
        alertCount: 0,
        primaryMetrics: [
            { label: 'Velocidad', value: null, unit: 'blisters/min' },
        ],
    },
    {
        id: 'eq-005',
        name: 'Granuladora Vector',
        type: 'granuladora',
        status: 'idle',
        connectionState: 'stale',
        lastUpdateAt: new Date(Date.now() - 300000).toISOString(), // hace 5 min (stale)
        alertCount: 0,
        primaryMetrics: [
            { label: 'Velocidad', value: 0, unit: 'RPM' },
            { label: 'Temp. Producto', value: 22.1, unit: '°C' },
        ],
    },
];

export const mockEquipmentDetail: Record<string, Equipment> = {
    'eq-001': {
        id: 'eq-001',
        name: 'Comprimidora FETTE-2090',
        type: 'comprimidora',
        status: 'running',
        connectionState: 'online',
        areaId: 'area-compresion',
        lineId: 'linea-1',
        plantId: 'planta-principal',
        criticality: 'high',
        lastUpdateAt: new Date(Date.now() - 12000).toISOString(),
        tags: ['farma', 'compresion', 'produccion'],
    },
    'eq-002': {
        id: 'eq-002',
        name: 'Mezcladora Glatt-600',
        type: 'mezcladora',
        status: 'warning',
        connectionState: 'online',
        areaId: 'area-mezclado',
        lineId: 'linea-1',
        plantId: 'planta-principal',
        criticality: 'medium',
        lastUpdateAt: new Date(Date.now() - 45000).toISOString(),
        tags: ['farma', 'mezclado'],
    },
};
