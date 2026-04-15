import type { Dashboard, Template, WidgetConfig, WidgetLayout } from '../domain/admin.types';
import { mockDashboards } from '../mocks/admin.mock';

// v2: bumped para re-seed automático al agregar headerConfig en mocks
const STORAGE_KEY = 'steigen_hmi_dashboards_v2';

// =============================================================================
// DashboardStorageService
// Servicio de persistencia para el Modo Administrador. Simula una BD asíncrona
// usando localStorage. Auto-puebla (seed) con datos estáticos si está vacío.
// =============================================================================

class DashboardStorageService {
    
    // Inicializa el Storage copiando los Mocks si es la primera vez.
    // Si ya existen datos, migra dashboards publicados sin snapshot
    // para que el viewer los muestre correctamente.
    private async initStorage(): Promise<void> {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(mockDashboards));
            return;
        }

        // Migración: corregir datos inconsistentes, renombrar tipos legacy y agregar snapshots faltantes
        const dashboards: Dashboard[] = JSON.parse(stored);
        let migrated = false;

        // Rename legacy widget types
        const WIDGET_TYPE_RENAMES: Record<string, string> = {
            'produccion-historica': 'prod-history',
        };

        for (const d of dashboards) {
            // Migrar widget types renombrados
            for (const w of d.widgets) {
                const newType = WIDGET_TYPE_RENAMES[w.type];
                if (newType) {
                    (w as { type: string }).type = newType;
                    migrated = true;
                }
            }
            // También migrar widgets en el publishedSnapshot si existe
            if (d.publishedSnapshot) {
                for (const w of d.publishedSnapshot.widgets) {
                    const newType = WIDGET_TYPE_RENAMES[w.type];
                    if (newType) {
                        (w as { type: string }).type = newType;
                        migrated = true;
                    }
                }
            }
            // Regla: sin nodo asignado no puede estar publicado
            if (d.status === 'published' && !d.ownerNodeId) {
                d.status = 'draft';
                d.publishedSnapshot = undefined;
                migrated = true;
            }
            // Agregar snapshot a dashboards publicados con nodo que no lo tengan
            if (d.status === 'published' && d.ownerNodeId && !d.publishedSnapshot) {
                d.publishedSnapshot = {
                    widgets: JSON.parse(JSON.stringify(d.widgets)),
                    layout: JSON.parse(JSON.stringify(d.layout)),
                    headerConfig: d.headerConfig
                        ? JSON.parse(JSON.stringify(d.headerConfig))
                        : undefined,
                    publishedAt: d.lastUpdateAt ?? new Date().toISOString(),
                };
                migrated = true;
            }
        }
        if (migrated) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboards));
        }
    }

    private async readStorage(): Promise<Dashboard[]> {
        await this.initStorage();
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    }

    async getDashboards(): Promise<Dashboard[]> {
        // Simulamos latencia de red de 300ms
        await new Promise(r => setTimeout(r, 300));
        return this.readStorage();
    }

    async getDashboard(id: string): Promise<Dashboard | null> {
        await new Promise(r => setTimeout(r, 200));
        const dashboards = await this.readStorage();
        return dashboards.find(d => d.id === id) || null;
    }

    async saveDashboard(dashboard: Dashboard): Promise<void> {
        await new Promise(r => setTimeout(r, 400));
        const dashboards = await this.readStorage();
        
        dashboard.lastUpdateAt = new Date().toISOString();
        
        const existingIndex = dashboards.findIndex(d => d.id === dashboard.id);
        if (existingIndex >= 0) {
            dashboards[existingIndex] = dashboard;
        } else {
            dashboards.push(dashboard);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboards));
    }

    async createEmptyDashboard(name: string): Promise<Dashboard> {
        const newDashboard: Dashboard = {
            id: `dash-${Date.now().toString(36)}`,
            name,
            status: 'draft',
            dashboardType: 'global',
            isTemplate: false,
            version: 1,
            layout: [],
            widgets: [],
            lastUpdateAt: new Date().toISOString()
        };
        await this.saveDashboard(newDashboard);
        return newDashboard;
    }

    async deleteDashboard(id: string): Promise<void> {
        const dashboards = await this.readStorage();
        const filtered = dashboards.filter(d => d.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }

    async reorderDashboards(orderedIds: string[]): Promise<Dashboard[]> {
        const dashboards = await this.readStorage();
        const dashboardById = new Map(dashboards.map((dashboard) => [dashboard.id, dashboard]));

        const reordered = orderedIds
            .map((id) => dashboardById.get(id))
            .filter((dashboard): dashboard is Dashboard => Boolean(dashboard));

        const missingDashboards = dashboards.filter((dashboard) => !orderedIds.includes(dashboard.id));
        const nextDashboards = [...reordered, ...missingDashboards];

        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDashboards));
        return nextDashboards;
    }

    /**
     * Duplica un dashboard existente con IDs frescos.
     * Conserva widgets, layout y bindings; resetea status/version.
     */
    async duplicateDashboard(id: string, newName?: string): Promise<Dashboard | null> {
        const original = await this.getDashboard(id);
        if (!original) return null;

        const idSuffix = Date.now().toString(36);
        const idMap = new Map<string, string>();

        // Generar nuevos IDs para widgets
        const newWidgets: WidgetConfig[] = original.widgets.map(w => {
            const newId = `${w.id}-dup-${idSuffix}`;
            idMap.set(w.id, newId);
            return { ...w, id: newId };
        });

        // Reasignar IDs en layout
        const newLayout: WidgetLayout[] = original.layout.map(l => ({
            ...l,
            widgetId: idMap.get(l.widgetId) || l.widgetId,
        }));

        const resolvedName = newName || `${original.name} (Copia)`;

        const duplicate: Dashboard = {
            ...original,
            id: `dash-${idSuffix}`,
            name: resolvedName,
            status: 'draft',
            version: 1,
            isTemplate: false,
            ownerNodeId: undefined,
            widgets: newWidgets,
            layout: newLayout,
            headerConfig: {
                ...original.headerConfig,
                title: resolvedName,
            },
            lastUpdateAt: new Date().toISOString(),
        };

        await this.saveDashboard(duplicate);
        return duplicate;
    }

    /**
     * Crea un dashboard a partir de un template.
     * Genera IDs únicos para cada widget y reasigna layout.
     */
    async createFromTemplate(template: Template, name: string): Promise<Dashboard> {
        const idSuffix = Date.now().toString(36);
        const presets = template.widgetPresets || [];
        const layoutPreset = template.layoutPreset || [];

        // Cast explícito: los presets son Partial<WidgetConfig> y el type+displayOptions
        // se preservan del template. La coherencia entre type y displayOptions es
        // responsabilidad del template original — aquí solo se reconstruye.
        const widgets: WidgetConfig[] = presets.map((preset, idx) => ({
            id: `w-tpl-${idSuffix}-${idx}`,
            type: preset.type || 'kpi',
            title: preset.title,
            position: { x: 0, y: 0 },
            size: preset.size || { w: 1, h: 1 },
            binding: preset.binding,
            thresholds: preset.thresholds,
            styleVariant: preset.styleVariant,
            displayOptions: preset.displayOptions,
        }) as WidgetConfig);

        const layout: WidgetLayout[] = layoutPreset.map((l, idx) => ({
            widgetId: widgets[idx]?.id || `w-tpl-${idSuffix}-${idx}`,
            x: l.x,
            y: l.y,
            w: l.w,
            h: l.h,
        }));

        const dashboard: Dashboard = {
            id: `dash-${idSuffix}`,
            name,
            description: `Creado desde template: ${template.name}`,
            dashboardType: template.dashboardType ?? 'equipment',
            status: 'draft',
            isTemplate: false,
            version: 1,
            templateId: template.id,
            widgets,
            layout,
            lastUpdateAt: new Date().toISOString(),
        };

        await this.saveDashboard(dashboard);
        return dashboard;
    }

    /**
     * Marca un dashboard como 'published' e incrementa su versión.
     * Congela la working copy actual como `publishedSnapshot` para que el viewer
     * siempre lea de ahí. Esto lo hace visible para el Visor público.
     */
    async publishDashboard(id: string): Promise<Dashboard | null> {
        const dashboard = await this.getDashboard(id);
        if (!dashboard) return null;

        dashboard.status = 'published';
        dashboard.version = (dashboard.version || 1) + 1;
        dashboard.publishedSnapshot = {
            widgets: JSON.parse(JSON.stringify(dashboard.widgets)),
            layout: JSON.parse(JSON.stringify(dashboard.layout)),
            headerConfig: dashboard.headerConfig
                ? JSON.parse(JSON.stringify(dashboard.headerConfig))
                : undefined,
            publishedAt: new Date().toISOString(),
        };
        
        await this.saveDashboard(dashboard);
        return dashboard;
    }

    /**
     * Descarta los cambios pendientes de un dashboard publicado,
     * restaurando widgets/layout/headerConfig desde el publishedSnapshot.
     * No-op si el dashboard no tiene snapshot.
     */
    async discardChanges(id: string): Promise<Dashboard | null> {
        const dashboard = await this.getDashboard(id);
        if (!dashboard?.publishedSnapshot) return dashboard ?? null;

        dashboard.widgets = JSON.parse(JSON.stringify(dashboard.publishedSnapshot.widgets));
        dashboard.layout = JSON.parse(JSON.stringify(dashboard.publishedSnapshot.layout));
        dashboard.headerConfig = dashboard.publishedSnapshot.headerConfig
            ? JSON.parse(JSON.stringify(dashboard.publishedSnapshot.headerConfig))
            : undefined;
        dashboard.lastUpdateAt = new Date().toISOString();

        await this.saveDashboard(dashboard);
        return dashboard;
    }
}

export const dashboardStorage = new DashboardStorageService();
