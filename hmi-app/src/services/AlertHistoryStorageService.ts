import type {
    AlertHistoryEntry,
    DashboardAlertHistory,
    HistorySeverity,
    WidgetStateSnapshot,
} from '../domain/alertHistory.types';
import type { MetricStatus } from '../domain/widget.types';

// =============================================================================
// AlertHistoryStorageService
// Servicio de persistencia del histórico de alertas por dashboard.
// Usa localStorage como capa de almacenamiento (igual que DashboardStorageService).
//
// Responsabilidades:
// - Recuperar el histórico de un dashboard.
// - Agregar nuevos eventos cuando hay cambio de estado de un widget.
// - Mantener snapshots del último estado por widget.
// - Limpiar histórico de un dashboard (ej. al eliminar el dashboard).
//
// Restricciones:
// - Solo registra transiciones HACIA 'warning' o 'critical'.
// - No registra retornos a 'normal' como evento visible.
// - Limita el histórico a MAX_ENTRIES por dashboard para no desbordar localStorage.
//
// Arquitectura Técnica v1.3 §15 (services layer)
// =============================================================================

const STORAGE_KEY_PREFIX = 'hmi_alert_history_v1_';
const MAX_ENTRIES = 200;

/**
 * Genera la clave de storage para un dashboardId específico.
 */
function storageKey(dashboardId: string): string {
    return `${STORAGE_KEY_PREFIX}${dashboardId}`;
}

class AlertHistoryStorageService {
    /**
     * Lee el histórico completo de un dashboard desde localStorage.
     * Si no existe, devuelve una estructura vacía.
     */
    getHistory(dashboardId: string): DashboardAlertHistory {
        const raw = localStorage.getItem(storageKey(dashboardId));
        if (!raw) {
            return this.emptyHistory(dashboardId);
        }
        try {
            return JSON.parse(raw) as DashboardAlertHistory;
        } catch {
            // Dato corrupto → historia limpia
            return this.emptyHistory(dashboardId);
        }
    }

    /**
     * Recupera solo los entries del histórico (sin snapshots).
     * Los entries vienen ordenados del más reciente al más antiguo.
     */
    getEntries(dashboardId: string): AlertHistoryEntry[] {
        return this.getHistory(dashboardId).entries;
    }

    /**
     * Recupera el snapshot del último estado conocido de un widget.
     * Devuelve null si no hay snapshot previo.
     */
    getWidgetSnapshot(
        dashboardId: string,
        widgetId: string,
    ): WidgetStateSnapshot | null {
        const history = this.getHistory(dashboardId);
        return history.widgetSnapshots[widgetId] ?? null;
    }

    /**
     * Evalúa si hay un cambio de estado para un widget y, si aplica,
     * registra el evento en el histórico y actualiza el snapshot.
     *
     * Lógica:
     * 1. Obtiene el snapshot anterior del widget.
     * 2. Si el estado nuevo es igual al anterior → no hacer nada.
     * 3. Si el estado nuevo es 'warning' o 'critical' → crear entry + actualizar snapshot.
     * 4. Si el estado nuevo es 'normal', 'stale', etc. → solo actualizar snapshot (sin entry).
     *
     * @param dashboardId  ID del dashboard
     * @param widgetId     ID del widget evaluado
     * @param widgetTitle  Título del widget (para el entry)
     * @param newStatus    MetricStatus actual del widget
     * @param value        Valor numérico/string en el momento de la transición
     * @param unit         Unidad del valor, si aplica
     * @returns El nuevo AlertHistoryEntry si se registró un evento, null si no.
     */
    recordStateChange(
        dashboardId: string,
        widgetId: string,
        widgetTitle: string,
        newStatus: MetricStatus,
        value?: number | string | null,
        unit?: string,
    ): AlertHistoryEntry | null {
        const history = this.getHistory(dashboardId);
        const prevSnapshot = history.widgetSnapshots[widgetId];
        const prevStatus: MetricStatus = prevSnapshot?.lastStatus ?? 'normal';

        // Sin cambio de estado → nada que registrar
        if (prevStatus === newStatus) {
            return null;
        }

        // Actualizar snapshot siempre (incluye retorno a normal/stale/no-data)
        const now = new Date().toISOString();
        const updatedSnapshot: WidgetStateSnapshot = {
            widgetId,
            lastStatus: newStatus,
            lastCheckedAt: now,
        };
        history.widgetSnapshots[widgetId] = updatedSnapshot;

        // Solo crear entry visible para transiciones HACIA warning/critical
        let newEntry: AlertHistoryEntry | null = null;
        if (newStatus === 'warning' || newStatus === 'critical') {
            newEntry = {
                id: `ah-${widgetId}-${Date.now().toString(36)}`,
                dashboardId,
                widgetId,
                widgetTitle,
                toStatus: newStatus as HistorySeverity,
                fromStatus: prevStatus,
                value,
                unit,
                detectedAt: now,
            };

            // Insertar al frente (más reciente primero), con límite
            history.entries = [newEntry, ...history.entries].slice(0, MAX_ENTRIES);
        }

        history.lastUpdatedAt = now;
        this.saveHistory(history);

        return newEntry;
    }

    /**
     * Calcula la severidad activa más alta del dashboard a partir de
     * los snapshots actuales de los widgets (NO del histórico de entries).
     *
     * Regla de prioridad: warning > critical > normal.
     * Si hay al menos un widget con warning activo → retorna 'warning'.
     * Si hay criticals activos pero ningún warning → retorna 'critical'.
     * Si no hay ningún widget en alerta → retorna 'normal'.
     *
     * @param dashboardId  ID del dashboard a consultar.
     * @returns La severidad activa más alta, o 'normal' si no hay alertas.
     */
    getActiveAlertSeverity(dashboardId: string): 'normal' | 'warning' | 'critical' {
        const history = this.getHistory(dashboardId);
        const snapshots = Object.values(history.widgetSnapshots);

        const hasActiveWarning = snapshots.some((s) => s.lastStatus === 'warning');
        if (hasActiveWarning) return 'warning';

        const hasActiveCritical = snapshots.some((s) => s.lastStatus === 'critical');
        if (hasActiveCritical) return 'critical';

        return 'normal';
    }

    /**
     * Limpia completamente el histórico de un dashboard.
     * Útil si el dashboard es eliminado o reseteado por el admin.
     */
    clearHistory(dashboardId: string): void {
        localStorage.removeItem(storageKey(dashboardId));
    }

    /**
     * Limpia únicamente el array de entries visibles del histórico.
     * Los widgetSnapshots se conservan intactos — reflejan el estado presente
     * de los widgets y son necesarios para detectar transiciones futuras.
     * Útil para que el operador limpie la vista sin perder el estado activo.
     */
    clearEntries(dashboardId: string): void {
        const history = this.getHistory(dashboardId);
        history.entries = [];
        history.lastUpdatedAt = new Date().toISOString();
        this.saveHistory(history);
    }

    /**
     * Elimina el snapshot de un widget específico (ej. cuando se elimina el widget).
     * Los entries históricos se conservan por trazabilidad.
     */
    removeWidgetSnapshot(dashboardId: string, widgetId: string): void {
        const history = this.getHistory(dashboardId);
        delete history.widgetSnapshots[widgetId];
        this.saveHistory(history);
    }

    /**
     * Elimina snapshots de widgets que ya no existen en el dashboard.
     * Previene que snapshots huérfanos mantengan el panel en estado de alerta.
     *
     * @param dashboardId      ID del dashboard.
     * @param activeWidgetIds  IDs de los widgets que actualmente existen en el dashboard.
     */
    removeOrphanedSnapshots(dashboardId: string, activeWidgetIds: Set<string>): void {
        const history = this.getHistory(dashboardId);
        const snapshotIds = Object.keys(history.widgetSnapshots);
        let changed = false;

        for (const id of snapshotIds) {
            if (!activeWidgetIds.has(id)) {
                delete history.widgetSnapshots[id];
                changed = true;
            }
        }

        if (changed) {
            this.saveHistory(history);
        }
    }

    // -------------------------------------------------------------------------
    // Helpers privados
    // -------------------------------------------------------------------------

    private saveHistory(history: DashboardAlertHistory): void {
        try {
            localStorage.setItem(storageKey(history.dashboardId), JSON.stringify(history));
        } catch {
            // localStorage puede estar lleno (QuotaExceededError) — fail silencioso
            // En un entorno real se loguearía al sistema de monitoreo.
        }
    }

    private emptyHistory(dashboardId: string): DashboardAlertHistory {
        return {
            dashboardId,
            entries: [],
            widgetSnapshots: {},
            lastUpdatedAt: new Date().toISOString(),
        };
    }
}

export const alertHistoryStorage = new AlertHistoryStorageService();
