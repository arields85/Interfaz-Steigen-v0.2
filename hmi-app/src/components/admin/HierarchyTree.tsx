import { useState } from 'react';
import {
    ChevronRight,
    ChevronDown,
    Factory,
    Layers,
    Grid3X3,
    Minus,
    Square,
    Cpu,
    FolderOpen,
    Folder,
    Users,
    LayoutDashboard,
    Box
} from 'lucide-react';
import type { NodeType } from '../../domain/admin.types';
import type { HierarchyNodeWithChildren } from '../../utils/hierarchyTree';

// =============================================================================
// HierarchyTree
// Árbol navegable de la jerarquía de planta del Modo Administrador.
// Render recursivo con íconos tipados por NodeType, colapsable por nivel.
//
// Especificación Funcional Modo Admin §6
// =============================================================================

interface HierarchyTreeProps {
    nodes: HierarchyNodeWithChildren[];
    selectedNodeId?: string;
    onSelect: (node: HierarchyNodeWithChildren) => void;
}

// Íconos semánticos por tipo de nodo
function NodeIcon({ type, isOpen }: { type: NodeType; isOpen: boolean }) {
    const cls = 'shrink-0';
    const size = 15;

    switch (type) {
        case 'plant':    return <Factory size={size} className={`${cls} text-accent-cyan`} />;
        case 'area':     return <Layers size={size} className={`${cls} text-blue-400`} />;
        case 'sector':   return <Grid3X3 size={size} className={`${cls} text-indigo-400`} />;
        case 'line':     return <Minus size={size} className={`${cls} text-violet-400`} />;
        case 'cell':     return <Square size={size} className={`${cls} text-purple-400`} />;
        case 'box':      return <Box size={size} className={`${cls} text-amber-400`} />;
        case 'equipment':return <Cpu size={size} className={`${cls} text-emerald-400`} />;
        case 'folder':   return isOpen
            ? <FolderOpen size={size} className={`${cls} text-yellow-400`} />
            : <Folder size={size} className={`${cls} text-yellow-400`} />;
        case 'group':    return <Users size={size} className={`${cls} text-rose-400`} />;
        default:         return <Square size={size} className={cls} />;
    }
}

// Badges de tipo de nodo
const NODE_TYPE_LABELS: Record<NodeType, string> = {
    plant: 'Planta',
    area: 'Área',
    sector: 'Sector',
    line: 'Línea',
    cell: 'Celda',
    box: 'Box',
    equipment: 'Equipo',
    folder: 'Carpeta',
    group: 'Grupo',
};

export { NODE_TYPE_LABELS };

// Nodo individual recursivo
function TreeNode({
    node,
    depth,
    selectedNodeId,
    onSelect,
}: {
    node: HierarchyNodeWithChildren;
    depth: number;
    selectedNodeId?: string;
    onSelect: (node: HierarchyNodeWithChildren) => void;
}) {
    const hasChildren = node.children.length > 0;
    const isSelected = node.id === selectedNodeId;

    // Los nodos raíz (plant) comienzan expandidos; el resto empieza colapsado
    const [isOpen, setIsOpen] = useState(depth === 0);

    const toggleOpen = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (hasChildren) setIsOpen(prev => !prev);
    };

    const indentPx = depth * 16;

    return (
        <div>
            <button
                className={`w-full flex items-center gap-1.5 py-1.5 pr-3 rounded-md text-sm text-left transition-all group ${
                    isSelected
                        ? 'bg-admin-accent/10 text-admin-accent border border-admin-accent/20'
                        : 'text-industrial-muted hover:bg-white/[0.04] hover:text-industrial-text'
                }`}
                style={{ paddingLeft: `${indentPx + 8}px` }}
                onClick={() => onSelect(node)}
            >
                {/* Expander */}
                <span
                    className={`w-4 h-4 flex items-center justify-center shrink-0 ${
                        hasChildren ? 'cursor-pointer' : 'opacity-0 pointer-events-none'
                    }`}
                    onClick={toggleOpen}
                >
                    {hasChildren && (
                        isOpen
                            ? <ChevronDown size={12} />
                            : <ChevronRight size={12} />
                    )}
                </span>

                {/* Ícono de tipo */}
                <NodeIcon type={node.type} isOpen={isOpen} />

                {/* Nombre */}
                <span className="flex-1 truncate font-medium text-xs">
                    {node.name}
                </span>

                {/* Indicador de dashboard vinculado */}
                {node.linkedDashboardId && (
                    <LayoutDashboard
                        size={11}
                        className="shrink-0 text-admin-accent/60"
                    />
                )}
            </button>

            {/* Hijos */}
            {hasChildren && isOpen && (
                <div>
                    {node.children.map(child => (
                        <TreeNode
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            selectedNodeId={selectedNodeId}
                            onSelect={onSelect}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// Árbol raíz
export default function HierarchyTree({
    nodes,
    selectedNodeId,
    onSelect,
}: HierarchyTreeProps) {
    if (nodes.length === 0) {
        return (
            <div className="p-4 text-xs text-industrial-muted italic text-center">
                La jerarquía está vacía.
            </div>
        );
    }

    return (
        <div className="space-y-0.5 px-2">
            {nodes.map(root => (
                <TreeNode
                    key={root.id}
                    node={root}
                    depth={0}
                    selectedNodeId={selectedNodeId}
                    onSelect={onSelect}
                />
            ))}
        </div>
    );
}
