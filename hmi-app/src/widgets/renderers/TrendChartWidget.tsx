import { useMemo } from 'react';
import {
    ResponsiveContainer,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
    Area,
    ComposedChart,
    Line,
} from 'recharts';
import type { WidgetConfig } from '../../domain/admin.types';
import type { EquipmentSummary } from '../../domain/equipment.types';
import { resolveBinding } from '../resolvers/bindingResolver';
import { generateTrendData } from '../../utils/trendDataGenerator';
import { TrendingUp } from 'lucide-react';

// =============================================================================
// TrendChartWidget
// Renderer para widgets de tipo 'trend-chart'.
// Renderiza un gráfico de tendencia temporal usando Recharts.
//
// Datos: genera serie temporal simulada alrededor del valor actual del binding.
// En el futuro, cuando exista un backend de time-series, se reemplazará
// generateTrendData por una query real.
//
// Estética: Dark Industrial Theme con gradientes cyan.
// =============================================================================

interface TrendChartWidgetProps {
    widget: WidgetConfig;
    equipmentMap: Map<string, EquipmentSummary>;
    isLoadingData?: boolean;
    className?: string;
}

// Tooltip personalizado con glassmorphism
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
    if (!active || !payload || payload.length === 0) return null;

    return (
        <div className="bg-[rgba(15,23,42,0.95)] backdrop-blur border border-white/10 rounded-lg px-3 py-2 shadow-xl">
            <p className="text-[10px] font-bold text-industrial-muted uppercase tracking-wider mb-0.5">
                {label}
            </p>
            <p className="text-sm font-black text-accent-cyan">
                {payload[0].value}
                <span className="text-industrial-muted font-normal text-xs ml-1">
                </span>
            </p>
        </div>
    );
}

export default function TrendChartWidget({
    widget,
    equipmentMap,
    isLoadingData = false,
    className,
}: TrendChartWidgetProps) {
    const resolved = resolveBinding(widget, equipmentMap);

    // Derivar el valor base para la serie temporal
    const baseValue = typeof resolved.value === 'number'
        ? resolved.value
        : typeof resolved.value === 'string'
            ? parseFloat(resolved.value) || 50
            : 50;

    // Generar datos memorizados (solo recalcula si cambia baseValue)
    const trendData = useMemo(
        () => generateTrendData(baseValue, undefined, 24),
        [baseValue]
    );

    // Calcular dominio Y con margen
    const yValues = trendData.map(d => d.value);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    const yPadding = (yMax - yMin) * 0.2 || 5;
    const domainMin = Math.floor(yMin - yPadding);
    const domainMax = Math.ceil(yMax + yPadding);

    // Loading state
    if (isLoadingData) {
        return (
            <div className={`glass-panel p-4 min-h-[220px] flex items-center justify-center ${className ?? ''}`}>
                <div className="animate-pulse text-industrial-muted text-xs font-bold uppercase tracking-widest">
                    Cargando datos...
                </div>
            </div>
        );
    }

    return (
        <div className={`glass-panel p-0 overflow-hidden min-h-[220px] flex flex-col ${className ?? ''}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-accent-cyan/60" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-industrial-muted">
                        {widget.title ?? 'Tendencia'}
                    </span>
                </div>
                {resolved.unit && (
                    <span className="text-[10px] font-bold text-industrial-muted/60 uppercase">
                        {resolved.unit}
                    </span>
                )}
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-0 px-2 pb-2">
                <ResponsiveContainer width="100%" height="100%" minHeight={170}>
                    <ComposedChart data={trendData} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                        {/* Grid oscuro */}
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.04)"
                            vertical={false}
                        />

                        {/* Eje X: hora */}
                        <XAxis
                            dataKey="time"
                            tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.25)', fontWeight: 700 }}
                            axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                            tickLine={false}
                            interval="preserveStartEnd"
                        />

                        {/* Eje Y: valor */}
                        <YAxis
                            domain={[domainMin, domainMax]}
                            tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.25)', fontWeight: 700 }}
                            axisLine={false}
                            tickLine={false}
                            width={45}
                        />

                        {/* Tooltip */}
                        <Tooltip content={<CustomTooltip />} />

                        {/* Líneas de threshold */}
                        {widget.thresholds?.map((t, idx) => (
                            <ReferenceLine
                                key={idx}
                                y={t.value}
                                stroke={t.severity === 'critical' ? '#ef4444' : '#f59e0b'}
                                strokeDasharray="6 3"
                                strokeWidth={1.5}
                                label={{
                                    value: t.label || (t.severity === 'critical' ? 'CRIT' : 'WARN'),
                                    position: 'right',
                                    fill: t.severity === 'critical' ? '#ef4444' : '#f59e0b',
                                    fontSize: 9,
                                    fontWeight: 800,
                                }}
                            />
                        ))}

                        {/* Área con gradiente */}
                        <defs>
                            <linearGradient id={`trendGrad-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#00e0ff" stopOpacity={0.15} />
                                <stop offset="100%" stopColor="#00e0ff" stopOpacity={0.01} />
                            </linearGradient>
                        </defs>
                        <Area
                            type="monotone"
                            dataKey="value"
                            fill={`url(#trendGrad-${widget.id})`}
                            stroke="none"
                        />

                        {/* Línea principal */}
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#00e0ff"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{
                                r: 4,
                                fill: '#00e0ff',
                                stroke: '#030712',
                                strokeWidth: 2,
                            }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
