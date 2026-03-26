import type { Template, WidgetConfig, WidgetLayout } from '../domain/admin.types';
import type { Dashboard } from '../domain/admin.types';
import { mockTemplates } from '../mocks/template.mock';

const STORAGE_KEY = 'steigen_hmi_templates_v1';

// =============================================================================
// TemplateStorageService
// Persistencia asíncrona de templates usando localStorage.
// Auto-inicializa con datos mock si el storage está vacío.
//
// Patrón análogo a DashboardStorageService / HierarchyStorageService.
// Especificación Funcional Modo Admin §13
// =============================================================================

class TemplateStorageService {

    private async initStorage(): Promise<void> {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(mockTemplates));
        }
    }

    private async readStorage(): Promise<Template[]> {
        await this.initStorage();
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    }

    /** Retorna todos los templates */
    async getTemplates(): Promise<Template[]> {
        await new Promise(r => setTimeout(r, 200));
        return this.readStorage();
    }

    /** Retorna un template por ID */
    async getTemplate(id: string): Promise<Template | null> {
        const templates = await this.readStorage();
        return templates.find(t => t.id === id) || null;
    }

    /** Guarda o actualiza un template */
    async saveTemplate(template: Template): Promise<void> {
        await new Promise(r => setTimeout(r, 300));
        const templates = await this.readStorage();
        const idx = templates.findIndex(t => t.id === template.id);

        if (idx >= 0) {
            templates[idx] = template;
        } else {
            templates.push(template);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    }

    /** Elimina un template por ID */
    async deleteTemplate(id: string): Promise<void> {
        const templates = await this.readStorage();
        const filtered = templates.filter(t => t.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }

    /**
     * Crea un template a partir de un dashboard existente.
     * Extrae la estructura visual (widgets + layout) como presets genéricos.
     */
    async createFromDashboard(dashboard: Dashboard, templateName: string): Promise<Template> {
        const template: Template = {
            id: `tpl-${Date.now().toString(36)}`,
            name: templateName,
            type: 'dashboard',
            sourceDashboardId: dashboard.id,
            status: 'active',
            widgetPresets: dashboard.widgets.map(w => ({
                type: w.type,
                title: w.title,
                size: { ...w.size },
                binding: w.binding ? { ...w.binding } : undefined,
                thresholds: w.thresholds ? [...w.thresholds] : undefined,
                styleVariant: w.styleVariant,
                displayOptions: w.displayOptions ? { ...w.displayOptions } : undefined,
            } as Partial<WidgetConfig>)),
            layoutPreset: dashboard.layout.map((l, idx) => ({
                widgetId: `preset-${idx}`,
                x: l.x,
                y: l.y,
                w: l.w,
                h: l.h,
            } as WidgetLayout)),
        };

        await this.saveTemplate(template);
        return template;
    }
}

export const templateStorage = new TemplateStorageService();
