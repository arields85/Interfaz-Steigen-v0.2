import { useState, useRef, useCallback } from 'react';
import type { DragEvent, KeyboardEvent, ReactNode, RefObject } from 'react';
import { ArrowDown, Plus, Trash2, Activity, Wifi, PlugZap } from 'lucide-react';
import AnchoredOverlay from '../ui/AnchoredOverlay';
import type { WidgetConfig, WidgetType } from '../../domain/admin.types';
import type { EquipmentSummary } from '../../domain/equipment.types';
import HeaderSelectionFrame from '../ui/HeaderSelectionFrame';
import WidgetHoverActions from '../ui/WidgetHoverActions';
import {
    HEADER_WIDGET_DRAG_MIME,
    HEADER_WIDGET_SLOT_COUNT,
    parseHeaderWidgetDragPayload,
    serializeHeaderWidgetDragPayload,
} from '../../utils/headerWidgets';
import HeaderWidgetRenderer from './HeaderWidgetRenderer';

// =============================================================================
// Opciones del menú contextual del slot vacío de header.
// Solo se ofrecen tipos compatibles con header. Creamos un widget nuevo directamente
// (en lugar de requerir que exista en el grid) porque es la UX más directa:
// el usuario hace click → elige tipo → aparece en el header ya configurado.
// =============================================================================
interface HeaderSlotMenuOption {
    type: WidgetType;
    label: string;
    description: string;
    icon: ReactNode;
}

const HEADER_SLOT_OPTIONS: HeaderSlotMenuOption[] = [
    {
        type: 'status',
        label: 'Estado de equipo',
        description: 'Muestra el estado operativo de un activo',
        icon: <Activity size={13} />,
    },
    {
        type: 'connection-indicator',
        label: 'Indicador de conexión',
        description: 'Muestra el estado del enlace de datos',
        icon: <Wifi size={13} />,
    },
    {
        type: 'connection-status',
        label: 'Estado conectado/desconectado',
        description: 'Muestra estado binario de conectividad',
        icon: <PlugZap size={13} />,
    },
];

// =============================================================================
// HeaderSlotContextMenu
// Menú contextual flotante para el slot vacío del header.
// Delega portal + posicionamiento a AnchoredOverlay.
// =============================================================================
interface HeaderSlotContextMenuProps {
    triggerRef: RefObject<HTMLButtonElement | null>;
    isOpen: boolean;
    onClose: () => void;
    onSelect: (type: WidgetType) => void;
}

const HEADER_SLOT_MENU_ESTIMATED_HEIGHT = HEADER_SLOT_OPTIONS.length * 52 + 16;

function HeaderSlotContextMenu({ triggerRef, isOpen, onClose, onSelect }: HeaderSlotContextMenuProps) {
    return (
        <AnchoredOverlay
            triggerRef={triggerRef}
            isOpen={isOpen}
            onClose={onClose}
            estimatedHeight={HEADER_SLOT_MENU_ESTIMATED_HEIGHT}
            minWidth={200}
            align="start"
            gap={4}
        >
            <div
                className="rounded-lg border border-white/10 py-1.5 overflow-hidden"
                style={{
                    background: 'var(--color-industrial-surface)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)',
                }}
            >
                <div className="px-3 pb-1.5 pt-0.5 mb-1 border-b border-white/5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-industrial-muted">
                        Agregar widget de header
                    </span>
                </div>
                {HEADER_SLOT_OPTIONS.map((opt) => (
                    <button
                        key={opt.type}
                        type="button"
                        onClick={() => {
                            onSelect(opt.type);
                            onClose();
                        }}
                        className="flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors hover:bg-white/5 group/opt"
                        style={{ color: 'var(--color-industrial-muted)' }}
                    >
                        <span
                            className="mt-0.5 shrink-0 transition-colors group-hover/opt:text-admin-accent"
                            style={{ color: 'var(--color-admin-accent)', opacity: 0.7 }}
                        >
                            {opt.icon}
                        </span>
                        <span className="flex flex-col gap-0.5">
                            <span
                                className="text-[11px] font-bold leading-tight transition-colors group-hover/opt:text-white"
                                style={{ color: 'var(--color-industrial-text)' }}
                            >
                                {opt.label}
                            </span>
                            <span className="text-[9px] leading-tight" style={{ color: 'var(--color-industrial-muted)' }}>
                                {opt.description}
                            </span>
                        </span>
                    </button>
                ))}
            </div>
        </AnchoredOverlay>
    );
}

// =============================================================================
// HeaderSlotTrigger
// Botón `+` individual para un slot vacío.
// Mantiene su propio estado de apertura del menú.
// Recibe `slotIndex` para que el handler de inserción ubique el widget en la
// posición exacta del slot, no siempre al final.
// =============================================================================
interface HeaderSlotTriggerProps {
    slotHighlight: boolean;
    slotIndex: number;
    onAddWidget: (type: WidgetType, slotIndex: number) => void;
}

function HeaderSlotTrigger({ slotHighlight, slotIndex, onAddWidget }: HeaderSlotTriggerProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);

    const handleToggle = useCallback(() => {
        setMenuOpen((prev) => !prev);
    }, []);

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={handleToggle}
                title="Agregar widget al header"
                className={`
                    relative z-[1]
                    flex h-6 w-6 items-center justify-center
                    rounded-full border transition-all
                    focus:outline-none
                    ${slotHighlight
                        ? 'border-admin-accent/40 text-admin-accent bg-admin-accent/10 hover:bg-admin-accent/20 hover:border-admin-accent/60 hover:shadow-[0_0_10px_color-mix(in_srgb,var(--color-admin-accent)_30%,transparent)]'
                        : 'border-white/10 bg-industrial-surface/80 text-industrial-muted hover:text-admin-accent hover:border-admin-accent/40 hover:bg-admin-accent/10 hover:shadow-[0_0_8px_color-mix(in_srgb,var(--color-admin-accent)_20%,transparent)]'
                    }
                    ${menuOpen ? 'border-admin-accent/60 text-admin-accent bg-admin-accent/15 shadow-[0_0_10px_color-mix(in_srgb,var(--color-admin-accent)_25%,transparent)]' : ''}
                `}
            >
                <Plus size={12} />
            </button>

            <HeaderSlotContextMenu
                triggerRef={triggerRef}
                isOpen={menuOpen}
                onClose={() => setMenuOpen(false)}
                onSelect={(type) => onAddWidget(type, slotIndex)}
            />
        </>
    );
}

// =============================================================================
// HeaderWidgetCanvas props
// =============================================================================
interface HeaderWidgetCanvasProps {
    widgets: WidgetConfig[];
    /** Mapa widgetId → columna (0-indexed) para posicionamiento explícito en el grid.
     *  Cuando está presente, cada widget se renderiza en su columna exacta con grid-column. */
    widgetColumnMap?: Map<string, number>;
    equipmentMap: Map<string, EquipmentSummary>;
    mode?: 'viewer' | 'preview';
    selectedWidgetId?: string;
    onWidgetSelect?: (widgetId: string) => void;
    onReorderWidget?: (widgetId: string, targetWidgetId?: string) => void;
    onRemoveWidget?: (widgetId: string) => void;
    onDeleteWidget?: (widgetId: string) => void;
    onHeaderDragEnter?: (event: DragEvent<HTMLDivElement>) => void;
    onHeaderDragOver?: (event: DragEvent<HTMLDivElement>) => void;
    onHeaderDragLeave?: (event: DragEvent<HTMLDivElement>) => void;
    onHeaderDrop?: (event: DragEvent<HTMLDivElement>) => void;
    isHeaderDropActive?: boolean;
    canDropHeaderWidget?: boolean;
    /** Callback para crear y asignar un nuevo widget al header desde el menú del slot vacío.
     *  Recibe el tipo elegido y el índice de columna (0-2) donde fue invocado el `+`. */
    onAddHeaderWidget?: (type: WidgetType, slotIndex: number) => void;
    /** Callback para asignar (por drop desde el grid) un widget existente a una columna específica.
     *  Recibe el widgetId y el índice de columna (0-2) objetivo. */
    onDropWidgetAtSlot?: (widgetId: string, slotIndex: number) => void;
}

export default function HeaderWidgetCanvas({
    widgets,
    widgetColumnMap,
    equipmentMap,
    mode = 'viewer',
    selectedWidgetId,
    onWidgetSelect,
    onReorderWidget,
    onRemoveWidget,
    onDeleteWidget,
    onHeaderDragEnter,
    onHeaderDragOver,
    onHeaderDragLeave,
    onHeaderDrop,
    isHeaderDropActive,
    canDropHeaderWidget,
    onAddHeaderWidget,
    onDropWidgetAtSlot,
}: HeaderWidgetCanvasProps) {
    const isPreview = mode === 'preview';
    // Debe mantenerse sincronizado con `.glass-panel { border-radius: 1.5rem }` en hmi-app/src/index.css
    const widgetCornerRadius = '1.5rem';

    // Construir un mapa columna → widget para el renderizado explícito por columna.
    // Si existe widgetColumnMap usamos sus valores; si no, fallback al índice del array.
    const columnToWidget = new Map<number, WidgetConfig>();
    widgets.forEach((widget, idx) => {
        const col = widgetColumnMap?.get(widget.id) ?? idx;
        columnToWidget.set(col, widget);
    });

    const emptySlotCount = Math.max(HEADER_WIDGET_SLOT_COUNT - widgets.length, 0);
    const showAvailableSlotAffordance = isPreview && canDropHeaderWidget && emptySlotCount > 0;
    const [draggedHeaderWidgetId, setDraggedHeaderWidgetId] = useState<string | null>(null);
    const [dropTargetWidgetId, setDropTargetWidgetId] = useState<string | null>(null);
    const [isCanvasDropTarget, setIsCanvasDropTarget] = useState(false);
    // Índice del slot vacío que está siendo el drop target activo (para resalte individual)
    const [activeEmptySlotIndex, setActiveEmptySlotIndex] = useState<number | null>(null);

    const getDragPayload = (event: DragEvent<HTMLDivElement>) => {
        const rawPayload = event.dataTransfer.getData(HEADER_WIDGET_DRAG_MIME);
        return rawPayload ? parseHeaderWidgetDragPayload(rawPayload) : null;
    };

    const resolveDisplayTitle = (widget: WidgetConfig) => widget.title || widget.type;

    const handleSelectByKeyboard = (
        event: KeyboardEvent<HTMLDivElement>,
        widgetId: string,
    ) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onWidgetSelect?.(widgetId);
        }
    };

    const handleCanvasDragOver = (event: DragEvent<HTMLDivElement>) => {
        const payload = getDragPayload(event);

        if (payload?.source === 'header-canvas') {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            setDropTargetWidgetId(null);
            setIsCanvasDropTarget(true);
            return;
        }

        onHeaderDragOver?.(event);
    };

    const handleCanvasDragLeave = (event: DragEvent<HTMLDivElement>) => {
        // Limpiar resalte de slot individual si el drag abandonó el canvas completo
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setActiveEmptySlotIndex(null);
        }
        onHeaderDragLeave?.(event);
    };

    const handleCanvasDrop = (event: DragEvent<HTMLDivElement>) => {
        const payload = getDragPayload(event);

        if (payload?.source === 'header-canvas') {
            event.preventDefault();
            onReorderWidget?.(payload.widgetId);
            setDraggedHeaderWidgetId(null);
            setDropTargetWidgetId(null);
            setIsCanvasDropTarget(false);
            return;
        }

        onHeaderDrop?.(event);
        setDropTargetWidgetId(null);
        setIsCanvasDropTarget(false);
    };

    const handleWidgetDragStart = (event: DragEvent<HTMLDivElement>, widget: WidgetConfig) => {
        if (!isPreview) {
            return;
        }

        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', widget.id);
        event.dataTransfer.setData(
            HEADER_WIDGET_DRAG_MIME,
            serializeHeaderWidgetDragPayload({
                widgetId: widget.id,
                widgetType: widget.type,
                source: 'header-canvas',
            }),
        );

        setDraggedHeaderWidgetId(widget.id);
    };

    const handleWidgetDragOver = (event: DragEvent<HTMLDivElement>, targetWidgetId: string) => {
        const payload = getDragPayload(event);

        if (!payload) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'move';
        setIsCanvasDropTarget(false);
        setDropTargetWidgetId(targetWidgetId);
    };

    const handleWidgetDrop = (event: DragEvent<HTMLDivElement>, targetWidgetId: string) => {
        const payload = getDragPayload(event);

        if (!payload) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        onReorderWidget?.(payload.widgetId, targetWidgetId);
        setDraggedHeaderWidgetId(null);
        setDropTargetWidgetId(null);
        setIsCanvasDropTarget(false);
    };

    const handleWidgetDragEnd = () => {
        setDraggedHeaderWidgetId(null);
        setDropTargetWidgetId(null);
        setIsCanvasDropTarget(false);
        setActiveEmptySlotIndex(null);
    };

    // ── Handlers para slots vacíos como drop targets reales ──────────────────
    // Un slot vacío es un destino explícito: al soltar aquí, el widget debe
    // quedar exactamente en ese índice de slot, no simplemente appended al array.
    // El `realSlotIndex` es el índice absoluto dentro del array de HEADER_WIDGET_SLOT_COUNT
    // (los primeros `widgets.length` están ocupados; los siguientes son vacíos).

    const handleEmptySlotDragOver = useCallback((
        event: DragEvent<HTMLDivElement>,
        realSlotIndex: number,
    ) => {
        // Solo procesar drags compatibles (desde el grid del builder)
        if (!canDropHeaderWidget) return;

        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'move';
        setActiveEmptySlotIndex(realSlotIndex);
        setIsCanvasDropTarget(false);
    }, [canDropHeaderWidget]);

    const handleEmptySlotDragLeave = useCallback((
        event: DragEvent<HTMLDivElement>,
    ) => {
        // Solo limpiar si el foco del drag salió del slot, no si entró a un hijo
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setActiveEmptySlotIndex(null);
        }
    }, []);

    const handleEmptySlotDrop = useCallback((
        event: DragEvent<HTMLDivElement>,
        realSlotIndex: number,
    ) => {
        event.preventDefault();
        event.stopPropagation();
        setActiveEmptySlotIndex(null);
        setIsCanvasDropTarget(false);

        // Intentar extraer el payload del drag (puede venir del grid del builder)
        const rawPayload = event.dataTransfer.getData(HEADER_WIDGET_DRAG_MIME);
        const payload = rawPayload ? parseHeaderWidgetDragPayload(rawPayload) : null;

        if (!payload) return;

        if (payload.source === 'header-canvas') {
            // Reordenar dentro del header: el target es el "after last widget" → append no aplica.
            // Para reordenar a un slot vacío usamos el índice del slot directamente.
            onReorderWidget?.(payload.widgetId, undefined);
        } else {
            // Viene del grid del builder: asignar al slot exacto
            onDropWidgetAtSlot?.(payload.widgetId, realSlotIndex);
        }
    }, [onReorderWidget, onDropWidgetAtSlot]);

    return (
        <div
            className="min-w-[18rem] rounded-2xl border border-dashed px-3 py-2.5 transition-all"
            style={{
                borderColor: isPreview && isHeaderDropActive
                    ? 'color-mix(in srgb, var(--color-admin-accent) 60%, transparent)'
                    : 'color-mix(in srgb, var(--color-industrial-border) 100%, transparent)',
                background: 'transparent',
                boxShadow: isPreview && isHeaderDropActive
                    ? '0 0 0 1px color-mix(in srgb, var(--color-admin-accent) 20%, transparent), 0 0 24px color-mix(in srgb, var(--color-admin-accent) 12%, transparent)'
                    : 'none',
            }}
            onDragEnter={onHeaderDragEnter}
            onDragOver={handleCanvasDragOver}
            onDragLeave={handleCanvasDragLeave}
            onDrop={handleCanvasDrop}
        >
            {/* ── Grid de 3 columnas fijas ────────────────────────────────────────
                Iteramos SIEMPRE las 3 columnas en orden.
                Cada columna es o un widget ocupado o un slot vacío.
                Esto garantiza que el widget del slot[2] esté visualmente en la
                tercera columna, independientemente de cuántos otros slots existan.
            ── */}
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
                {Array.from({ length: HEADER_WIDGET_SLOT_COUNT }, (_, colIndex) => {
                    const widget = columnToWidget.get(colIndex);

                    if (widget) {
                        // ── Columna ocupada: renderizar widget ──────────────
                        const isSelected = selectedWidgetId === widget.id;
                        const isDropTarget = dropTargetWidgetId === widget.id;
                        const isDragging = draggedHeaderWidgetId === widget.id;

                        return (
                            <div
                                key={widget.id}
                                className="group relative min-w-0"
                                style={{ borderRadius: widgetCornerRadius }}
                            >
                                <HeaderSelectionFrame
                                    isSelected={isSelected}
                                    radius={widgetCornerRadius}
                                />

                                {isPreview && (
                                    <WidgetHoverActions
                                        actions={[
                                            {
                                                label: 'Devolver widget al grid',
                                                icon: ArrowDown,
                                                onClick: () => onRemoveWidget?.(widget.id),
                                            },
                                            {
                                                label: 'Eliminar widget',
                                                icon: Trash2,
                                                onClick: () => onDeleteWidget?.(widget.id),
                                            },
                                        ]}
                                    />
                                )}

                                <div
                                    role="button"
                                    tabIndex={0}
                                    draggable={isPreview}
                                    onClick={() => onWidgetSelect?.(widget.id)}
                                    onKeyDown={(event) => handleSelectByKeyboard(event, widget.id)}
                                    onDragStart={(event) => handleWidgetDragStart(event, widget)}
                                    onDragOver={(event) => handleWidgetDragOver(event, widget.id)}
                                    onDrop={(event) => handleWidgetDrop(event, widget.id)}
                                    onDragEnd={handleWidgetDragEnd}
                                    className="glass-panel relative flex h-full min-h-18 w-full flex-col px-3 py-2 text-left transition-all focus:outline-none"
                                    style={{
                                        borderRadius: widgetCornerRadius,
                                        borderColor: isDropTarget
                                            ? 'color-mix(in srgb, var(--color-admin-accent) 55%, transparent)'
                                            : 'color-mix(in srgb, var(--color-industrial-border) 85%, transparent)',
                                        boxShadow: isDropTarget
                                            ? '0 0 0 1px color-mix(in srgb, var(--color-admin-accent) 16%, transparent), 0 0 18px color-mix(in srgb, var(--color-admin-accent) 10%, transparent)'
                                            : 'none',
                                        opacity: isDragging ? 0.45 : 1,
                                    }}
                                >
                                    <div className="flex flex-1 flex-col justify-center gap-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-industrial-muted">
                                                    {resolveDisplayTitle(widget)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="border-t border-white/6 pt-1">
                                            <HeaderWidgetRenderer
                                                widget={widget}
                                                equipmentMap={equipmentMap}
                                                align="start"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    // ── Columna vacía: renderizar slot drop target / botón + ──
                    // Solo visible en modo preview. En viewer, columnas vacías no
                    // se renderizan para no mostrar huecos visuales.
                    if (!isPreview) return null;

                    const isThisSlotDropTarget = activeEmptySlotIndex === colIndex;
                    const slotHighlight = showAvailableSlotAffordance;
                    const slotActive = (slotHighlight && isHeaderDropActive) || isThisSlotDropTarget;

                    return (
                        <div
                            key={`header-empty-slot-${colIndex}`}
                            className="relative flex items-center justify-center rounded-xl border border-dashed transition-all"
                            onDragOver={(e) => handleEmptySlotDragOver(e, colIndex)}
                            onDragLeave={handleEmptySlotDragLeave}
                            onDrop={(e) => handleEmptySlotDrop(e, colIndex)}
                            style={{
                                // Misma geometría base que el widget real del header:
                                // min-h-18 (72px) + px-3 py-2 internos.
                                minHeight: '72px',
                                borderRadius: widgetCornerRadius,
                                borderColor: isThisSlotDropTarget
                                    ? 'color-mix(in srgb, var(--color-admin-accent) 80%, transparent)'
                                    : slotHighlight
                                        ? 'color-mix(in srgb, var(--color-admin-accent) 58%, transparent)'
                                        : 'color-mix(in srgb, var(--color-industrial-border) 70%, transparent)',
                                background: slotActive
                                    ? `linear-gradient(135deg,
                                        color-mix(in srgb, var(--color-admin-accent) ${isThisSlotDropTarget ? '20%' : '14%'}, transparent) 0%,
                                        color-mix(in srgb, var(--color-admin-accent) ${isThisSlotDropTarget ? '8%' : '5%'}, transparent) 100%)`
                                    : slotHighlight
                                        ? `linear-gradient(135deg,
                                            color-mix(in srgb, var(--color-admin-accent) 9%, transparent) 0%,
                                            color-mix(in srgb, var(--color-admin-accent) 2%, transparent) 100%)`
                                        : 'color-mix(in srgb, var(--color-industrial-surface) 40%, transparent)',
                                boxShadow: isThisSlotDropTarget
                                    ? '0 0 0 2px color-mix(in srgb, var(--color-admin-accent) 30%, transparent), 0 0 28px color-mix(in srgb, var(--color-admin-accent) 20%, transparent)'
                                    : slotHighlight
                                        ? `0 0 0 1px color-mix(in srgb, var(--color-admin-accent) ${slotActive ? '16%' : '10%'}, transparent),
                                            0 0 ${slotActive ? '24px' : '16px'} color-mix(in srgb, var(--color-admin-accent) ${slotActive ? '16%' : '10%'}, transparent)`
                                        : 'none',
                                opacity: isCanvasDropTarget && !isThisSlotDropTarget ? 0.9 : 1,
                                transform: isThisSlotDropTarget ? 'scale(1.02)' : 'scale(1)',
                            }}
                        >
                            {/* El + en modo preview es un botón funcional con menú contextual */}
                            {onAddHeaderWidget ? (
                                <HeaderSlotTrigger
                                    slotHighlight={!!slotHighlight}
                                    slotIndex={colIndex}
                                    onAddWidget={onAddHeaderWidget}
                                />
                            ) : (
                                <Plus
                                    size={14}
                                    className={`relative z-[1] transition-all ${slotHighlight ? 'scale-110' : ''}`}
                                    style={{
                                        color: slotHighlight
                                            ? 'color-mix(in srgb, var(--color-admin-accent) 85%, var(--color-industrial-text))'
                                            : 'color-mix(in srgb, var(--color-industrial-muted) 80%, transparent)',
                                        filter: slotHighlight
                                            ? 'drop-shadow(0 0 10px color-mix(in srgb, var(--color-admin-accent) 22%, transparent))'
                                            : 'none',
                                    }}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
