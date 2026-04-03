import { useState, useMemo, useEffect, useRef } from 'react';
import type { DragEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Loader2, AlertCircle, Edit2, Check, ChevronDown } from 'lucide-react';
import { dashboardStorage } from '../../services/DashboardStorageService';
import { mockEquipmentList } from '../../mocks/equipment.mock';
import type { Dashboard, DashboardHeaderConfig, WidgetType, WidgetConfig, WidgetLayout } from '../../domain/admin.types';
import type { EquipmentSummary } from '../../domain/equipment.types';
import BuilderCanvas from '../../components/admin/BuilderCanvas';
import CatalogSidebar from '../../components/admin/CatalogSidebar';
import PropertyDock from '../../components/admin/PropertyDock';
import DashboardHeader from '../../components/viewer/DashboardHeader';
import { generateWidgetId } from '../../utils/idGenerator';
import { getDashboardHeaderTitle } from '../../utils/dashboardHeader';
import {
    HEADER_WIDGET_DRAG_MIME,
    HEADER_WIDGET_SLOT_COUNT,
    type HeaderWidgetDragPayload,
    isHeaderCompatibleWidget,
    isHeaderCompatibleWidgetType,
    parseHeaderWidgetDragPayload,
    getFirstFreeHeaderSlot,
} from '../../utils/headerWidgets';
import { createDefaultStatusDisplayOptions } from '../../utils/statusWidget';
import {
    createDefaultConnectionIndicatorDisplayOptions,
    createDefaultConnectionStatusDisplayOptions,
} from '../../utils/connectionWidget';

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
    const [isPropertyDockOpen, setIsPropertyDockOpen] = useState(true);

    // 3. Estado de edición de nombre
    const [isEditingName, setIsEditingName] = useState(false);
    const [editNameValue, setEditNameValue] = useState('');

    // 3b. Dropdown de tipo/categoría
    const [isTypeOpen, setIsTypeOpen] = useState(false);
    const typeRef = useRef<HTMLDivElement>(null);
    const [draggedWidget, setDraggedWidget] = useState<HeaderWidgetDragPayload | null>(null);
    const [isHeaderDropActive, setIsHeaderDropActive] = useState(false);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (typeRef.current && !typeRef.current.contains(e.target as Node)) {
                setIsTypeOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 4a. IDs de widgets asignados al header — excluidos del grid del builder
    // Calculado antes del guard para respetar las reglas de hooks.
    const headerWidgetIds = useMemo(() => {
        return new Set(
            (draft?.headerConfig?.widgetSlots ?? []).map(s => s.widgetId)
        );
    }, [draft?.headerConfig?.widgetSlots]);

    // 4b. Columnas del header actualmente ocupadas (para calcular el primer slot libre).
    // El valor de `column` puede ser explícito o implícito (índice en el array).
    const headerOccupiedColumns = useMemo(() => {
        const slots = draft?.headerConfig?.widgetSlots ?? [];
        return new Set(slots.map((s, i) => s.column ?? i));
    }, [draft?.headerConfig?.widgetSlots]);

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
            connectionState: eq.connectionState,
            lastUpdateAt: eq.lastUpdateAt,
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
            <div className="h-full bg-industrial-bg flex items-center justify-center text-industrial-muted">
                <Loader2 className="animate-spin mr-2" /> Cargando entorno constructor...
            </div>
        );
    }

    if (!draft || !originalConfig) {
        return <div className="p-8 text-white">Dashboard no encontrado.</div>;
    }

    const selectedWidget = draft.widgets.find(w => w.id === selectedWidgetId);
    const isSelectedHeaderWidget = selectedWidgetId ? headerWidgetIds.has(selectedWidgetId) : false;
    const selectedWidgetLayout = draft.layout.find(l => l.widgetId === selectedWidgetId) ?? (
        selectedWidget && isSelectedHeaderWidget
            ? {
                widgetId: selectedWidget.id,
                x: 0,
                y: 0,
                w: selectedWidget.size.w,
                h: selectedWidget.size.h,
            }
            : undefined
    );
    const isPropertyDockVisible = Boolean(selectedWidget && selectedWidgetLayout && isPropertyDockOpen);

    // Checkear si draft difiere de originalConfig de manera utilitaria y burda
    const isDirty = JSON.stringify(draft.widgets) !== JSON.stringify(originalConfig.widgets) || 
                    JSON.stringify(draft.layout) !== JSON.stringify(originalConfig.layout) || 
                    draft.name !== originalConfig.name ||
                    draft.dashboardType !== originalConfig.dashboardType ||
                    JSON.stringify(draft.headerConfig) !== JSON.stringify(originalConfig.headerConfig);

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

    const handleUpdateHeaderConfig = (headerConfig: DashboardHeaderConfig) => {
        setDraft(prev => {
            if (!prev) return prev;
            return { ...prev, headerConfig };
        });
    };

    const handleHeaderTitleChange = (value: string) => {
        handleUpdateHeaderConfig({
            ...(draft.headerConfig ?? {}),
            title: value.trim() || undefined,
        });
    };

    const handleHeaderSubtitleChange = (value: string) => {
        handleUpdateHeaderConfig({
            ...(draft.headerConfig ?? {}),
            subtitle: value.trim() || undefined,
        });
    };

    const buildGridLayoutForWidget = (widget: WidgetConfig, layout: WidgetLayout[]): WidgetLayout => {
        const maxY = layout.reduce((acc, item) => Math.max(acc, item.y + item.h), 0);

        return {
            widgetId: widget.id,
            x: 0,
            y: maxY,
            w: widget.size.w,
            h: widget.size.h,
        };
    };

    const handleAssignWidgetToHeader = (widgetId: string, targetWidgetId?: string) => {
        const widget = draft.widgets.find(item => item.id === widgetId);

        if (!widget || !isHeaderCompatibleWidget(widget)) {
            return;
        }

        const currentSlots = draft.headerConfig?.widgetSlots ?? [];

        if (currentSlots.some(slot => slot.widgetId === widgetId)) {
            return;
        }

        if (currentSlots.length >= HEADER_WIDGET_SLOT_COUNT) {
            return;
        }

        const targetIndex = targetWidgetId
            ? currentSlots.findIndex(slot => slot.widgetId === targetWidgetId)
            : -1;

        const nextSlots = [...currentSlots];

        if (targetIndex >= 0) {
            nextSlots.splice(targetIndex, 0, { widgetId });
        } else {
            nextSlots.push({ widgetId });
        }

        handleUpdateHeaderConfig({
            ...(draft.headerConfig ?? {}),
            widgetSlots: nextSlots,
        });

        setSelectedWidgetId(widgetId);
    };

    const handleRemoveWidgetFromHeader = (widgetId: string) => {
        const widget = draft.widgets.find(item => item.id === widgetId);

        setDraft(prev => {
            if (!prev) return prev;

            const hasLayoutEntry = prev.layout.some(item => item.widgetId === widgetId);
            const nextLayout = !hasLayoutEntry && widget
                ? [...prev.layout, buildGridLayoutForWidget(widget, prev.layout)]
                : prev.layout;

            return {
                ...prev,
                layout: nextLayout,
                headerConfig: {
                    ...(prev.headerConfig ?? {}),
                    widgetSlots: (prev.headerConfig?.widgetSlots ?? []).filter(slot => slot.widgetId !== widgetId),
                },
            };
        });
    };

    const handleReorderHeaderWidget = (widgetId: string, targetWidgetId?: string) => {
        const currentSlots = draft.headerConfig?.widgetSlots ?? [];
        const sourceSlot = currentSlots.find(slot => slot.widgetId === widgetId);

        if (!sourceSlot) {
            // Widget no está en el header aún — delegar a assign (compat. con drags externos)
            handleAssignWidgetToHeader(widgetId, targetWidgetId);
            return;
        }

        if (!targetWidgetId) {
            // Sin target específico: no hace nada (reordenar a vacío ya maneja handleEmptySlotDrop)
            return;
        }

        const targetSlot = currentSlots.find(slot => slot.widgetId === targetWidgetId);
        if (!targetSlot) return;

        // Intercambiar las columnas de los dos slots: el widget arrastrado toma la
        // columna del destino y viceversa. Esto preserva las posiciones explícitas.
        const sourceIdx = currentSlots.indexOf(sourceSlot);
        const targetIdx = currentSlots.indexOf(targetSlot);

        const sourceCol = sourceSlot.column ?? sourceIdx;
        const targetCol = targetSlot.column ?? targetIdx;

        const nextSlots = currentSlots.map(slot => {
            if (slot.widgetId === widgetId) return { ...slot, column: targetCol };
            if (slot.widgetId === targetWidgetId) return { ...slot, column: sourceCol };
            return slot;
        });

        handleUpdateHeaderConfig({
            ...(draft.headerConfig ?? {}),
            widgetSlots: nextSlots,
        });
    };

    const handleHeaderDragOver = (event: DragEvent<HTMLDivElement>) => {
        const rawPayload = event.dataTransfer.getData(HEADER_WIDGET_DRAG_MIME);
        const payload = rawPayload ? parseHeaderWidgetDragPayload(rawPayload) : draggedWidget;

        if (
            !payload
            || !isHeaderCompatibleWidgetType(payload.widgetType)
            || (draft.headerConfig?.widgetSlots?.length ?? 0) >= HEADER_WIDGET_SLOT_COUNT
        ) {
            return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setIsHeaderDropActive(true);
    };

    const handleHeaderDrop = (event: DragEvent<HTMLDivElement>) => {
        const rawPayload = event.dataTransfer.getData(HEADER_WIDGET_DRAG_MIME);
        const payload = rawPayload ? parseHeaderWidgetDragPayload(rawPayload) : draggedWidget;

        setIsHeaderDropActive(false);

        if (
            !payload
            || !isHeaderCompatibleWidgetType(payload.widgetType)
            || (draft.headerConfig?.widgetSlots?.length ?? 0) >= HEADER_WIDGET_SLOT_COUNT
        ) {
            return;
        }

        event.preventDefault();
        handleAssignWidgetToHeader(payload.widgetId);
        setDraggedWidget(null);
    };

    const handleAddWidget = (type: WidgetType) => {
        if (!draft) return;
        
        const newId = generateWidgetId(type);
        const defaultWidth = type === 'trend-chart' ? 2 : 1;
        const defaultHeight = type === 'kpi' ? 2 : type === 'alert-history' ? 2 : 1;

        const newWidget: WidgetConfig = type === 'trend-chart'
            ? {
                id: newId,
                type,
                title: 'Trend Chart',
                position: { x: 0, y: 0 },
                size: { w: defaultWidth, h: defaultHeight },
                binding: { mode: 'simulated_value', simulatedValue: 50 },
            }
            : type === 'alert-history'
            ? {
                id: newId,
                type,
                title: 'Histórico de alertas',
                position: { x: 0, y: 0 },
                size: { w: defaultWidth, h: defaultHeight },
                binding: { mode: 'simulated_value', simulatedValue: 0 },
                displayOptions: {
                    dashboardId: draft.id,
                    maxVisible: 5,
                    pollInterval: 10000,
                }
            }
            : type === 'connection-status'
                ? {
                    id: newId,
                    type,
                    title: 'Estado',
                    position: { x: 0, y: 0 },
                    size: { w: defaultWidth, h: defaultHeight },
                    binding: { mode: 'simulated_value', simulatedValue: 1 },
                    displayOptions: createDefaultConnectionStatusDisplayOptions(),
                }
            : type === 'status'
                ? {
                    id: newId,
                    type,
                    title: `Nuevo ${type.replace('-', ' ')}`,
                    position: { x: 0, y: 0 },
                    size: { w: defaultWidth, h: defaultHeight },
                    binding: {
                        mode: 'simulated_value',
                        simulatedValue: 'running',
                    },
                    displayOptions: createDefaultStatusDisplayOptions(),
                }
            : type === 'connection-indicator'
                ? {
                    id: newId,
                    type,
                    title: 'Conexión',
                    position: { x: 0, y: 0 },
                    size: { w: defaultWidth, h: defaultHeight },
                    binding: {
                        mode: 'simulated_value',
                        simulatedValue: 'online',
                    },
                    displayOptions: createDefaultConnectionIndicatorDisplayOptions(),
                }
            : {
            id: newId,
            type,
            title: `Nuevo ${type.replace('-', ' ')}`,
            position: { x: 0, y: 0 },
            size: { w: defaultWidth, h: defaultHeight },
            binding: { mode: 'simulated_value', simulatedValue: 0 },
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

    /**
     * Crea un widget compatible con header y lo asigna directamente al header
     * en el slot exacto indicado por `slotIndex`.
     * Invocado desde el `+` del slot vacío.
     *
     * `slotIndex` es la columna objetivo (0, 1, 2) dentro del grid de header.
     * Se guarda en `DashboardHeaderWidgetSlot.column` para que el renderizado
     * ubique el widget en la columna correcta con `grid-column`, independientemente
     * de cuántos otros slots estén ocupados.
     */
    const handleAddHeaderWidgetFromSlot = (type: WidgetType, slotIndex: number) => {
        if (!draft) return;
        if (type !== 'status' && type !== 'connection-indicator' && type !== 'connection-status') return;

        const currentSlots = draft.headerConfig?.widgetSlots ?? [];
        if (currentSlots.length >= HEADER_WIDGET_SLOT_COUNT) return;
        // No insertar si ya hay un widget en esa columna
        if (currentSlots.some(slot => (slot.column ?? currentSlots.indexOf(slot)) === slotIndex)) return;

        const newId = generateWidgetId(type);
        const newWidget: WidgetConfig = type === 'connection-status'
            ? {
                id: newId,
                type,
                title: 'Estado',
                position: { x: 0, y: 0 },
                size: { w: 1, h: 1 },
                binding: { mode: 'simulated_value', simulatedValue: 1 },
                displayOptions: createDefaultConnectionStatusDisplayOptions(),
            }
            : type === 'status'
                ? {
                    id: newId,
                    type,
                    title: 'Estado de equipo',
                    position: { x: 0, y: 0 },
                    size: { w: 1, h: 1 },
                    binding: {
                        mode: 'simulated_value',
                        simulatedValue: 'running',
                    },
                    displayOptions: createDefaultStatusDisplayOptions(),
                }
            : {
                id: newId,
                type,
                title: 'Conexión',
                position: { x: 0, y: 0 },
                size: { w: 1, h: 1 },
                binding: {
                    mode: 'simulated_value',
                    simulatedValue: 'online',
                },
                displayOptions: createDefaultConnectionIndicatorDisplayOptions(),
            };

        setDraft(prev => {
            if (!prev) return prev;
            const slots = prev.headerConfig?.widgetSlots ?? [];
            // El nuevo slot lleva `column` explícita para que el renderer
            // lo posicione en la columna correcta con grid-column.
            const nextSlots = [...slots, { widgetId: newId, column: slotIndex }];
            return {
                ...prev,
                widgets: [...prev.widgets, newWidget],
                headerConfig: {
                    ...(prev.headerConfig ?? {}),
                    widgetSlots: nextSlots,
                },
            };
        });
        setSelectedWidgetId(newId);
    };

    /**
     * Asigna un widget existente (arrastrado desde el grid) al slot vacío exacto
     * indicado por `slotIndex`.
     * Invocado desde el drop sobre un slot vacío específico del header canvas.
     */
    const handleDropWidgetAtSlot = (widgetId: string, slotIndex: number) => {
        const widget = draft.widgets.find(item => item.id === widgetId);

        if (!widget || !isHeaderCompatibleWidget(widget)) return;

        const currentSlots = draft.headerConfig?.widgetSlots ?? [];
        if (currentSlots.some(slot => slot.widgetId === widgetId)) return;
        if (currentSlots.length >= HEADER_WIDGET_SLOT_COUNT) return;

        setIsHeaderDropActive(false);
        setDraggedWidget(null);

        // Guardar `column` explícita para que el renderer posicione el widget
        // en la columna correcta del grid, sin depender del orden del array.
        handleUpdateHeaderConfig({
            ...(draft.headerConfig ?? {}),
            widgetSlots: [...currentSlots, { widgetId, column: slotIndex }],
        });

        setSelectedWidgetId(widgetId);
    };

    /**
     * Sube un widget del grid al header asignándolo al primer slot libre
     * empezando desde la izquierda (columna 0 → 1 → 2).
     *
     * Reutiliza `handleDropWidgetAtSlot` para mantener la misma lógica de
     * asignación posicional que ya usa el drag & drop.
     */
    const handlePromoteToHeader = (widgetId: string) => {
        const targetSlot = getFirstFreeHeaderSlot(headerOccupiedColumns);
        if (targetSlot === null) return; // Los 3 slots están ocupados — no debería llamarse en este caso
        handleDropWidgetAtSlot(widgetId, targetSlot);
    };

    const handleDuplicateWidget = (widgetId?: string) => {
        const targetWidgetId = widgetId ?? selectedWidgetId;

        if (!draft || !targetWidgetId) return;
        
        const selectedWidget = draft.widgets.find(w => w.id === targetWidgetId);
        const selectedLayout = draft.layout.find(l => l.widgetId === targetWidgetId);
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

    const handleDeleteWidget = (widgetId?: string) => {
        const targetWidgetId = widgetId ?? selectedWidgetId;

        if (!targetWidgetId || !draft) return;
        
        setDraft(prev => {
            if (!prev) return prev;

            const nextHeaderSlots = (prev.headerConfig?.widgetSlots ?? []).filter(slot => slot.widgetId !== targetWidgetId);

            return {
                ...prev,
                widgets: prev.widgets.filter(w => w.id !== targetWidgetId),
                layout: prev.layout.filter(l => l.widgetId !== targetWidgetId),
                headerConfig: {
                    ...(prev.headerConfig ?? {}),
                    widgetSlots: nextHeaderSlots,
                },
            };
        });
        setSelectedWidgetId(current => current === targetWidgetId ? undefined : current);
    };

    return (
        <div className="flex flex-col h-full bg-industrial-bg text-industrial-text overflow-hidden">
            
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
                                        handleHeaderTitleChange(editNameValue);
                                        setIsEditingName(false);
                                    }
                                    if (e.key === 'Escape') setIsEditingName(false);
                                }}
                                onBlur={() => {
                                    handleHeaderTitleChange(editNameValue);
                                    setIsEditingName(false);
                                }}
                                className="text-sm font-black text-white bg-black/40 border border-admin-accent/50 rounded px-2 py-1 focus:outline-none w-64"
                            />
                            <button 
                                onClick={() => {
                                    handleHeaderTitleChange(editNameValue);
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
                                setEditNameValue(getDashboardHeaderTitle(draft));
                                setIsEditingName(true);
                            }}
                        >
                            <h2 className="text-sm font-black tracking-normal text-white group-hover:text-admin-accent transition-colors">
                                {getDashboardHeaderTitle(draft)}
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
                            <div className="absolute top-full left-0 mt-1 min-w-[120px] rounded-md bg-industrial-surface border border-white/10 shadow-xl z-50 py-1 overflow-hidden">
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

            <div
                className="flex flex-1 overflow-hidden transition-[margin] duration-300 ease-out"
                style={{ marginBottom: isPropertyDockVisible ? '13.5rem' : '0px' }}
            >
                
                {/* LEFT COLUMN: catálogo de widgets */}
                <div className="w-64 flex flex-col shrink-0 overflow-hidden border-r border-white/5 bg-industrial-bg/50 z-10">
                    <CatalogSidebar onAddWidget={handleAddWidget} />
                </div>

                {/* CANVAS CENTRAL — header preview + grid de widgets */}
                <main className="flex-1 flex flex-col bg-[url('/grid.svg')] bg-center overflow-hidden">

                    {/* ── Header Preview ── */}
                    {/* Reusa DashboardHeader en modo 'preview': sin tabs de navegación.
                        Reacciona en vivo a cada cambio de draft.headerConfig. */}
                    <div className="shrink-0 px-8 pt-6 pb-4 border-b border-white/5 bg-industrial-bg/60 backdrop-blur-sm">
                        <DashboardHeader
                            mode="preview"
                            dashboard={draft}
                            equipmentMap={equipmentMap}
                            onTitleChange={handleHeaderTitleChange}
                            onSubtitleChange={handleHeaderSubtitleChange}
                            onHeaderDragEnter={() => setIsHeaderDropActive(Boolean(
                                draggedWidget
                                && isHeaderCompatibleWidgetType(draggedWidget.widgetType)
                                && headerWidgetIds.size < HEADER_WIDGET_SLOT_COUNT,
                            ))}
                            onHeaderDragOver={handleHeaderDragOver}
                            onHeaderDragLeave={() => setIsHeaderDropActive(false)}
                            onHeaderDrop={handleHeaderDrop}
                            onRemoveHeaderWidget={handleRemoveWidgetFromHeader}
                            onDeleteHeaderWidget={handleDeleteWidget}
                            onReorderHeaderWidget={handleReorderHeaderWidget}
                            selectedWidgetId={selectedWidgetId}
                            onSelectHeaderWidget={setSelectedWidgetId}
                            isHeaderDropActive={isHeaderDropActive}
                            canDropHeaderWidget={Boolean(
                                draggedWidget
                                && isHeaderCompatibleWidgetType(draggedWidget.widgetType)
                                && headerWidgetIds.size < HEADER_WIDGET_SLOT_COUNT,
                            )}
                            onAddHeaderWidget={handleAddHeaderWidgetFromSlot}
                            onDropWidgetAtSlot={handleDropWidgetAtSlot}
                        />
                    </div>

                    {/* ── Grid de widgets ── */}
                    <div className="flex-1 overflow-hidden">
                        <BuilderCanvas
                            layout={draft.layout}
                            widgets={draft.widgets}
                            equipmentMap={equipmentMap}
                            selectedWidgetId={selectedWidgetId}
                            onWidgetSelect={setSelectedWidgetId}
                            onReorder={handleReorderLayout}
                            onResize={handleResizeLayout}
                            onDelete={handleDeleteWidget}
                            onDuplicate={handleDuplicateWidget}
                            onWidgetDragChange={(payload) => {
                                setDraggedWidget(payload);

                                if (!payload || !isHeaderCompatibleWidgetType(payload.widgetType)) {
                                    setIsHeaderDropActive(false);
                                }
                            }}
                            headerWidgetIds={headerWidgetIds}
                            headerOccupiedSlotCount={headerOccupiedColumns.size}
                            onPromoteToHeader={handlePromoteToHeader}
                        />
                    </div>
                </main>

            </div>

            {/* PROPERTY DOCK (FLOATING BOTTOM) */}
            <PropertyDock 
                selectedWidget={selectedWidget}
                selectedLayout={selectedWidgetLayout}
                isOpen={isPropertyDockOpen}
                onToggleOpen={() => setIsPropertyDockOpen(prev => !prev)}
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
