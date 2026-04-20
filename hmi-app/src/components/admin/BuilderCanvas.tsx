import { useEffect, useRef, useState } from 'react';
import { Copy, Trash2, ArrowUp, LayoutDashboard } from 'lucide-react';
import { WidgetRenderer } from '../../widgets';
import type { WidgetConfig, WidgetLayout } from '../../domain/admin.types';
import type { EquipmentSummary } from '../../domain/equipment.types';
import type { HierarchyContext } from '../../widgets/resolvers/hierarchyResolver';
import GridSelectionFrame from '../ui/GridSelectionFrame';
import WidgetHoverActions from '../ui/WidgetHoverActions';
import {
    HEADER_WIDGET_SLOT_COUNT,
    type HeaderWidgetDragPayload,
    isHeaderCompatibleWidget,
} from '../../utils/headerWidgets';
import AdminEmptyState from './AdminEmptyState';
import { useCanvasReference } from '../../utils/useCanvasReference';
import { clampWidgetBounds, DEFAULT_COLS, DEFAULT_ROWS, getGridTemplateStyle } from '../../utils/gridConfig';
import { useUIStore } from '../../store/ui.store';
import {
    applyPointerDeltaToPixelBounds,
    layoutToPixelBounds,
    pixelBoundsToGridBounds,
    type WidgetInteractionMetrics,
    type WidgetInteractionType,
    type WidgetPixelBounds,
} from '../../utils/widgetInteraction';

interface BuilderCanvasProps {
    widgets: WidgetConfig[];
    layout: WidgetLayout[];
    equipmentMap: Map<string, EquipmentSummary>;
    hierarchyContext?: HierarchyContext;
    onWidgetSelect?: (widgetId: string) => void;
    selectedWidgetId?: string;
    onReorder?: (startIndex: number, endIndex: number) => void;
    onResize?: (widgetId: string, w: number, h: number) => void;
    onLayoutCommit?: (layout: WidgetLayout) => void;
    onDelete?: (widgetId: string) => void;
    onDuplicate?: (widgetId: string) => void;
    onWidgetDragChange?: (payload: HeaderWidgetDragPayload | null) => void;
    headerWidgetIds?: Set<string>;
    headerOccupiedSlotCount?: number;
    onPromoteToHeader?: (widgetId: string) => void;
    cols?: number;
    rows?: number;
}

const DRAG_THRESHOLD_PX = 3;

interface InteractionState {
    widgetId: string;
    type: WidgetInteractionType;
    startPointer: { x: number; y: number };
    startLayout: Pick<WidgetLayout, 'x' | 'y' | 'w' | 'h'>;
    startBounds: WidgetPixelBounds;
    tentativeBounds: WidgetPixelBounds;
    hasExceededThreshold: boolean;
}

interface PanState {
    startPointer: { x: number; y: number };
    startScroll: { left: number; top: number };
}

function isInputElement(target: EventTarget | null): target is HTMLInputElement | HTMLTextAreaElement {
    return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

function isSpaceKey(event: Pick<KeyboardEvent, 'code' | 'key'> | Pick<React.KeyboardEvent<HTMLDivElement>, 'code' | 'key'>): boolean {
    return event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar';
}

function isFiniteLayout(layout: Pick<WidgetLayout, 'x' | 'y' | 'w' | 'h'>): boolean {
    return [layout.x, layout.y, layout.w, layout.h].every((value) => Number.isFinite(value));
}

function resolveCommittedLayout(args: {
    interaction: InteractionState;
    metrics: WidgetInteractionMetrics;
    cols: number;
    rows: number;
}): Pick<WidgetLayout, 'x' | 'y' | 'w' | 'h'> {
    const tentativeLayout = pixelBoundsToGridBounds(args.interaction.tentativeBounds, args.metrics);

    if (!isFiniteLayout(tentativeLayout)) {
        return clampWidgetBounds(args.interaction.startLayout, args.cols, args.rows);
    }

    if (args.interaction.type === 'resize') {
        const safeX = Math.min(Math.max(args.interaction.startLayout.x, 0), Math.max(0, args.cols - 1));
        const safeY = Math.min(Math.max(args.interaction.startLayout.y, 0), Math.max(0, args.rows - 1));

        return {
            x: safeX,
            y: safeY,
            w: Math.min(Math.max(tentativeLayout.w, 1), Math.max(1, args.cols - safeX)),
            h: Math.min(Math.max(tentativeLayout.h, 1), Math.max(1, args.rows - safeY)),
        };
    }

    return clampWidgetBounds(tentativeLayout, args.cols, args.rows);
}

function ResizeHandle({
    widgetId,
    onPointerDown,
}: {
    widgetId: string;
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
}) {
    return (
        <div
            data-testid={`builder-canvas-resize-handle-${widgetId}`}
            onPointerDown={onPointerDown}
            className="absolute bottom-0 right-0 z-20 flex h-6 w-6 cursor-se-resize items-end justify-end p-1.5 opacity-0 transition-opacity drop-shadow-md group-hover:opacity-100"
            title="Arrastrar para cambiar tamaño"
        >
            <div
                className="h-2.5 w-2.5 rounded-sm"
                style={{
                    background: 'var(--color-admin-selection-to)',
                    clipPath: 'polygon(100% 0, 0% 100%, 100% 100%)',
                }}
            />
        </div>
    );
}

export default function BuilderCanvas({
    widgets,
    layout,
    equipmentMap,
    hierarchyContext,
    onWidgetSelect,
    selectedWidgetId,
    onResize,
    onLayoutCommit,
    onDelete,
    onDuplicate,
    onWidgetDragChange,
    headerWidgetIds,
    headerOccupiedSlotCount = 0,
    onPromoteToHeader,
    cols = DEFAULT_COLS,
    rows = DEFAULT_ROWS,
}: BuilderCanvasProps) {
    const widgetCornerRadius = '1.5rem';
    const widgetMap = new Map(widgets.map((widget) => [widget.id, widget]));
    const isGridVisible = useUIStore((state) => state.isGridVisible);
    const { containerRef, width, height, rowHeight, cellWidth } = useCanvasReference({
        cols,
        rows,
    });

    const metrics: WidgetInteractionMetrics = { cellWidth, rowHeight };
    const [interaction, setInteraction] = useState<InteractionState | null>(null);
    const [isPanMode, setIsPanMode] = useState(false);
    const [isBuilderFocused, setIsBuilderFocused] = useState(false);
    const [panState, setPanState] = useState<PanState | null>(null);

    const interactionRef = useRef<InteractionState | null>(null);
    const interactionCleanupRef = useRef<(() => void) | null>(null);
    const isBuilderFocusedRef = useRef(false);
    const panStateRef = useRef<PanState | null>(null);
    const panCleanupRef = useRef<(() => void) | null>(null);

    const clearPan = () => {
        panCleanupRef.current?.();
        panCleanupRef.current = null;
        panStateRef.current = null;
        setPanState(null);
    };

    const activatePanMode = () => {
        setIsPanMode(true);
    };

    const deactivatePanMode = () => {
        setIsPanMode(false);
        clearPan();
    };

    const handleSpaceKeyDown = (event: KeyboardEvent | React.KeyboardEvent<HTMLDivElement>) => {
        if (!isSpaceKey(event) || event.repeat || !isBuilderFocusedRef.current || isInputElement(event.target)) {
            return;
        }

        event.preventDefault();
        activatePanMode();
    };

    const handleSpaceKeyUp = (event: KeyboardEvent | React.KeyboardEvent<HTMLDivElement>) => {
        if (!isSpaceKey(event)) {
            return;
        }

        deactivatePanMode();
    };

    const clearInteraction = () => {
        interactionCleanupRef.current?.();
        interactionCleanupRef.current = null;
        interactionRef.current = null;
        setInteraction(null);
        document.body.style.cursor = '';
    };

    useEffect(() => () => {
        clearPan();
        clearInteraction();
    }, []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            handleSpaceKeyDown(event);
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            handleSpaceKeyUp(event);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    const commitLayout = (widgetId: string, nextLayout: Pick<WidgetLayout, 'x' | 'y' | 'w' | 'h'>) => {
        onLayoutCommit?.({ widgetId, ...nextLayout });

        if (!onLayoutCommit && onResize) {
            onResize(widgetId, nextLayout.w, nextLayout.h);
        }
    };

    const beginInteraction = (
        event: React.PointerEvent<HTMLDivElement>,
        item: WidgetLayout,
        type: WidgetInteractionType,
    ) => {
        if (isPanMode) {
            return;
        }

        if (event.button !== 0) {
            return;
        }

        event.preventDefault();
        if (type === 'resize') {
            event.stopPropagation();
        }

        const startLayout = { x: item.x, y: item.y, w: item.w, h: item.h };
        const startBounds = layoutToPixelBounds(startLayout, metrics);
        const initialInteraction: InteractionState = {
            widgetId: item.widgetId,
            type,
            startPointer: { x: event.clientX, y: event.clientY },
            startLayout,
            startBounds,
            tentativeBounds: startBounds,
            hasExceededThreshold: false,
        };

        interactionRef.current = initialInteraction;
        setInteraction(initialInteraction);
        document.body.style.cursor = type === 'resize' ? 'se-resize' : 'grabbing';
        onWidgetDragChange?.(null);

        const handlePointerMove = (moveEvent: PointerEvent) => {
            const currentInteraction = interactionRef.current;

            if (!currentInteraction) {
                return;
            }

            const deltaX = moveEvent.clientX - currentInteraction.startPointer.x;
            const deltaY = moveEvent.clientY - currentInteraction.startPointer.y;
            const distance = Math.hypot(deltaX, deltaY);
            const hasExceededThreshold = currentInteraction.type === 'resize'
                ? true
                : currentInteraction.hasExceededThreshold || distance > DRAG_THRESHOLD_PX;

            const tentativeBounds = currentInteraction.type === 'move' && !hasExceededThreshold
                ? currentInteraction.startBounds
                : applyPointerDeltaToPixelBounds(
                    currentInteraction.type,
                    currentInteraction.startBounds,
                    deltaX,
                    deltaY,
                );

            const nextInteraction: InteractionState = {
                ...currentInteraction,
                tentativeBounds,
                hasExceededThreshold,
            };

            interactionRef.current = nextInteraction;
            setInteraction(nextInteraction);
        };

        const handlePointerUp = () => {
            const currentInteraction = interactionRef.current;

            if (!currentInteraction) {
                clearInteraction();
                return;
            }

            if (currentInteraction.type === 'move' && !currentInteraction.hasExceededThreshold) {
                onWidgetSelect?.(currentInteraction.widgetId);
                clearInteraction();
                return;
            }

            commitLayout(
                currentInteraction.widgetId,
                resolveCommittedLayout({
                    interaction: currentInteraction,
                    metrics,
                    cols,
                    rows,
                }),
            );

            clearInteraction();
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        interactionCleanupRef.current = () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    };

    const beginPan = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!isPanMode || event.button !== 0) {
            return;
        }

        const scrollContainer = containerRef.current?.parentElement;

        if (!(scrollContainer instanceof HTMLElement)) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const nextPanState: PanState = {
            startPointer: { x: event.clientX, y: event.clientY },
            startScroll: { left: scrollContainer.scrollLeft, top: scrollContainer.scrollTop },
        };

        panStateRef.current = nextPanState;
        setPanState(nextPanState);

        const handlePointerMove = (moveEvent: PointerEvent) => {
            const currentPanState = panStateRef.current;

            if (!currentPanState) {
                return;
            }

            scrollContainer.scrollLeft = currentPanState.startScroll.left - (moveEvent.clientX - currentPanState.startPointer.x);
            scrollContainer.scrollTop = currentPanState.startScroll.top - (moveEvent.clientY - currentPanState.startPointer.y);
        };

        const handlePointerUp = () => {
            clearPan();
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        panCleanupRef.current = () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    };

    return (
        <div
            ref={containerRef}
            data-testid="builder-canvas-root"
            tabIndex={0}
            className="flex h-full w-full items-start justify-start overflow-visible"
            style={{ cursor: panState ? 'grabbing' : isPanMode ? 'grab' : undefined }}
            onFocusCapture={() => {
                isBuilderFocusedRef.current = true;
                setIsBuilderFocused(true);
            }}
            onBlurCapture={(event) => {
                const nextFocused = event.relatedTarget;

                if (containerRef.current?.contains(nextFocused as Node | null)) {
                    return;
                }

                isBuilderFocusedRef.current = false;
                setIsBuilderFocused(false);
                deactivatePanMode();
            }}
            onKeyDownCapture={handleSpaceKeyDown}
            onKeyUpCapture={handleSpaceKeyUp}
            onPointerDownCapture={(event) => {
                if (!isInputElement(event.target)) {
                    isBuilderFocusedRef.current = true;
                    setIsBuilderFocused(true);
                    containerRef.current?.focus({ preventScroll: true });
                }

                beginPan(event);
            }}
        >
            <div
                className="relative shrink-0"
                style={{
                    width: `${width}px`,
                    height: `${height}px`,
                }}
            >
                <div
                    data-testid="builder-canvas-grid-overlay"
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 transition-opacity"
                    style={{
                        backgroundImage: isGridVisible
                            ? [
                                'repeating-linear-gradient(to right, var(--color-canvas-grid-major) 0px, var(--color-canvas-grid-major) 1px, transparent 1px, transparent calc((100% / var(--canvas-cols)) * 2))',
                                'repeating-linear-gradient(to bottom, var(--color-canvas-grid-major) 0px, var(--color-canvas-grid-major) 1px, transparent 1px, transparent calc((100% / var(--canvas-rows)) * 2))',
                                'repeating-linear-gradient(to right, var(--color-canvas-grid-minor) 0px, var(--color-canvas-grid-minor) 1px, transparent 1px, transparent calc(100% / var(--canvas-cols)))',
                                'repeating-linear-gradient(to bottom, var(--color-canvas-grid-minor) 0px, var(--color-canvas-grid-minor) 1px, transparent 1px, transparent calc(100% / var(--canvas-rows)))',
                            ].join(', ')
                            : 'none',
                        opacity: isGridVisible ? 1 : 0,
                        ['--canvas-cols' as string]: String(cols),
                        ['--canvas-rows' as string]: String(rows),
                        ['--cell-width-px' as string]: `${cellWidth}px`,
                        ['--row-height-px' as string]: `${rowHeight}px`,
                    }}
                />

                <div
                    className="relative z-10 grid h-full w-full"
                    style={{
                        ...getGridTemplateStyle(cols),
                        gridTemplateRows: `repeat(${rows}, ${rowHeight}px)`,
                        gap: 0,
                    }}
                >
                    {layout.map((item) => {
                        if (headerWidgetIds?.has(item.widgetId)) {
                            return null;
                        }

                        const widget = widgetMap.get(item.widgetId);
                        if (!widget) {
                            return null;
                        }

                        const isSelected = selectedWidgetId === widget.id;
                        const activeInteraction = interaction?.widgetId === widget.id ? interaction : null;
                        const itemStyle = activeInteraction
                            ? {
                                position: 'absolute' as const,
                                left: `${activeInteraction.tentativeBounds.left}px`,
                                top: `${activeInteraction.tentativeBounds.top}px`,
                                width: `${activeInteraction.tentativeBounds.width}px`,
                                height: `${activeInteraction.tentativeBounds.height}px`,
                                zIndex: 20,
                              }
                            : {
                                gridColumnStart: item.x + 1,
                                gridColumnEnd: `span ${item.w}`,
                                gridRowStart: item.y + 1,
                                gridRowEnd: `span ${item.h}`,
                              };

                        return (
                            <div
                                key={widget.id}
                                data-testid={`builder-canvas-item-${widget.id}`}
                                className="relative group cursor-grab rounded-xl transition-opacity duration-200"
                                style={itemStyle}
                                onPointerDown={(event) => beginInteraction(event, item, 'move')}
                            >
                                <GridSelectionFrame
                                    isSelected={isSelected}
                                    isHighlighted={false}
                                    radius={widgetCornerRadius}
                                />

                                <WidgetHoverActions
                                    actions={[
                                        ...(isHeaderCompatibleWidget(widget) && headerOccupiedSlotCount < HEADER_WIDGET_SLOT_COUNT
                                            ? [{
                                                label: 'Subir al header',
                                                icon: ArrowUp,
                                                onClick: () => onPromoteToHeader?.(widget.id),
                                              }]
                                            : []),
                                        {
                                            label: 'Duplicar widget',
                                            icon: Copy,
                                            onClick: () => onDuplicate?.(widget.id),
                                        },
                                        {
                                            label: 'Eliminar widget',
                                            icon: Trash2,
                                            onClick: () => onDelete?.(widget.id),
                                        },
                                    ]}
                                />

                                {isSelected && (
                                    <ResizeHandle
                                        widgetId={widget.id}
                                        onPointerDown={(event) => beginInteraction(event, item, 'resize')}
                                    />
                                )}

                                <div
                                    data-testid={`builder-canvas-item-surface-${widget.id}`}
                                    className="pointer-events-none relative z-0 h-full w-full box-border"
                                    style={{ padding: 'var(--widget-spacing)' }}
                                >
                                    <WidgetRenderer
                                        widget={widget}
                                        equipmentMap={equipmentMap}
                                        isLoadingData={false}
                                        siblingWidgets={widgets}
                                        hierarchyContext={hierarchyContext}
                                        className="h-full w-full"
                                    />
                                </div>
                            </div>
                        );
                    })}

                    {layout.filter((item) => !headerWidgetIds?.has(item.widgetId)).length === 0 && (
                        <div style={{ gridColumn: '1 / -1' }} className="h-64 px-6">
                            <AdminEmptyState
                                icon={LayoutDashboard}
                                message="El dashboard está vacío"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
