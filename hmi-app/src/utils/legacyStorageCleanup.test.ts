import {
    cleanupLegacyStorage,
    DASHBOARDS_STORAGE_KEY,
    HIERARCHY_EXPANDED_STORAGE_KEY,
    HIERARCHY_STORAGE_KEY,
    LEGACY_KEYS_TO_PURGE,
    NODE_TYPES_STORAGE_KEY,
    TEMPLATES_STORAGE_KEY,
    VARIABLE_CATALOG_STORAGE_KEY,
} from './legacyStorageCleanup';

describe('legacyStorageCleanup constants', () => {
    it('exports the canonical laboratorio storage keys', () => {
        expect(DASHBOARDS_STORAGE_KEY).toBe('laboratorio_hmi_dashboards_v1');
        expect(TEMPLATES_STORAGE_KEY).toBe('laboratorio_hmi_templates_v1');
        expect(VARIABLE_CATALOG_STORAGE_KEY).toBe('laboratorio_hmi_variable_catalog_v1');
        expect(HIERARCHY_STORAGE_KEY).toBe('laboratorio_hmi_hierarchy_v1');
        expect(HIERARCHY_EXPANDED_STORAGE_KEY).toBe('laboratorio_hmi_hierarchy_expanded_v1');
        expect(NODE_TYPES_STORAGE_KEY).toBe('laboratorio_hmi_node_types_v1');
    });

    it('includes all old steigen keys in LEGACY_KEYS_TO_PURGE', () => {
        expect(LEGACY_KEYS_TO_PURGE).toEqual([
            'steigen_hmi_dashboards_v1',
            'steigen_hmi_dashboards_v2',
            'steigen_hmi_templates_v1',
            'steigen_hmi_variable_catalog_v1',
            'steigen_hmi_hierarchy_v1',
            'steigen_hmi_hierarchy_expanded_v1',
            'steigen_hmi_node_types_v1',
        ]);
    });
});

describe('cleanupLegacyStorage', () => {
    beforeEach(() => {
        window.localStorage.clear();
        LEGACY_KEYS_TO_PURGE.forEach((key, index) => {
            window.localStorage.setItem(key, `legacy-${index}`);
        });
        window.localStorage.setItem(DASHBOARDS_STORAGE_KEY, 'keep-dashboard');
        window.localStorage.setItem(TEMPLATES_STORAGE_KEY, 'keep-template');
    });

    it('removes every legacy key from localStorage', () => {
        cleanupLegacyStorage();

        LEGACY_KEYS_TO_PURGE.forEach((key) => {
            expect(window.localStorage.getItem(key)).toBeNull();
        });
    });

    it('is idempotent and leaves new keys intact', () => {
        cleanupLegacyStorage();
        cleanupLegacyStorage();

        expect(window.localStorage.getItem(DASHBOARDS_STORAGE_KEY)).toBe('keep-dashboard');
        expect(window.localStorage.getItem(TEMPLATES_STORAGE_KEY)).toBe('keep-template');
    });

    it('is safe when window is unavailable', async () => {
        const originalWindow = globalThis.window;

        // @ts-expect-error intentional SSR simulation for test
        delete globalThis.window;

        const { cleanupLegacyStorage: ssrCleanup } = await import('./legacyStorageCleanup');

        expect(() => ssrCleanup()).not.toThrow();

        globalThis.window = originalWindow;
    });
});
