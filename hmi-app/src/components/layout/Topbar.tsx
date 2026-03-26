import { Bell, Search, Activity, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export default function Topbar() {
    return (
        <header className="flex items-center justify-between border-b border-white/5 px-6 lg:px-10 py-5 backdrop-blur-xl bg-black/40 fixed top-0 left-0 right-0 z-50">
            {/* Nav Left: Logo & Title & Search */}
            <div className="flex items-center gap-12">
                <div className="flex items-center gap-4">
                    <div className="size-10 rounded-xl bg-gradient-to-tr from-[#A78BFA] to-[#22d3ee] flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.3)] shrink-0">
                        <Activity className="text-white" size={22} />
                    </div>
                    <h2 className="text-white text-xl font-extrabold tracking-tight uppercase" style={{ letterSpacing: '0.05em' }}>
                        Core <span className="text-gradient font-light">Analytics</span>
                    </h2>
                </div>

                <div className="hidden lg:flex items-center bg-white/5 border border-white/5 rounded-2xl px-4 py-2 w-80">
                    <Search className="text-slate-500 shrink-0" size={20} />
                    <input
                        className="bg-transparent border-none focus:ring-0 focus:outline-none text-sm w-full placeholder:text-slate-600 ml-2 text-white"
                        placeholder="Analyze equipment..."
                        type="text"
                    />
                </div>
            </div>

            {/* Nav Right: Links & Actions */}
            <div className="flex items-center gap-8">
                <nav className="hidden md:flex items-center gap-10">
                    <NavLink to="/" className={({ isActive }) => isActive ? "text-white text-xs font-bold tracking-widest uppercase pb-1 nav-link-gradient-underline" : "text-slate-500 text-xs font-bold tracking-widest uppercase hover:text-white transition-colors pb-1"}>Overview</NavLink>
                    <a className="text-slate-500 text-xs font-bold tracking-widest uppercase hover:text-white transition-colors pb-1 cursor-pointer">Diagnostics</a>
                    <a className="text-slate-500 text-xs font-bold tracking-widest uppercase hover:text-white transition-colors pb-1 cursor-pointer">Logs</a>
                </nav>

                <div className="flex gap-4 items-center">
                    <button className="relative flex size-11 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all shrink-0 overflow-visible">
                        <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] border border-black/40"></span>
                        <Bell size={20} />
                    </button>
                    <div className="h-11 w-11 rounded-2xl overflow-hidden border border-white/10 p-0.5 bg-slate-800 flex items-center justify-center shrink-0">
                        <User className="text-slate-400" size={20} />
                    </div>
                </div>
            </div>
        </header>
    );
}
