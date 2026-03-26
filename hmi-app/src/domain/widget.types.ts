import type { ConnectionState } from './equipment.types';

// =============================================================================
// DOMAIN: Widget Types
// Tipos formales para la capa de resolución de widgets.
// Define MetricStatus como tipo canónico del dominio — unifica los estados
// semánticos de valores métricos individuales con el system de diseño.
//
// Relación con otros tipos:
//   EquipmentStatus  → estado del equipo como activo (running, offline, etc.)
//   ConnectionState  → estado de la fuente de dato (online, degraded, stale, etc.)
//   MetricStatus     → estado del valor observado individual
//
// Los tres son ORTOGONALES: pueden coexistir y se representan simultáneamente.
// Arquitectura Técnica v1.3 §13 — UI Style Guide §11
// =============================================================================

/**
 * Estado semántico de un valor métrico individual.
 * Resultado de evaluar un valor contra ThresholdRule[].
 * Este tipo es el contrato entre el thresholdEvaluator y los renderers.
 */
export type MetricStatus =
    | 'normal'    // valor dentro de rangos esperados
    | 'warning'   // valor cerca de umbral de alerta
    | 'critical'  // valor fuera de umbral crítico
    | 'stale'     // valor presente pero potencialmente desactualizado (superó staleTimeout)
    | 'no-data';  // value === null | undefined — bindig sin dato disponible

/**
 * Resultado de la resolución de un WidgetBinding.
 * Es la representación normalizada del dato listo para ser consumido
 * por cualquier renderer sin que este conozca el origen del dato.
 */
export interface ResolvedBinding {
    /** Valor resuelto. null implica no-data. */
    value: number | string | null;
    /** Unidad del valor, si aplica. */
    unit?: string;
    /** Estado semántico derivado del valor + thresholds. */
    status: MetricStatus;
    /** ISO 8601 del último update válido recibido. */
    lastUpdateAt?: string;
    /**
     * Estado de conectividad de la fuente.
     * Independiente del status del valor — ambos se presentan simultáneamente.
     */
    connectionState?: ConnectionState;
    /**
     * Trazabilidad del origen del dato resuelto.
     * - 'real'      → proviene del equipo vía adapter/query
     * - 'simulated' → proviene de simulatedValue en WidgetConfig
     * - 'fallback'  → último valor conocido, fuente degraded/stale
     * - 'error'     → no se pudo resolver dato
     */
    source: 'real' | 'simulated' | 'fallback' | 'error';
}
