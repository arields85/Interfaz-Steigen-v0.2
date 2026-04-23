import { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LogOut, Settings } from 'lucide-react';
import GlobalSettingsDialog from '../components/admin/GlobalSettingsDialog';
import { ADMIN_SECTIONS, getAdminSectionByPath } from '../utils/adminNavigation';

// =============================================================================
// AdminLayout
// Layout exclusivo para el Modo Administrador.
// Separado del AppShell de usuario final para evitar accidentes operacionales
// y proveer un entorno orientado a la edición de estructura y visualización.
//
// Especificación Funcional Modo Admin §1
// =============================================================================

export default function AdminLayout() {
    const location = useLocation();
    const activeSectionKey = getAdminSectionByPath(location.pathname)?.key;
    const [isNodeRedSettingsOpen, setIsNodeRedSettingsOpen] = useState(false);

    return (
        <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-industrial-bg font-sans text-industrial-text">
            
            {/* TOPBAR ADMIN */}
            <header className="z-20 flex h-14 shrink-0 items-center justify-between border-b border-industrial-border bg-industrial-surface px-6">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                            <h1 className="text-sm font-black tracking-widest leading-tight">
                                CORE <span className="text-admin-accent font-light">BUILDER</span>
                            </h1>
                            <span className="text-[9px] uppercase tracking-widest text-industrial-muted font-bold">
                                Modo Administrador
                            </span>
                        </div>
                    </div>

                    <nav className="flex h-full items-end gap-1">
                        {ADMIN_SECTIONS.map((section) => (
                            <AdminNavItem
                                key={section.key}
                                to={section.navTo}
                                label={section.label}
                                isActive={section.key === activeSectionKey}
                            />
                        ))}
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        aria-label="Configuracion general"
                        className="h-8 w-8 inline-flex items-center justify-center rounded-md text-industrial-muted transition-colors hover:bg-white/5 hover:text-white"
                        title="Configuracion general"
                        type="button"
                        onClick={() => setIsNodeRedSettingsOpen(true)}
                    >
                        <Settings size={14} />
                    </button>
                    <span className="text-xs font-bold text-admin-accent/80 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-admin-accent animate-pulse" />
                        SESIÓN ADMIN ACTIVA
                    </span>
                    <div className="h-4 w-px bg-industrial-border" />
                    <NavLink 
                        to="/" 
                        className="flex items-center gap-2 text-xs font-bold text-industrial-muted hover:text-white transition-colors"
                    >
                        Salir al visor
                        <LogOut size={14} />
                    </NavLink>
                </div>
            </header>

            {/* MAIN ADMIN CONTENT */}
            <main className="flex-1 min-h-0 overflow-hidden relative">
                <Outlet />
            </main>

            {isNodeRedSettingsOpen && (
                <GlobalSettingsDialog
                    open={isNodeRedSettingsOpen}
                    onClose={() => setIsNodeRedSettingsOpen(false)}
                />
            )}
            
        </div>
    );
}

function AdminNavItem({ to, label, isActive }: { to: string; label: string; isActive: boolean }) {
    return (
        <NavLink
            to={to}
            className={`relative px-3 pb-2 pt-3 text-xs font-bold tracking-wide transition-colors ${
                isActive ? 'text-white' : 'text-industrial-muted hover:text-white'
            }`}
        >
            <>
                {label}
                <span
                    className={`pointer-events-none absolute bottom-1 left-2 right-2 h-0.5 rounded-full transition-opacity ${
                        isActive ? 'bg-admin-accent opacity-100' : 'bg-admin-accent opacity-0'
                    }`}
                />
            </>
        </NavLink>
    );
}
