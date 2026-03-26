import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, FileEdit, Copy, Trash2, Plus,
    GripVertical, Loader2, BookTemplate, PackagePlus,
    Bookmark, X
} from 'lucide-react';
import { dashboardStorage } from '../../services/DashboardStorageService';
import { templateStorage } from '../../services/TemplateStorageService';
import type { Dashboard, Template } from '../../domain/admin.types';

// =============================================================================
// DashboardManagerPage
// Gestor de dashboards y templates del Modo Administrador.
// Especificación Funcional Modo Admin §7 / §13
// =============================================================================

export default function DashboardManagerPage() {
    const navigate = useNavigate();
    const [dashboards, setDashboards] = useState<Dashboard[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showTemplatePrompt, setShowTemplatePrompt] = useState<string | null>(null);
    const [templateName, setTemplateName] = useState('');

    useEffect(() => {
        const loadAll = async () => {
            setIsLoading(true);
            try {
                const [dashData, tplData] = await Promise.all([
                    dashboardStorage.getDashboards(),
                    templateStorage.getTemplates(),
                ]);
                setDashboards(dashData);
                setTemplates(tplData);
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

    const handleDelete = async (id: string) => {
        if (!window.confirm('¿Eliminar este dashboard? Esta acción no se puede deshacer.')) return;
        try {
            await dashboardStorage.deleteDashboard(id);
            setDashboards(dashboards.filter(d => d.id !== id));
        } catch (error) {
            console.error("Error eliminando dashboard:", error);
        }
    };

    const handleDuplicate = async (id: string) => {
        try {
            const duplicate = await dashboardStorage.duplicateDashboard(id);
            if (duplicate) {
                setDashboards(prev => [...prev, duplicate]);
            }
        } catch (error) {
            console.error("Error duplicando dashboard:", error);
        }
    };

    const handleSaveAsTemplate = async (dashId: string) => {
        if (!templateName.trim()) return;
        try {
            const dash = dashboards.find(d => d.id === dashId);
            if (!dash) return;
            const tpl = await templateStorage.createFromDashboard(dash, templateName.trim());
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

    const handleDeleteTemplate = async (id: string) => {
        if (!window.confirm('¿Eliminar este template?')) return;
        try {
            await templateStorage.deleteTemplate(id);
            setTemplates(templates.filter(t => t.id !== id));
        } catch (error) {
            console.error("Error eliminando template:", error);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            
            {/* HEADER */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <LayoutDashboard className="text-accent-cyan" />
                        Gestor de Dashboards
                    </h1>
                    <p className="text-industrial-muted text-sm font-bold mt-2 uppercase tracking-widest">
                        Crea, edita, duplica y organiza las vistas de la plataforma.
                    </p>
                </div>
                <button 
                    onClick={handleCreateNew}
                    className="flex items-center gap-2 px-5 py-2.5 bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 hover:bg-accent-cyan/20 rounded-md font-bold text-sm transition-colors"
                >
                    <Plus size={16} />
                    Nuevo Dashboard
                </button>
            </div>

            {/* LOADING */}
            {isLoading ? (
                <div className="flex justify-center items-center h-64 border border-white/5 rounded-xl bg-white/[0.02]">
                    <Loader2 className="animate-spin text-accent-cyan" size={32} />
                </div>
            ) : (
            <>

            {/* === TABLA DE DASHBOARDS === */}
            <div className="glass-panel border-white/5 overflow-hidden">
                <div className="grid grid-cols-[auto_2fr_1fr_1fr_auto] gap-4 p-4 border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-industrial-muted">
                    <div className="w-8"></div>
                    <div>Nombre / Descripción</div>
                    <div>Tipo</div>
                    <div>Estado</div>
                    <div className="text-right pr-4">Acciones</div>
                </div>

                <div className="divide-y divide-white/5">
                    {dashboards.map(dash => (
                        <div key={dash.id} className="grid grid-cols-[auto_2fr_1fr_1fr_auto] gap-4 p-4 items-center group hover:bg-white/[0.02] transition-colors">
                            
                            <div className="flex justify-center w-8 text-white/20 cursor-move">
                                <GripVertical size={16} />
                            </div>

                            <div>
                                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                                    {dash.name}
                                    {dash.templateId && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 uppercase tracking-wider">
                                            Template
                                        </span>
                                    )}
                                </h3>
                                <p className="text-xs text-industrial-muted truncate mt-1">
                                    {dash.description || 'Sin descripción'}
                                </p>
                            </div>

                            <div>
                                <span className="px-2 py-1 rounded bg-white/5 text-xs text-slate-300 font-medium">
                                    {dash.dashboardType}
                                </span>
                            </div>

                            <div>
                                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                                    dash.status === 'published' 
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                }`}>
                                    {dash.status}
                                </span>
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
                                    onClick={() => handleDuplicate(dash.id)}
                                >
                                    <Copy size={16} />
                                </button>
                                <button 
                                    className="p-2 hover:bg-violet-500/20 hover:text-violet-400 rounded transition-colors"
                                    title="Guardar como Template"
                                    onClick={() => {
                                        setShowTemplatePrompt(dash.id);
                                        setTemplateName(`Template de ${dash.name}`);
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
                    ))}
                    
                    {dashboards.length === 0 && (
                        <div className="p-8 text-center text-industrial-muted italic text-sm">
                            No hay dashboards configurados.
                        </div>
                    )}
                </div>
            </div>

            {/* === MODAL TEMPLATE NAME === */}
            {showTemplatePrompt && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="glass-panel border-white/10 p-6 w-full max-w-md space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                                <Bookmark size={16} className="text-violet-400" />
                                Guardar como Template
                            </h3>
                            <button
                                onClick={() => setShowTemplatePrompt(null)}
                                className="p-1 hover:bg-white/10 rounded transition-colors text-industrial-muted"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <input
                            type="text"
                            value={templateName}
                            onChange={e => setTemplateName(e.target.value)}
                            placeholder="Nombre del template"
                            className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white font-medium focus:outline-none focus:border-accent-cyan/40"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowTemplatePrompt(null)}
                                className="px-4 py-2 text-xs font-bold text-industrial-muted hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleSaveAsTemplate(showTemplatePrompt)}
                                disabled={!templateName.trim()}
                                className="px-4 py-2 bg-violet-500/15 text-violet-400 border border-violet-500/20 hover:bg-violet-500/25 rounded text-xs font-bold transition-colors disabled:opacity-30"
                            >
                                Guardar Template
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* === SECCIÓN DE TEMPLATES === */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <BookTemplate size={20} className="text-violet-400" />
                    <h2 className="text-lg font-black text-white tracking-tight">Templates</h2>
                    <span className="text-[10px] font-bold text-industrial-muted uppercase tracking-widest">
                        {templates.length} disponible{templates.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {templates.length === 0 ? (
                    <div className="border border-white/5 border-dashed rounded-xl p-8 text-center text-industrial-muted text-sm italic">
                        No hay templates guardados. Usa el botón <Bookmark size={12} className="inline text-violet-400 mx-1" /> en un dashboard para crear uno.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {templates.map(tpl => (
                            <div
                                key={tpl.id}
                                className="glass-panel border-violet-500/10 p-5 flex flex-col gap-3 group hover:border-violet-500/20 transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-sm font-bold text-white">{tpl.name}</h3>
                                        <p className="text-[10px] text-industrial-muted mt-1 font-mono">
                                            {tpl.widgetPresets?.length || 0} widgets · {tpl.type}
                                        </p>
                                    </div>
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 uppercase tracking-wider">
                                        {tpl.status}
                                    </span>
                                </div>

                                <div className="flex gap-2 mt-auto">
                                    <button
                                        onClick={() => handleCreateFromTemplate(tpl)}
                                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 hover:bg-accent-cyan/20 rounded text-xs font-bold transition-colors"
                                    >
                                        <PackagePlus size={14} />
                                        Crear Dashboard
                                    </button>
                                    <button
                                        onClick={() => handleDeleteTemplate(tpl.id)}
                                        className="p-2 hover:bg-red-500/20 hover:text-red-400 text-industrial-muted rounded transition-colors"
                                        title="Eliminar template"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            </>
            )}
        </div>
    );
}
