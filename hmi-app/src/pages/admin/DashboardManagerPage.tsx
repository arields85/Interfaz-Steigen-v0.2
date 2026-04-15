import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutTemplate, FileEdit, Copy, Trash2, Plus, Edit2, Check,
    GripVertical, Loader2, Search, SearchX, LayoutDashboard,
    Bookmark
} from 'lucide-react';
import { dashboardStorage } from '../../services/DashboardStorageService';
import { templateStorage } from '../../services/TemplateStorageService';
import { hierarchyStorage } from '../../services/HierarchyStorageService';
import type { Dashboard, HierarchyNode, Template } from '../../domain/admin.types';
import { getDashboardVisualStatus } from '../../domain/admin.types';
import { getDashboardHeaderSubtitle, getDashboardHeaderTitle } from '../../utils/dashboardHeader';
import AdminWorkspaceLayout from '../../components/admin/AdminWorkspaceLayout';
import { loadNodeTypeLabels, resolveTypeLabel } from '../../utils/nodeTypeLabels';
import {
    ADMIN_CONTEXT_BAR_LABEL_CLS,
    ADMIN_SIDEBAR_INPUT_CLS,
    ADMIN_SIDEBAR_PANEL_CLS,
    ADMIN_SIDEBAR_PANEL_STACK_CLS,
    ADMIN_SIDEBAR_PANEL_TITLE_CLS,
    ADMIN_SIDEBAR_SECTION_CLS,
} from '../../components/admin/adminSidebarStyles';
import AdminEmptyState from '../../components/admin/AdminEmptyState';
import AdminDialog from '../../components/admin/AdminDialog';
import AdminDestructiveDialog from '../../components/admin/AdminDestructiveDialog';
import AdminActionButton from '../../components/admin/AdminActionButton';
import AdminTag from '../../components/admin/AdminTag';

function getVisibleDashboardSubtitle(dashboard: Dashboard, activeTemplateIds: Set<string>) {
    const subtitle = getDashboardHeaderSubtitle(dashboard);

    if (!subtitle) {
        return undefined;
    }

    const templateDerivedPrefix = 'Creado desde template:';

    if (subtitle.startsWith(templateDerivedPrefix)) {
        const templateName = subtitle.slice(templateDerivedPrefix.length).trim();

        if (!dashboard.templateId || activeTemplateIds.has(dashboard.templateId)) {
            return templateName || undefined;
        }
    }

    if (
        dashboard.templateId
        && !activeTemplateIds.has(dashboard.templateId)
        && subtitle.startsWith(templateDerivedPrefix)
    ) {
        return undefined;
    }

    return subtitle;
}

function getSuggestedTemplateName(dashboard: Dashboard) {
    const baseName = getDashboardHeaderTitle(dashboard).replace(/\s+—\s+Nuevo$/, '').trim();
    return `${baseName} (Template)`;
}

function getSuggestedDuplicateName(dashboard: Dashboard) {
    return `${getDashboardHeaderTitle(dashboard)} (copia)`;
}

function getDashboardTypeLabel(
    dashboardType: string,
    ownerNodeId: string | undefined,
    nodeMap: Map<string, HierarchyNode>,
) {
    const ownerNode = ownerNodeId ? nodeMap.get(ownerNodeId) : undefined;
    if (ownerNode) return resolveTypeLabel(ownerNode.type);
    if (!ownerNodeId) return '—';
    return resolveTypeLabel(dashboardType);
}

function getTemplateTypeLabel(dashboardType: string | undefined) {
    return resolveTypeLabel(dashboardType);
}

function getWidgetCountLabel(widgetCount: number) {
    return `${widgetCount} ${widgetCount === 1 ? 'widget' : 'widgets'}`;
}

// =============================================================================
// DashboardManagerPage
// Gestor de dashboards y templates del Modo Administrador.
// Especificación Funcional Modo Admin §7 / §13
// =============================================================================

export default function DashboardManagerPage() {
    const DASHBOARD_LIST_GRID_CLS = 'grid-cols-[2rem_2fr_1fr_1fr_1fr_10rem]';
    const navigate = useNavigate();

    const [dashboards, setDashboards] = useState<Dashboard[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [nodeMap, setNodeMap] = useState<Map<string, HierarchyNode>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [showTemplatePrompt, setShowTemplatePrompt] = useState<string | null>(null);
    const [templateName, setTemplateName] = useState('');
    const [showDuplicatePrompt, setShowDuplicatePrompt] = useState<string | null>(null);
    const [duplicateName, setDuplicateName] = useState('');
    const [deleteDashboardId, setDeleteDashboardId] = useState<string | null>(null);
    const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
    const [editingTemplateName, setEditingTemplateName] = useState('');
    const [draggingDashboardId, setDraggingDashboardId] = useState<string | null>(null);
    const [dragOverDashboardId, setDragOverDashboardId] = useState<string | null>(null);
    const [dashboardSearch, setDashboardSearch] = useState('');
    const [, setNodeTypeLabelsVersion] = useState(0);

    useEffect(() => {
        void loadNodeTypeLabels().then(() => {
            setNodeTypeLabelsVersion((current) => current + 1);
        });
    }, []);

    useEffect(() => {
        const loadAll = async () => {
            setIsLoading(true);
            try {
                const [dashData, tplData, hierarchyNodes] = await Promise.all([
                    dashboardStorage.getDashboards(),
                    templateStorage.getTemplates(),
                    hierarchyStorage.getNodes(),
                ]);
                setDashboards(dashData);
                setTemplates(tplData);
                setNodeMap(new Map(hierarchyNodes.map((node) => [node.id, node])));
            } catch (error) {
                console.error("Error cargando datos:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadAll();
    }, []);

    const handleCreateNew = async () => {
        try {
            const newDash = await dashboardStorage.createEmptyDashboard('Nuevo Dashboard');
            navigate(`/admin/builder/${newDash.id}`);
        } catch (error) {
            console.error("Error creando dashboard:", error);
        }
    };

    const handleDelete = (id: string) => {
        setDeleteDashboardId(id);
    };

    const handleConfirmDeleteDashboard = async () => {
        if (!deleteDashboardId) return;
        const id = deleteDashboardId;
        setDeleteDashboardId(null);

        try {
            await dashboardStorage.deleteDashboard(id);
            setDashboards(dashboards.filter(d => d.id !== id));
        } catch (error) {
            console.error("Error eliminando dashboard:", error);
        }
    };

    const handleDuplicate = async (id: string, newName?: string) => {
        const trimmedName = newName?.trim();

        if (newName !== undefined && !trimmedName) {
            return;
        }

        try {
            const duplicate = await dashboardStorage.duplicateDashboard(id, trimmedName);
            if (duplicate) {
                setDashboards(prev => [...prev, duplicate]);
            }
        } catch (error) {
            console.error("Error duplicando dashboard:", error);
        }
    };

    const handleConfirmDuplicate = async () => {
        if (!showDuplicatePrompt || !duplicateName.trim()) {
            return;
        }

        const dashboardId = showDuplicatePrompt;
        const nextDuplicateName = duplicateName.trim();

        await handleDuplicate(dashboardId, nextDuplicateName);
        setShowDuplicatePrompt(null);
        setDuplicateName('');
    };

    const handleSaveAsTemplate = async (dashId: string) => {
        if (!templateName.trim()) return;
        try {
            const dash = dashboards.find(d => d.id === dashId);
            if (!dash) return;
            // Resolver tipo efectivo: desde jerarquía si asignado, vacío si no asignado
            const ownerNode = dash.ownerNodeId ? nodeMap.get(dash.ownerNodeId) : undefined;
            const effectiveDash = {
                ...dash,
                dashboardType: (ownerNode
                    ? ownerNode.type
                    : 'none') as Dashboard['dashboardType'],
            };
            const tpl = await templateStorage.createFromDashboard(effectiveDash, templateName.trim());
            setTemplates(prev => [...prev, tpl]);
            setShowTemplatePrompt(null);
            setTemplateName('');
        } catch (error) {
            console.error("Error creando template:", error);
        }
    };

    const handleCreateFromTemplate = async (template: Template) => {
        try {
            const dash = await dashboardStorage.createFromTemplate(
                template,
                `${template.name} — Nuevo`
            );
            navigate(`/admin/builder/${dash.id}`);
        } catch (error) {
            console.error("Error creando desde template:", error);
        }
    };

    const handleDeleteTemplate = (id: string) => {
        setDeleteTemplateId(id);
    };

    const handleConfirmDeleteTemplate = async () => {
        if (!deleteTemplateId) return;
        const id = deleteTemplateId;
        setDeleteTemplateId(null);

        try {
            await templateStorage.deleteTemplate(id);
            setTemplates(templates.filter(t => t.id !== id));
        } catch (error) {
            console.error("Error eliminando template:", error);
        }
    };

    const handleStartTemplateRename = (template: Template) => {
        setEditingTemplateId(template.id);
        setEditingTemplateName(template.name);
    };

    const handleCommitTemplateRename = async (template: Template) => {
        const nextName = editingTemplateName.trim();

        if (!nextName || nextName === template.name) {
            setEditingTemplateId(null);
            setEditingTemplateName('');
            return;
        }

        try {
            const updatedTemplate = { ...template, name: nextName };
            await templateStorage.saveTemplate(updatedTemplate);
            setTemplates((current) => current.map((item) => item.id === template.id ? updatedTemplate : item));
        } catch (error) {
            console.error('Error renombrando template:', error);
        } finally {
            setEditingTemplateId(null);
            setEditingTemplateName('');
        }
    };

    const moveDashboard = (items: Dashboard[], sourceId: string, targetId: string) => {
        if (sourceId === targetId) {
            return items;
        }

        const sourceIndex = items.findIndex((item) => item.id === sourceId);
        const targetIndex = items.findIndex((item) => item.id === targetId);

        if (sourceIndex < 0 || targetIndex < 0) {
            return items;
        }

        const nextItems = [...items];
        const [movedItem] = nextItems.splice(sourceIndex, 1);
        nextItems.splice(targetIndex, 0, movedItem);
        return nextItems;
    };

    const handleDashboardDrop = async (targetId: string) => {
        if (!draggingDashboardId) {
            return;
        }

        const reorderedDashboards = moveDashboard(dashboards, draggingDashboardId, targetId);

        setDraggingDashboardId(null);
        setDragOverDashboardId(null);

        if (reorderedDashboards === dashboards) {
            return;
        }

        setDashboards(reorderedDashboards);

        try {
            await dashboardStorage.reorderDashboards(reorderedDashboards.map((dashboard) => dashboard.id));
        } catch (error) {
            console.error('Error reordenando dashboards:', error);
        }
    };

    const filteredDashboards = useMemo(() => {
        const normalizedQuery = dashboardSearch.trim().toLocaleLowerCase();
        const activeTemplateIds = new Set(templates.map((template) => template.id));

        if (!normalizedQuery) {
            return dashboards;
        }

        return dashboards.filter((dashboard) => {
            const title = getDashboardHeaderTitle(dashboard).toLocaleLowerCase();
            const visibleSubtitle = getVisibleDashboardSubtitle(dashboard, activeTemplateIds);
            const subtitle = visibleSubtitle?.toLocaleLowerCase() ?? '';

            return title.includes(normalizedQuery)
                || subtitle.includes(normalizedQuery);
        });
    }, [dashboardSearch, dashboards, templates]);

    const activeTemplateIds = useMemo(() => new Set(templates.map((template) => template.id)), [templates]);
    const sourceDashboardIds = useMemo(
        () => new Set(templates.map((template) => template.sourceDashboardId).filter((id): id is string => Boolean(id))),
        [templates]
    );

    return (
        <AdminWorkspaceLayout
            contextBarPanel={
                <div className="flex h-full w-full items-center px-4">
                    <div className="flex items-center gap-2">
                        <span className={ADMIN_CONTEXT_BAR_LABEL_CLS}>Templates:</span>
                        <span className={ADMIN_CONTEXT_BAR_LABEL_CLS}>{templates.length}</span>
                    </div>
                </div>
            }
            contextBar={
                <div className="flex h-full w-full items-center justify-between gap-4 px-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className={ADMIN_CONTEXT_BAR_LABEL_CLS}>Dashboards:</span>
                            <span className={ADMIN_CONTEXT_BAR_LABEL_CLS}>{dashboards.length}</span>
                        </div>
                    </div>

                    <label className="relative w-full max-w-sm">
                        <Search
                            size={14}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-industrial-muted"
                        />
                        <input
                            type="search"
                            value={dashboardSearch}
                            onChange={(event) => setDashboardSearch(event.target.value)}
                            placeholder="Buscar dashboards"
                            className={`${ADMIN_SIDEBAR_INPUT_CLS} h-9 pl-9 pr-3 text-xs font-medium`}
                            aria-label="Buscar dashboards por nombre, subtítulo o descripción"
                        />
                    </label>

                    <AdminActionButton
                        onClick={handleCreateNew}
                        variant="primary"
                        className="shrink-0"
                    >
                        <Plus size={14} />
                        Nuevo Dashboard
                    </AdminActionButton>
                </div>
            }
            rail={
                <div className="h-full w-full flex flex-col items-center py-3 gap-1">
                    <button
                        type="button"
                        title="Nuevo dashboard"
                        onClick={handleCreateNew}
                        className="h-9 w-9 inline-flex items-center justify-center rounded-md text-industrial-muted transition-colors hover:bg-white/5 hover:text-white"
                    >
                        <Plus size={18} />
                    </button>
                </div>
            }
            sidePanel={
                <div className={ADMIN_SIDEBAR_PANEL_CLS}>
                    {templates.length === 0 ? (
                        <div className="h-full px-3 py-4">
                            <AdminEmptyState
                                icon={LayoutTemplate}
                                message="No hay templates disponibles todavía."
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2 p-2">
                            {templates.map((template) => {
                                const widgetCount = template.widgetPresets?.length ?? 0;
                                const templateDashboardTypeLabel = getTemplateTypeLabel(template.dashboardType);

                                return (
                                        <article
                                            key={template.id}
                                            className="rounded-lg border border-white/10 bg-black/10 p-3"
                                        >
                                            <div className="mb-1.5 flex justify-end">
                                                <AdminTag label="TEMPLATE" variant="pink" />
                                            </div>

                                            <div className="min-w-0">
                                                {editingTemplateId === template.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            autoFocus
                                                            value={editingTemplateName}
                                                            onChange={(e) => setEditingTemplateName(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    void handleCommitTemplateRename(template);
                                                                }

                                                                if (e.key === 'Escape') {
                                                                    setEditingTemplateId(null);
                                                                    setEditingTemplateName('');
                                                                }
                                                            }}
                                                            onBlur={() => {
                                                                void handleCommitTemplateRename(template);
                                                            }}
                                                            className="w-full rounded border border-admin-accent/50 bg-black/40 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white transition-colors focus:outline-none"
                                                        />
                                                        <button
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onClick={() => {
                                                                void handleCommitTemplateRename(template);
                                                            }}
                                                            className="rounded p-1 text-admin-accent transition-colors hover:bg-white/10"
                                                        >
                                                            <Check size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleStartTemplateRename(template)}
                                                        className="group flex w-full items-center gap-2 text-left"
                                                    >
                                                        <h3 className="truncate text-[10px] font-black uppercase tracking-widest text-industrial-muted transition-colors group-hover:text-admin-accent">
                                                            {template.name}
                                                        </h3>
                                                        <Edit2 size={12} className="shrink-0 text-white/20 transition-colors group-hover:text-admin-accent" />
                                                    </button>
                                                )}

                                                <p className="mt-0.5 text-[10px] font-mono font-semibold text-industrial-muted">
                                                    {getWidgetCountLabel(widgetCount)} · {templateDashboardTypeLabel}
                                                </p>
                                            </div>

                                            <div className="mt-2 flex items-center gap-2">
                                                <AdminActionButton
                                                    onClick={() => handleCreateFromTemplate(template)}
                                                    variant="primary"
                                                    className="flex-1"
                                                >
                                                    <LayoutTemplate size={13} />
                                                    Crear Dashboard
                                                </AdminActionButton>
                                                <button
                                                    onClick={() => handleDeleteTemplate(template.id)}
                                                    className="rounded p-2 text-industrial-muted transition-colors hover:bg-white/10 hover:[color:var(--color-status-critical)]"
                                                    title="Eliminar template"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </article>
                                );
                            })}
                        </div>
                    )}
                </div>
            }
        >

            <div className="flex h-full min-h-0 flex-col px-8 pb-8 pt-3">
                <div className="flex h-full min-h-0 w-full flex-col">
                    {/* LOADING */}
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64 border border-white/5 rounded-xl bg-white/[0.02]">
                            <Loader2 className="animate-spin text-admin-accent" size={32} />
                        </div>
                    ) : (
                        <>

            {/* === TABLA DE DASHBOARDS === */}
            <section className="flex min-h-0 flex-1 flex-col">
                <div className="hmi-scrollbar min-h-0 flex-1 overflow-y-auto">
                    <div className={`sticky top-0 z-10 grid ${DASHBOARD_LIST_GRID_CLS} items-center gap-4 border-b border-white/5 bg-industrial-bg px-4 py-4 text-[10px] font-black uppercase tracking-widest text-industrial-muted`}>
                        <div className="w-8"></div>
                        <div>Título / Subtítulo</div>
                        <div className="text-center">Asignación</div>
                        <div className="text-center">Tipo</div>
                        <div className="text-center">Estado</div>
                        <div className="text-center">Acciones</div>
                    </div>

                    <div className="divide-y divide-white/5">
                    {filteredDashboards.map(dash => {
                        const headerTitle = getDashboardHeaderTitle(dash);
                        const headerSubtitle = getVisibleDashboardSubtitle(dash, activeTemplateIds);
                        const ownerNode = dash.ownerNodeId
                            ? nodeMap.get(dash.ownerNodeId)
                            : undefined;
                        const dashboardTypeLabel = getDashboardTypeLabel(dash.dashboardType, dash.ownerNodeId, nodeMap);
                        const isAssigned = Boolean(dash.ownerNodeId);

                        return (
                            <div
                                key={dash.id}
                                onDragOver={(event) => {
                                    event.preventDefault();
                                    if (draggingDashboardId && draggingDashboardId !== dash.id) {
                                        setDragOverDashboardId(dash.id);
                                    }
                                }}
                                onDragLeave={() => {
                                    if (dragOverDashboardId === dash.id) {
                                        setDragOverDashboardId(null);
                                    }
                                }}
                                onDrop={() => void handleDashboardDrop(dash.id)}
                                className={`grid ${DASHBOARD_LIST_GRID_CLS} items-center gap-4 rounded border p-4 group transition-colors ${
                                    dragOverDashboardId === dash.id
                                        ? 'border-white/20 bg-white/10'
                                        : draggingDashboardId === dash.id
                                            ? 'border-admin-accent/30 bg-admin-accent/10'
                                            : 'border-transparent bg-transparent hover:border-white/20 hover:bg-white/10'
                                }`}
                            >
                             
                            <div
                                draggable
                                onDragStart={(event) => {
                                    event.dataTransfer.effectAllowed = 'move';
                                    event.dataTransfer.setData('text/plain', dash.id);
                                    setDraggingDashboardId(dash.id);
                                }}
                                onDragEnd={() => {
                                    setDraggingDashboardId(null);
                                    setDragOverDashboardId(null);
                                }}
                                className="flex justify-center w-8 cursor-move text-white/20"
                            >
                                <GripVertical size={16} />
                            </div>

                            <div>
                                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                                    {headerTitle}
                                    {sourceDashboardIds.has(dash.id) && (
                                        <AdminTag label="TEMPLATE" variant="pink" />
                                    )}
                                </h3>
                                {headerSubtitle && (
                                    <p className="text-xs font-medium text-industrial-muted truncate mt-1">
                                        {headerSubtitle}
                                    </p>
                                )}
                            </div>

                            <div className="flex justify-center">
                                <AdminTag
                                    label={isAssigned ? 'ASIGNADO' : 'SIN ASIGNAR'}
                                    variant={isAssigned ? 'cyan' : 'muted'}
                                />
                            </div>

                            <div className="flex justify-center">
                                <AdminTag label={dashboardTypeLabel} variant="muted" />
                            </div>

                            <div className="flex justify-center">
                                {(() => {
                                    const vs = getDashboardVisualStatus(dash);
                                    return (
                                        <AdminTag
                                            label={vs === 'pending' ? 'PENDING' : vs === 'published' ? 'PUBLISHED' : 'DRAFT'}
                                            variant={vs === 'pending' ? 'amber' : vs === 'published' ? 'green' : 'muted'}
                                        />
                                    );
                                })()}
                            </div>

                            <div className="flex justify-end gap-1 text-industrial-muted">
                                <button 
                                    className="p-2 hover:bg-white/10 hover:text-white rounded transition-colors"
                                    onClick={() => navigate(`/admin/builder/${dash.id}`)}
                                    title="Editar en Builder"
                                >
                                    <FileEdit size={16} />
                                </button>
                                <button 
                                    className="p-2 hover:bg-white/10 hover:text-white rounded transition-colors"
                                    title="Duplicar"
                                    onClick={() => {
                                        setShowDuplicatePrompt(dash.id);
                                        setDuplicateName(getSuggestedDuplicateName(dash));
                                    }}
                                >
                                    <Copy size={16} />
                                </button>
                                <button 
                                    className="p-2 hover:bg-violet-500/20 hover:text-violet-400 rounded transition-colors"
                                    title="Guardar como Template"
                                    onClick={() => {
                                        setShowTemplatePrompt(dash.id);
                                        setTemplateName(getSuggestedTemplateName(dash));
                                    }}
                                >
                                    <Bookmark size={16} />
                                </button>
                                <button 
                                    className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded transition-colors" 
                                    title="Eliminar"
                                    onClick={() => handleDelete(dash.id)}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            </div>
                        );
                    })}
                    
                    {dashboards.length === 0 && (
                        <div className="h-56 px-4 py-6">
                            <AdminEmptyState
                                icon={LayoutDashboard}
                                message="No hay dashboards configurados."
                            />
                        </div>
                    )}

                    {dashboards.length > 0 && filteredDashboards.length === 0 && (
                        <div className="h-56 px-4 py-6">
                            <AdminEmptyState
                                icon={SearchX}
                                message={`No encontramos dashboards que coincidan con “${dashboardSearch.trim()}”.`}
                            />
                        </div>
                    )}
                </div>
                </div>
            </section>

            {/* === MODAL TEMPLATE NAME === */}
            {showTemplatePrompt && (
                <AdminDialog
                    open={Boolean(showTemplatePrompt)}
                    title="Guardar como Template"
                    onClose={() => setShowTemplatePrompt(null)}
                    actions={(
                        <>
                            <AdminActionButton variant="secondary" onClick={() => setShowTemplatePrompt(null)}>
                                Cancelar
                            </AdminActionButton>
                            <AdminActionButton
                                onClick={() => showTemplatePrompt && void handleSaveAsTemplate(showTemplatePrompt)}
                                disabled={!templateName.trim() || !showTemplatePrompt}
                                variant="primary"
                            >
                                Guardar Template
                            </AdminActionButton>
                        </>
                    )}
                >
                    <div>
                        <label className="mb-1.5 block w-auto text-[10px] font-bold uppercase tracking-widest text-industrial-muted">
                            Nombre
                        </label>
                        <input
                            type="text"
                            value={templateName}
                            onChange={e => setTemplateName(e.target.value)}
                            placeholder="Nombre del template"
                            className={`${ADMIN_SIDEBAR_INPUT_CLS} px-3 py-2 text-sm`}
                            autoFocus
                        />
                    </div>
                </AdminDialog>
            )}

            {showDuplicatePrompt && (
                <AdminDialog
                    open={Boolean(showDuplicatePrompt)}
                    title="DUPLICAR DASHBOARD"
                    onClose={() => {
                        setShowDuplicatePrompt(null);
                        setDuplicateName('');
                    }}
                    actions={(
                        <>
                            <AdminActionButton
                                variant="secondary"
                                onClick={() => {
                                    setShowDuplicatePrompt(null);
                                    setDuplicateName('');
                                }}
                            >
                                Cancelar
                            </AdminActionButton>
                            <AdminActionButton
                                onClick={() => void handleConfirmDuplicate()}
                                disabled={!duplicateName.trim() || !showDuplicatePrompt}
                                variant="primary"
                            >
                                Duplicar
                            </AdminActionButton>
                        </>
                    )}
                >
                    <div>
                        <label className="mb-1.5 block w-auto text-[10px] font-bold uppercase tracking-widest text-industrial-muted">
                            NOMBRE
                        </label>
                        <input
                            type="text"
                            value={duplicateName}
                            onChange={e => setDuplicateName(e.target.value)}
                            placeholder="Nombre del dashboard"
                            className={`${ADMIN_SIDEBAR_INPUT_CLS} px-3 py-2 text-sm`}
                            autoFocus
                        />
                    </div>
                </AdminDialog>
            )}

            {(() => {
                const targetDash = dashboards.find(d => d.id === deleteDashboardId);
                const ownerNode = targetDash?.ownerNodeId ? nodeMap.get(targetDash.ownerNodeId) : undefined;

                return ownerNode ? (
                    <AdminDestructiveDialog
                        open={Boolean(deleteDashboardId)}
                        title="Eliminar Dashboard"
                        onClose={() => setDeleteDashboardId(null)}
                        onConfirm={() => void handleConfirmDeleteDashboard()}
                        warningMessage="Este dashboard está asignado a un nodo en la jerarquía de planta."
                        affectedLabel="Nodo afectado"
                        affectedItems={[{ name: ownerNode.name, id: ownerNode.id }]}
                        confirmMessage="El nodo quedará sin dashboard vinculado. ¿Confirmar?"
                    />
                ) : (
                    <AdminDialog
                        open={Boolean(deleteDashboardId)}
                        title="Eliminar Dashboard"
                        onClose={() => setDeleteDashboardId(null)}
                        actions={(
                            <>
                                <AdminActionButton variant="secondary" onClick={() => setDeleteDashboardId(null)}>
                                    Cancelar
                                </AdminActionButton>
                                <AdminActionButton
                                    onClick={() => void handleConfirmDeleteDashboard()}
                                    variant="critical"
                                >
                                    Eliminar
                                </AdminActionButton>
                            </>
                        )}
                    >
                        <p className="text-xs text-industrial-muted">¿Eliminar este dashboard? Esta acción no se puede deshacer.</p>
                    </AdminDialog>
                );
            })()}

            <AdminDialog
                open={Boolean(deleteTemplateId)}
                title="Eliminar Template"
                onClose={() => setDeleteTemplateId(null)}
                actions={(
                    <>
                        <AdminActionButton variant="secondary" onClick={() => setDeleteTemplateId(null)}>
                            Cancelar
                        </AdminActionButton>
                        <AdminActionButton
                            onClick={() => void handleConfirmDeleteTemplate()}
                            variant="secondary"
                        >
                            Eliminar
                        </AdminActionButton>
                    </>
                )}
            >
                <p className="text-xs text-industrial-muted">¿Eliminar este template?</p>
            </AdminDialog>

                        </>
                    )}
                </div>
            </div>
        </AdminWorkspaceLayout>
    );
}
