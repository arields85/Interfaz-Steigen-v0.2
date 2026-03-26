import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Loader2, Network, ChevronRight, LayoutDashboard,
    ExternalLink, Link2, Plus, Edit2, Trash2, FolderSymlink, Check
} from 'lucide-react';
import type { HierarchyNode, NodeType } from '../../domain/admin.types';
import type { Dashboard } from '../../domain/admin.types';
import { hierarchyStorage } from '../../services/HierarchyStorageService';
import { dashboardStorage } from '../../services/DashboardStorageService';
import { buildTree, getAncestors, type HierarchyNodeWithChildren } from '../../utils/hierarchyTree';
import HierarchyTree, { NODE_TYPE_LABELS } from '../../components/admin/HierarchyTree';

// =============================================================================
// HierarchyPage
// Módulo de Jerarquía de Planta dentro del Modo Administrador.
// Especificación Funcional Modo Admin §6 / §14
// =============================================================================

function NodeDetailPanel({
    node,
    allNodes,
    dashboards,
    onUpdate,
    onDelete,
    onAddChild,
    onMove
}: {
    node: HierarchyNodeWithChildren | null;
    allNodes: HierarchyNode[];
    dashboards: Dashboard[];
    onUpdate: (id: string, partial: Partial<Omit<HierarchyNode, 'id' | 'parentId'>>) => void;
    onDelete: (id: string) => void;
    onAddChild: (parentId: string, name: string, type: NodeType) => void;
    onMove: (id: string, newParentId: string | null) => void;
}) {
    const navigate = useNavigate();

    // Estados de UI locales
    const [isEditingName, setIsEditingName] = useState(false);
    const [editNameValue, setEditNameValue] = useState('');
    
    const [showAddChildModal, setShowAddChildModal] = useState(false);
    const [newChildName, setNewChildName] = useState('');
    const [newChildType, setNewChildType] = useState<NodeType>('equipment');

    const [showMoveModal, setShowMoveModal] = useState(false);
    const [moveTargetId, setMoveTargetId] = useState<string>('');

    // Sincronizar nombre al cambiar de nodo
    useEffect(() => {
        if (node) {
            setEditNameValue(node.name);
            setIsEditingName(false);
        }
    }, [node?.id, node?.name]);

    if (!node) {
        return (
            <div className="flex-1 flex items-center justify-center text-industrial-muted">
                <div className="text-center">
                    <Network size={40} className="mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-bold uppercase tracking-widest opacity-40">
                        Seleccioná un nodo para ver y editar sus detalles
                    </p>
                </div>
            </div>
        );
    }

    const breadcrumbs = getAncestors(node.id, allNodes);
    const hasChildren = node.children.length > 0;

    const handleSaveName = () => {
        if (editNameValue.trim() && editNameValue !== node.name) {
            onUpdate(node.id, { name: editNameValue.trim() });
        } else {
            setEditNameValue(node.name); // revert on empty
        }
        setIsEditingName(false);
    };

    const handleDashboardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        onUpdate(node.id, { linkedDashboardId: val === 'none' ? undefined : val });
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden relative">
            
            {/* TOOLBAR SUPERIOR DEL PANEL DETALLE */}
            <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 shrink-0 bg-white/[0.01]">
                {/* BREADCRUMBS */}
                <nav className="flex items-center gap-1 text-[10px] font-bold text-industrial-muted uppercase tracking-widest flex-wrap">
                    {breadcrumbs.map((ancestor, idx) => (
                        <span key={ancestor.id} className="flex items-center gap-1">
                            {idx > 0 && <ChevronRight size={10} className="opacity-40" />}
                            <span className={idx === breadcrumbs.length - 1 ? 'text-white/80' : ''}>
                                {ancestor.name}
                            </span>
                        </span>
                    ))}
                </nav>

                {/* ACCIONES DEL NODO */}
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setShowAddChildModal(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-accent-cyan/10 hover:bg-accent-cyan/20 border border-accent-cyan/20 text-accent-cyan rounded text-xs font-bold transition-colors"
                    >
                        <Plus size={14} /> Hijo
                    </button>
                    <button 
                        onClick={() => setShowMoveModal(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded text-xs font-bold transition-colors"
                    >
                        <FolderSymlink size={14} /> Mover
                    </button>
                    <button 
                        onClick={() => onDelete(node.id)}
                        disabled={hasChildren}
                        title={hasChildren ? "No se puede eliminar un nodo con hijos" : "Eliminar nodo"}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded text-xs font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {/* HEADER DEL NODO (RENOMBRABLE) */}
                <div className="flex items-start gap-4 mb-8">
                    <div className="w-full">
                        <div className="flex items-center gap-3 mb-1 w-full max-w-xl">
                            {isEditingName ? (
                                <div className="flex items-center gap-2 w-full">
                                    <input 
                                        autoFocus
                                        value={editNameValue}
                                        onChange={e => setEditNameValue(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                                        onBlur={handleSaveName}
                                        className="text-2xl font-black text-white bg-black/40 border border-accent-cyan/50 rounded px-2 py-1 w-full focus:outline-none"
                                    />
                                    <button onClick={handleSaveName} className="p-2 text-accent-cyan hover:bg-white/10 rounded">
                                        <Check size={20} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setIsEditingName(true)}>
                                    <h1 className="text-2xl font-black text-white tracking-tight group-hover:text-accent-cyan transition-colors">
                                        {node.name}
                                    </h1>
                                    <Edit2 size={14} className="text-white/20 group-hover:text-accent-cyan transition-colors" />
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-industrial-muted font-mono opacity-60 flex items-center gap-2">
                            id: {node.id} 
                            <span className="px-2 py-0.5 rounded border border-white/10 bg-white/5 text-[9px] font-black uppercase tracking-widest text-industrial-muted">
                                {NODE_TYPE_LABELS[node.type]}
                            </span>
                        </p>
                    </div>
                </div>

                {/* GRID DE PROPIEDADES */}
                <div className="grid grid-cols-1 gap-4 max-w-2xl">

                    {/* Dashboard vinculado (EDITABLE) */}
                    <div className="glass-panel border-accent-cyan/10 p-4 flex items-start gap-3 relative">
                        <LayoutDashboard size={16} className={`${node.linkedDashboardId ? 'text-accent-cyan' : 'text-industrial-muted'} shrink-0 mt-0.5`} />
                        <div className="flex-1 w-full relative">
                            <p className="text-[10px] font-black uppercase tracking-widest text-industrial-muted mb-2">
                                Dashboard vinculado
                            </p>
                            
                            <select 
                                value={node.linkedDashboardId || 'none'}
                                onChange={handleDashboardChange}
                                className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white font-medium focus:outline-none focus:border-accent-cyan/40 appearance-none cursor-pointer mb-3"
                            >
                                <option value="none">-- Sin dashboard asignado --</option>
                                {dashboards.map(d => (
                                    <option key={d.id} value={d.id}>
                                        {d.name} {d.status === 'published' ? '(Público)' : '(Borrador)'}
                                    </option>
                                ))}
                            </select>

                            {node.linkedDashboardId && (
                                <button
                                    onClick={() => navigate(`/admin/builder/${node.linkedDashboardId}`)}
                                    className="flex w-fit items-center gap-2 px-3 py-1.5 bg-accent-cyan/10 hover:bg-accent-cyan/20 border border-accent-cyan/20 text-accent-cyan rounded text-xs font-bold transition-colors"
                                >
                                    <ExternalLink size={12} /> Abrir Editor Visual
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Activo asociado (Solo lectura V1) */}
                    <div className="glass-panel border-emerald-500/10 p-4 flex items-start gap-3">
                        <Link2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400/60 mb-2">
                                Activo IoT asociado
                            </p>
                            <input 
                                disabled
                                value={node.linkedAssetId || 'Ninguno (Solo lectura en V1)'}
                                className="w-full bg-black/30 border border-white/5 rounded px-3 py-2 text-sm text-industrial-muted font-medium cursor-not-allowed"
                            />
                        </div>
                    </div>

                    {/* Sub-nodos Info */}
                    {hasChildren && (
                        <div className="glass-panel border-white/5 p-4 flex items-start gap-3">
                            <Network size={16} className="text-industrial-muted shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-industrial-muted mb-1">
                                    Jerarquía Descendente
                                </p>
                                <p className="text-sm text-white">
                                    Contiene {node.children.length} nodo{node.children.length !== 1 ? 's' : ''} directos.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL: Añadir Hijo */}
            {showAddChildModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="glass-panel border-white/10 p-6 w-full max-w-sm space-y-4">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Nuevo Nodo Hijo</h3>
                        
                        <div>
                            <label className="block text-[10px] font-bold text-industrial-muted uppercase tracking-widest mb-1.5">Nombre</label>
                            <input
                                autoFocus
                                type="text"
                                value={newChildName}
                                onChange={e => setNewChildName(e.target.value)}
                                className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-cyan/40"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-industrial-muted uppercase tracking-widest mb-1.5">Tipo</label>
                            <select
                                value={newChildType}
                                onChange={e => setNewChildType(e.target.value as NodeType)}
                                className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-cyan/40"
                            >
                                {Object.entries(NODE_TYPE_LABELS).map(([val, label]) => (
                                    <option key={val} value={val}>{label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button onClick={() => setShowAddChildModal(false)} className="px-4 py-2 text-xs font-bold text-industrial-muted hover:text-white transition-colors">Cancelar</button>
                            <button 
                                onClick={() => {
                                    if(newChildName.trim()){
                                        onAddChild(node.id, newChildName.trim(), newChildType);
                                        setShowAddChildModal(false);
                                        setNewChildName('');
                                    }
                                }}
                                disabled={!newChildName.trim()}
                                className="px-4 py-2 bg-accent-cyan text-black rounded text-xs font-bold shadow-[0_0_10px_rgba(0,194,255,0.3)] disabled:opacity-50"
                            >Crear</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: Mover Nodo */}
            {showMoveModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="glass-panel border-white/10 p-6 w-full max-w-sm space-y-4">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Reubicar Nodo</h3>
                        <p className="text-xs text-industrial-muted">
                            ¿Bajo qué nodo padre querés mover "{node.name}"?
                        </p>
                        
                        <select
                            value={moveTargetId}
                            onChange={e => setMoveTargetId(e.target.value)}
                            className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-cyan/40"
                        >
                            <option value="">-- Mover a la Raíz (Sin padre) --</option>
                            {allNodes
                                .filter(n => n.id !== node.id) // Simplificado: el backend validará los ciclos
                                .map(n => (
                                <option key={n.id} value={n.id}>
                                    {getAncestors(n.id, allNodes).map(a=>a.name).join(' > ')}
                                </option>
                            ))}
                        </select>

                        <div className="flex justify-end gap-2 pt-2">
                            <button onClick={() => setShowMoveModal(false)} className="px-4 py-2 text-xs font-bold text-industrial-muted hover:text-white transition-colors">Cancelar</button>
                            <button 
                                onClick={() => {
                                    onMove(node.id, moveTargetId || null);
                                    setShowMoveModal(false);
                                }}
                                className="px-4 py-2 bg-accent-cyan text-black rounded text-xs font-bold shadow-[0_0_10px_rgba(0,194,255,0.3)]"
                            >Confirmar Mover</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

// ---- Página principal ----
export default function HierarchyPage() {
    const [allNodes, setAllNodes] = useState<HierarchyNode[]>([]);
    const [dashboards, setDashboards] = useState<Dashboard[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    const load = async () => {
        try {
            const [nodes, dashs] = await Promise.all([
                hierarchyStorage.getNodes(),
                dashboardStorage.getDashboards()
            ]);
            setAllNodes(nodes);
            setDashboards(dashs);
        } catch (err) {
            console.error('Error cargando datos de jerarquía:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const tree = useMemo(() => buildTree(allNodes), [allNodes]);
    
    // Obtenemos el selectedNode derivado
    const selectedNode = useMemo(() => {
        if (!selectedNodeId) return null;
        // Búsqueda profunda en el tree renderizado
        let found: HierarchyNodeWithChildren | null = null;
        const findRecursive = (nodes: HierarchyNodeWithChildren[]) => {
            for (const n of nodes) {
                if (n.id === selectedNodeId) found = n;
                if (!found && n.children.length > 0) findRecursive(n.children);
            }
        };
        findRecursive(tree);
        return found;
    }, [selectedNodeId, tree]);

    // Handlers CRUD
    const handleAddRoot = async () => {
        const name = prompt("Nombre de la nueva locación/planta raíz:");
        if (name) {
            await hierarchyStorage.createNode(name, 'plant', null);
            await load();
        }
    };

    const handleUpdateNode = async (id: string, partial: Partial<Omit<HierarchyNode, 'id' | 'parentId'>>) => {
        await hierarchyStorage.updateNode(id, partial);
        await load();
    };

    const handleDeleteNode = async (id: string) => {
        if (window.confirm("¿Seguro que deseas eliminar el nodo seleccionado?")) {
            const success = await hierarchyStorage.deleteNode(id);
            if (!success) {
                alert("No se puede eliminar un nodo que contiene sub-nodos. Elimina primero a los hijos o muévelos.");
            } else {
                if (selectedNodeId === id) setSelectedNodeId(null);
                await load();
            }
        }
    };

    const handleAddChild = async (parentId: string, name: string, type: NodeType) => {
        await hierarchyStorage.createNode(name, type, parentId);
        await load();
    };

    const handleMoveNode = async (id: string, newParentId: string | null) => {
        const success = await hierarchyStorage.updateNodeParent(id, newParentId);
        if (!success) {
            alert("No se puede mover el nodo allí. Operación inválida o ciclo infinito (un nodo padre no puede ser movido dentro de su propio descendiente).");
        } else {
            await load();
        }
    };

    return (
        <div className="flex h-full overflow-hidden">

            {/* PANEL IZQUIERDO — Árbol */}
            <aside className="w-72 border-r border-white/5 flex flex-col shrink-0 bg-industrial-panel/20 overflow-hidden relative">
                <div className="h-14 px-4 border-b border-white/5 shrink-0 flex items-center justify-between">
                    <h2 className="text-[10px] font-black uppercase tracking-widest text-industrial-muted flex items-center gap-2">
                        <Network size={12} />
                        Estructura Planta
                    </h2>
                    <button 
                        onClick={handleAddRoot}
                        title="Crear nueva Planta/Sitio (Raíz)"
                        className="p-1.5 hover:bg-white/10 text-white/60 hover:text-white rounded transition-colors"
                    >
                        <Plus size={14} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="animate-spin text-accent-cyan" size={24} />
                        </div>
                    ) : (
                        <HierarchyTree
                            nodes={tree}
                            selectedNodeId={selectedNodeId || undefined}
                            onSelect={(n) => setSelectedNodeId(n.id)}
                        />
                    )}
                </div>
            </aside>

            {/* PANEL DERECHO — Detalle */}
            <NodeDetailPanel 
                node={selectedNode} 
                allNodes={allNodes}
                dashboards={dashboards}
                onUpdate={handleUpdateNode}
                onDelete={handleDeleteNode}
                onAddChild={handleAddChild}
                onMove={handleMoveNode}
            />

        </div>
    );
}
