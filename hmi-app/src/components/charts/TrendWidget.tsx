import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Activity } from 'lucide-react';

const mockData = [
    { time: '08:00', oee: 72, production: 120 },
    { time: '09:00', oee: 75, production: 132 },
    { time: '10:00', oee: 74, production: 128 },
    { time: '11:00', oee: 77, production: 140 },
    { time: '12:00', oee: 76, production: 135 },
    { time: '13:00', oee: 79, production: 145 },
    { time: '14:00', oee: 78.4, production: 142.5 },
];

export default function TrendWidget() {
    return (
        <div className="glass-panel w-full h-[300px] p-5 flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <Activity size={18} className="text-accent-cyan" />
                    <h3 className="font-semibold text-industrial-text text-sm tracking-wide">TENDENCIA HISTÓRICA: OEE vs PRODUCCIÓN</h3>
                </div>
                <div className="flex gap-4 text-xs font-medium text-industrial-muted">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-accent-cyan"></div>
                        <span>OEE (%)</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-accent-purple"></div>
                        <span>Volumen (k)</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={mockData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorOee" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#00BEFF" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#00BEFF" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#B258FF" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#B258FF" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="time" stroke="rgba(255,255,255,0.2)" tick={{ fill: '#8F9BB3', fontSize: 11 }} tickLine={false} axisLine={false} dy={10} />
                        <YAxis yAxisId="left" stroke="rgba(255,255,255,0.2)" tick={{ fill: '#8F9BB3', fontSize: 11 }} tickLine={false} axisLine={false} dx={-10} />
                        <YAxis yAxisId="right" orientation="right" stroke="rgba(255,255,255,0.2)" tick={{ fill: '#8F9BB3', fontSize: 11 }} tickLine={false} axisLine={false} dx={10} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#0e1117', borderColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '8px', color: '#f1f5f9' }}
                            itemStyle={{ color: '#fff', fontSize: '12px' }}
                            labelStyle={{ color: '#8F9BB3', marginBottom: '4px', fontSize: '12px' }}
                        />
                        <Area yAxisId="left" type="monotone" dataKey="oee" stroke="#00BEFF" strokeWidth={3} fillOpacity={1} fill="url(#colorOee)" activeDot={{ r: 6, fill: '#22d3ee', stroke: '#0e1117', strokeWidth: 2 }} className="neon-cyan-glow" />
                        <Area yAxisId="right" type="monotone" dataKey="production" stroke="#B258FF" strokeWidth={3} fillOpacity={1} fill="url(#colorProd)" activeDot={{ r: 6, fill: '#a855f7', stroke: '#0e1117', strokeWidth: 2 }} className="neon-violet-glow" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
