// =============================================================================
// DOMAIN: Telemetry
// Representación de variables de proceso, muestras puntuales y series temporales.
// =============================================================================

export type DataQuality = 'good' | 'estimated' | 'stale' | 'invalid' | 'unknown';

/**
 * Muestra puntual de una variable de proceso.
 * El campo `quality` permite a la UI comunicar la confiabilidad del dato.
 */
export interface TelemetryPoint {
    metricId: string;
    equipmentId: string;
    label: string;
    value: number | string | boolean | null;
    unit?: string;
    quality?: DataQuality;
    timestamp: string;  // ISO 8601
    status?: 'normal' | 'warning' | 'critical';
}

/**
 * Punto de una serie temporal (para gráficos Recharts).
 */
export interface MetricTrendPoint {
    timestamp: string;  // ISO 8601
    value: number | null;
}

/**
 * Serie completa de una métrica para su representación en TrendChart.
 */
export interface TrendSeries {
    metricId: string;
    label: string;
    unit?: string;
    data: MetricTrendPoint[];
}
