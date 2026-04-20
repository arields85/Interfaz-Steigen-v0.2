export const DASHBOARDS_STORAGE_KEY = 'laboratorio_hmi_dashboards_v1';
export const TEMPLATES_STORAGE_KEY = 'laboratorio_hmi_templates_v1';
export const VARIABLE_CATALOG_STORAGE_KEY = 'laboratorio_hmi_variable_catalog_v1';
export const HIERARCHY_STORAGE_KEY = 'laboratorio_hmi_hierarchy_v1';
export const HIERARCHY_EXPANDED_STORAGE_KEY = 'laboratorio_hmi_hierarchy_expanded_v1';
export const NODE_TYPES_STORAGE_KEY = 'laboratorio_hmi_node_types_v1';

export const LEGACY_KEYS_TO_PURGE: readonly string[] = [
    'steigen_hmi_dashboards_v1',
    'steigen_hmi_dashboards_v2',
    'steigen_hmi_templates_v1',
    'steigen_hmi_variable_catalog_v1',
    'steigen_hmi_hierarchy_v1',
    'steigen_hmi_hierarchy_expanded_v1',
    'steigen_hmi_node_types_v1',
];

export function cleanupLegacyStorage(): void {
    if (typeof window === 'undefined') {
        return;
    }

    LEGACY_KEYS_TO_PURGE.forEach((key) => {
        window.localStorage.removeItem(key);
    });
}
