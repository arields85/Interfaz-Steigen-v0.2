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
import type { TrendChartWidgetConfig } from '../../domain/admin.types';
import type { EquipmentSummary } from '../../domain/equipment.types';
import { resolveBinding } from '../resolvers/bindingResolver';
import { generateTrendData } from '../../utils/trendDataGenerator';
import { TrendingUp } from 'lucide-react';
import WidgetHeader from '../../components/ui/WidgetHeader';

// =============================================================================
// TrendChartWidget
// Renderer para widgets de tipo 'trend-chart'.
// Renderiza un gráfico de tendencia temporal usando Recharts.
//
// Datos: genera serie temporal simulada alrededor del valor actual del binding.
// En el futuro, cuando exista un backend de time-series, se reemplazará
// generateTrendData por una query real.
//
// Estética: Dark Industrial Theme con gradientes del sistema de tokens.
// Colores: NUNCA hardcodeados — siempre via var(--color-*) del @theme {}.
// =============================================================================

const TOKEN = {
    lineColor: 'var(--color-widget-gradient-from)',
    lineGlow: 'drop-shadow(0 0 18px color-mix(in srgb, var(--color-widget-gradient-from) 55%, transparent))',
    gradientFrom: 'var(--color-widget-gradient-from)',
    gradientTo: 'var(--color-widget-gradient-to)',
    statusCritical: 'var(--color-status-critical)',
    statusWarning: 'var(--color-status-warning)',
    industrialBg: 'var(--color-industrial-bg)',
    industrialBorder: 'var(--color-industrial-border)',
    industrialMuted: 'var(--color-industrial-muted)',
} as const;

// ─────────────────────────────────────────────────────────────────────────────

interface TrendChartWidgetProps {
    widget: TrendChartWidgetConfig;
    equipmentMap: Map<string, EquipmentSummary>;
    isLoadingData?: boolean;
    className?: string;
}

interface TrendLiveDotProps {
    cx?: number;
    cy?: number;
    index?: number;
}

// Tooltip personalizado con glassmorphism
function CustomTooltip({
    active,
    payload,
    label,
    unit,
}: {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
    unit?: string;
}) {
    if (!active || !payload || payload.length === 0) return null;

    return (
        <div
            className="backdrop-blur border border-white/10 rounded-lg px-3 py-2 shadow-xl"
            style={{ background: 'color-mix(in srgb, var(--color-industrial-bg) 95%, transparent)' }}
        >
            <p className="text-[10px] font-bold text-industrial-muted uppercase tracking-wider mb-0.5">
                {label}
            </p>
            <p className="text-sm font-black" style={{ color: 'var(--color-widget-gradient-to)' }}>
                {payload[0].value}
                {unit && <span className="text-industrial-muted font-normal text-xs ml-1">{unit}</span>}
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
    const lastPointIndex = trendData.length - 1;

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
            <div className={`glass-panel p-5 w-full h-full flex items-center justify-center ${className ?? ''}`}>
                <div className="animate-pulse text-industrial-muted text-xs font-bold uppercase tracking-widest">
                    Cargando datos...
                </div>
            </div>
        );
    }

    return (
        <div className={`glass-panel group p-5 overflow-hidden w-full h-full flex flex-col ${className ?? ''}`}>
            <WidgetHeader
                title={widget.title ?? 'Trend Chart'}
                icon={TrendingUp}
                iconColor="var(--color-widget-icon)"
                subtitle={resolved.unit ? String(resolved.unit).toUpperCase() : undefined}
                className="mb-2 shrink-0"
            />

            {/* Chart */}
            <div className="flex-1 min-h-0 -mx-3 -mb-3">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trendData} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                        {/* Grid oscuro — borde sutil del sistema */}
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="color-mix(in srgb, white 4%, transparent)"
                            vertical={false}
                        />

                        {/* Eje X: hora */}
                        <XAxis
                            dataKey="time"
                            tick={{ fontSize: 9, fill: TOKEN.industrialMuted, fontWeight: 700, fillOpacity: 0.4 }}
                            axisLine={{ stroke: TOKEN.industrialBorder }}
                            tickLine={false}
                            interval="preserveStartEnd"
                        />

                        {/* Eje Y: valor */}
                        <YAxis
                            domain={[domainMin, domainMax]}
                            tick={{ fontSize: 9, fill: TOKEN.industrialMuted, fontWeight: 700, fillOpacity: 0.4 }}
                            axisLine={false}
                            tickLine={false}
                            width={45}
                        />

                        {/* Tooltip */}
                        <Tooltip content={<CustomTooltip unit={resolved.unit ? String(resolved.unit) : undefined} />} />

                        {/* Líneas de threshold — colores semánticos del sistema */}
                        {widget.thresholds?.map((t, idx) => (
                            <ReferenceLine
                                key={idx}
                                y={t.value}
                                stroke={t.severity === 'critical' ? TOKEN.statusCritical : TOKEN.statusWarning}
                                strokeDasharray="6 3"
                                strokeWidth={1.5}
                                label={{
                                    value: t.label || (t.severity === 'critical' ? 'CRIT' : 'WARN'),
                                    position: 'right',
                                    fill: t.severity === 'critical' ? TOKEN.statusCritical : TOKEN.statusWarning,
                                    fontSize: 9,
                                    fontWeight: 800,
                                }}
                            />
                        ))}

                        {/* Área con color horizontal + fade vertical combinados */}
                        <defs>
                            <linearGradient id={`trendLineGrad-${widget.id}`} x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor={TOKEN.gradientFrom} stopOpacity={0.7} />
                                <stop offset="100%" stopColor={TOKEN.gradientTo} stopOpacity={0.7} />
                            </linearGradient>

                            <linearGradient id={`trendColorGrad-${widget.id}`} x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor={TOKEN.gradientFrom} stopOpacity={1} />
                                <stop offset="100%" stopColor={TOKEN.gradientTo} stopOpacity={1} />
                            </linearGradient>

                            <linearGradient id={`trendFadeGrad-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="white" stopOpacity={0.7} />
                                <stop offset="100%" stopColor="white" stopOpacity={0} />
                            </linearGradient>

                            <mask id={`trendMask-${widget.id}`} maskContentUnits="objectBoundingBox">
                                <rect x="0" y="0" width="1" height="1" fill={`url(#trendFadeGrad-${widget.id})`} />
                            </mask>
                        </defs>
                        <Area
                            type="monotone"
                            dataKey="value"
                            fill={`url(#trendColorGrad-${widget.id})`}
                            fillOpacity={1}
                            mask={`url(#trendMask-${widget.id})`}
                            stroke="none"
                        />

                        {/* Línea principal */}
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke={`url(#trendLineGrad-${widget.id})`}
                            strokeWidth={2.5}
                            style={{ filter: TOKEN.lineGlow }}
                            dot={(props: TrendLiveDotProps) => {
                                if (
                                    props.index !== lastPointIndex
                                    || props.cx === undefined
                                    || props.cy === undefined
                                ) {
                                    return false;
                                }

                                return (
                                    <g>
                                        <circle
                                            cx={props.cx}
                                            cy={props.cy}
                                            r={9}
                                            fill={TOKEN.gradientTo}
                                            fillOpacity={0.45}
                                            className="animate-ping"
                                            style={{ animationDuration: '2s', transformOrigin: `${props.cx}px ${props.cy}px` }}
                                        />
                                        <circle
                                            cx={props.cx}
                                            cy={props.cy}
                                            r={4}
                                            fill={TOKEN.gradientTo}
                                            stroke={TOKEN.industrialBg}
                                            strokeWidth={1.5}
                                        />
                                    </g>
                                );
                            }}
                            activeDot={{
                                r: 4,
                                fill: TOKEN.lineColor,
                                stroke: TOKEN.industrialBg,
                                strokeWidth: 2,
                            }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
