import type { TrendSeries } from '../domain';

// =============================================================================
// MOCKS: Telemetry & Trends
// Series temporales para gráficos TrendChart.
// =============================================================================

const generateTrend = (
    base: number,
    variance: number,
    points = 12
): { timestamp: string; value: number }[] => {
    const now = Date.now();
    return Array.from({ length: points }, (_, i) => ({
        timestamp: new Date(now - (points - 1 - i) * 10 * 60 * 1000).toISOString(),
        value: Math.round((base + (Math.random() - 0.5) * variance * 2) * 10) / 10,
    }));
};

export const mockTrendSeries: Record<string, TrendSeries[]> = {
    'eq-001': [
        {
            metricId: 'rotor-speed',
            label: 'Velocidad de Rotor',
            unit: 'RPM',
            data: generateTrend(1250, 40),
        },
        {
            metricId: 'compression-force',
            label: 'Fuerza Principal',
            unit: 'kN',
            data: generateTrend(24.5, 2),
        },
        {
            metricId: 'die-temperature',
            label: 'Temperatura Matriz',
            unit: '°C',
            data: generateTrend(42, 3),
        },
    ],
    'eq-002': [
        {
            metricId: 'bed-temperature',
            label: 'Temperatura de Lecho',
            unit: '°C',
            data: generateTrend(40, 4),
        },
        {
            metricId: 'impeller-speed',
            label: 'Velocidad de Impulsor',
            unit: 'RPM',
            data: generateTrend(850, 50),
        },
    ],
};
