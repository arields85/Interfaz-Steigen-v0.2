import { beforeEach, describe, expect, it, vi } from 'vitest';

const UI_STORAGE_KEY = 'interfaz-laboratorio-ui';

async function loadFreshUIStore() {
    vi.resetModules();
    return import('./ui.store');
}

describe('useUIStore persistence', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.resetModules();
    });

    it('defaults grid visibility to true, persists toggleGrid(), and restores it after a fresh module load', async () => {
        const { useUIStore } = await loadFreshUIStore();

        expect(useUIStore.getState().isGridVisible).toBe(true);

        useUIStore.getState().toggleGrid();

        expect(useUIStore.getState().isGridVisible).toBe(false);
        expect(localStorage.getItem(UI_STORAGE_KEY)).toBe(
            JSON.stringify({ state: { isGridVisible: false }, version: 0 }),
        );

        const { useUIStore: reloadedUIStore } = await loadFreshUIStore();
        await reloadedUIStore.persist.rehydrate();

        expect(reloadedUIStore.getState().isGridVisible).toBe(false);
    });

    it('partializes persisted state so only isGridVisible is stored', async () => {
        const { useUIStore } = await loadFreshUIStore();

        useUIStore.getState().toggleGrid();
        useUIStore.getState().toggleSidebar();
        useUIStore.getState().setAdminMode(true);
        useUIStore.getState().setSelectedPlant('plant-01');
        useUIStore.getState().setSelectedArea('area-01');
        useUIStore.getState().setSelectedEquipment('equipment-01');
        useUIStore.getState().setGlobalStatusFilter('alarm');

        expect(localStorage.getItem(UI_STORAGE_KEY)).toBe(
            JSON.stringify({ state: { isGridVisible: false }, version: 0 }),
        );
    });
});
