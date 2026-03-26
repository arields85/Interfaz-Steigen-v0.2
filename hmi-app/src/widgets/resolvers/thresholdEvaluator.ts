import type { ThresholdRule } from '../../domain/admin.types';
import type { MetricStatus } from '../../domain/widget.types';

// =============================================================================
// thresholdEvaluator
// Función pura que evalúa un valor numérico contra un conjunto de ThresholdRule[]
// y devuelve un MetricStatus canónico.
//
// Contratos:
// - Sin efectos secundarios.
// - Sin imports de UI, componentes ni estado global.
// - Completamente determinista y testeable.
// - Arquitectura Técnica v1.3 §6 (anti-corruption) — nunca propaga lógica de
//   evaluación hacia componentes de presentación.
// =============================================================================

/**
 * Evalúa un valor contra las reglas de umbral configuradas en un widget.
 *
 * Algoritmo:
 * 1. Si el valor es null/undefined → 'no-data'
 * 2. Si no hay thresholds definidos → 'normal'
 * 3. Ordena las reglas de mayor a menor (evalúa primero las más críticas)
 * 4. El primer umbral superado determina el estado
 * 5. Si ningún umbral se supera → 'normal'
 *
 * @example
 * const rules = [
 *   { value: 90, severity: 'critical' },
 *   { value: 70, severity: 'warning' },
 * ];
 * evaluateThresholds(95, rules) → 'critical'
 * evaluateThresholds(75, rules) → 'warning'
 * evaluateThresholds(50, rules) → 'normal'
 * evaluateThresholds(null, rules) → 'no-data'
 */
export function evaluateThresholds(
    value: number | string | null | undefined,
    thresholds: ThresholdRule[] | undefined,
): MetricStatus {
    if (value === null || value === undefined) {
        return 'no-data';
    }

    if (!thresholds || thresholds.length === 0) {
        return 'normal';
    }

    // Solo se evalúan valores numéricos contra umbrales numéricos.
    // Los valores string (ej. estados textuales) siempre devuelven 'normal'
    // a menos que haya un threshold explícito para ellos (no soportado aún).
    if (typeof value !== 'number') {
        return 'normal';
    }

    // Ordenar de mayor a menor para evaluar el umbral más severo primero.
    const sorted = [...thresholds].sort((a, b) => b.value - a.value);

    for (const rule of sorted) {
        if (value >= rule.value) {
            return rule.severity; // 'critical' | 'warning' — ambos son MetricStatus válidos
        }
    }

    return 'normal';
}

/**
 * Versión mínima del status de MetricCard (sin stale/no-data).
 * Útil para los componentes base que solo aceptan los tres estados visuales
 * básicos. stale y no-data se manejan a nivel del renderer, no del componente.
 */
export function toCardStatus(
    metricStatus: MetricStatus,
): 'normal' | 'warning' | 'critical' {
    switch (metricStatus) {
        case 'critical': return 'critical';
        case 'warning': return 'warning';
        // 'stale', 'no-data' y 'normal' → 'normal'
        // El renderer comunica stale/no-data por otros medios (subtext, isError, value=null)
        default: return 'normal';
    }
}
