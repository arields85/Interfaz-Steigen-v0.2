import { Bell, Search, User, Home, FolderTree, Activity, AlertTriangle, Box, Settings, LayoutDashboard, Stethoscope, ScrollText } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navLeftItems = [
    { icon: Home, label: 'Visión General', path: '/' },
    { icon: FolderTree, label: 'Explorador', path: '/explorer' },
    { icon: Activity, label: 'Tendencias', path: '/trends' },
    { icon: AlertTriangle, label: 'Alarmas', path: '/alerts' },
];

const navRightItems = [
    { icon: Box, label: 'Trazabilidad', path: '/traceability' },
    { icon: LayoutDashboard, label: 'Overview', path: '/overview' },
    { icon: Stethoscope, label: 'Diagnostics', path: '/diagnostics' },
    { icon: ScrollText, label: 'Logs', path: '/logs' },
];

function NavIconLink({ icon: Icon, label, path }: { icon: typeof Home; label: string; path: string }) {
    return (
        <NavLink
            to={path}
            title={label}
            end={path === '/'}
            className={({ isActive }) =>
                `p-2 rounded-lg transition-colors ${
                    isActive
                        ? 'text-admin-accent drop-shadow-[0_0_8px_var(--color-admin-accent)] hover:bg-white/5'
                        : 'text-industrial-muted hover:text-white hover:bg-white/5'
                }`
            }
        >
            <Icon size={20} />
        </NavLink>
    );
}

export default function Topbar() {
    return (
        <header className="relative flex items-center justify-between border-b border-white/5 px-6 lg:px-10 py-4 backdrop-blur-xl bg-black/40 sticky top-0 z-50">
            {/* Left: Logo */}
            <h2 className="text-white text-xl font-extrabold tracking-tight uppercase shrink-0" style={{ letterSpacing: '0.05em' }}>
                Core <span className="text-gradient font-light">Analytics</span>
            </h2>

            {/* Center: Nav Left + Search + Nav Right */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
                <nav className="flex items-center gap-1">
                    {navLeftItems.map((item) => (
                        <NavIconLink key={item.path} {...item} />
                    ))}
                </nav>

                <div className="hidden lg:flex items-center bg-white/5 border border-white/5 rounded-2xl px-4 py-2 w-80">
                    <Search className="text-slate-500 shrink-0" size={20} />
                    <input
                        className="bg-transparent border-none focus:ring-0 focus:outline-none text-sm w-full placeholder:text-slate-600 ml-2 text-white"
                        placeholder="Analyze equipment..."
                        type="text"
                    />
                </div>

                <nav className="flex items-center gap-1">
                    {navRightItems.map((item) => (
                        <NavIconLink key={item.path} {...item} />
                    ))}
                </nav>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1">
                <button title="Notificaciones" className="relative p-2 rounded-lg text-industrial-muted hover:text-white hover:bg-white/5 transition-colors">
                    <span className="absolute top-1 right-1 size-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]"></span>
                    <Bell size={20} />
                </button>
                <button title="Configuración" className="p-2 rounded-lg text-industrial-muted hover:text-white hover:bg-white/5 transition-colors">
                    <Settings size={20} />
                </button>
                <button title="Usuario" className="p-2 rounded-lg text-industrial-muted hover:text-white hover:bg-white/5 transition-colors">
                    <User size={20} />
                </button>
            </div>
        </header>
    );
}
