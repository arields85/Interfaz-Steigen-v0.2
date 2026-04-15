import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EquipmentSummary } from '../../domain/equipment.types';
import { TrendingUp } from 'lucide-react';
import type { TrendChartWidgetConfig, ThresholdRule } from '../../domain/admin.types';
import { resolveBinding } from '../resolvers/bindingResolver';
import { generateTrendData } from '../../utils/trendDataGenerator';
import { smoothPath, buildAreaPath, formatTick, clamp, computeVisibleLabelIndices, type Point } from '../../utils/chartHelpers';
import WidgetHeader from '../../components/ui/WidgetHeader';
import ChartTooltip from '../../components/ui/ChartTooltip';
import type { ChartTooltipSeries } from '../../components/ui/ChartTooltip';
import ChartHoverLayer from '../../components/ui/ChartHoverLayer';

// =============================================================================
// TrendChartWidget
// Renderer para widgets de tipo 'trend-chart'.
// Renderiza un gráfico de tendencia temporal en SVG puro.
//
// Datos: genera serie temporal simulada alrededor del valor actual del binding.
// En el futuro, cuando exista un backend de time-series, se reemplazará
// generateTrendData por una query real.
//
// Estética: Dark Industrial Theme con gradientes del sistema de tokens.
// Colores: NUNCA hardcodeados — siempre via var(--color-*) del @theme {}.
// =============================================================================

const TOKEN = {
    gradientFrom: 'var(--color-widget-gradient-from)',
    gradientTo: 'var(--color-widget-gradient-to)',
    lineGlow: 'drop-shadow(0 0 18px color-mix(in srgb, var(--color-widget-gradient-from) 55%, transparent))',
    statusCritical: 'var(--color-status-critical)',
    statusWarning: 'var(--color-status-warning)',
    background: 'var(--color-industrial-bg)',
    border: 'var(--color-industrial-border)',
    muted: 'var(--color-industrial-muted)',
    grid: 'var(--color-chart-grid)',
    icon: 'var(--color-widget-icon)',
} as const;

interface TrendChartWidgetProps {
    widget: TrendChartWidgetConfig;
    equipmentMap: Map<string, EquipmentSummary>;
    isLoadingData?: boolean;
    className?: string;
}

interface TrendChartSvgProps {
    widgetId: string;
    width: number;
    height: number;
    data: Array<{ time: string; value: number }>;
    domainMin: number;
    domainMax: number;
    thresholds?: ThresholdRule[];
    hoveredIndex: number | null;
    onHoverChange: (index: number | null, x?: number) => void;
}

interface TrendChartContainerProps {
    widgetId: string;
    data: Array<{ time: string; value: number }>;
    domainMin: number;
    domainMax: number;
    thresholds?: ThresholdRule[];
    seriesName: string;
    unit?: string;
}

function TrendChartSvg({
    widgetId,
    width,
    height,
    data,
    domainMin,
    domainMax,
    thresholds,
    hoveredIndex,
    onHoverChange,
}: TrendChartSvgProps) {
    if (width <= 0 || height <= 0 || data.length === 0) return null;

    const margin = { top: 10, right: 12, bottom: 24, left: 45 } as const;
    const plotWidth = Math.max(width - margin.left - margin.right, 1);
    const plotHeight = Math.max(height - margin.top - margin.bottom, 1);
    const step = plotWidth / Math.max(data.length - 1, 1);
    const x0 = margin.left;

    const range = Math.max(domainMax - domainMin, 1);
    const toY = (value: number) => {
        const ratio = clamp((value - domainMin) / range, 0, 1);
        return margin.top + plotHeight - (ratio * plotHeight);
    };

    const points: Point[] = data.map((item, index) => ({
        x: x0 + (index * step),
        y: toY(item.value),
    }));

    const linePath = smoothPath(points);
    const areaPath = buildAreaPath(linePath, points, margin.top + plotHeight);
    const lastPoint = points[points.length - 1];

    const gridLines = Array.from({ length: 5 }, (_, index) => ({
        y: margin.top + ((index / 4) * plotHeight),
    }));

    const yTicks = Array.from({ length: 5 }, (_, index) => ({
        value: domainMax - (((domainMax - domainMin) * index) / 4),
        y: margin.top + ((index / 4) * plotHeight),
    }));

    const lineGradientId = `trend-line-grad-${widgetId}`;
    const colorGradientId = `trend-color-grad-${widgetId}`;
    const fadeGradientId = `trend-fade-grad-${widgetId}`;
    const maskId = `trend-mask-${widgetId}`;
    const glowId = `trend-glow-${widgetId}`;

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <defs>
                {/* Horizontal gradient for line stroke */}
                <linearGradient id={lineGradientId} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={TOKEN.gradientFrom} stopOpacity={0.7} />
                    <stop offset="100%" stopColor={TOKEN.gradientTo} stopOpacity={0.7} />
                </linearGradient>

                {/* Horizontal gradient for area color */}
                <linearGradient id={colorGradientId} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={TOKEN.gradientFrom} />
                    <stop offset="100%" stopColor={TOKEN.gradientTo} />
                </linearGradient>

                {/* Vertical fade for area mask */}
                <linearGradient id={fadeGradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="white" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="white" stopOpacity={0} />
                </linearGradient>

                <mask id={maskId} maskContentUnits="objectBoundingBox">
                    <rect x="0" y="0" width="1" height="1" fill={`url(#${fadeGradientId})`} />
                </mask>

                {/* Glow filter for line */}
                <filter id={glowId} x="-20%" y="-50%" width="140%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {gridLines.map(({ y }) => (
                <line
                    key={y}
                    x1={margin.left}
                    x2={margin.left + plotWidth}
                    y1={y}
                    y2={y}
                    stroke={TOKEN.grid}
                    strokeDasharray="3 3"
                />
            ))}

            <line
                x1={margin.left}
                y1={margin.top}
                x2={margin.left}
                y2={margin.top + plotHeight}
                stroke={TOKEN.border}
            />
            <line
                x1={margin.left}
                y1={margin.top + plotHeight}
                x2={margin.left + plotWidth}
                y2={margin.top + plotHeight}
                stroke={TOKEN.border}
            />

            {thresholds?.map((t, idx) => {
                const ty = toY(t.value);
                if (ty < margin.top || ty > margin.top + plotHeight) return null;
                const color = t.severity === 'critical' ? TOKEN.statusCritical : TOKEN.statusWarning;

                return (
                    <g key={`threshold-${idx}`}>
                        <line
                            x1={margin.left}
                            x2={margin.left + plotWidth}
                            y1={ty}
                            y2={ty}
                            stroke={color}
                            strokeDasharray="6 3"
                            strokeWidth={1.5}
                        />
                        <text
                            x={margin.left + plotWidth - 4}
                            y={ty - 6}
                            textAnchor="end"
                            fill={color}
                            fontSize={9}
                            fontWeight={800}
                            fontFamily="var(--font-chart)"
                        >
                            {t.label || (t.severity === 'critical' ? 'CRIT' : 'WARN')}
                        </text>
                    </g>
                );
            })}

            {areaPath.length > 0 && (
                <path
                    d={areaPath}
                    fill={`url(#${colorGradientId})`}
                    mask={`url(#${maskId})`}
                />
            )}

            {linePath.length > 0 && (
                <path
                    d={linePath}
                    stroke={`url(#${lineGradientId})`}
                    strokeWidth={2.5}
                    fill="none"
                    filter={`url(#${glowId})`}
                />
            )}

            {lastPoint && (
                <g>
                    <circle
                        cx={lastPoint.x}
                        cy={lastPoint.y}
                        r={9}
                        fill={TOKEN.gradientTo}
                        fillOpacity={0.45}
                        className="animate-ping"
                        style={{ animationDuration: '2s', transformOrigin: `${lastPoint.x}px ${lastPoint.y}px` }}
                    />
                    <circle
                        cx={lastPoint.x}
                        cy={lastPoint.y}
                        r={4}
                        fill={TOKEN.gradientTo}
                        stroke={TOKEN.background}
                        strokeWidth={1.5}
                    />
                </g>
            )}

            {(() => {
                const xLabels = data.map((item) => item.time);
                const xPositions = data.map((_, index) => x0 + (index * step));
                const visibleIndices = computeVisibleLabelIndices(
                    xLabels,
                    xPositions,
                    '600 10px IBMPlexMono, monospace',
                    8,
                    margin.left + plotWidth,
                );
                return data.map((item, index) => {
                    if (!visibleIndices.has(index)) return null;
                    return (
                        <text
                            key={`x-label-${index}`}
                            x={x0 + (index * step)}
                            y={margin.top + plotHeight + 16}
                            textAnchor="middle"
                            fill={TOKEN.muted}
                            fontSize={10}
                            fontFamily="var(--font-chart)"
                            fontWeight={600}
                        >
                            {item.time}
                        </text>
                    );
                });
            })()}

            {yTicks.map((tick, index) => (
                <text
                    key={`y-tick-${index}`}
                    x={margin.left - 8}
                    y={tick.y}
                    dy={4}
                    textAnchor="end"
                    fill={TOKEN.muted}
                    fontSize={10}
                    fontFamily="var(--font-chart)"
                    fontWeight={600}
                >
                    {formatTick(tick.value)}
                </text>
            ))}

            <ChartHoverLayer
                dataLength={data.length}
                x0={x0}
                step={step}
                marginTop={margin.top}
                marginLeft={margin.left}
                plotWidth={plotWidth}
                plotHeight={plotHeight}
                hoveredIndex={hoveredIndex}
                onHoverChange={onHoverChange}
                indicatorColor={TOKEN.muted}
                highlightBorderColor={TOKEN.background}
                highlights={hoveredIndex !== null && hoveredIndex >= 0 && hoveredIndex < data.length
                    ? [{ x: points[hoveredIndex].x, y: points[hoveredIndex].y, color: TOKEN.gradientTo }]
                    : undefined}
            />
        </svg>
    );
}

function TrendChartContainer({
    widgetId,
    data,
    domainMin,
    domainMax,
    thresholds,
    seriesName,
    unit,
}: TrendChartContainerProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [hoverInfo, setHoverInfo] = useState<{ index: number; x: number } | null>(null);

    const handleHoverChange = useCallback((index: number | null, x?: number) => {
        setHoveredIndex(index);
        setHoverInfo(index !== null && x !== undefined ? { index, x } : null);
    }, []);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            setDimensions({ width, height });
        });

        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={ref} className="h-full w-full relative">
            <TrendChartSvg
                widgetId={widgetId}
                width={dimensions.width}
                height={dimensions.height}
                data={data}
                domainMin={domainMin}
                domainMax={domainMax}
                thresholds={thresholds}
                hoveredIndex={hoveredIndex}
                onHoverChange={handleHoverChange}
            />

            {hoverInfo && hoverInfo.index >= 0 && hoverInfo.index < data.length && (() => {
                const point = data[hoverInfo.index];
                const series: ChartTooltipSeries[] = [{
                    name: seriesName,
                    value: `${point.value}${unit ? ` ${unit}` : ''}`,
                    color: TOKEN.gradientTo,
                }];

                return (
                    <ChartTooltip
                        label={point.time}
                        series={series}
                        x={hoverInfo.x}
                        containerWidth={dimensions.width}
                    />
                );
            })()}
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

    const baseValue = typeof resolved.value === 'number'
        ? resolved.value
        : typeof resolved.value === 'string'
            ? parseFloat(resolved.value) || 50
            : 50;

    const trendData = useMemo(
        () => generateTrendData(baseValue, undefined, 24),
        [baseValue],
    );

    const yValues = trendData.map((d) => d.value);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    const yPadding = (yMax - yMin) * 0.2 || 5;
    const domainMin = Math.floor(yMin - yPadding);
    const domainMax = Math.ceil(yMax + yPadding);

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
                iconColor={TOKEN.icon}
                subtitle={resolved.unit ? String(resolved.unit).toUpperCase() : undefined}
                className="mb-2 shrink-0"
            />

            <div className="flex-1 min-h-0 -mx-3 -mb-3 relative">
                <TrendChartContainer
                    widgetId={widget.id}
                    data={trendData}
                    domainMin={domainMin}
                    domainMax={domainMax}
                    thresholds={widget.thresholds}
                    seriesName={widget.title ?? 'Valor'}
                    unit={resolved.unit ? String(resolved.unit) : undefined}
                />
            </div>
        </div>
    );
}
