import { Outlet, NavLink } from 'react-router-dom';
import { Settings, LayoutDashboard, Network, LogOut } from 'lucide-react';

// =============================================================================
// AdminLayout
// Layout exclusivo para el Modo Administrador.
// Separado del AppShell de usuario final para evitar accidentes operacionales
// y proveer un entorno orientado a la edición de estructura y visualización.
//
// Especificación Funcional Modo Admin §1
// =============================================================================

export default function AdminLayout() {
    return (
        <div className="min-h-screen bg-industrial-bg text-industrial-text flex flex-col font-sans overflow-hidden">
            
            {/* TOPBAR ADMIN */}
            <header className="h-14 border-b border-admin-accent/20 bg-industrial-panel/80 backdrop-blur flex items-center justify-between px-6 z-20 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded flex items-center justify-center">
                            <Settings className="w-4 h-4 text-admin-accent" />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-sm font-black tracking-widest leading-tight">
                                CORE <span className="text-admin-accent font-light">BUILDER</span>
                            </h1>
                            <span className="text-[9px] uppercase tracking-widest text-industrial-muted font-bold">
                                Modo Administrador
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-admin-accent/80 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-admin-accent animate-pulse" />
                        SESIÓN ADMIN ACTIVA
                    </span>
                    <div className="w-px h-4 bg-white/10" />
                    <NavLink 
                        to="/" 
                        className="flex items-center gap-2 text-xs font-bold text-industrial-muted hover:text-white transition-colors"
                    >
                        Salir al visor
                        <LogOut size={14} />
                    </NavLink>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* SIDEBAR ADMIN */}
                <aside className="w-64 border-r border-white/5 bg-industrial-panel/30 flex flex-col pt-6 shrink-0 z-10">
                    <nav className="flex-1 px-3 space-y-1">
                        <div className="mb-4 px-3 text-[10px] font-black uppercase tracking-widest text-industrial-muted">
                            Gestión Visual
                        </div>
                        
                        <NavLink
                            to="/admin/dashboards"
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-bold transition-all ${
                                    isActive
                                        ? 'admin-accent-ghost'
                                        : 'text-industrial-muted hover:bg-white/5 hover:text-industrial-text'
                                }`
                            }
                        >
                            <LayoutDashboard size={16} />
                            Dashboards
                        </NavLink>
                        
                        <div className="mt-8 mb-4 px-3 text-[10px] font-black uppercase tracking-widest text-industrial-muted block">
                            Estructura
                        </div>

                        <NavLink
                            to="/admin/hierarchy"
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-bold transition-all ${
                                    isActive
                                        ? 'admin-accent-ghost'
                                        : 'text-industrial-muted hover:bg-white/5 hover:text-industrial-text'
                                }`
                            }
                        >
                            <Network size={16} />
                            Jerarquía de Planta
                        </NavLink>
                    </nav>
                </aside>

                {/* MAIN ADMIN CONTENT */}
                <main className="flex-1 overflow-y-auto bg-[rgba(2,6,23,0.5)] relative">
                    <Outlet />
                </main>
            </div>
            
        </div>
    );
}
