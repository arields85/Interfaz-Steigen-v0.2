import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { HIERARCHY_EXPANDED_STORAGE_KEY } from '../../utils/legacyStorageCleanup';

const mockedData = vi.hoisted(() => ({
    nodes: [
        { id: 'node-plant-01', name: 'Planta Demo', type: 'plant', parentId: null, order: 0 },
        { id: 'node-area-comp', name: 'Área Compresión', type: 'area', parentId: 'node-plant-01', order: 0 },
    ],
    dashboards: [],
    nodeTypes: [
        { key: 'plant', label: 'Planta', icon: 'factory', color: 'text-accent-cyan' },
        { key: 'area', label: 'Área', icon: 'layers', color: 'text-accent-blue' },
    ],
}));

vi.mock('../../services/HierarchyStorageService', () => ({
    hierarchyStorage: {
        getNodes: vi.fn().mockResolvedValue(mockedData.nodes),
    },
}));

vi.mock('../../services/DashboardStorageService', () => ({
    dashboardStorage: {
        getDashboards: vi.fn().mockResolvedValue(mockedData.dashboards),
    },
}));

vi.mock('../../services/NodeTypeStorageService', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../services/NodeTypeStorageService')>();

    return {
        ...actual,
        nodeTypeStorage: {
            getAll: vi.fn().mockResolvedValue(mockedData.nodeTypes),
        },
    };
});

import HierarchyPage from './HierarchyPage';

describe('HierarchyPage', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('reads and writes expanded state using HIERARCHY_EXPANDED_STORAGE_KEY', async () => {
        localStorage.setItem(HIERARCHY_EXPANDED_STORAGE_KEY, JSON.stringify(['node-plant-01']));

        const user = userEvent.setup();
        const { container } = render(
            <MemoryRouter>
                <HierarchyPage />
            </MemoryRouter>,
        );

        expect(await screen.findByText('Área Compresión')).toBeInTheDocument();

        const rootExpander = container.querySelector('span.cursor-pointer');

        expect(rootExpander).not.toBeNull();

        await user.click(rootExpander as HTMLSpanElement);

        await waitFor(() => {
            expect(localStorage.getItem(HIERARCHY_EXPANDED_STORAGE_KEY)).toBe(JSON.stringify([]));
        });
    });
});
