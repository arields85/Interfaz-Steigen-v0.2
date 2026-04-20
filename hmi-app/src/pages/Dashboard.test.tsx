import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Dashboard from './Dashboard';
import { makeDashboard } from '../test/fixtures/dashboard.fixture';

const { dashboardStorageMock, hierarchyStorageMock, dashboardViewerMock } = vi.hoisted(() => ({
    dashboardStorageMock: {
        getDashboards: vi.fn(),
    },
    hierarchyStorageMock: {
        getNodes: vi.fn(),
    },
    dashboardViewerMock: vi.fn(),
}));

vi.mock('../services/DashboardStorageService', () => ({
    dashboardStorage: dashboardStorageMock,
}));

vi.mock('../services/HierarchyStorageService', () => ({
    hierarchyStorage: hierarchyStorageMock,
}));

vi.mock('../components/viewer/DashboardHeader', () => ({
    default: () => <div data-testid="dashboard-header-title">Header title</div>,
}));

vi.mock('../components/viewer/DashboardViewer', () => ({
    default: (props: Record<string, unknown>) => {
        dashboardViewerMock(props);
        return <div data-testid="dashboard-viewer-root">Viewer canvas</div>;
    },
}));

describe('Dashboard page layout', () => {
    beforeEach(() => {
        const dashboard = makeDashboard({ status: 'published', publishedSnapshot: undefined });
        dashboardStorageMock.getDashboards.mockResolvedValue([dashboard]);
        hierarchyStorageMock.getNodes.mockResolvedValue([]);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('keeps the viewer header title and canvas inside the same padded column for left-edge alignment', async () => {
        const { container } = render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByTestId('dashboard-viewer-root')).toBeInTheDocument();
        });

        const pageColumn = container.firstElementChild as HTMLElement | null;
        const header = screen.getByTestId('dashboard-header-title');
        const viewerRoot = screen.getByTestId('dashboard-viewer-root');
        const canvasShell = viewerRoot.parentElement;

        expect(pageColumn).not.toBeNull();
        expect(pageColumn).toHaveClass('px-2');
        expect(pageColumn).toContainElement(header);
        expect(pageColumn).toContainElement(canvasShell);
        expect(canvasShell).toHaveClass('overflow-hidden');
    });

    it('passes published snapshot cols to the viewer when rendering a published dashboard', async () => {
        dashboardStorageMock.getDashboards.mockResolvedValue([
            makeDashboard({
                status: 'published',
                cols: 20,
                rows: 12,
                publishedSnapshot: {
                    aspect: '16:9',
                    cols: 30,
                    rows: 12,
                    widgets: [],
                    layout: [],
                    publishedAt: '2026-04-20T12:00:00.000Z',
                },
            }),
        ]);

        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByTestId('dashboard-viewer-root')).toBeInTheDocument();
        });

        expect(dashboardViewerMock).toHaveBeenCalledWith(
            expect.objectContaining({
                cols: 30,
                rows: 12,
            }),
        );
    });
});
