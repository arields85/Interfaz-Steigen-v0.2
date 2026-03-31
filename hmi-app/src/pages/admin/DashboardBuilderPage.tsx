import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Loader2, AlertCircle, Edit2, Check, ChevronDown } from 'lucide-react';
import { dashboardStorage } from '../../services/DashboardStorageService';
import { mockEquipmentList } from '../../mocks/equipment.mock';
import type { Dashboard, WidgetType, WidgetConfig, WidgetLayout } from '../../domain/admin.types';
import type { EquipmentSummary } from '../../domain/equipment.types';
import BuilderCanvas from '../../components/admin/BuilderCanvas';
import CatalogSidebar from '../../components/admin/CatalogSidebar';
import PropertyDock from '../../components/admin/PropertyDock';
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

    // 3. Estado de edición de nombre
    const [isEditingName, setIsEditingName] = useState(false);
    const [editNameValue, setEditNameValue] = useState('');

    // 3b. Dropdown de tipo/categoría
    const [isTypeOpen, setIsTypeOpen] = useState(false);
    const typeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (typeRef.current && !typeRef.current.contains(e.target as Node)) {
                setIsTypeOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
                    draft.name !== originalConfig.name ||
                    draft.dashboardType !== originalConfig.dashboardType;

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
        const defaultWidth = type === 'trend-chart' || type === 'kpi' ? 2 : 1;
        const defaultHeight = type === 'kpi' ? 2 : 1;
        const newWidget: WidgetConfig = {
            id: newId,
            type,
            title: `Nuevo ${type.replace('-', ' ')}`,
            position: { x: 0, y: 0 },
            size: { w: defaultWidth, h: defaultHeight },
            binding: { mode: 'simulated_value', simulatedValue: type === 'trend-chart' ? 50 : 0 }
        };
        const newLayout: WidgetLayout = {
            widgetId: newId,
            x: 0,
            y: 0,
            w: defaultWidth,
            h: defaultHeight
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

    const handleDuplicateWidget = () => {
        if (!draft || !selectedWidgetId) return;
        
        const selectedWidget = draft.widgets.find(w => w.id === selectedWidgetId);
        const selectedLayout = draft.layout.find(l => l.widgetId === selectedWidgetId);
        if (!selectedWidget || !selectedLayout) return;

        const newId = generateWidgetId(selectedWidget.type);
        const duplicatedWidget: WidgetConfig = {
            ...JSON.parse(JSON.stringify(selectedWidget)),
            id: newId,
            title: selectedWidget.title ? `${selectedWidget.title} (Copia)` : undefined
        };
        
        const newLayout: WidgetLayout = {
            ...JSON.parse(JSON.stringify(selectedLayout)),
            widgetId: newId,
            y: selectedLayout.y + selectedLayout.h
        };

        setDraft(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                widgets: [...prev.widgets, duplicatedWidget],
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

                    {/* Nombre editable */}
                    {isEditingName ? (
                        <div className="flex items-center gap-2">
                            <input
                                autoFocus
                                value={editNameValue}
                                onChange={e => setEditNameValue(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        if (editNameValue.trim()) {
                                            setDraft(prev => prev ? { ...prev, name: editNameValue.trim() } : prev);
                                        }
                                        setIsEditingName(false);
                                    }
                                    if (e.key === 'Escape') setIsEditingName(false);
                                }}
                                onBlur={() => {
                                    if (editNameValue.trim()) {
                                        setDraft(prev => prev ? { ...prev, name: editNameValue.trim() } : prev);
                                    }
                                    setIsEditingName(false);
                                }}
                                className="text-sm font-black text-white bg-black/40 border border-admin-accent/50 rounded px-2 py-1 focus:outline-none w-64"
                            />
                            <button 
                                onClick={() => {
                                    if (editNameValue.trim()) {
                                        setDraft(prev => prev ? { ...prev, name: editNameValue.trim() } : prev);
                                    }
                                    setIsEditingName(false);
                                }}
                                className="p-1 text-admin-accent hover:bg-white/10 rounded"
                            >
                                <Check size={16} />
                            </button>
                        </div>
                    ) : (
                        <div 
                            className="flex items-center gap-2 group cursor-pointer"
                            onClick={() => {
                                setEditNameValue(draft.name);
                                setIsEditingName(true);
                            }}
                        >
                            <h2 className="text-sm font-black tracking-normal text-white group-hover:text-admin-accent transition-colors">
                                {draft.name}
                            </h2>
                            <Edit2 size={12} className="text-white/20 group-hover:text-admin-accent transition-colors" />
                        </div>
                    )}

                    {/* Categoría / Tipo — custom dropdown */}
                    <div className="relative" ref={typeRef}>
                        <button
                            onClick={() => setIsTypeOpen(o => !o)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/5 text-[10px] text-slate-300 font-bold uppercase tracking-widest border border-white/10 hover:bg-white/10 hover:border-white/20 transition-colors"
                        >
                            {draft.dashboardType}
                            <ChevronDown size={10} className={`transition-transform ${isTypeOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isTypeOpen && (
                            <div className="absolute top-full left-0 mt-1 min-w-[120px] rounded-md bg-[#0f1219] border border-white/10 shadow-xl z-50 py-1 overflow-hidden">
                                {(['global', 'area', 'line', 'equipment', 'free'] as const).map(type => (
                                    <button
                                        key={type}
                                        onClick={() => {
                                            setDraft(prev => prev ? { ...prev, dashboardType: type } : prev);
                                            setIsTypeOpen(false);
                                        }}
                                        className={`w-full text-left px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                                            draft.dashboardType === type
                                                ? 'text-admin-accent bg-white/5'
                                                : 'text-slate-400 hover:text-admin-accent hover:bg-white/5'
                                        }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase ${
                        draft.status === 'published'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
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
                                ? 'bg-white/5 text-industrial-muted hover:text-white hover:bg-white/10 border-white/10 hover:border-white/20' 
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
                                ? 'admin-accent-ghost' 
                                : 'bg-transparent text-admin-accent/50 border border-admin-accent/10 cursor-not-allowed opacity-50'
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

                {/* CANVAS CENTRAL — ahora ocupa TODO el ancho disponible */}
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

            </div>

            {/* PROPERTY DOCK (FLOATING BOTTOM) */}
            <PropertyDock 
                selectedWidget={selectedWidget}
                selectedLayout={draft.layout.find(l => l.widgetId === selectedWidgetId)}
                onUpdateWidget={handleUpdateWidget}
                onUpdateLayout={handleUpdateLayout}
                equipmentMap={equipmentMap}
                onDelete={handleDeleteWidget}
                onDuplicate={handleDuplicateWidget}
                onDeselect={() => setSelectedWidgetId(undefined)}
            />

        </div>
    );
}
