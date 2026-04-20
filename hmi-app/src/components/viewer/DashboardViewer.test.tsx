import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardViewer from './DashboardViewer';
import { makeDashboard, makeLayout, makeWidget } from '../../test/fixtures/dashboard.fixture';

type ResizeObserverCallback = (entries: ResizeObserverEntry[], observer: ResizeObserver) => void;

const resizeCallbacks = new Map<Element, Set<ResizeObserverCallback>>();

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

vi.mock('../../widgets', () => ({
    WidgetRenderer: ({ widget }: { widget: { id: string; title?: string } }) => (
        <div data-testid={`widget-renderer-${widget.id}`}>{widget.title ?? widget.id}</div>
    ),
}));

describe('DashboardViewer', () => {
    beforeEach(() => {
        resizeCallbacks.clear();
        vi.stubGlobal('ResizeObserver', MockResizeObserver);
        vi.stubGlobal('requestAnimationFrame', ((callback: FrameRequestCallback) => {
            callback(0);
            return 1;
        }) as typeof requestAnimationFrame);
        vi.stubGlobal('cancelAnimationFrame', vi.fn());
    });

    afterEach(() => {
        resizeCallbacks.clear();
        vi.unstubAllGlobals();
    });

    it('renders widgets by persisted x/y coordinates instead of layout array order', async () => {
        const dashboard = makeDashboard({
            aspect: '16:9',
            cols: 20,
            rows: 12,
            widgets: [
                makeWidget({ id: 'widget-near-origin', title: 'Origin' }),
                makeWidget({ id: 'widget-lower-right', title: 'Lower Right' }),
            ],
            layout: [
                makeLayout({ widgetId: 'widget-lower-right', x: 10, y: 4, w: 3, h: 2 }),
                makeLayout({ widgetId: 'widget-near-origin', x: 0, y: 0, w: 4, h: 3 }),
            ],
        });

        const { container } = render(
            <div style={{ width: '1200px', height: '675px' }}>
                <DashboardViewer
                    widgets={dashboard.widgets}
                    layout={dashboard.layout}
                    equipmentMap={new Map()}
                    cols={dashboard.cols}
                    rows={dashboard.rows}
                />
            </div>,
        );

        const observedContainer = container.querySelector('[data-testid="dashboard-viewer-root"]');
        if (!observedContainer) {
            throw new Error('Dashboard viewer root was not rendered.');
        }

        emitResize(observedContainer, 1200, 675);

        await waitFor(() => {
            expect(screen.getByTestId('dashboard-viewer-item-widget-near-origin').style.gridColumnStart).toBe('1');
            expect(screen.getByTestId('dashboard-viewer-item-widget-near-origin').style.gridRowStart).toBe('1');
            expect(screen.getByTestId('dashboard-viewer-item-widget-near-origin').style.gridColumnEnd).toBe('span 4');
            expect(screen.getByTestId('dashboard-viewer-item-widget-near-origin').style.gridRowEnd).toBe('span 3');

            expect(screen.getByTestId('dashboard-viewer-item-widget-lower-right').style.gridColumnStart).toBe('11');
            expect(screen.getByTestId('dashboard-viewer-item-widget-lower-right').style.gridRowStart).toBe('5');
            expect(screen.getByTestId('dashboard-viewer-item-widget-lower-right').style.gridColumnEnd).toBe('span 3');
            expect(screen.getByTestId('dashboard-viewer-item-widget-lower-right').style.gridRowEnd).toBe('span 2');
        });
    });

    it('fills the measured container and keeps the centering flex shell ready for future letterboxing', async () => {
        const dashboard = makeDashboard({
            cols: 24,
            rows: 12,
            widgets: [makeWidget({ id: 'widget-1', title: 'Origin' })],
            layout: [makeLayout({ widgetId: 'widget-1', x: 0, y: 0, w: 4, h: 3 })],
        });

        const { container } = render(
            <div style={{ width: '1200px', height: '800px' }}>
                <DashboardViewer
                    widgets={dashboard.widgets}
                    layout={dashboard.layout}
                    equipmentMap={new Map()}
                    cols={dashboard.cols}
                    rows={dashboard.rows}
                />
            </div>,
        );

        const observedContainer = container.querySelector('[data-testid="dashboard-viewer-root"]');
        if (!observedContainer) {
            throw new Error('Dashboard viewer root was not rendered.');
        }

        emitResize(observedContainer, 1200, 800);

        await waitFor(() => {
            const canvasFrame = observedContainer.firstElementChild as HTMLElement | null;

            expect(observedContainer.className).toContain('items-center');
            expect(observedContainer.className).toContain('justify-center');
            expect(Number.parseFloat(canvasFrame?.style.width ?? '0')).toBe(1200);
            expect(Number.parseFloat(canvasFrame?.style.height ?? '0')).toBe(800);
            expect(canvasFrame?.style.gridTemplateRows).toBe('repeat(12, 66.66666666666667px)');
        });
    });
});
