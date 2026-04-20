import { beforeEach, describe, expect, it } from 'vitest';
import { hierarchyStorage } from './HierarchyStorageService';
import { HIERARCHY_STORAGE_KEY } from '../utils/legacyStorageCleanup';
import type { HierarchyNode } from '../domain/admin.types';

describe('HierarchyStorageService', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('reads hierarchy nodes from HIERARCHY_STORAGE_KEY', async () => {
        const nodes: HierarchyNode[] = [
            {
                id: 'node-1',
                name: 'Planta Demo',
                type: 'plant',
                parentId: null,
                order: 0,
            },
        ];

        localStorage.setItem(HIERARCHY_STORAGE_KEY, JSON.stringify(nodes));

        await expect(hierarchyStorage.getNodes()).resolves.toEqual(nodes);
    });
});
