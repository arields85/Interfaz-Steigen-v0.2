// =============================================================================
// trendDataGenerator
// Genera una serie temporal simulada para el TrendChartWidget.
// Función pura sin side-effects.
//
// Se usa como fuente de datos mock cuando no existe historial real,
// tanto en modo simulado como en modo real sin backend de time-series.
// =============================================================================

export interface TrendDataPoint {
    time: string;       // HH:mm
    timestamp: number;  // epoch ms
    value: number;
}

/**
 * Genera una serie temporal sintética alrededor de un valor base.
 * @param baseValue - Valor central de la serie (ej: 1500 RPM)
 * @param variance  - Variación máxima arriba/abajo (por defecto ±10% del base)
 * @param pointCount - Cantidad de puntos (por defecto 20)
 * @param intervalMs - Intervalo entre puntos en ms (por defecto 60_000 = 1 min)
 */
export function generateTrendData(
    baseValue: number,
    variance?: number,
    pointCount: number = 20,
    intervalMs: number = 60_000,
): TrendDataPoint[] {
    const effectiveVariance = variance ?? Math.abs(baseValue) * 0.1;
    const now = Date.now();
    const points: TrendDataPoint[] = [];

    // Generar de más antiguo a más reciente
    for (let i = pointCount - 1; i >= 0; i--) {
        const ts = now - i * intervalMs;
        const date = new Date(ts);
        const noise = (Math.random() - 0.5) * 2 * effectiveVariance;
        // Suavizado: mezclar con el punto anterior para evitar saltos abruptos
        const rawValue = baseValue + noise;

        points.push({
            time: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`,
            timestamp: ts,
            value: Math.round(rawValue * 100) / 100,
        });
    }

    // Suavizado simple: promedio móvil con el vecino anterior
    for (let i = 1; i < points.length; i++) {
        points[i].value = Math.round(((points[i - 1].value + points[i].value) / 2) * 100) / 100;
    }

    return points;
}
