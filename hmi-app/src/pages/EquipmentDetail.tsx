import type { CSSProperties } from 'react';
import { ArrowLeft, Activity, Thermometer, Zap, Layers } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const chartAxisTickStyle = {
    fill: '#8F9BB3',
    fontFamily: 'var(--font-chart)',
    fontSize: 'var(--font-size-chart)',
    fontWeight: 'var(--font-weight-chart)',
    letterSpacing: 'var(--tracking-chart)',
} satisfies CSSProperties;

const chartTooltipContentStyle = {
    backgroundColor: '#0e1117',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    color: '#f1f5f9',
    fontFamily: 'var(--font-chart)',
    fontSize: 'var(--font-size-chart)',
    fontWeight: 'var(--font-weight-chart)',
    letterSpacing: 'var(--tracking-chart)',
} satisfies CSSProperties;

const chartTooltipItemStyle = {
    color: '#00BEFF',
    fontFamily: 'var(--font-chart)',
    fontSize: 'var(--font-size-chart)',
    fontWeight: 'var(--font-weight-chart)',
    letterSpacing: 'var(--tracking-chart)',
} satisfies CSSProperties;

const chartTooltipLabelStyle = {
    color: '#8F9BB3',
    marginBottom: '4px',
    fontFamily: 'var(--font-chart)',
    fontSize: 'var(--font-size-chart)',
    fontWeight: 'var(--font-weight-chart)',
    letterSpacing: 'var(--tracking-chart)',
} satisfies CSSProperties;

const mockSpeedData = [
    { time: '10:00', value: 1200 },
    { time: '10:10', value: 1250 },
    { time: '10:20', value: 1240 },
    { time: '10:30', value: 1230 },
    { time: '10:40', value: 1260 },
    { time: '10:50', value: 1280 },
    { time: '11:00', value: 1250 },
];

export default function EquipmentDetail() {
    return (
        <div className="flex flex-col h-full space-y-6 max-w-7xl mx-auto mt-4 px-2 pb-10">

            {/* HEADER DE CABECERA Y NAVEGACIÓN */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 glass-panel p-6">
                <div className="flex items-center gap-4">
                    <NavLink to="/" className="p-2 hover:bg-industrial-hover rounded-full transition-colors text-industrial-muted hover:text-white">
                        <ArrowLeft size={24} />
                    </NavLink>
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 text-purple-400/80 uppercase mb-1">
                            <span>Industrial Asset</span>
                            <span className="w-8 h-[1px] bg-purple-500/30"></span>
                            <span>Node 2090</span>
                        </div>
                        <h1 className="text-white mb-2">Comprimidora FETTE-2090</h1>
                        <div className="flex gap-4 pt-1">
                            <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
                                <span className="text-slate-400 uppercase">Recipe</span>
                                <span className="text-white">ASRP-500mg</span>
                            </div>
                            <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
                                <span className="text-slate-400 uppercase">Batch</span>
                                <span className="text-white">#BCTX-109</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            {/* ROW 1: TELEMETRÍA PRINCIPAL (Gauges / Valores) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

                {/* Velocidad */}
                <div className="glass-panel p-5 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <span className="text-slate-400 uppercase">Velocidad de Rotor</span>
                        <Activity size={20} className="text-accent-cyan opacity-80" />
                    </div>
                    <div className="mt-4 text-white flex items-end gap-2">
                        1,250 <span className="text-slate-400 mt-1 uppercase">RPM</span>
                    </div>
                    <div className="mt-4 w-full h-1.5 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                        <div className="h-full bg-accent-cyan w-[75%]"></div>
                    </div>
                </div>

                {/* Fuerza de Compresión */}
                <div className="glass-panel p-5 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <span className="text-slate-400 uppercase">Fuerza Principal</span>
                        <Layers size={20} className="text-accent-purple opacity-80" />
                    </div>
                    <div className="mt-4 text-white flex items-end gap-2">
                        24.5 <span className="text-slate-400 mt-1 uppercase">kN</span>
                    </div>
                    <div className="mt-4 w-full h-1.5 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                        <div className="h-full bg-accent-purple w-[60%]"></div>
                    </div>
                </div>

                {/* Temperatura Matriz */}
                <div className="p-5 flex flex-col justify-between transition-colors duration-300 relative overflow-hidden widget-state-warning">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-accent-amber"></div>
                    <div className="flex justify-between items-start pl-1">
                        <span className="text-slate-400 uppercase">Temp. Matriz</span>
                        <Thermometer size={20} className="text-accent-amber opacity-80" />
                    </div>
                    <div className="mt-4 text-accent-amber flex items-end gap-2 pl-1">
                        42.8 <span className="text-slate-400 mt-1 uppercase">°C</span>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-slate-400 uppercase pl-1">
                        <span>Límite: 45.0 °C</span>
                        <span className="text-accent-amber animate-pulse-slow">ALERTA ALTA</span>
                    </div>
                </div>

                {/* Consumo Eléctrico */}
                <div className="glass-panel p-5 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <span className="text-slate-400 uppercase">Potencia Activa</span>
                        <Zap size={20} className="text-industrial-muted opacity-80" />
                    </div>
                    <div className="mt-4 text-white flex items-end gap-2">
                        15.2 <span className="text-slate-400 mt-1 uppercase">kW</span>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-slate-400 uppercase">
                        <span>Promedio Turno</span>
                        <span>14.8 kW</span>
                    </div>
                </div>

            </div>

            {/* ROW 2: TENDENCIA ESPECÍFICA Y ESTADO DE ALARMAS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 h-80">

                {/* Gráfico de Tendencia de Velocidad */}
                <div className="lg:col-span-2 glass-panel p-5 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-slate-400 uppercase flex items-center gap-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan"></span>
                            Live Analytics Stream
                        </h3>
                        <span className="text-slate-400 uppercase">Hace 1 seg</span>
                    </div>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={mockSpeedData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#00BEFF" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#00BEFF" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="time" stroke="rgba(255,255,255,0.2)" tick={chartAxisTickStyle} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="rgba(255,255,255,0.2)" tick={chartAxisTickStyle} tickLine={false} axisLine={false} dx={-10} domain={['dataMin - 50', 'dataMax + 50']} />
                                <Tooltip
                                    contentStyle={chartTooltipContentStyle}
                                    itemStyle={chartTooltipItemStyle}
                                    labelStyle={chartTooltipLabelStyle}
                                />
                                <Area type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={3} fillOpacity={1} fill="url(#colorSpeed)" activeDot={{ r: 6, fill: '#22d3ee', stroke: '#0e1117', strokeWidth: 2 }} className="neon-cyan-glow" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Panel de Alarmas del Equipo */}
                <div className="glass-panel glass-panel-danger p-5 flex flex-col">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-slate-400 uppercase">Critical Events</h3>
                        <span className="size-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></span>
                    </div>

                    <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-2 hmi-scrollbar">

                        {/* Alarma Activa */}
                        <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] rounded-lg p-3 relative overflow-hidden group">
                            <div className="absolute left-0 top-0 bottom-0 w-[5px] bg-accent-ruby"></div>
                            <div className="flex justify-between items-start pl-2">
                                <div>
                                    <span className="text-accent-ruby">CRÍTICA • HACE 5 MIN</span>
                                    <p className="text-white mt-1 uppercase">Presión de compactación inestable</p>
                                </div>
                            </div>
                            <div className="pl-2 mt-2 text-slate-400 flex justify-between">
                                <span>Código: ERR-CP-402</span>
                                <span className="text-white hover:underline cursor-pointer hover:text-accent-ruby transition-colors">Acknowledge</span>
                            </div>
                        </div>

                        {/* Warning */}
                        <div className="bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.3)] rounded-lg p-3 relative overflow-hidden group">
                            <div className="absolute left-0 top-0 bottom-0 w-[5px] bg-accent-amber"></div>
                            <div className="flex justify-between items-start pl-2">
                                <div>
                                    <span className="text-accent-amber">ADVERTENCIA • HACE 20 MIN</span>
                                    <p className="text-white mt-1 uppercase">Nivel de tolva bajo (20%)</p>
                                </div>
                            </div>
                        </div>

                    </div>

                    <button className="w-full mt-4 py-2 border border-industrial-border rounded-lg text-industrial-muted hover:bg-industrial-hover hover:text-white transition-colors">
                        Ver Historial Completo
                    </button>
                </div>

            </div>
        </div>
    );
}
