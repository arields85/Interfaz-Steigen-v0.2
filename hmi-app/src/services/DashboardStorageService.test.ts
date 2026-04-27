import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dashboardStorage } from './DashboardStorageService';
import { DASHBOARDS_STORAGE_KEY } from '../utils/legacyStorageCleanup';
import { makeDashboard, makeLayout, makeTemplate, makeWidget } from '../test/fixtures/dashboard.fixture';
import { TemplateAspectMismatchError, buildTemplateAspectMismatchMessage } from '../utils/templateAspectMismatch';

describe('DashboardStorageService', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-04-16T15:00:00.000Z'));
        vi.spyOn(Date, 'now').mockReturnValue(1_234_567_890);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('seeds and reads dashboards from DASHBOARDS_STORAGE_KEY', async () => {
        const dashboardsPromise = dashboardStorage.getDashboards();

        await vi.advanceTimersByTimeAsync(300);
        const dashboards = await dashboardsPromise;

        expect(dashboards.length).toBeGreaterThan(0);
        expect(localStorage.getItem(DASHBOARDS_STORAGE_KEY)).not.toBeNull();
    });

    it('seeds header connection widgets using connection-status type', async () => {
        const dashboardsPromise = dashboardStorage.getDashboards();

        await vi.advanceTimersByTimeAsync(300);
        const dashboards = await dashboardsPromise;

        const seededConnectionWidget = dashboards
            .flatMap(dashboard => dashboard.widgets)
            .find(widget => widget.id === 'w-hdr-conn');

        expect(seededConnectionWidget).toEqual(expect.objectContaining({
            id: 'w-hdr-conn',
            type: 'connection-status',
        }));
    });

    it('creates empty dashboards with aspect 16:9, cols 40, and rows 24 by default', async () => {
        const dashboardPromise = dashboardStorage.createEmptyDashboard('Nuevo dashboard');

        await vi.advanceTimersByTimeAsync(400);
        const dashboard = await dashboardPromise;

        expect(dashboard.aspect).toBe('16:9');
        expect(dashboard.cols).toBe(40);
        expect(dashboard.rows).toBe(24);

        const persistedDashboards = JSON.parse(localStorage.getItem(DASHBOARDS_STORAGE_KEY) ?? '[]');
        expect(persistedDashboards).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: dashboard.id,
                    aspect: '16:9',
                    cols: 40,
                    rows: 24,
                }),
            ]),
        );
    });

    it('creates dashboards from templates preserving aspect, cols, and rows', async () => {
        const template = makeTemplate({
            aspect: '21:9',
            cols: 24,
            rows: 18,
            widgetPresets: [makeWidget({ title: 'Template widget' })],
            layoutPreset: [makeLayout({ widgetId: 'preset-0', x: 3, y: 4, w: 5, h: 6 })],
        });

        const dashboardPromise = dashboardStorage.createFromTemplate(template, 'Desde template');

        await vi.advanceTimersByTimeAsync(400);
        const dashboard = await dashboardPromise;

        expect(dashboard.aspect).toBe('21:9');
        expect(dashboard.cols).toBe(24);
        expect(dashboard.rows).toBe(18);
        expect(dashboard.layout).toEqual([
            expect.objectContaining({ x: 3, y: 4, w: 5, h: 6 }),
        ]);
    });

    it('publishes snapshots with aspect, cols, and rows and restores them on discard', async () => {
        const initialDashboard = makeDashboard({
            id: 'dashboard-publish',
            name: 'Publicable',
            aspect: '21:9',
            cols: 24,
            rows: 18,
            ownerNodeId: 'node-1',
            widgets: [makeWidget({ id: 'widget-1', title: 'Original' })],
            layout: [makeLayout({ widgetId: 'widget-1', x: 2, y: 1, w: 4, h: 3 })],
        });

        const savePromise = dashboardStorage.saveDashboard(initialDashboard);
        await vi.advanceTimersByTimeAsync(400);
        await savePromise;

        const publishPromise = dashboardStorage.publishDashboard(initialDashboard.id);
        const publishAdvance = vi.advanceTimersByTimeAsync(600);
        await publishAdvance;
        const published = await publishPromise;

        expect(published?.publishedSnapshot).toEqual(
            expect.objectContaining({
                aspect: '21:9',
                cols: 24,
                rows: 18,
                layout: [expect.objectContaining({ x: 2, y: 1, w: 4, h: 3 })],
            }),
        );

        const pendingDashboard = {
            ...published!,
            aspect: '4:3' as const,
            cols: 16,
            rows: 9,
            widgets: [makeWidget({ id: 'widget-1', title: 'Editado' })],
            layout: [makeLayout({ widgetId: 'widget-1', x: 0, y: 0, w: 2, h: 2 })],
        };

        const updatePromise = dashboardStorage.saveDashboard(pendingDashboard);
        await vi.advanceTimersByTimeAsync(400);
        await updatePromise;

        const discardPromise = dashboardStorage.discardChanges(initialDashboard.id);
        const discardAdvance = vi.advanceTimersByTimeAsync(600);
        await discardAdvance;
        const discarded = await discardPromise;

        expect(discarded?.aspect).toBe('21:9');
        expect(discarded?.cols).toBe(24);
        expect(discarded?.rows).toBe(18);
        expect(discarded?.widgets[0]?.title).toBe('Original');
        expect(discarded?.layout[0]).toEqual(expect.objectContaining({ x: 2, y: 1, w: 4, h: 3 }));
    });

    it('persists published cols in the stored snapshot for the viewer flow', async () => {
        const dashboard = makeDashboard({
            id: 'dashboard-cols-publish',
            name: 'Cols publish',
            status: 'draft',
            cols: 30,
            rows: 12,
            ownerNodeId: 'node-1',
        });

        const savePromise = dashboardStorage.saveDashboard(dashboard);
        await vi.advanceTimersByTimeAsync(400);
        await savePromise;

        const publishPromise = dashboardStorage.publishDashboard(dashboard.id);
        await vi.advanceTimersByTimeAsync(600);
        await publishPromise;

        const loadPromise = dashboardStorage.getDashboard(dashboard.id);
        await vi.advanceTimersByTimeAsync(200);
        const storedPublishedDashboard = await loadPromise;

        expect(storedPublishedDashboard?.publishedSnapshot).toEqual(
            expect.objectContaining({
                cols: 30,
                rows: 12,
            }),
        );
    });

    it('applies matching templates preserving coordinates when rows already fit', () => {
        const dashboard = makeDashboard({
            id: 'dashboard-target',
            aspect: '16:9',
            rows: 12,
            widgets: [makeWidget({ id: 'existing-widget', title: 'Viejo widget' })],
            layout: [makeLayout({ widgetId: 'existing-widget', x: 0, y: 0, w: 2, h: 2 })],
        });
        const template = makeTemplate({
            id: 'template-match',
            aspect: '16:9',
            rows: 12,
            widgetPresets: [makeWidget({ id: 'preset-1', title: 'Nuevo widget' })],
            layoutPreset: [makeLayout({ widgetId: 'preset-1', x: 3, y: 4, w: 5, h: 6 })],
        });

        const applied = dashboardStorage.applyTemplate(dashboard, template);

        expect(applied.layout).toEqual([
            expect.objectContaining({ x: 3, y: 4, w: 5, h: 6 }),
        ]);
        expect(applied.widgets).toHaveLength(1);
        expect(applied.widgets[0]?.title).toBe('Nuevo widget');
        expect(applied.widgets[0]?.id).not.toBe('existing-widget');
    });

    it('applies matching templates clamping coordinates when dashboard rows differ', () => {
        const dashboard = makeDashboard({
            id: 'dashboard-target',
            aspect: '16:9',
            cols: 20,
            rows: 6,
            widgets: [makeWidget({ id: 'existing-widget', title: 'Viejo widget' })],
            layout: [makeLayout({ widgetId: 'existing-widget', x: 0, y: 0, w: 2, h: 2 })],
        });
        const template = makeTemplate({
            id: 'template-match-rows',
            aspect: '16:9',
            rows: 12,
            widgetPresets: [makeWidget({ id: 'preset-1', title: 'Nuevo widget' })],
            layoutPreset: [makeLayout({ widgetId: 'preset-1', x: 18, y: 10, w: 4, h: 3 })],
        });

        const applied = dashboardStorage.applyTemplate(dashboard, template);

        expect(applied.rows).toBe(6);
        expect(applied.layout).toEqual([
            expect.objectContaining({ x: 16, y: 3, w: 4, h: 3 }),
        ]);
    });

    it('throws TemplateAspectMismatchError before copying widgets when template aspect mismatches', () => {
        const dashboard = makeDashboard({
            id: 'dashboard-target',
            aspect: '16:9',
            rows: 12,
            widgets: [makeWidget({ id: 'existing-widget', title: 'Viejo widget' })],
            layout: [makeLayout({ widgetId: 'existing-widget', x: 1, y: 2, w: 3, h: 4 })],
        });
        const template = makeTemplate({
            id: 'template-mismatch',
            aspect: '21:9',
            rows: 12,
            widgetPresets: [makeWidget({ id: 'preset-1', title: 'Nuevo widget' })],
            layoutPreset: [makeLayout({ widgetId: 'preset-1', x: 3, y: 4, w: 5, h: 6 })],
        });

        expect(() => dashboardStorage.applyTemplate(dashboard, template)).toThrowError(
            new TemplateAspectMismatchError({
                templateAspect: '21:9',
                dashboardAspect: '16:9',
                message: buildTemplateAspectMismatchMessage('21:9', '16:9'),
            }),
        );
        expect(dashboard.widgets).toEqual([expect.objectContaining({ id: 'existing-widget', title: 'Viejo widget' })]);
        expect(dashboard.layout).toEqual([expect.objectContaining({ widgetId: 'existing-widget', x: 1, y: 2, w: 3, h: 4 })]);
    });
});
