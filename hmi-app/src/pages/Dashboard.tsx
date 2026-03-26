import { useState, useEffect, useMemo } from 'react';
import { Activity, Server, Loader2, Link2Off } from 'lucide-react';
import { dashboardStorage } from '../services/DashboardStorageService';
import type { Dashboard } from '../domain/admin.types';
import DashboardViewer from '../components/viewer/DashboardViewer';
import { mockEquipmentList } from '../mocks/equipment.mock';
import type { EquipmentSummary } from '../domain/equipment.types';

// =============================================================================
// Dashboard Público (Visor)
// Punto de entrada de la aplicación (/ruta raíz).
// Carga dinámicamente los dashboards con `status === 'published'`.
//
// Especificación Funcional Modo Admin §11
// =============================================================================

export default function Dashboard() {
    const [publishedDashboards, setPublishedDashboards] = useState<Dashboard[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(0);

    // Mapeo de equipos simulado (para resolver bindings de la F3)
    const equipmentMap = useMemo(() => {
        const list = mockEquipmentList;
        const map = new Map<string, EquipmentSummary>();
        list.forEach((eq: EquipmentSummary) => map.set(eq.id, { 
            id: eq.id, 
            name: eq.name, 
            status: eq.status, 
            type: eq.type, 
            primaryMetrics: eq.primaryMetrics.map((m: any) => ({
                id: m.label,
                label: m.label,
                value: m.value,
                unit: m.unit,
                status: 'normal',
                timestamp: new Date().toISOString()
            })),
            connectionState: eq.connectionState 
        }));
        return map;
    }, []);

    useEffect(() => {
        const loadPublished = async () => {
            setIsLoading(true);
            try {
                const all = await dashboardStorage.getDashboards();
                const published = all.filter(d => d.status === 'published');
                setPublishedDashboards(published);
            } catch (error) {
                console.error("Error cargando dashboards públicos:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadPublished();
    }, []);

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center text-industrial-muted gap-3">
                <Loader2 className="animate-spin" size={24} />
                <span className="font-bold uppercase tracking-widest text-sm">Iniciando Visor Operativo...</span>
            </div>
        );
    }

    if (publishedDashboards.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-industrial-muted space-y-4">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
                    <Link2Off size={32} className="text-industrial-muted/50" />
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">Sin Vistas Publicadas</h2>
                <p className="text-sm font-medium text-center max-w-sm">
                    No hay ningún dashboard operativo configurado como público. 
                    Contacte a un administrador para publicar una vista desde el Gestor de Dashboards.
                </p>
            </div>
        );
    }

    const activeDashboard = publishedDashboards[activeTab];

    return (
        <div className="flex flex-col h-full space-y-4 max-w-7xl mx-auto mt-4 px-2 overflow-hidden">

            {/* HEADER DASHBOARD DÍNAMICO */}
            <div className="flex justify-between items-end mb-2 shrink-0">
                <div>
                    <h1 className="text-5xl font-black tracking-tight text-industrial-text mb-2">
                        {activeDashboard.name}
                    </h1>
                    <p className="text-industrial-muted text-[11px] font-bold uppercase tracking-widest mt-1">
                        {activeDashboard.description || 'Vista Operativa Global'}
                    </p>
                </div>
                
                <div className="flex gap-3 items-end">
                    {/* Tabs (si hay múltiples) */}
                    {publishedDashboards.length > 1 && (
                        <div className="flex bg-white/5 p-1 rounded-lg gap-1 border border-white/5 mr-4">
                            {publishedDashboards.map((dash, idx) => (
                                <button
                                    key={dash.id}
                                    onClick={() => setActiveTab(idx)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                                        activeTab === idx 
                                            ? 'bg-industrial-panel text-white shadow-sm' 
                                            : 'text-industrial-muted hover:text-white'
                                    }`}
                                >
                                    {dash.name}
                                </button>
                            ))}
                        </div>
                    )}

                    <button className="glass-panel hover:bg-industrial-hover px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 text-industrial-muted hover:text-industrial-text">
                        <Server size={16} /> Edge Gateway
                    </button>
                    <button className="bg-white/5 hover:bg-white/10 px-5 py-2 rounded-lg flex items-center justify-center border border-white/10 gap-2 transition-transform hover:scale-105 active:scale-95 text-sm font-semibold text-white">
                        <Activity size={16} />
                        <span className="flex items-center gap-2">
                            Centro de Control
                            <span className="w-1.5 h-1.5 rounded-full bg-accent-green shadow-[0_0_8px_rgba(0,255,102,0.8)] animate-pulse" />
                        </span>
                    </button>
                </div>
            </div>

            {/* RENDERIZADOR DEL DASHBOARD DINÁMICO */}
            <div className="flex-1 bg-[url('/grid.svg')] bg-center rounded-xl border border-white/5 overflow-hidden">
                <DashboardViewer 
                    widgets={activeDashboard.widgets}
                    layout={activeDashboard.layout}
                    equipmentMap={equipmentMap}
                />
            </div>
        </div>
    );
}
