// =============================================================================
// DOMAIN: Alert History (Histórico de Alertas de Widgets)
//
// Registra los eventos de cambio de estado MetricStatus producidos por widgets
// del mismo dashboard que tienen thresholds evaluables.
//
// Principios:
// - Scope por dashboard: cada registro está asociado a un dashboardId.
// - Solo se registra cuando el estado CAMBIA (no se duplica el mismo estado).
// - Solo se persisten transiciones hacia 'warning' o 'critical'.
//   La vuelta a 'normal' cierra el evento interno pero no genera un entry visible.
// - Persistencia: localStorage vía AlertHistoryStorageService.
//
// Tipos ortogonales relacionados:
//   MetricStatus  → estado semántico del valor métrico evaluado
//   AlertSeverity → severidad de un AlertEvent del sistema de alertas
//
// Arquitectura Técnica v1.3 §4 (domain types) / AGENTS.md §4
// =============================================================================

import type { MetricStatus } from './widget.types';

/**
 * Severidad visible de un evento histórico de widget.
 * Derivada de MetricStatus — solo los estados que requieren atención del operador.
 */
export type HistorySeverity = 'warning' | 'critical';

/**
 * Entrada individual del histórico de alertas de widgets.
 * Representa un cambio de estado detectado en un widget específico.
 */
export interface AlertHistoryEntry {
    /** ID único del evento, generado en el momento de la detección. */
    id: string;

    /** ID del dashboard donde vive el widget fuente. */
    dashboardId: string;

    /** ID del widget que produjo el evento. */
    widgetId: string;

    /** Título del widget fuente (para mostrar en la UI sin necesidad de resolver el config). */
    widgetTitle: string;

    /** Estado nuevo que provocó el registro (la transición fue HACIA este estado). */
    toStatus: HistorySeverity;

    /** Estado anterior del widget antes de la transición. */
    fromStatus: MetricStatus;

    /** Valor numérico del widget en el momento del evento, si está disponible. */
    value?: number | string | null;

    /** Unidad del valor, si aplica. */
    unit?: string;

    /** Timestamp ISO 8601 del momento en que se detectó el cambio de estado. */
    detectedAt: string;
}

/**
 * Snapshot del último estado conocido de un widget dentro de un dashboard.
 * Se usa para detectar transiciones de estado sin duplicar eventos.
 * Persiste en localStorage junto con el histórico.
 */
export interface WidgetStateSnapshot {
    /** ID del widget. */
    widgetId: string;

    /** Último MetricStatus evaluado para este widget. */
    lastStatus: MetricStatus;

    /** Timestamp de la última evaluación. */
    lastCheckedAt: string;
}

/**
 * Estructura completa almacenada en localStorage por dashboardId.
 */
export interface DashboardAlertHistory {
    /** ID del dashboard al que pertenece este histórico. */
    dashboardId: string;

    /** Lista de eventos registrados, ordenados del más reciente al más antiguo. */
    entries: AlertHistoryEntry[];

    /** Snapshots del último estado conocido por widgetId. */
    widgetSnapshots: Record<string, WidgetStateSnapshot>;

    /** Timestamp ISO 8601 de la última vez que se actualizó este registro. */
    lastUpdatedAt: string;
}
