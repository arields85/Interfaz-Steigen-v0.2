import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { dashboardStorage } from '../../services/DashboardStorageService';
import { mockEquipmentList } from '../../mocks/equipment.mock';
import type { Dashboard, WidgetType, WidgetConfig, WidgetLayout } from '../../domain/admin.types';
import type { EquipmentSummary } from '../../domain/equipment.types';
import BuilderCanvas from '../../components/admin/BuilderCanvas';
import CatalogSidebar from '../../components/admin/CatalogSidebar';
import PropertiesPanel from '../../components/admin/PropertiesPanel';
import { generateWidgetId } from '../../utils/idGenerator';

// =============================================================================
// DashboardBuilderPage
// Editor visual del dashboard. Composición de canvas central con sidebars
// de catálogo de widgets y panel de propiedades.
// =============================================================================

export default function DashboardBuilderPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // 1. Estado original vs Estado draft para saber si hay cambios
    const [originalConfig, setOriginalConfig] = useState<Dashboard | null>(null);
    const [draft, setDraft] = useState<Dashboard | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // 2. Estado de selección
    const [selectedWidgetId, setSelectedWidgetId] = useState<string | undefined>();

    // 4. Mapeo de equipos simulado (para resolver bindings de la F3)
    const equipmentMap = useMemo(() => {
        const list = mockEquipmentList;
        const map = new Map<string, EquipmentSummary>();
        // simplificamos para el ejemplo 
        list.forEach((eq: EquipmentSummary) => map.set(eq.id, { 
            id: eq.id, 
            name: eq.name, 
            status: eq.status, 
            type: eq.type, 
            primaryMetrics: eq.primaryMetrics.filter((m: any) => m.label === 'Velocidad' || m.label === 'Fuerza').map((m: any) => ({
                id: m.label,
                label: m.label,
                value: m.value,
                unit: m.unit,
                status: 'normal',
                timestamp: new Date().toISOString()
            })),
            connectionState: eq.connectionState 
        }));
        return map;
    }, []);

    // 4. Efecto de carga inicial
    useEffect(() => {
        const loadConfig = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const config = await dashboardStorage.getDashboard(id);
                if (config) {
                    setOriginalConfig(config);
                    setDraft(JSON.parse(JSON.stringify(config))); // Deep copy
                }
            } catch (error) {
                console.error("Error cargando dashboard:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadConfig();
    }, [id]);

    if (isLoading) {
        return (
            <div className="h-full bg-[#030712] flex items-center justify-center text-industrial-muted">
                <Loader2 className="animate-spin mr-2" /> Cargando entorno constructor...
            </div>
        );
    }

    if (!draft || !originalConfig) {
        return <div className="p-8 text-white">Dashboard no encontrado.</div>;
    }

    const selectedWidget = draft.widgets.find(w => w.id === selectedWidgetId);
    
    // Checkear si draft difiere de originalConfig de manera utilitaria y burda
    const isDirty = JSON.stringify(draft.widgets) !== JSON.stringify(originalConfig.widgets) || 
                    JSON.stringify(draft.layout) !== JSON.stringify(originalConfig.layout) || 
                    draft.name !== originalConfig.name;

    const handleSaveDraft = async () => {
        if (!draft) return;
        setIsSaving(true);
        try {
            // Forzamos a draft si guarda cambios
            const draftToSave = { ...draft, status: 'draft' as const };
            await dashboardStorage.saveDashboard(draftToSave);
            
            const newConfig = await dashboardStorage.getDashboard(draft.id);
            if (newConfig) {
                setOriginalConfig(newConfig);
                setDraft(JSON.parse(JSON.stringify(newConfig)));
            }
        } catch (error) {
            console.error("Error guardando draft:", error);
            alert("Hubo un error al guardar el borrador.");
        } finally {
            setIsSaving(false);
        }
    };

    const handlePublish = async () => {
        if (!originalConfig) return;
        setIsSaving(true);
        try {
            if (isDirty && draft) {
                // Si hay cambios sin guardar, guardamos primero
                await dashboardStorage.saveDashboard(draft);
            }
            await dashboardStorage.publishDashboard(originalConfig.id);
            
            const newConfig = await dashboardStorage.getDashboard(originalConfig.id);
            if (newConfig) {
                setOriginalConfig(newConfig);
                setDraft(JSON.parse(JSON.stringify(newConfig)));
            }
        } catch (error) {
            console.error("Error publicando:", error);
            alert("Hubo un error al publicar el dashboard.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddWidget = (type: WidgetType) => {
        if (!draft) return;
        
        const newId = generateWidgetId(type);
        const defaultWidth = type === 'trend-chart' ? 2 : 1;
        const newWidget: WidgetConfig = {
            id: newId,
            type,
            title: `Nuevo ${type.replace('-', ' ')}`,
            position: { x: 0, y: 0 },
            size: { w: defaultWidth, h: 1 },
            binding: { mode: 'simulated_value', simulatedValue: type === 'trend-chart' ? 50 : 0 }
        };
        const newLayout: WidgetLayout = {
            widgetId: newId,
            x: 0,
            y: 0,
            w: defaultWidth,
            h: 1
        };

        setDraft(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                widgets: [...prev.widgets, newWidget],
                layout: [...prev.layout, newLayout]
            };
        });
        setSelectedWidgetId(newId);
    };

    const handleUpdateWidget = (updatedWidget: WidgetConfig) => {
        setDraft(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                widgets: prev.widgets.map(w => w.id === updatedWidget.id ? updatedWidget : w)
            };
        });
    };

    const handleUpdateLayout = (updatedLayout: WidgetLayout) => {
        setDraft(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                layout: prev.layout.map(l => l.widgetId === updatedLayout.widgetId ? updatedLayout : l)
            };
        });
    };

    const handleResizeLayout = (widgetId: string, w: number, h: number) => {
        setDraft(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                layout: prev.layout.map(l => l.widgetId === widgetId ? { ...l, w, h } : l)
            };
        });
    };

    const handleReorderLayout = (startIndex: number, endIndex: number) => {
        setDraft(prev => {
            if (!prev) return prev;
            
            const newLayout = Array.from(prev.layout);
            const [movedItem] = newLayout.splice(startIndex, 1);
            newLayout.splice(endIndex, 0, movedItem);

            return {
                ...prev,
                layout: newLayout
            };
        });
    };

    const handleDeleteWidget = () => {
        if (!selectedWidgetId || !draft) return;
        
        setDraft(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                widgets: prev.widgets.filter(w => w.id !== selectedWidgetId),
                layout: prev.layout.filter(l => l.widgetId !== selectedWidgetId)
            };
        });
        setSelectedWidgetId(undefined);
    };

    return (
        <div className="flex flex-col h-full bg-[#030712] text-industrial-text overflow-hidden">
            
            {/* BUILDER HEADER */}
            <header className="h-12 border-b border-white/10 bg-industrial-panel flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/admin/dashboards')}
                        className="text-industrial-muted hover:text-white transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
                    >
                        <ArrowLeft size={14} /> Volver
                    </button>
                    <div className="h-4 w-px bg-white/10" />
                    <h2 className="text-sm font-black tracking-normal text-white">
                        {draft.name}
                    </h2>
                    <span className="px-2 py-0.5 rounded text-[9px] bg-white/5 text-industrial-muted font-bold tracking-widest uppercase">
                        {draft.status}
                    </span>
                    {draft.templateId && (
                        <span className="px-2 py-0.5 rounded text-[9px] bg-violet-500/10 text-violet-400 border border-violet-500/20 font-bold tracking-widest uppercase">
                            Basado en template
                        </span>
                    )}
                </div>
                
                <div className="flex items-center gap-3">
                    {isDirty && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-500/80 mr-2 uppercase tracking-widest bg-amber-500/10 px-2 py-1 rounded">
                            <AlertCircle size={12} /> Cambios sin guardar
                        </div>
                    )}
                    <button 
                        onClick={handleSaveDraft}
                        disabled={!isDirty || isSaving}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-md font-bold text-xs transition-all border ${
                            isDirty 
                                ? 'bg-white/5 text-white hover:bg-white/10 border-white/20' 
                                : 'bg-transparent text-industrial-muted border-white/5 cursor-not-allowed opacity-50'
                        }`}
                    >
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 
                        Guardar Draft
                    </button>
                    <button 
                        onClick={handlePublish}
                        disabled={isSaving || (draft.status === 'published' && !isDirty)}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-md font-bold text-xs transition-all ${
                            draft.status !== 'published' || isDirty
                                ? 'bg-accent-cyan text-black hover:bg-accent-cyan/90 shadow-[0_0_15px_rgba(0,194,255,0.3)]' 
                                : 'bg-accent-cyan/20 text-accent-cyan cursor-not-allowed opacity-50'
                        }`}
                    >
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : null} 
                        Publicar
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                
                {/* WIDGET CATALOGUE (LEFT SIDEBAR) */}
                <CatalogSidebar onAddWidget={handleAddWidget} />

                {/* CANVAS CENTRAL */}
                <main className="flex-1 bg-[url('/grid.svg')] bg-center overflow-hidden">
                    <BuilderCanvas 
                        layout={draft.layout} 
                        widgets={draft.widgets} 
                        equipmentMap={equipmentMap}
                        selectedWidgetId={selectedWidgetId}
                        onWidgetSelect={setSelectedWidgetId}
                        onReorder={handleReorderLayout}
                        onResize={handleResizeLayout}
                    />
                </main>

                {/* PROPERTIES PANEL (RIGHT SIDEBAR) */}
                <PropertiesPanel 
                    selectedWidget={selectedWidget}
                    selectedLayout={draft.layout.find(l => l.widgetId === selectedWidgetId)}
                    onUpdateWidget={handleUpdateWidget}
                    onUpdateLayout={handleUpdateLayout}
                    equipmentMap={equipmentMap}
                    onDelete={handleDeleteWidget}
                />

            </div>
        </div>
    );
}
