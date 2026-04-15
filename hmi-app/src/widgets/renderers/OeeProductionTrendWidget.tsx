import { useRef, useEffect, useState } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from 'recharts';
import { LineChart } from 'lucide-react';
import type { OeeProductionTrendWidgetConfig } from '../../domain/admin.types';
import type { EquipmentSummary } from '../../domain/equipment.types';

// =============================================================================
// OeeProductionTrendWidget
// Colores: NUNCA hardcodeados — siempre via var(--color-*) del @theme {}.
// =============================================================================

const TOKEN = {
    oee:    'var(--color-widget-gradient-from)',
    prod:   'var(--color-widget-gradient-to)',
    muted:  'var(--color-industrial-muted)',
    bg:     'var(--color-industrial-bg)',
    border: 'var(--color-industrial-border)',
} as const;

const MOCK_DATA = [
    { time: '08:00', oee: 72,   production: 120   },
    { time: '09:00', oee: 75,   production: 132   },
    { time: '10:00', oee: 74,   production: 128   },
    { time: '11:00', oee: 77,   production: 140   },
    { time: '12:00', oee: 76,   production: 135   },
    { time: '13:00', oee: 79,   production: 145   },
    { time: '14:00', oee: 78.4, production: 142.5 },
];

type TrendPoint = (typeof MOCK_DATA)[number];

interface Point { x: number; y: number; }

// Curva spline suavizada (cubic bezier monotone)
function smoothPath(points: Point[]): string {
    if (points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cpx  = (prev.x + curr.x) / 2;
        d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return d;
}

function formatTick(value: number): string {
    return value >= 10 ? Math.round(value).toString() : value.toFixed(1);
}

// =============================================================================
// BarsModeSvg — SVG completamente custom para el modo 'bars'.
//
// Arquitectura:
//   1. Barras de producción (eje Y derecho) — centradas en sus puntos
//   2. Área degradado OEE (eje Y izquierdo) — sobre las barras
//   3. Línea OEE — sobre el área
//
// Punto fantasma: se agrega un punto a cada extremo (mismo valor que el primero/
// último real) para que la curva spline llegue horizontal al borde del plot.
// Un <clipPath> recorta el área/línea OEE al rectángulo de ploteo exacto.
// Las barras NO necesitan clipPath — están matemáticamente centradas dentro.
// =============================================================================
interface BarsModeSvgProps {
    width?: number;
    height?: number;
    data: TrendPoint[];
    gradOeeId: string;
    gradBarBodyId: string;
}

function BarsModeSvg({ width = 0, height = 0, data, gradOeeId, gradBarBodyId }: BarsModeSvgProps) {
    if (width <= 0 || height <= 0 || data.length < 2) return null;

    const margin     = { top: 10, right: 48, bottom: 30, left: 48 } as const;
    const plotWidth  = Math.max(width  - margin.left - margin.right,  1);
    const plotHeight = Math.max(height - margin.top  - margin.bottom, 1);

    // ── Layout horizontal con padding interno (Opción A) ──────────────────────
    // El padding interno simétrico (padX) cumple DOS funciones:
    //   1. Estructural (barW/2): garantiza que la primera y la última barra
    //      queden COMPLETAS dentro del plot, sin recortes.
    //   2. Estético (barW/2 extra): da "respiración" entre las barras extremas
    //      y los labels de los ejes Y, evitando la sensación de encajonado.
    // Total: padX = barW * 1.0 (mitad estructural + mitad respiración).
    //
    // La línea OEE comparte exactamente los mismos centros X que las barras
    // (`x0 + i*step`), garantizando correlación perfecta entre ambas series.
    //
    // Factor 0.35 = ancho de barra al 35% del ancho de banda teórico.
    // Sweet spot estético para HMI premium (Grafana/Datadog rondan 30-40%).
    // El piso de 8px garantiza legibilidad en viewports muy chicos.
    const barW    = Math.max((plotWidth / data.length) * 0.35, 8);
    const padX    = barW * 1.0;
    const usableW = Math.max(plotWidth - 2 * padX, 1);
    const step    = usableW / (data.length - 1);
    const x0      = margin.left + padX;

    const maxProd = Math.max(...data.map(d => d.production)) * 1.15;
    const maxOee  = Math.max(...data.map(d => d.oee))        * 1.15;

    // ── Puntos OEE — mismo centro X que las barras ──
    const oeePoints: Point[] = data.map((item, i) => ({
        x: x0 + i * step,
        y: margin.top + plotHeight - (item.oee / maxOee) * plotHeight,
    }));

    const oeePath    = smoothPath(oeePoints);
    const clipPathId = `clip-${gradOeeId}`;
    const glowId     = `glow-${gradOeeId}`;

    // Área de relleno OEE — cerrada hacia la baseline
    const firstPt = oeePoints[0];
    const lastPt  = oeePoints[oeePoints.length - 1];
    const areaPath = `${oeePath}`
        + ` L ${lastPt.x} ${margin.top + plotHeight}`
        + ` L ${firstPt.x} ${margin.top + plotHeight} Z`;

    // ── Grid horizontal ──
    const TICKS = 5;
    const gridLines = Array.from({ length: TICKS }, (_, i) => ({
        y: margin.top + (i / (TICKS - 1)) * plotHeight,
    }));

    // ── Ticks de ejes Y ──
    const oeeTicks   = Array.from({ length: TICKS }, (_, i) => ({
        value: maxOee  * (1 - i / (TICKS - 1)),
        y:     margin.top + (i / (TICKS - 1)) * plotHeight,
    }));
    const prodTicks  = Array.from({ length: TICKS }, (_, i) => ({
        value: maxProd * (1 - i / (TICKS - 1)),
        y:     margin.top + (i / (TICKS - 1)) * plotHeight,
    }));

    return (
        <svg width={width} height={height}>
            <defs>
                {/* Gradiente área OEE */}
                <linearGradient id={gradOeeId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={TOKEN.oee}  stopOpacity={0.30} />
                    <stop offset="95%" stopColor={TOKEN.oee}  stopOpacity={0}    />
                </linearGradient>
                {/* Gradiente cuerpo barra */}
                <linearGradient id={gradBarBodyId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={TOKEN.prod} stopOpacity={0.55} />
                    <stop offset="100%" stopColor={TOKEN.prod} stopOpacity={0.10} />
                </linearGradient>
                {/* ClipPath — recorta área y línea OEE al rectángulo del plot */}
                <clipPath id={clipPathId}>
                    <rect x={margin.left} y={margin.top} width={plotWidth} height={plotHeight} />
                </clipPath>
                {/* Glow para la línea OEE */}
                <filter id={glowId} x="-20%" y="-50%" width="140%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Grid horizontal */}
            {gridLines.map(({ y }) => (
                <line key={y} x1={margin.left} x2={margin.left + plotWidth}
                    y1={y} y2={y}
                    stroke="var(--color-chart-grid)" strokeDasharray="3 3" />
            ))}

            {/* ── 1. Área degradado OEE (detrás de las barras) ── */}
            <path d={areaPath} fill={`url(#${gradOeeId})`} fillOpacity={1}
                clipPath={`url(#${clipPathId})`} />

            {/* ── 2. Línea OEE (detrás de las barras, sobre el área) ── */}
            <path d={oeePath} stroke={TOKEN.oee} strokeWidth={2.5} fill="none"
                clipPath={`url(#${clipPathId})`}
                filter={`url(#${glowId})`} />

            {/* ── 3. Barras de producción — sin clipPath: el padding interno
                 garantiza que ninguna barra se salga del área de ploteo ── */}
            {data.map((item, i) => {
                const cx   = x0 + i * step;
                const barH = (item.production / maxProd) * plotHeight;
                const barY = margin.top + plotHeight - barH;
                const bx   = cx - barW / 2;
                const topH = Math.min(5, barH);
                return (
                    <g key={item.time}>
                        <rect x={bx} y={barY} width={barW} height={barH}
                            fill={`url(#${gradBarBodyId})`} />
                        <rect x={bx} y={barY} width={barW} height={topH}
                            fill={TOKEN.prod}
                            style={{ filter: `drop-shadow(0 0 6px ${TOKEN.prod})` }} />
                    </g>
                );
            })}

            {/* Labels eje X — alineadas con los centros de las barras y de la línea OEE */}
            {data.map((item, i) => (
                <text key={`xl-${item.time}`}
                    x={x0 + i * step} y={margin.top + plotHeight + 16}
                    textAnchor="middle" fill={TOKEN.muted}
                    fontSize={10} fontFamily="var(--font-chart)" fontWeight={600}>
                    {item.time}
                </text>
            ))}

            {/* Labels eje Y izquierdo (OEE) */}
            {oeeTicks.map((t, i) => (
                <text key={`yl-${i}`}
                    x={margin.left - 8} y={t.y} dy={4}
                    textAnchor="end" fill={TOKEN.muted}
                    fontSize={10} fontFamily="var(--font-chart)" fontWeight={600}>
                    {formatTick(t.value)}
                </text>
            ))}

            {/* Labels eje Y derecho (producción) */}
            {prodTicks.map((t, i) => (
                <text key={`yr-${i}`}
                    x={margin.left + plotWidth + 8} y={t.y} dy={4}
                    textAnchor="start" fill={TOKEN.muted}
                    fontSize={10} fontFamily="var(--font-chart)" fontWeight={600}>
                    {formatTick(t.value)}
                </text>
            ))}
        </svg>
    );
}

// =============================================================================
// BarsModeContainer — mide el div con ResizeObserver y pasa dimensiones reales
// =============================================================================
interface BarsModeContainerProps {
    data: TrendPoint[];
    gradOeeId: string;
    gradBarBodyId: string;
}

function BarsModeContainer({ data, gradOeeId, gradBarBodyId }: BarsModeContainerProps) {
    const ref  = useRef<HTMLDivElement>(null);
    const [dims, setDims] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const ro = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            setDims({ width, height });
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    return (
        <div ref={ref} className="w-full h-full">
            <BarsModeSvg
                width={dims.width} height={dims.height}
                data={data} gradOeeId={gradOeeId} gradBarBodyId={gradBarBodyId}
            />
        </div>
    );
}

// =============================================================================
// OeeProductionTrendWidget — componente principal
// =============================================================================
interface OeeProductionTrendWidgetProps {
    widget: OeeProductionTrendWidgetConfig;
    equipmentMap: Map<string, EquipmentSummary>;
    isLoadingData?: boolean;
    className?: string;
}

export default function OeeProductionTrendWidget({
    widget,
    equipmentMap: _equipmentMap,
    isLoadingData = false,
    className,
}: OeeProductionTrendWidgetProps) {
    const oeeLabel        = widget.displayOptions?.oeeLabel        ?? 'OEE (%)';
    const productionLabel = widget.displayOptions?.productionLabel ?? 'Volumen (k)';
    const chartTitle      = widget.displayOptions?.chartTitle      ?? 'TENDENCIA HISTÓRICA: OEE vs PRODUCCIÓN';
    const volumeMode      = widget.displayOptions?.volumeChartMode ?? 'area';

    const gradOeeId     = `oee-grad-${widget.id}`;
    const gradProdId    = `prod-grad-${widget.id}`;
    const gradBarBodyId = `bar-body-grad-${widget.id}`;

    if (isLoadingData) {
        return (
            <div className={`glass-panel p-5 w-full h-full flex items-center justify-center ${className ?? ''}`}>
                <div className="animate-pulse text-industrial-muted text-xs font-bold uppercase tracking-widest">
                    Cargando datos...
                </div>
            </div>
        );
    }

    // ── Props modo área (Recharts) ──
    const xAxisProps = {
        dataKey: 'time',
        stroke: TOKEN.border,
        tick: { fill: TOKEN.muted, fontSize: 10, fontFamily: 'var(--font-chart)', fontWeight: 600 },
        tickLine: false, axisLine: false, dy: 10,
    } as const;

    const yAxisLeftProps = {
        yAxisId: 'left' as const,
        stroke: TOKEN.border,
        tick: { fill: TOKEN.muted, fontSize: 10, fontFamily: 'var(--font-chart)', fontWeight: 600 },
        tickLine: false, axisLine: false, dx: -10,
    } as const;

    const yAxisRightProps = {
        yAxisId: 'right' as const,
        orientation: 'right' as const,
        stroke: TOKEN.border,
        tick: { fill: TOKEN.muted, fontSize: 10, fontFamily: 'var(--font-chart)', fontWeight: 600 },
        tickLine: false, axisLine: false, dx: 10,
    } as const;

    const tooltipProps = {
        contentStyle: {
            backgroundColor: TOKEN.bg,
            borderColor: 'rgba(255,255,255,0.08)',
            borderRadius: '8px',
            color: 'var(--color-industrial-text)',
        },
        itemStyle:  { color: 'var(--color-industrial-text)', fontSize: '12px' },
        labelStyle: { color: TOKEN.muted, marginBottom: '4px', fontSize: '12px' },
    } as const;

    const svgDefs = (
        <defs>
            <linearGradient id={gradOeeId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={TOKEN.oee}  stopOpacity={0.3} />
                <stop offset="95%" stopColor={TOKEN.oee}  stopOpacity={0}   />
            </linearGradient>
            <linearGradient id={gradProdId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={TOKEN.prod} stopOpacity={0.3} />
                <stop offset="95%" stopColor={TOKEN.prod} stopOpacity={0}   />
            </linearGradient>
        </defs>
    );

    return (
        <div className={`glass-panel w-full h-[300px] p-5 flex flex-col ${className ?? ''}`}>

            {/* Header */}
            <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-2">
                    <LineChart size={24} strokeWidth={2} className="shrink-0 opacity-70"
                        style={{ color: 'var(--color-widget-icon)' }} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-industrial-muted">
                        {chartTitle}
                    </span>
                </div>
                <div className="flex gap-4 shrink-0">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: TOKEN.oee }} />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{oeeLabel}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 shrink-0 ${volumeMode === 'bars' ? 'rounded-sm' : 'rounded-full'}`}
                            style={{ backgroundColor: TOKEN.prod }} />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{productionLabel}</span>
                    </div>
                </div>
            </div>

            {/* Gráfico */}
            <div className="flex-1 w-full min-h-0">
                {volumeMode === 'bars' ? (
                    <BarsModeContainer
                        data={MOCK_DATA}
                        gradOeeId={gradOeeId}
                        gradBarBodyId={gradBarBodyId}
                    />
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={MOCK_DATA} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            {svgDefs}
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" vertical={false} />
                            <XAxis {...xAxisProps} />
                            <YAxis {...yAxisLeftProps} />
                            <YAxis {...yAxisRightProps} />
                            <Tooltip {...tooltipProps} />
                            <Area yAxisId="left" type="monotone" dataKey="oee" name={oeeLabel}
                                stroke={TOKEN.oee} strokeWidth={3} fillOpacity={1}
                                fill={`url(#${gradOeeId})`}
                                activeDot={{ r: 6, fill: TOKEN.oee, stroke: TOKEN.bg, strokeWidth: 2 }}
                                className="neon-cyan-glow" />
                            <Area yAxisId="right" type="monotone" dataKey="production" name={productionLabel}
                                stroke={TOKEN.prod} strokeWidth={3} fillOpacity={1}
                                fill={`url(#${gradProdId})`}
                                activeDot={{ r: 6, fill: TOKEN.prod, stroke: TOKEN.bg, strokeWidth: 2 }}
                                className="neon-violet-glow" />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
