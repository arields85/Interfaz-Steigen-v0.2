import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Lock, Plus, Trash2, X } from 'lucide-react';
import type { CatalogVariable } from '../../domain';
import AnchoredOverlay from '../ui/AnchoredOverlay';
import HoverTooltip from '../ui/HoverTooltip';
import { ADMIN_SIDEBAR_HINT_CLS, ADMIN_SIDEBAR_INPUT_CLS } from './adminSidebarStyles';

interface CatalogVariableSelectorProps {
    variables: CatalogVariable[];
    selectedId?: string;
    usedIds: string[];
    onChange: (variableId: string | undefined) => void;
    onDelete?: (variableId: string) => void;
    onCreateNew: (name: string) => void;
    hasRequiredError?: boolean;
    disabled?: boolean;
}

export default function CatalogVariableSelector({
    variables,
    selectedId,
    usedIds,
    onChange,
    onDelete,
    onCreateNew,
    hasRequiredError = false,
    disabled = false,
}: CatalogVariableSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [draftName, setDraftName] = useState('');
    const triggerRef = useRef<HTMLButtonElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const usedIdSet = useMemo(() => new Set(usedIds), [usedIds]);
    const selectedVariable = variables.find((variable) => variable.id === selectedId);
    const estimatedHeight = isCreating ? 140 : Math.min(variables.length * 30 + 76, 320);
    const canConfirm = draftName.trim().length > 0;
    const showRequiredErrorState = hasRequiredError && !selectedVariable && !isOpen;

    useEffect(() => {
        if (isOpen && isCreating) {
            inputRef.current?.focus();
        }
    }, [isCreating, isOpen]);

    const closeOverlay = () => {
        setIsOpen(false);
        setIsCreating(false);
        setDraftName('');
    };

    const handleToggle = () => {
        if (disabled) {
            return;
        }

        setIsOpen((current) => !current);
    };

    const handleCreateConfirm = () => {
        const normalizedName = draftName.trim();
        if (!normalizedName) {
            return;
        }

        onCreateNew(normalizedName);
        closeOverlay();
    };

    return (
        <div className="relative w-full">
            <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                onClick={handleToggle}
                className={`${ADMIN_SIDEBAR_INPUT_CLS} flex items-center justify-between gap-2 ${disabled ? 'cursor-not-allowed border-white/5 bg-black/20 text-white/35 hover:border-white/5' : 'hover:border-white/20'} ${showRequiredErrorState ? 'border-status-critical/40' : ''}`}
            >
                <span className="flex min-w-0 items-center gap-1.5 truncate">
                    {selectedVariable ? (
                        <>
                            <span className="truncate">{selectedVariable.name}</span>
                            <span className={`shrink-0 rounded bg-white/5 px-1.5 py-0.5 font-mono ${ADMIN_SIDEBAR_HINT_CLS}`} style={{ fontWeight: 'var(--font-weight-mono)' }}>
                                {selectedVariable.unit}
                            </span>
                        </>
                    ) : (
                        <span className={`truncate ${disabled ? 'text-white/35' : showRequiredErrorState ? 'text-status-critical' : 'text-industrial-muted'}`}>Seleccionar variable...</span>
                    )}
                </span>
                <ChevronDown size={10} className={`shrink-0 transition-transform ${disabled ? 'text-white/20' : 'text-white/40'} ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnchoredOverlay
                triggerRef={triggerRef}
                isOpen={isOpen && !disabled}
                onClose={closeOverlay}
                estimatedHeight={estimatedHeight}
                minWidth="trigger"
                align="start"
                gap={4}
            >
                <div className="overflow-hidden rounded-md border border-white/10 bg-industrial-surface shadow-xl">
                    {isCreating ? (
                        <div className="flex flex-col gap-3 p-3">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-industrial-muted">
                                <Plus size={12} className="text-admin-accent" />
                                Crear variable
                            </div>

                            <input
                                ref={inputRef}
                                type="text"
                                value={draftName}
                                onChange={(event) => setDraftName(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        event.preventDefault();
                                        handleCreateConfirm();
                                    }
                                    if (event.key === 'Escape') {
                                        event.preventDefault();
                                        closeOverlay();
                                    }
                                }}
                                className={ADMIN_SIDEBAR_INPUT_CLS}
                                placeholder="Ej. Temperatura descarga"
                            />

                            <div className="flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={closeOverlay}
                                    className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-industrial-muted transition-colors hover:bg-white/10 hover:text-white"
                                >
                                    <X size={11} /> Cancelar
                                </button>
                                <button
                                    type="button"
                                    disabled={!canConfirm}
                                    onClick={handleCreateConfirm}
                                    className="inline-flex items-center gap-1 rounded border border-admin-accent/30 bg-admin-accent/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-admin-accent transition-colors hover:bg-admin-accent/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-industrial-muted"
                                >
                                    <Check size={11} /> Confirmar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="py-1">
                            {variables.length === 0 && (
                                <div className="px-3 py-2 text-xs text-industrial-muted">
                                    No hay variables disponibles para esta unidad.
                                </div>
                            )}

                            {variables.map((variable) => {
                                const isUsedByAnotherWidget = usedIdSet.has(variable.id) && variable.id !== selectedId;

                                return (
                                    <div
                                        key={variable.id}
                                        className={`group flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                                            variable.id === selectedId
                                                ? 'bg-white/5'
                                                : 'hover:bg-white/5'
                                        }`}
                                    >
                                        <button
                                            type="button"
                                            disabled={isUsedByAnotherWidget}
                                            onClick={() => {
                                                onChange(variable.id);
                                                closeOverlay();
                                            }}
                                            className={`flex min-w-0 flex-1 items-center justify-between gap-3 text-left transition-colors ${
                                                isUsedByAnotherWidget
                                                    ? 'cursor-not-allowed text-white/20'
                                                    : variable.id === selectedId
                                                        ? 'text-admin-accent'
                                                        : 'text-slate-400 group-hover:text-admin-accent'
                                            }`}
                                        >
                                            <span className="truncate">{variable.name}</span>
                                            {isUsedByAnotherWidget ? (
                                                <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-status-warning">
                                                    <Lock size={10} /> En uso
                                                </span>
                                            ) : null}
                                        </button>

                                        {onDelete ? (
                                            <HoverTooltip
                                                label={`Eliminar variable ${variable.name}`}
                                                position="top"
                                                className="flex"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        event.stopPropagation();
                                                        onDelete(variable.id);
                                                        closeOverlay();
                                                    }}
                                                    className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-industrial-muted opacity-0 transition-all group-hover:opacity-100 group-focus-within:opacity-100 hover:text-status-critical"
                                                    aria-label={`Eliminar variable ${variable.name}`}
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </HoverTooltip>
                                        ) : null}
                                    </div>
                                );
                            })}

                            <div className="my-1 border-t border-white/5" />

                            <button
                                type="button"
                                onClick={() => setIsCreating(true)}
                                className="block w-full px-3 py-1.5 text-left text-xs text-admin-accent transition-colors hover:bg-white/5"
                            >
                                <span className="flex items-center gap-1.5">
                                    <Plus size={12} className="shrink-0" />
                                    Crear variable
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            </AnchoredOverlay>
        </div>
    );
}
