import type { WidgetType } from '../domain/admin.types';

/**
 * Capability flags available for each widget type.
 *
 * To enable catalog/hierarchy support for a new widget type,
 * add its capabilities here without touching UI consumers.
 */
export interface WidgetCapabilities {
    /** Widget can be assigned a catalog variable for semantic identity. */
    catalogVariable: boolean;
    /** Widget can aggregate values from hierarchy children. */
    hierarchy: boolean;
}

const WIDGET_CAPABILITIES: Partial<Record<WidgetType, WidgetCapabilities>> = {
    'metric-card': { catalogVariable: true, hierarchy: true },
    'kpi': { catalogVariable: false, hierarchy: false },
    'trend-chart': { catalogVariable: false, hierarchy: false },
    'connection-status': { catalogVariable: false, hierarchy: false },
    'status': { catalogVariable: false, hierarchy: false },
    'alert-history': { catalogVariable: false, hierarchy: false },
    'prod-history': { catalogVariable: false, hierarchy: false },
};

/** Default capabilities for unknown widget types. */
const DEFAULT_CAPABILITIES: WidgetCapabilities = {
    catalogVariable: false,
    hierarchy: false,
};

/**
 * Returns the capability set for a widget type.
 */
export function getWidgetCapabilities(widgetType: string): WidgetCapabilities {
    return WIDGET_CAPABILITIES[widgetType as WidgetType] ?? DEFAULT_CAPABILITIES;
}

/**
 * Returns true when the widget type supports catalog variable assignment.
 */
export function supportsCatalogVariable(widgetType: string): boolean {
    return getWidgetCapabilities(widgetType).catalogVariable;
}

/**
 * Returns true when the widget type supports hierarchy aggregation.
 */
export function supportsHierarchy(widgetType: string): boolean {
    return getWidgetCapabilities(widgetType).hierarchy;
}
