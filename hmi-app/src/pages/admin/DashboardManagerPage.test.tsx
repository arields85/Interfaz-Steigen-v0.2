import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardManagerPage from './DashboardManagerPage';
import { makeDashboard, makeTemplate } from '../../test/fixtures/dashboard.fixture';

const {
    mockNavigate,
    dashboardStorageMock,
    templateStorageMock,
    hierarchyStorageMock,
    loadNodeTypeLabelsMock,
    resolveTypeLabelMock,
} = vi.hoisted(() => ({
    mockNavigate: vi.fn(),
    dashboardStorageMock: {
        getDashboards: vi.fn(),
        createEmptyDashboard: vi.fn(),
        deleteDashboard: vi.fn(),
        duplicateDashboard: vi.fn(),
        reorderDashboards: vi.fn(),
    },
    templateStorageMock: {
        getTemplates: vi.fn(),
        createFromDashboard: vi.fn(),
        deleteTemplate: vi.fn(),
        saveTemplate: vi.fn(),
    },
    hierarchyStorageMock: {
        getNodes: vi.fn(),
    },
    loadNodeTypeLabelsMock: vi.fn(),
    resolveTypeLabelMock: vi.fn((type: string) => type),
}));

vi.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
}));

vi.mock('../../services/DashboardStorageService', () => ({
    dashboardStorage: dashboardStorageMock,
}));

vi.mock('../../services/TemplateStorageService', () => ({
    templateStorage: templateStorageMock,
}));

vi.mock('../../services/HierarchyStorageService', () => ({
    hierarchyStorage: hierarchyStorageMock,
}));

vi.mock('../../utils/nodeTypeLabels', () => ({
    loadNodeTypeLabels: loadNodeTypeLabelsMock,
    resolveTypeLabel: resolveTypeLabelMock,
}));

vi.mock('../../components/admin/AdminWorkspaceLayout', () => ({
    default: ({
        contextBar,
        rail,
        sidePanel,
        children,
    }: {
        contextBar: ReactNode;
        rail?: ReactNode;
        sidePanel?: ReactNode;
        children: ReactNode;
    }) => (
        <div>
            <div data-testid="context-bar">{contextBar}</div>
            <div data-testid="workspace-rail">{rail}</div>
            <div data-testid="workspace-side-panel">{sidePanel}</div>
            <div data-testid="workspace-content">{children}</div>
        </div>
    ),
}));

describe('DashboardManagerPage', () => {
    beforeEach(() => {
        mockNavigate.mockReset();
        dashboardStorageMock.getDashboards.mockResolvedValue([
            makeDashboard({
                id: 'dashboard-1',
                name: 'Principal',
                description: 'Resumen general',
                ownerNodeId: 'node-1',
            }),
        ]);
        templateStorageMock.getTemplates.mockResolvedValue([
            makeTemplate({
                id: 'template-1',
                name: 'Plantilla base',
                dashboardType: 'cell',
            }),
        ]);
        hierarchyStorageMock.getNodes.mockResolvedValue([
            { id: 'node-1', name: 'Línea 1', type: 'cell', parentId: null },
        ]);
        loadNodeTypeLabelsMock.mockResolvedValue(undefined);
    });

    it('shows hover tooltips for dashboard rail and icon-only actions', async () => {
        const user = userEvent.setup();

        render(<DashboardManagerPage />);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Nuevo dashboard' })).toBeInTheDocument();
        });

        const tooltipAssertions = [
            'Nuevo dashboard',
            'Eliminar template',
            'Editar en Builder',
            'Duplicar',
            'Guardar como Template',
            'Eliminar',
        ] as const;

        for (const label of tooltipAssertions) {
            const button = screen.getByRole('button', { name: label });

            await user.hover(button);
            expect(await screen.findByRole('tooltip')).toHaveTextContent(label);
            await user.unhover(button);

            await waitFor(() => {
                expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
            });
        }
    });
});
