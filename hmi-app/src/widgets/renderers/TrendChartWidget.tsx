import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EquipmentSummary } from '../../domain/equipment.types';
import {
    HISTORY_RANGES,
    HISTORY_RANGE_LABELS,
    type ContractMachine,
    type HistoryRange,
} from '../../domain/dataContract.types';
import { TrendingUp } from 'lucide-react';
import type { TrendChartWidgetConfig, ThresholdRule } from '../../domain/admin.types';
import { isDataHistoryEnabled } from '../../config/dataConnection.config';
import { useDataHistory } from '../../queries/useDataHistory';
import { resolveBinding } from '../resolvers/bindingResolver';
import { generateTrendData } from '../../utils/trendDataGenerator';
import { smoothPath, buildAreaPath, formatTick, clamp, computeVisibleLabelIndices, type Point } from '../../utils/chartHelpers';
import WidgetHeader from '../../components/ui/WidgetHeader';
import WidgetSegmentedControl from '../../components/ui/WidgetSegmentedControl';
import type { SegmentedOption } from '../../components/ui/WidgetSegmentedControl';
import ChartTooltip from '../../components/ui/ChartTooltip';
import type { ChartTooltipSeries } from '../../components/ui/ChartTooltip';
import ChartHoverLayer from '../../components/ui/ChartHoverLayer';

// =============================================================================
// TrendChartWidget
// Renderer para widgets de tipo 'trend-chart'.
// Renderiza un gráfico de tendencia temporal en SVG puro.
//
// Datos: consume histórico real cuando está disponible y conserva
// generateTrendData como fallback visual para bindings sin endpoint.
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
    machines?: ContractMachine[];
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

const MONTH_SHORT_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const;

const HISTORY_RANGE_OPTIONS: SegmentedOption<HistoryRange>[] = HISTORY_RANGES.map((range) => ({
    value: range,
    label: HISTORY_RANGE_LABELS[range],
}));

/**
 * Formatea un timestamp ISO UTC a hora local del browser.
 * Usa Date.getHours/getMinutes/etc. que SIEMPRE devuelven hora local,
 * sin depender de Intl.DateTimeFormat ni de la detección de timezone.
 */
function formatHistoryTimestamp(timestamp: string, range: HistoryRange): string {
    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return '--';
    }

    if (range === 'minuto' || range === 'hora') {
        const hh = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
    }

    if (range === 'dia' || range === 'semana') {
        const dd = String(date.getDate()).padStart(2, '0');
        const mo = String(date.getMonth() + 1).padStart(2, '0');
        return `${dd}/${mo}`;
    }

    return MONTH_SHORT_ES[date.getMonth()];
}

function formatSummaryValue(value: number | null): string {
    return value === null ? '--' : formatTick(value);
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
                            fontFamily="var(--font-chart)"
                            fontWeight="var(--font-weight-chart)"
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
                            fontWeight="var(--font-weight-chart)"
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
                    fontWeight="var(--font-weight-chart)"
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
    machines,
    isLoadingData = false,
    className,
}: TrendChartWidgetProps) {
    const [range, setRange] = useState<HistoryRange>('hora');
    const resolved = resolveBinding(widget, equipmentMap, machines);
    const isSimulated = widget.binding?.mode === 'simulated_value';
    const bindingMachineId = widget.binding?.machineId;
    const bindingVariableKey = widget.binding?.variableKey;
    const historyEnabled = isDataHistoryEnabled();

    // Solo consultar histórico cuando el origen es real (no simulado)
    const historyParams = !isSimulated && bindingMachineId !== undefined && bindingVariableKey && historyEnabled
        ? { machineId: bindingMachineId, variableKey: bindingVariableKey, range }
        : null;
    const {
        data: historyData,
        isLoading: isLoadingHistory,
        isError: isHistoryError,
    } = useDataHistory(historyParams);

    const baseValue = resolved.value == null
        ? null
        : typeof resolved.value === 'number'
            ? resolved.value
            : typeof resolved.value === 'string'
                ? (() => {
                    const parsed = parseFloat(resolved.value);
                    return Number.isNaN(parsed) ? 50 : parsed;
                })()
                : 50;

    // Datos simulados: solo cuando el binding está en modo simulado
    const trendData = useMemo(
        () => isSimulated && baseValue !== null ? generateTrendData(baseValue, undefined, 24) : [],
        [baseValue, isSimulated],
    );

    const historyTrendData = useMemo(
        () => historyData?.series
            ?.filter((point): point is { timestamp: string; value: number } => point.value !== null)
            .map((point) => ({
                time: formatHistoryTimestamp(point.timestamp, range),
                value: point.value,
            })) ?? [],
        [historyData?.series, range],
    );

    // Modo simulado → trendData; Modo real → historyTrendData (puede estar vacío)
    const chartData = isSimulated
        ? trendData
        : historyTrendData;

    const yValues = chartData.map((d) => d.value);
    const yMin = yValues.length > 0 ? Math.min(...yValues) : 0;
    const yMax = yValues.length > 0 ? Math.max(...yValues) : 0;
    const yPadding = yValues.length > 0 ? (yMax - yMin) * 0.2 || 5 : 0;
    const domainMin = yValues.length > 0 ? Math.floor(yMin - yPadding) : 0;
    const domainMax = yValues.length > 0 ? Math.ceil(yMax + yPadding) : 0;
    const resolvedUnit = historyData?.unit ?? (resolved.unit ? String(resolved.unit) : undefined);
    const hasBinding = bindingMachineId !== undefined && Boolean(bindingVariableKey);

    // Modo real cargando → skeleton; Modo simulado no muestra loading por histórico
    const isRealLoading = !isSimulated && historyParams !== null && isLoadingHistory;
    // Sin datos: modo real sin serie + sin error, o simulado sin binding
    const isNoData = isSimulated
        ? (chartData.length === 0 && (!hasBinding || baseValue === null))
        : (!isLoadingHistory && chartData.length === 0);

    if (isLoadingData || isRealLoading) {
        return (
            <div className={`glass-panel p-5 w-full h-full flex items-center justify-center ${className ?? ''}`}>
                <div className="animate-pulse text-industrial-muted text-xs font-bold uppercase tracking-widest">
                    Cargando datos...
                </div>
            </div>
        );
    }

    return (
        <div className={`glass-panel group relative p-5 overflow-hidden w-full h-full flex flex-col ${className ?? ''}`}>
            <WidgetSegmentedControl
                options={HISTORY_RANGE_OPTIONS}
                value={range}
                onChange={setRange}
            />

            <WidgetHeader
                title={widget.title ?? 'Trend Chart'}
                icon={TrendingUp}
                iconColor={TOKEN.icon}
                iconPosition="left"
                subtitle={resolvedUnit ? resolvedUnit.toUpperCase() : undefined}
                className="mb-3 shrink-0 min-w-0 max-w-[calc(100%-220px)]"
            />

            {historyData?.summary && chartData === historyTrendData && historyTrendData.length > 0 && (
                <div className="mb-3 flex items-center justify-center gap-4 shrink-0">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-industrial-muted">Min {formatSummaryValue(historyData.summary.min)}</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-industrial-muted">Max {formatSummaryValue(historyData.summary.max)}</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-industrial-muted">Avg {formatSummaryValue(historyData.summary.avg)}</span>
                </div>
            )}

            <div className="flex-1 min-h-0 -mx-3 -mb-3 relative">
                {isNoData ? (
                    <div className="h-full w-full flex flex-col items-center justify-center gap-2">
                        <span className="text-6xl font-black text-white leading-none tracking-tighter">--</span>
                        {!isSimulated && (
                            <span className="text-[10px] font-bold uppercase tracking-widest text-industrial-muted">
                                {isHistoryError ? 'Error al cargar datos' : 'Sin datos'}
                            </span>
                        )}
                    </div>
                ) : (
                    <TrendChartContainer
                        widgetId={widget.id}
                        data={chartData}
                        domainMin={domainMin}
                        domainMax={domainMax}
                        thresholds={widget.thresholds}
                        seriesName={widget.title ?? 'Valor'}
                        unit={resolvedUnit}
                    />
                )}
            </div>

        </div>
    );
}
