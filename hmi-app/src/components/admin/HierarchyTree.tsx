import {
    ChevronRight,
    ChevronDown,
    Square,
    FolderOpen,
    Folder,
    LayoutDashboard,
    type LucideIcon,
} from 'lucide-react';
import type { HierarchyNodeWithChildren } from '../../utils/hierarchyTree';
import type { NodeTypeDefinition } from '../../services/NodeTypeStorageService';
import { AVAILABLE_NODE_ICONS, DEFAULT_ICON_KEY } from '../../utils/nodeTypeIcons';
import AdminEmptyState from './AdminEmptyState';

// =============================================================================
// HierarchyTree
// Árbol navegable de la jerarquía de planta del Modo Administrador.
// Render recursivo con íconos tipados por NodeType, colapsable por nivel.
//
// Especificación Funcional Modo Admin §6
// =============================================================================

interface HierarchyTreeProps {
    nodes: HierarchyNodeWithChildren[];
    nodeTypes: NodeTypeDefinition[];
    selectedNodeId?: string;
    expandedNodeIds: Set<string>;
    onToggleExpand: (nodeId: string) => void;
    onSelect: (node: HierarchyNodeWithChildren) => void;
}

// Íconos semánticos por tipo de nodo
function NodeIcon({ type, isOpen, nodeTypes }: { type: string; isOpen: boolean; nodeTypes: NodeTypeDefinition[] }) {
    const typeDefinition = nodeTypes.find((nodeType) => nodeType.key === type);
    const iconKey = typeDefinition?.icon ?? DEFAULT_ICON_KEY;
    const iconDefinition = AVAILABLE_NODE_ICONS[iconKey];
    const colorClassName = typeDefinition?.color ?? iconDefinition?.defaultColor ?? 'text-industrial-muted';
    const Icon: LucideIcon = iconDefinition?.component ?? Square;

    if (iconKey === 'folder') {
        const FolderIcon = isOpen ? FolderOpen : Folder;
        return <FolderIcon size={15} className={`shrink-0 ${colorClassName}`} />;
    }

    return <Icon size={15} className={`shrink-0 ${colorClassName}`} />;
}

// Nodo individual recursivo
function TreeNode({
    node,
    depth,
    selectedNodeId,
    expandedNodeIds,
    nodeTypes,
    onToggleExpand,
    onSelect,
}: {
    node: HierarchyNodeWithChildren;
    depth: number;
    selectedNodeId?: string;
    expandedNodeIds: Set<string>;
    nodeTypes: NodeTypeDefinition[];
    onToggleExpand: (nodeId: string) => void;
    onSelect: (node: HierarchyNodeWithChildren) => void;
}) {
    const hasChildren = node.children.length > 0;
    const isSelected = node.id === selectedNodeId;
    const isOpen = expandedNodeIds.has(node.id);

    const toggleOpen = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (hasChildren) onToggleExpand(node.id);
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
                <NodeIcon type={node.type} isOpen={isOpen} nodeTypes={nodeTypes} />

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
                            expandedNodeIds={expandedNodeIds}
                            nodeTypes={nodeTypes}
                            onToggleExpand={onToggleExpand}
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
    nodeTypes,
    selectedNodeId,
    expandedNodeIds,
    onToggleExpand,
    onSelect,
}: HierarchyTreeProps) {
    if (nodes.length === 0) {
        return (
            <div className="h-full p-4">
                <AdminEmptyState
                    icon={FolderOpen}
                    message="La jerarquía está vacía."
                />
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
                    expandedNodeIds={expandedNodeIds}
                    nodeTypes={nodeTypes}
                    onToggleExpand={onToggleExpand}
                    onSelect={onSelect}
                />
            ))}
        </div>
    );
}
