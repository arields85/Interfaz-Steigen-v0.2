import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardBuilderPage from './DashboardBuilderPage';
import { makeDashboard, makeLayout, makeWidget } from '../../test/fixtures/dashboard.fixture';
import { useUIStore } from '../../store/ui.store';
import { buildTemplateAspectMismatchMessage } from '../../utils/templateAspectMismatch';

type ResizeObserverCallback = (entries: ResizeObserverEntry[], observer: ResizeObserver) => void;

const resizeCallbacks = new Map<Element, Set<ResizeObserverCallback>>();
const {
    mockNavigate,
    dashboardStorageMock,
    templateStorageMock,
    hierarchyStorageMock,
    variableCatalogStorageMock,
    loadNodeTypeLabelsMock,
    resolveTypeLabelMock,
    migrateLegacyBindingsMock,
} = vi.hoisted(() => ({
    mockNavigate: vi.fn(),
    dashboardStorageMock: {
        getDashboard: vi.fn(),
        getDashboards: vi.fn(),
        saveDashboard: vi.fn(),
        publishDashboard: vi.fn(),
        applyTemplate: vi.fn(),
    },
    templateStorageMock: {
        getTemplates: vi.fn(),
    },
    hierarchyStorageMock: {
        getNodes: vi.fn(),
    },
    variableCatalogStorageMock: {
        getAll: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        getAffectedDashboards: vi.fn(),
    },
    loadNodeTypeLabelsMock: vi.fn(),
    resolveTypeLabelMock: vi.fn((type: string) => type),
    migrateLegacyBindingsMock: vi.fn(),
}));

class MockResizeObserver implements ResizeObserver {
    public readonly boxOptions = '';
    private readonly observedElements = new Set<Element>();

    public constructor(private readonly callback: ResizeObserverCallback) {}

    public observe(target: Element): void {
        this.observedElements.add(target);
        const callbacks = resizeCallbacks.get(target) ?? new Set<ResizeObserverCallback>();
        callbacks.add(this.callback);
        resizeCallbacks.set(target, callbacks);
    }

    public unobserve(target: Element): void {
        this.observedElements.delete(target);
        const callbacks = resizeCallbacks.get(target);
        callbacks?.delete(this.callback);
        if (callbacks?.size === 0) {
            resizeCallbacks.delete(target);
        }
    }

    public disconnect(): void {
        for (const element of this.observedElements) {
            this.unobserve(element);
        }
    }
}

function emitResize(target: Element, width: number, height: number) {
    const callbacks = resizeCallbacks.get(target);

    if (!callbacks || callbacks.size === 0) {
        throw new Error('No ResizeObserver registered for the target element.');
    }

    const entry = {
        target,
        contentRect: { width, height },
    } as ResizeObserverEntry;

    for (const callback of callbacks) {
        callback([entry], {} as ResizeObserver);
    }
}

async function syncViewportResize(target: Element, width: number, height: number) {
    if ((resizeCallbacks.get(target)?.size ?? 0) === 0) {
        return;
    }

    await act(async () => {
        emitResize(target, width, height);
    });
}

async function renderBuilderPage(dashboard = makeDashboard({
    id: 'dashboard-1',
    cols: 20,
    rows: 12,
    widgets: [makeWidget({ id: 'widget-1', title: 'Widget 1' })],
    layout: [makeLayout({ widgetId: 'widget-1', x: 0, y: 0, w: 4, h: 3 })],
})) {
    dashboardStorageMock.getDashboard.mockResolvedValue(dashboard);
    dashboardStorageMock.getDashboards.mockResolvedValue([dashboard]);
    dashboardStorageMock.applyTemplate.mockImplementation((currentDashboard, template) => ({
        ...currentDashboard,
        widgets: template.widgetPresets ?? [],
        layout: template.layoutPreset ?? [],
    }));
    if (!templateStorageMock.getTemplates.getMockImplementation()) {
        templateStorageMock.getTemplates.mockResolvedValue([]);
    }
    hierarchyStorageMock.getNodes.mockResolvedValue([]);
    variableCatalogStorageMock.getAll.mockResolvedValue([]);
    variableCatalogStorageMock.getAffectedDashboards.mockResolvedValue([]);
    loadNodeTypeLabelsMock.mockResolvedValue(undefined);
    migrateLegacyBindingsMock.mockResolvedValue([]);

    const view = render(<DashboardBuilderPage />);

    await waitFor(() => {
        expect(screen.getByRole('button', { name: /grid/i })).toBeInTheDocument();
    });

    const viewport = screen.getByTestId('dashboard-builder-canvas-viewport');
    await syncViewportResize(viewport, 1200, 675);

    return view;
}

function getBuilderCanvasSnapshot() {
    const node = screen.getByTestId('builder-canvas-props');
    return {
        cols: Number(node.getAttribute('data-cols')),
        rows: Number(node.getAttribute('data-rows')),
        widgetIds: JSON.parse(node.getAttribute('data-widget-ids') ?? '[]') as string[],
        layout: JSON.parse(node.getAttribute('data-layout') ?? '[]') as Array<{ widgetId: string; x: number; y: number; w: number; h: number }>,
    };
}

vi.mock('react-router-dom', () => ({
    useParams: () => ({ id: 'dashboard-1' }),
    useNavigate: () => mockNavigate,
    useBlocker: () => ({ state: 'unblocked', reset: vi.fn(), proceed: vi.fn() }),
}));

vi.mock('../../services/DashboardStorageService', () => ({
    dashboardStorage: dashboardStorageMock,
}));

vi.mock('../../services/HierarchyStorageService', () => ({
    hierarchyStorage: hierarchyStorageMock,
}));

vi.mock('../../services/TemplateStorageService', () => ({
    templateStorage: templateStorageMock,
}));

vi.mock('../../services/VariableCatalogStorageService', () => ({
    variableCatalogStorage: variableCatalogStorageMock,
}));

vi.mock('../../utils/nodeTypeLabels', () => ({
    loadNodeTypeLabels: loadNodeTypeLabelsMock,
    resolveTypeLabel: resolveTypeLabelMock,
}));

vi.mock('../../utils/catalogMigration', () => ({
    migrateLegacyBindings: migrateLegacyBindingsMock,
}));

vi.mock('../../components/admin/AdminWorkspaceLayout', () => ({
    default: ({
        contextBarPanel,
        contextBar,
        rail,
        children,
    }: {
        contextBarPanel?: ReactNode;
        contextBar: ReactNode;
        rail?: ReactNode;
        children: ReactNode;
    }) => (
        <div>
            <div data-testid="context-bar-panel">{contextBarPanel}</div>
            <div data-testid="context-bar">{contextBar}</div>
            <div data-testid="workspace-rail">{rail}</div>
            <div data-testid="workspace-content">{children}</div>
        </div>
    ),
}));

vi.mock('../../components/admin/WidgetCatalogRail', () => ({
    default: ({ onAddWidget }: { onAddWidget: (type: 'kpi' | 'metric-card') => void }) => (
        <div data-testid="widget-catalog-rail">
            <button type="button" onClick={() => onAddWidget('kpi')}>
                Agregar KPI
            </button>
            <button type="button" onClick={() => onAddWidget('metric-card')}>
                Agregar Métrica
            </button>
        </div>
    ),
}));

vi.mock('../../components/admin/PropertyDock', () => ({
    default: () => <div data-testid="property-dock" />,
}));

vi.mock('../../components/viewer/DashboardHeader', () => ({
    default: ({
        dashboard,
        onAddHeaderWidget,
    }: {
        dashboard: { headerConfig?: { widgetSlots?: Array<{ widgetId: string; column?: number }> } };
        onAddHeaderWidget?: (type: 'status', slotIndex: number) => void;
    }) => (
        <div data-testid="dashboard-header" data-header-slot-count={dashboard.headerConfig?.widgetSlots?.length ?? 0}>
            <button type="button" onClick={() => onAddHeaderWidget?.('status', 0)}>
                Agregar widget header
            </button>
        </div>
    ),
}));

vi.mock('../../components/admin/BuilderCanvas', () => ({
    default: ({
        cols,
        rows,
        layout,
        widgets,
    }: {
        cols: number;
        rows: number;
        layout: Array<{ widgetId: string; x: number; y: number; w: number; h: number }>;
        widgets: Array<{ id: string; type: string }>;
    }) => (
        <div
            data-testid="builder-canvas-props"
            data-cols={cols}
            data-rows={rows}
            data-layout={JSON.stringify(layout)}
            data-widget-ids={JSON.stringify(widgets.map((widget) => widget.id))}
        />
    ),
}));

describe('DashboardBuilderPage', () => {
    beforeEach(() => {
        resizeCallbacks.clear();
        mockNavigate.mockReset();
        localStorage.clear();
        useUIStore.setState(useUIStore.getInitialState());
        templateStorageMock.getTemplates.mockReset();
        vi.stubGlobal('ResizeObserver', MockResizeObserver);
        vi.stubGlobal('requestAnimationFrame', ((callback: FrameRequestCallback) => {
            callback(0);
            return 1;
        }) as typeof requestAnimationFrame);
        vi.stubGlobal('cancelAnimationFrame', vi.fn());
    });

    afterEach(() => {
        resizeCallbacks.clear();
        useUIStore.setState(useUIStore.getInitialState());
        vi.clearAllMocks();
        vi.unstubAllGlobals();
    });

    it('toggles the persisted grid preference and opens/closes the settings panel from the context bar', async () => {
        const user = userEvent.setup();
        const firstRender = await renderBuilderPage();
        const viewport = screen.getByTestId('dashboard-builder-canvas-viewport');

        expect(viewport.parentElement).toHaveClass('flex', 'h-full', 'min-h-0', 'flex-col');

        const gridButton = screen.getByRole('button', { name: 'Ocultar grid' });
        expect(gridButton).toHaveAttribute('aria-pressed', 'true');

        await user.click(gridButton);

        expect(useUIStore.getState().isGridVisible).toBe(false);
        expect(screen.getByRole('button', { name: 'Mostrar grid' })).toHaveAttribute('aria-pressed', 'false');
        expect(localStorage.getItem('interfaz-laboratorio-ui')).toBe(
            JSON.stringify({ state: { isGridVisible: false }, version: 0 }),
        );

        const settingsButton = screen.getByRole('button', { name: 'Configurar dashboard' });
        await user.click(settingsButton);
        expect(screen.getByText('Configuración del dashboard')).toBeInTheDocument();

        await user.click(settingsButton);
        expect(screen.queryByText('Configuración del dashboard')).not.toBeInTheDocument();

        firstRender.unmount();
        useUIStore.setState(useUIStore.getInitialState());
        localStorage.setItem(
            'interfaz-laboratorio-ui',
            JSON.stringify({ state: { isGridVisible: false }, version: 0 }),
        );
        await act(async () => {
            await useUIStore.persist.rehydrate();
        });

        await renderBuilderPage();

        expect(screen.getByRole('button', { name: 'Mostrar grid' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('keeps the builder surface stretchable so sidebar and header widget additions can become visible', async () => {
        const user = userEvent.setup();
        await renderBuilderPage(makeDashboard({
            id: 'dashboard-1',
            cols: 20,
            rows: 12,
            widgets: [],
            layout: [],
            headerConfig: { title: 'Demo', widgetSlots: [] },
        }));

        const viewport = screen.getByTestId('dashboard-builder-canvas-viewport');
        expect(viewport.parentElement).toHaveClass('flex', 'h-full', 'min-h-0', 'flex-col');

        await user.click(screen.getByRole('button', { name: 'Agregar KPI' }));

        await waitFor(() => {
            const snapshot = getBuilderCanvasSnapshot();
            expect(snapshot.layout).toHaveLength(1);
            expect(snapshot.widgetIds).toHaveLength(1);
            expect(snapshot.layout[0]).toMatchObject({ x: 0, y: 0, w: 1, h: 2 });
        });

        await user.click(screen.getByRole('button', { name: 'Agregar widget header' }));

        await waitFor(() => {
            expect(screen.getByTestId('dashboard-header')).toHaveAttribute('data-header-slot-count', '1');
        });
    });

    it('anchors the header title preview and builder canvas inside the same content column', async () => {
        await renderBuilderPage(makeDashboard({
            id: 'dashboard-1',
            cols: 20,
            rows: 12,
            widgets: [makeWidget({ id: 'widget-1', title: 'Widget 1' })],
            layout: [makeLayout({ widgetId: 'widget-1', x: 0, y: 0, w: 4, h: 3 })],
            headerConfig: { title: 'Planta Demo', widgetSlots: [] },
        }));

        const contentColumn = screen.getByTestId('dashboard-builder-content-column');
        const header = screen.getByTestId('dashboard-header');
        const viewport = screen.getByTestId('dashboard-builder-canvas-viewport');

        expect(contentColumn).toContainElement(header);
        expect(contentColumn).toContainElement(viewport);
        expect(header.closest('[data-testid="dashboard-builder-content-column"]')).toBe(contentColumn);
        expect(viewport.parentElement).toBe(contentColumn);
        expect(contentColumn).toHaveClass('px-8');
    });

    it('uses a horizontal-scroll builder viewport shell so measured-canvas overflow stays reachable', async () => {
        await renderBuilderPage();

        const viewport = screen.getByTestId('dashboard-builder-canvas-viewport');

        expect(viewport).toHaveClass('overflow-x-auto');
        expect(viewport).toHaveClass('overflow-y-auto');
        expect(viewport).toHaveClass('hmi-scrollbar');
        expect(viewport).toHaveClass('pt-10');
        expect(viewport).toHaveClass('pl-3');
        expect(viewport).toHaveClass('pr-3');
        expect(viewport).toHaveClass('pb-3');
    });

    it('applies cols changes immediately when no widget needs clamping', async () => {
        const user = userEvent.setup();
        await renderBuilderPage();

        await user.click(screen.getByRole('button', { name: 'Configurar dashboard' }));
        const colsInput = screen.getByRole('textbox', { name: 'COLUMNAS' });
        await user.clear(colsInput);
        await user.type(colsInput, '24{enter}');

        await waitFor(() => {
            expect(getBuilderCanvasSnapshot().cols).toBe(24);
        });

        expect(screen.queryByRole('dialog', { name: 'Confirmar ajuste de widgets' })).not.toBeInTheDocument();
    });

    it('asks for confirmation before clamping widgets and only commits after continuing', async () => {
        const user = userEvent.setup();
        await renderBuilderPage(
            makeDashboard({
                id: 'dashboard-1',
                cols: 20,
                rows: 12,
                widgets: [makeWidget({ id: 'widget-1', title: 'Widget 1' })],
                layout: [makeLayout({ widgetId: 'widget-1', x: 0, y: 10, w: 4, h: 3 })],
            }),
        );

        await user.click(screen.getByRole('button', { name: 'Configurar dashboard' }));

        const rowsInput = screen.getByRole('textbox', { name: 'Filas' });
        await user.clear(rowsInput);
        await user.type(rowsInput, '6{enter}');

        expect(screen.getByRole('dialog', { name: 'Confirmar ajuste de widgets' })).toBeInTheDocument();
        expect(screen.getByText('Este cambio ajustará la posición/tamaño de 1 widget al nuevo área. ¿Continuar?')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Cancelar' }));

        await waitFor(() => {
            expect(getBuilderCanvasSnapshot().rows).toBe(12);
        });
        expect(screen.queryByRole('dialog', { name: 'Confirmar ajuste de widgets' })).not.toBeInTheDocument();

        await user.clear(rowsInput);
        await user.type(rowsInput, '6{enter}');
        await user.click(screen.getByRole('button', { name: 'Continuar' }));

        await waitFor(() => {
            const snapshot = getBuilderCanvasSnapshot();
            expect(snapshot.rows).toBe(6);
            expect(snapshot.layout).toEqual([
                { widgetId: 'widget-1', x: 0, y: 3, w: 4, h: 3 },
            ]);
        });
    });

    it('disables mismatched templates with a tooltip and does nothing on click', async () => {
        const user = userEvent.setup();
        const dashboard = makeDashboard({
            id: 'dashboard-1',
            cols: 20,
            rows: 12,
        });
        const mismatchMessage = buildTemplateAspectMismatchMessage('21:9', '16:9');

        templateStorageMock.getTemplates.mockResolvedValue([
            {
                id: 'template-match',
                name: 'Template compatible',
                type: 'dashboard',
                aspect: '16:9',
                rows: 12,
                status: 'active',
                widgetPresets: [],
                layoutPreset: [],
            },
            {
                id: 'template-mismatch',
                name: 'Template 21:9',
                type: 'dashboard',
                aspect: '21:9',
                rows: 12,
                status: 'active',
                widgetPresets: [],
                layoutPreset: [],
            },
        ]);

        await renderBuilderPage(dashboard);

        await user.click(screen.getByRole('button', { name: 'Aplicar template' }));

        const mismatchButton = await screen.findByRole('button', { name: 'Aplicar template Template 21:9' });
        expect(mismatchButton).toBeDisabled();
        expect(mismatchButton).toHaveAttribute('title', mismatchMessage);

        await user.click(mismatchButton);

        expect(dashboardStorageMock.applyTemplate).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Aplicar template Template compatible' })).not.toBeDisabled();
    });
});
