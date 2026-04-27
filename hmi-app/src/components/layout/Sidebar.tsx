import { Home, FolderTree, Activity, AlertTriangle, Box, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
    { icon: Home, label: 'Visión General', path: '/' },
    { icon: FolderTree, label: 'Explorador', path: '/explorer' },
    { icon: Activity, label: 'Tendencias', path: '/trends' },
    { icon: AlertTriangle, label: 'Alarmas', path: '/alerts' },
    { icon: Box, label: 'Trazabilidad', path: '/traceability' },
];

export default function Sidebar() {
    return (
        <aside className="w-64 h-full bg-industrial-bg border-r border-[var(--color-industrial-border)] flex-col hidden md:flex shrink-0">
            <nav className="mt-2 flex-1 overflow-y-auto hmi-scrollbar space-y-2 px-4 py-6">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${isActive ? 'bg-[rgba(255,255,255,0.03)] border border-industrial-border shadow-sm' : 'text-industrial-muted hover:bg-industrial-hover hover:text-industrial-text border border-transparent'}`}
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon size={20} className={isActive ? "text-admin-accent drop-shadow-[0_0_8px_var(--color-admin-accent)]" : ""} />
                                <span className={isActive ? 'text-white' : ''}>{item.label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-[var(--color-industrial-border)] shrink-0">
                <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-industrial-muted hover:bg-industrial-hover hover:text-industrial-text transition-colors duration-200 border border-transparent">
                    <Settings size={20} />
                    <span>Configuración</span>
                </button>
            </div>
        </aside>
    );
}
