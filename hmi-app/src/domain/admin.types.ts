// =============================================================================
// DOMAIN: Admin (Modo Administrador)
// Entidades para el builder de jerarquía, dashboards, widgets y bindings.
//
// RESTRICCIÓN (Especificación Funcional Modo Admin):
// El Modo Admin es read-only respecto a planta. Solo modela estructura
// visual, bindings de LECTURA y configuración de dashboards.
// Ninguna entidad aquí puede implicar escritura sobre equipos.
// =============================================================================

// --- JERARQUÍA ---

export type NodeType =
    | 'plant'
    | 'area'
    | 'sector'
    | 'line'
    | 'cell'
    | 'box'
    | 'equipment'
    | 'folder'
    | 'group';

/**
 * Nodo del árbol jerárquico de planta.
 * Puede tener un dashboard asignado y/o un activo asociado.
 */
export interface HierarchyNode {
    id: string;
    name: string;
    type: NodeType;
    parentId: string | null;
    order: number;
    linkedDashboardId?: string;
    linkedAssetId?: string;
}

// --- DASHBOARD ---

export type DashboardType = 'global' | 'area' | 'line' | 'equipment' | 'free' | 'template';
export type DashboardStatus = 'draft' | 'published' | 'archived';

/**
 * Slot de widget asignado al header del dashboard.
 * Referencia un widget del array `widgets` del dashboard.
 * Widgets aquí son EXCLUSIVOS del header y NO se renderizan en el grid.
 *
 * `column` (0-indexed) indica en qué columna del header de 3 columnas debe
 * renderizarse este widget. Si está ausente, el orden del array determina la
 * columna (el primer slot va a col-0, el segundo a col-1, etc.).
 * Cuando se inserta en un slot específico, `column` debe guardarse explícitamente
 * para que la posición visual sea exacta independientemente de cuántos otros
 * slots estén ocupados.
 *
 * `widgetId` debe existir en `Dashboard.widgets`.
 */
export interface DashboardHeaderWidgetSlot {
    widgetId: string;
    /** Columna del header (0, 1 o 2). Índice dentro del grid de 3 columnas. */
    column?: number;
}

/**
 * Configuración explícita del header de un dashboard.
 *
 * - `title`: sobreescribe el nombre del dashboard como título principal.
 *   Si está ausente, se usa `Dashboard.name`.
 * - `subtitle`: texto secundario debajo del título (ej. descripción técnica, turno, área).
 *   Si está ausente, se usa `Dashboard.description`.
 * - `widgetSlots`: widgets del header (estado de equipo, conexión, etc.).
 *   Los widget IDs listados aquí son EXCLUSIVOS del header: no se renderizan en el grid.
 *
 * Convención de extensión: los campos son todos opcionales para compatibilidad
 * con dashboards existentes que no tienen `headerConfig` definido.
 */
export interface DashboardHeaderConfig {
    title?: string;
    subtitle?: string;
    widgetSlots?: DashboardHeaderWidgetSlot[];
}

/**
 * Composición visual completa: un dashboard con su layout y sus widgets.
 */
export interface Dashboard {
    id: string;
    name: string;
    description?: string;
    dashboardType: DashboardType;
    layout: WidgetLayout[];
    widgets: WidgetConfig[];
    lastUpdateAt?: string;
    ownerNodeId?: string;
    templateId?: string;
    isTemplate: boolean;
    version: number;
    status: DashboardStatus;
    /**
     * Configuración explícita del header del dashboard.
     * Opcional: si está ausente, el header usa `name`/`description` y sin widget slots.
     */
    headerConfig?: DashboardHeaderConfig;
}

export interface WidgetLayout {
    widgetId: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

// --- WIDGETS ---

export type WidgetType =
    | 'kpi'
    | 'metric-card'
    | 'status'
    | 'badge'
    | 'sparkline'
    | 'trend-chart'
    | 'table'
    | 'alert-list'
    | 'alert-history'
    | 'text-summary'
    | 'connection-indicator'
    | 'connection-status'
    | 'multi-metric'
    | 'ai-summary'
    | 'section-title';

// --- BINDING ---

export type BindingMode = 'real_variable' | 'simulated_value';

/**
 * Vínculo entre un widget y su fuente de dato.
 * Siempre apunta a una variable LÓGICA del dominio, nunca a un tag crudo industrial.
 */
export interface WidgetBinding {
    mode: BindingMode;
    assetId?: string;
    variableKey?: string;    // clave semántica del dominio (ej: 'rotorSpeed', 'temperature')
    formatter?: string;
    unit?: string;
    lastKnownValueAllowed?: boolean;
    staleTimeout?: number;   // segundos antes de considerar el dato como stale
    simulatedValue?: number | string | boolean;
}

export interface ThresholdRule {
    value: number;
    severity: 'warning' | 'critical';
    label?: string;
}

// =============================================================================
// DISPLAY OPTIONS — Tipado estricto por tipo de widget
//
// Contratos:
//   KpiDisplayOptions        → widget tipo 'kpi'
//   MetricCardDisplayOptions → widget tipo 'metric-card'
//   TrendChartDisplayOptions → widget tipo 'trend-chart'
//   AlertHistoryDisplayOptions → widget tipo 'alert-history'
//   StatusDisplayOptions     → widget tipo 'status'
//   BaseDisplayOptions       → widgets sin opciones específicas activas
//
// Separación conceptual que NO se mezcla nunca:
//   subtitle  → texto debajo del título en el HEADER del widget (KPI y MetricCard lo usan)
//   subtext   → texto aclaratorio en el FOOTER del widget (KPI y MetricCard lo usan)
// =============================================================================

/**
 * Opciones de visualización para widgets de tipo 'kpi'.
 *
 * - `subtitle`: texto en el header (debajo del título). Puede tener color dinámico.
 * - `subtext`:  texto aclaratorio en el footer inferior. Sin color dinámico.
 * - `icon`:     nombre del ícono Lucide a mostrar (e.g. 'Gauge', 'Activity').
 *               `undefined` = pendiente de configuración (placeholder),
 *               `null` = sin ícono explícito.
 * - `kpiMode`:  forma visual del medidor — 'circular' (default) o 'bar'.
 * - `min`:      valor mínimo del rango de la escala.
 * - `max`:      valor máximo del rango de la escala.
 * - `dynamicColor`: si true, el color del widget cambia según el estado de los thresholds.
 */
export interface KpiDisplayOptions {
    subtitle?: string;
    subtext?: string;
    icon?: string | null;
    kpiMode?: 'circular' | 'bar';
    min?: number;
    max?: number;
    dynamicColor?: boolean;
}

/**
 * Opciones de visualización para widgets de tipo 'metric-card'.
 *
 * - `subtitle`: texto secundario en el HEADER del widget (debajo del título), mismo color que el ícono.
 *   Convive con `subtext` — son conceptos ortogonales: subtitle = cabecera, subtext = footer.
 * - `subtext`:  texto aclaratorio en el footer inferior.
 * - `icon`:     nombre del ícono Lucide a mostrar.
 *               `undefined` = pendiente de configuración (placeholder),
 *               `null` = sin ícono explícito.
 */
export interface MetricCardDisplayOptions {
    subtitle?: string;
    subtext?: string;
    icon?: string | null;
}

/**
 * Opciones de visualización para widgets de tipo 'trend-chart'.
 *
 * TrendChart no usa subtitle ni subtext propios: su header muestra la unidad
 * del binding como subtítulo (derivado de `resolved.unit`), no de displayOptions.
 * Se reserva la interfaz para extensión futura (intervalo, tipo de línea, etc.)
 */
export interface TrendChartDisplayOptions {
    // Reservado para configuración futura del gráfico.
    // No se aceptan subtitle ni subtext aquí.
}

/**
 * Opciones de visualización para widgets de tipo 'alert-history'.
 *
 * - `dashboardId`:   ID del dashboard que se monitorea (requerido para evaluar widgets hermanos).
 * - `maxVisible`:    máximo de eventos históricos a mostrar en la lista (default: 5).
 * - `pollInterval`:  intervalo de polling en milisegundos (default: 10000).
 * - `icon`:          nombre del ícono Lucide a mostrar en el header.
 *                    `undefined` = pendiente de configuración (placeholder),
 *                    `null` = sin ícono explícito.
 */
export interface AlertHistoryDisplayOptions {
    dashboardId?: string;
    maxVisible?: number;
    pollInterval?: number;
    icon?: string | null;
}

/**
 * Opciones de visualización para widgets de tipo 'connection-status'.
 *
 * - `connectedText`: copy mostrado cuando el estado resuelto es conectado.
 * - `disconnectedText`: copy mostrado cuando el estado resuelto es desconectado.
 */
export interface ConnectionStatusDisplayOptions {
    connectedText?: string;
    disconnectedText?: string;
}

/**
 * Opciones de visualización para widgets de tipo 'connection-indicator'.
 *
 * Permite personalizar los labels de cada uno de los 5 estados de conexión
 * y controlar si se muestra el tiempo de última actualización.
 *
 * - `onlineText`:    label para estado 'online'    (default: 'Online')
 * - `degradedText`:  label para estado 'degraded'  (default: 'Degradado')
 * - `staleText`:     label para estado 'stale'     (default: 'Dato desactualizado')
 * - `offlineText`:   label para estado 'offline'   (default: 'Sin señal')
 * - `unknownText`:   label para estado 'unknown'   (default: 'Sin datos de conexión')
 * - `showLastUpdate`: si true, muestra el tiempo relativo de última actualización.
 */
export interface ConnectionIndicatorDisplayOptions {
    onlineText?: string;
    degradedText?: string;
    staleText?: string;
    offlineText?: string;
    unknownText?: string;
    showLastUpdate?: boolean;
}

/**
 * Opciones de visualización para widgets de tipo 'status'.
 *
 * Permite personalizar el label visible para cada estado operativo del equipo.
 */
export interface StatusDisplayOptions {
    runningText?: string;
    idleText?: string;
    warningText?: string;
    criticalText?: string;
    offlineText?: string;
    maintenanceText?: string;
    unknownText?: string;
}

/**
 * Opciones de visualización para widgets sin opciones específicas tipadas.
 * Extensible, pero deliberadamente vacío — no es un Record<string, unknown> abierto.
 */
export interface BaseDisplayOptions {
    // Sin opciones activas para este tipo de widget en esta versión.
}

// =============================================================================
// WIDGET CONFIG — Unión discriminada por tipo
//
// Cada variante tiene su propio `displayOptions` tipado.
// El campo discriminante es `type`.
// =============================================================================

/** Campos comunes a todas las variantes de WidgetConfig. */
interface WidgetConfigBase {
    id: string;
    title?: string;
    position: { x: number; y: number };
    size: { w: number; h: number };
    styleVariant?: string;
    binding?: WidgetBinding;
    thresholds?: ThresholdRule[];
    fallbackMode?: 'last-known' | 'empty' | 'error';
    simulatedValue?: number | string | boolean;
}

export interface KpiWidgetConfig extends WidgetConfigBase {
    type: 'kpi';
    displayOptions?: KpiDisplayOptions;
}

export interface MetricCardWidgetConfig extends WidgetConfigBase {
    type: 'metric-card';
    displayOptions?: MetricCardDisplayOptions;
}

export interface TrendChartWidgetConfig extends WidgetConfigBase {
    type: 'trend-chart';
    displayOptions?: TrendChartDisplayOptions;
}

export interface AlertHistoryWidgetConfig extends WidgetConfigBase {
    type: 'alert-history';
    displayOptions?: AlertHistoryDisplayOptions;
}

export interface ConnectionStatusWidgetConfig extends WidgetConfigBase {
    type: 'connection-status';
    displayOptions?: ConnectionStatusDisplayOptions;
}

export interface ConnectionIndicatorWidgetConfig extends WidgetConfigBase {
    type: 'connection-indicator';
    displayOptions?: ConnectionIndicatorDisplayOptions;
}

export interface StatusWidgetConfig extends WidgetConfigBase {
    type: 'status';
    displayOptions?: StatusDisplayOptions;
}

/** Variante genérica para todos los tipos de widget sin displayOptions específicos. */
export interface GenericWidgetConfig extends WidgetConfigBase {
    type: Exclude<WidgetType, 'kpi' | 'metric-card' | 'trend-chart' | 'alert-history' | 'connection-status' | 'connection-indicator' | 'status'>;
    displayOptions?: BaseDisplayOptions;
}

/**
 * Un widget configurado con posición, tamaño, estilo y binding.
 * Unión discriminada: cada variante tiene displayOptions estrictamente tipado.
 */
export type WidgetConfig =
    | KpiWidgetConfig
    | MetricCardWidgetConfig
    | TrendChartWidgetConfig
    | AlertHistoryWidgetConfig
    | ConnectionStatusWidgetConfig
    | ConnectionIndicatorWidgetConfig
    | StatusWidgetConfig
    | GenericWidgetConfig;

// =============================================================================
// TYPE GUARDS — Narrowing helpers para WidgetConfig
// =============================================================================

export function isKpiWidget(w: WidgetConfig): w is KpiWidgetConfig {
    return w.type === 'kpi';
}

export function isMetricCardWidget(w: WidgetConfig): w is MetricCardWidgetConfig {
    return w.type === 'metric-card';
}

export function isTrendChartWidget(w: WidgetConfig): w is TrendChartWidgetConfig {
    return w.type === 'trend-chart';
}

export function isAlertHistoryWidget(w: WidgetConfig): w is AlertHistoryWidgetConfig {
    return w.type === 'alert-history';
}

// --- TEMPLATE ---

export type TemplateType = 'dashboard' | 'widget' | 'equipment-type';
export type TemplateStatus = 'active' | 'archived';

/**
 * Configuración reutilizable para acelerar la creación de dashboards similares.
 * Ejemplo: template "Comprimidora Estándar" con widgets de presión, velocidad y estado.
 */
export interface Template {
    id: string;
    name: string;
    type: TemplateType;
    sourceDashboardId?: string;
    widgetPresets?: Partial<WidgetConfig>[];
    layoutPreset?: WidgetLayout[];
    status: TemplateStatus;
}
