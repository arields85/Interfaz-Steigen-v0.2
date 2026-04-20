import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { templateStorage } from './TemplateStorageService';
import { TEMPLATES_STORAGE_KEY } from '../utils/legacyStorageCleanup';
import { makeDashboard, makeLayout, makeWidget } from '../test/fixtures/dashboard.fixture';
import type { Template } from '../domain/admin.types';

describe('TemplateStorageService', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-04-16T15:30:00.000Z'));
        vi.spyOn(Date, 'now').mockReturnValue(2_345_678_901);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('seeds and reads templates from TEMPLATES_STORAGE_KEY', async () => {
        const templatesPromise = templateStorage.getTemplates();

        await vi.advanceTimersByTimeAsync(200);
        const templates = await templatesPromise;

        expect(templates.length).toBeGreaterThan(0);
        expect(localStorage.getItem(TEMPLATES_STORAGE_KEY)).not.toBeNull();
    });

    it('creates templates from dashboards preserving layoutPreset, aspect, cols, and rows', async () => {
        const dashboard = makeDashboard({
            id: 'dashboard-for-template',
            name: 'Origen',
            dashboardType: 'equipment',
            aspect: '4:3',
            cols: 18,
            rows: 10,
            widgets: [makeWidget({ id: 'widget-1', title: 'Velocidad' })],
            layout: [makeLayout({ widgetId: 'widget-1', x: 5, y: 6, w: 7, h: 8 })],
        });

        const templatePromise = templateStorage.createFromDashboard(dashboard, 'Template 4:3');

        await vi.advanceTimersByTimeAsync(500);
        const template = await templatePromise;

        expect(template.aspect).toBe('4:3');
        expect(template.cols).toBe(18);
        expect(template.rows).toBe(10);
        expect(template.layoutPreset).toEqual([
            expect.objectContaining({ widgetId: 'preset-0', x: 5, y: 6, w: 7, h: 8 }),
        ]);

        const persistedTemplates = JSON.parse(localStorage.getItem(TEMPLATES_STORAGE_KEY) ?? '[]');
        expect(persistedTemplates).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: template.id,
                    aspect: '4:3',
                    cols: 18,
                    rows: 10,
                    layoutPreset: [expect.objectContaining({ x: 5, y: 6, w: 7, h: 8 })],
                }),
            ]),
        );
    });

    it('returns aspect, cols, and rows from stored templates on read paths', async () => {
        const storedTemplate: Template = {
            id: 'stored-template',
            name: 'Stored template',
            type: 'dashboard',
            dashboardType: 'free',
            aspect: '21:9',
            cols: 28,
            rows: 16,
            status: 'active',
            widgetPresets: [makeWidget({ title: 'Stored widget' })],
            layoutPreset: [makeLayout({ widgetId: 'preset-0', x: 1, y: 2, w: 3, h: 4 })],
        };

        localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify([storedTemplate]));

        const template = await templateStorage.getTemplate('stored-template');

        expect(template).toEqual(expect.objectContaining({ aspect: '21:9', cols: 28, rows: 16 }));
        expect(template?.layoutPreset).toEqual([
            expect.objectContaining({ x: 1, y: 2, w: 3, h: 4 }),
        ]);
    });
});
