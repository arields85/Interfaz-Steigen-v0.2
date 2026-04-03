import type { WidgetConfig } from '../../domain/admin.types';
import type { EquipmentSummary } from '../../domain/equipment.types';
import type { AlertHistoryEntry } from '../../domain/alertHistory.types';
import { resolveBinding } from './bindingResolver';
import { alertHistoryStorage } from '../../services/AlertHistoryStorageService';

// =============================================================================
// alertHistoryEvaluator
//
// Evalúa todos los widgets con thresholds de un dashboard y registra
// cambios de estado en el AlertHistoryStorageService.
//
// Responsabilidades:
// - Filtrar widgets evaluables (con thresholds definidos).
// - Resolver cada binding y obtener su MetricStatus actual.
// - Delegar a alertHistoryStorage.recordStateChange() la detección de cambio.
//
// Restricciones:
// - Función pura respecto a la detección: la lógica de "hubo cambio"
//   vive en AlertHistoryStorageService, no aquí.
// - No tiene efectos secundarios de UI ni estado global de React.
// - Diseñado para ser llamado desde un hook con intervalo (polling)
//   o desde el mount/update de un widget de tipo 'alert-history'.
//
// Arquitectura Técnica v1.3 §6 (resolvers layer)
// =============================================================================

export interface EvaluationResult {
    /** Cantidad de widgets evaluados en esta pasada. */
    evaluatedCount: number;

    /** Nuevos eventos registrados en esta pasada. */
    newEntries: AlertHistoryEntry[];
}

/**
 * Evalúa todos los widgets con thresholds de un dashboard y detecta
 * cambios de estado registrables en el histórico.
 *
 * @param dashboardId  ID del dashboard que se está monitoreando.
 * @param widgets      Lista completa de WidgetConfig del dashboard.
 * @param equipmentMap Mapa de equipos del dominio (para resolver bindings reales).
 * @returns Resultado de la evaluación con los nuevos eventos detectados.
 */
export function evaluateDashboardWidgets(
    dashboardId: string,
    widgets: WidgetConfig[],
    equipmentMap: Map<string, EquipmentSummary>,
): EvaluationResult {
    // Solo evaluamos widgets que tengan thresholds definidos y no sean
    // el propio widget de histórico (evitar auto-referencia)
    const evaluableWidgets = widgets.filter(
        (w) =>
            w.type !== 'alert-history' &&
            w.thresholds !== undefined &&
            w.thresholds.length > 0,
    );

    const newEntries: AlertHistoryEntry[] = [];

    for (const widget of evaluableWidgets) {
        const resolved = resolveBinding(widget, equipmentMap);

        // Solo registrar cambios de estado para valores con dato real
        // (ignorar no-data/error durante evaluación de histórico)
        if (resolved.status === 'no-data') {
            continue;
        }

        const entry = alertHistoryStorage.recordStateChange(
            dashboardId,
            widget.id,
            widget.title ?? `Widget ${widget.id}`,
            resolved.status,
            resolved.value,
            resolved.unit,
        );

        if (entry !== null) {
            newEntries.push(entry);
        }
    }

    return {
        evaluatedCount: evaluableWidgets.length,
        newEntries,
    };
}
