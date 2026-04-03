import { Edit2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DragEvent, KeyboardEvent } from 'react';
import type { Dashboard, WidgetType } from '../../domain/admin.types';
import type { EquipmentSummary } from '../../domain/equipment.types';
import { getDashboardHeaderSubtitle, getDashboardHeaderTitle } from '../../utils/dashboardHeader';
import HeaderWidgetCanvas from './HeaderWidgetCanvas';

// =============================================================================
// DashboardHeader
// Header configurable del dashboard público (Visor Operativo) y del
// Builder Admin (modo preview).
// =============================================================================

interface InlineEditableTextProps {
    value?: string;
    fallback?: string;
    placeholder: string;
    onCommit: (value: string) => void;
    className: string;
    emptyClassName?: string;
    inputClassName: string;
    multiline?: boolean;
}

function InlineEditableText({
    value,
    fallback,
    placeholder,
    onCommit,
    className,
    emptyClassName,
    inputClassName,
    multiline = false,
}: InlineEditableTextProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [draftValue, setDraftValue] = useState(value ?? '');

    useEffect(() => {
        if (!isEditing) {
            setDraftValue(value ?? '');
        }
    }, [value, isEditing]);

    const displayValue = value ?? fallback ?? '';

    const commit = () => {
        onCommit(draftValue);
        setIsEditing(false);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !multiline) {
            event.preventDefault();
            commit();
        }

        if (event.key === 'Escape') {
            setDraftValue(value ?? '');
            setIsEditing(false);
        }
    };

    if (isEditing) {
        if (multiline) {
            return (
                <textarea
                    autoFocus
                    rows={2}
                    value={draftValue}
                    onChange={(event) => setDraftValue(event.target.value)}
                    onBlur={commit}
                    onKeyDown={handleKeyDown}
                    placeholder={fallback ?? placeholder}
                    className={inputClassName}
                />
            );
        }

        return (
            <input
                autoFocus
                value={draftValue}
                onChange={(event) => setDraftValue(event.target.value)}
                onBlur={commit}
                onKeyDown={handleKeyDown}
                placeholder={fallback ?? placeholder}
                className={inputClassName}
            />
        );
    }

    return (
        <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="group flex items-center gap-2 text-left"
            title="Editar directamente en el preview"
        >
            <span className={`${className} ${!displayValue ? emptyClassName ?? '' : ''}`}>
                {displayValue || placeholder}
            </span>
            <Edit2 size={14} className="shrink-0 text-industrial-muted/50 transition-colors group-hover:text-admin-accent" />
        </button>
    );
}

interface DashboardHeaderViewerProps {
    mode?: 'viewer';
    dashboard: Dashboard;
    equipmentMap: Map<string, EquipmentSummary>;
    onTitleChange?: never;
    onSubtitleChange?: never;
    onHeaderDragEnter?: never;
    onHeaderDragOver?: never;
    onHeaderDragLeave?: never;
    onHeaderDrop?: never;
    onRemoveHeaderWidget?: never;
    onDeleteHeaderWidget?: never;
    onReorderHeaderWidget?: never;
    selectedWidgetId?: never;
    onSelectHeaderWidget?: never;
    isHeaderDropActive?: never;
    canDropHeaderWidget?: never;
    onAddHeaderWidget?: never;
    onDropWidgetAtSlot?: never;
    publishedDashboards: Dashboard[];
    activeTabIndex: number;
    onTabChange: (index: number) => void;
}

interface DashboardHeaderPreviewProps {
    mode: 'preview';
    dashboard: Dashboard;
    equipmentMap: Map<string, EquipmentSummary>;
    onTitleChange?: (value: string) => void;
    onSubtitleChange?: (value: string) => void;
    onHeaderDragEnter?: (event: DragEvent<HTMLDivElement>) => void;
    onHeaderDragOver?: (event: DragEvent<HTMLDivElement>) => void;
    onHeaderDragLeave?: (event: DragEvent<HTMLDivElement>) => void;
    onHeaderDrop?: (event: DragEvent<HTMLDivElement>) => void;
    onRemoveHeaderWidget?: (widgetId: string) => void;
    onDeleteHeaderWidget?: (widgetId: string) => void;
    onReorderHeaderWidget?: (widgetId: string, targetWidgetId?: string) => void;
    selectedWidgetId?: string;
    onSelectHeaderWidget?: (widgetId: string) => void;
    isHeaderDropActive?: boolean;
    canDropHeaderWidget?: boolean;
    /** Crea un widget nuevo del tipo dado y lo asigna al header en el slot indicado */
    onAddHeaderWidget?: (type: WidgetType, slotIndex: number) => void;
    /** Asigna un widget existente (arrastrado desde el grid) al slot indicado */
    onDropWidgetAtSlot?: (widgetId: string, slotIndex: number) => void;
    publishedDashboards?: never;
    activeTabIndex?: never;
    onTabChange?: never;
}

type DashboardHeaderProps = DashboardHeaderViewerProps | DashboardHeaderPreviewProps;

export default function DashboardHeader({
    mode = 'viewer',
    dashboard,
    equipmentMap,
    onTitleChange,
    onSubtitleChange,
    onHeaderDragEnter,
    onHeaderDragOver,
    onHeaderDragLeave,
    onHeaderDrop,
    onRemoveHeaderWidget,
    onDeleteHeaderWidget,
    onReorderHeaderWidget,
    selectedWidgetId,
    onSelectHeaderWidget,
    isHeaderDropActive,
    canDropHeaderWidget,
    onAddHeaderWidget,
    onDropWidgetAtSlot,
    publishedDashboards,
    activeTabIndex,
    onTabChange,
}: DashboardHeaderProps) {
    const headerConfig = dashboard.headerConfig;
    const title = getDashboardHeaderTitle(dashboard);
    const subtitle = getDashboardHeaderSubtitle(dashboard);

    const widgetMap = new Map(dashboard.widgets.map(widget => [widget.id, widget]));
    const headerWidgets = (headerConfig?.widgetSlots ?? [])
        .map(slot => widgetMap.get(slot.widgetId))
        .filter(Boolean) as typeof dashboard.widgets;

    // Mapa widgetId → columna (0-indexed). Cuando el slot tiene `column` explícita
    // se usa ese valor; si no, se usa la posición del slot en el array como fallback.
    const widgetColumnMap = new Map<string, number>(
        (headerConfig?.widgetSlots ?? []).map((slot, idx) => [
            slot.widgetId,
            slot.column ?? idx,
        ])
    );

    const isPreview = mode === 'preview';
    const isEditablePreview = isPreview && Boolean(onTitleChange) && Boolean(onSubtitleChange);

    return (
        <div className="flex justify-between items-end gap-6 shrink-0">
            <div className="min-w-0 flex-1">
                {isEditablePreview ? (
                    <div className="space-y-1.5">
                        <InlineEditableText
                            value={title}
                            placeholder="Título del header"
                            onCommit={(value) => onTitleChange?.(value)}
                            className="text-5xl font-black tracking-tight text-industrial-text leading-none"
                            emptyClassName="text-industrial-muted/60"
                            inputClassName="w-full min-w-[20rem] bg-transparent text-5xl font-black tracking-tight text-industrial-text leading-none border-b border-white/10 focus:border-admin-accent/60 focus:outline-none"
                        />
                        <InlineEditableText
                            value={headerConfig?.subtitle}
                            fallback={dashboard.description}
                            placeholder="Subtítulo del header"
                            onCommit={(value) => onSubtitleChange?.(value)}
                            className="text-industrial-muted text-[11px] font-bold uppercase tracking-widest"
                            emptyClassName="text-industrial-muted/50"
                            inputClassName="w-full min-w-[20rem] resize-none bg-transparent text-industrial-muted text-[11px] font-bold uppercase tracking-widest border-b border-white/10 focus:border-admin-accent/60 focus:outline-none"
                            multiline
                        />
                    </div>
                ) : (
                    <>
                        <h1 className="text-5xl font-black tracking-tight text-industrial-text mb-1 leading-none">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="text-industrial-muted text-[11px] font-bold uppercase tracking-widest mt-1">
                                {subtitle}
                            </p>
                        )}
                    </>
                )}

            </div>

            <div className="flex gap-3 items-end">
                {mode === 'viewer' && publishedDashboards && publishedDashboards.length > 1 && (
                    <div className="mr-2 flex gap-1 rounded-lg border border-white/5 bg-white/5 p-1">
                        {publishedDashboards.map((dash, idx) => (
                            <button
                                key={dash.id}
                                onClick={() => onTabChange?.(idx)}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                                    activeTabIndex === idx
                                        ? 'bg-industrial-panel text-white shadow-sm'
                                        : 'text-industrial-muted hover:text-white'
                                }`}
                            >
                                {getDashboardHeaderTitle(dash)}
                            </button>
                        ))}
                    </div>
                )}

                {(isPreview || headerWidgets.length > 0) && (
                    <HeaderWidgetCanvas
                        widgets={headerWidgets}
                        widgetColumnMap={widgetColumnMap}
                        equipmentMap={equipmentMap}
                        mode={isPreview ? 'preview' : 'viewer'}
                        selectedWidgetId={selectedWidgetId}
                        onWidgetSelect={onSelectHeaderWidget}
                        onReorderWidget={onReorderHeaderWidget}
                        onRemoveWidget={onRemoveHeaderWidget}
                        onDeleteWidget={onDeleteHeaderWidget}
                        onHeaderDragEnter={onHeaderDragEnter}
                        onHeaderDragOver={onHeaderDragOver}
                        onHeaderDragLeave={onHeaderDragLeave}
                        onHeaderDrop={onHeaderDrop}
                        isHeaderDropActive={isHeaderDropActive}
                        canDropHeaderWidget={canDropHeaderWidget}
                        onAddHeaderWidget={onAddHeaderWidget}
                        onDropWidgetAtSlot={onDropWidgetAtSlot}
                    />
                )}
            </div>
        </div>
    );
}
