import { ArrowUpDown, GitBranch, Pencil, Plus, Settings, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import HoverTooltip from '../ui/HoverTooltip';

interface HierarchyActionsRailProps {
    selectedNodeId: string | null;
    onAddRoot: () => void;
    onAddChild: () => void;
    onRename: () => void;
    onMove: () => void;
    onDelete: () => void;
    onConfigureTypes: () => void;
}

export default function HierarchyActionsRail({
    selectedNodeId,
    onAddRoot,
    onAddChild,
    onRename,
    onMove,
    onDelete,
    onConfigureTypes,
}: HierarchyActionsRailProps) {
    const hasSelection = selectedNodeId !== null;

    return (
        <div className="h-full w-full flex flex-col items-center py-3 gap-1">
            <HoverTooltip label="Agregar nodo raíz" position="right" className="flex">
                <button
                    type="button"
                    aria-label="Agregar nodo raíz"
                    onClick={onAddRoot}
                    className="h-9 w-9 inline-flex items-center justify-center rounded-md text-industrial-muted transition-colors hover:bg-white/5 hover:text-white"
                >
                    <Plus size={18} />
                </button>
            </HoverTooltip>

            <RailButton label="Agregar nodo hijo" onClick={onAddChild} disabled={!hasSelection} icon={<GitBranch size={18} />} />
            <RailButton label="Renombrar nodo" onClick={onRename} disabled={!hasSelection} icon={<Pencil size={18} />} />
            <RailButton label="Mover nodo" onClick={onMove} disabled={!hasSelection} icon={<ArrowUpDown size={18} />} />
            <RailButton label="Eliminar nodo" onClick={onDelete} disabled={!hasSelection} icon={<Trash2 size={18} />} />
            <div className="flex-1" />
            <RailButton label="Configurar tipos de nodo" onClick={onConfigureTypes} disabled={false} icon={<Settings size={18} />} />
        </div>
    );
}

function RailButton({
    label,
    onClick,
    disabled,
    icon,
}: {
    label: string;
    onClick: () => void;
    disabled: boolean;
    icon: ReactNode;
}) {
    return (
        <HoverTooltip label={label} position="right" className="flex">
            <button
                type="button"
                aria-label={label}
                onClick={onClick}
                disabled={disabled}
                className={`h-9 w-9 inline-flex items-center justify-center rounded-md text-industrial-muted transition-colors ${
                    disabled
                        ? 'opacity-30 cursor-not-allowed'
                        : 'hover:bg-white/5 hover:text-white'
                }`}
            >
                {icon}
            </button>
        </HoverTooltip>
    );
}
