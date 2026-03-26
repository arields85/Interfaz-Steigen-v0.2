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
    | 'gauge'
    | 'sparkline'
    | 'trend-chart'
    | 'table'
    | 'alert-list'
    | 'text-summary'
    | 'connection-indicator'
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

/**
 * Un widget configurado con posición, tamaño, estilo y binding.
 */
export interface WidgetConfig {
    id: string;
    type: WidgetType;
    title?: string;
    position: { x: number; y: number };
    size: { w: number; h: number };
    styleVariant?: string;
    displayOptions?: Record<string, unknown>;
    binding?: WidgetBinding;
    thresholds?: ThresholdRule[];
    fallbackMode?: 'last-known' | 'empty' | 'error';
    simulatedValue?: number | string | boolean;
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
