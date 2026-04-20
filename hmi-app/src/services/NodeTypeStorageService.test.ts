import { beforeEach, describe, expect, it } from 'vitest';
import { nodeTypeStorage } from './NodeTypeStorageService';
import { NODE_TYPES_STORAGE_KEY } from '../utils/legacyStorageCleanup';
import type { NodeTypeDefinition } from './NodeTypeStorageService';

describe('NodeTypeStorageService', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('reads node types from NODE_TYPES_STORAGE_KEY', async () => {
        const nodeTypes: NodeTypeDefinition[] = [
            { key: 'plant', label: 'Planta', icon: 'factory', color: 'text-accent-cyan' },
        ];

        localStorage.setItem(NODE_TYPES_STORAGE_KEY, JSON.stringify(nodeTypes));

        await expect(nodeTypeStorage.getAll()).resolves.toEqual(nodeTypes);
    });
});
