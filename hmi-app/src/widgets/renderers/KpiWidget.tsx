import type { KpiWidgetConfig, ThresholdRule } from '../../domain/admin.types';
import type { EquipmentSummary } from '../../domain/equipment.types';
import type { ContractMachine } from '../../domain/dataContract.types';
import { resolveBinding } from '../resolvers/bindingResolver';
import { Activity, Thermometer, Zap, Droplet, Wind, Settings, Gauge, Fan, FoldVertical, HelpCircle, type LucideIcon } from 'lucide-react';
import WidgetHeader from '../../components/ui/WidgetHeader';
import WidgetCenteredContentLayout from '../../components/ui/WidgetCenteredContentLayout';

const ICON_MAP: Record<string, LucideIcon> = {
    'Gauge': Gauge,
    'Activity': Activity,
    'Thermometer': Thermometer,
    'Zap': Zap,
    'Droplet': Droplet,
    'Wind': Wind,
    'Settings': Settings,
    'Fan': Fan,
    'FoldVertical': FoldVertical
};

interface KpiWidgetProps {
    widget: KpiWidgetConfig;
    equipmentMap: Map<string, EquipmentSummary>;
    machines?: ContractMachine[];
    isLoadingData?: boolean;
    className?: string;
}

export default function KpiWidget({ widget, equipmentMap, machines, isLoadingData, className }: KpiWidgetProps) {
    if (isLoadingData) {
        return (
            <div className={`p-5 rounded-3xl bg-industrial-surface border border-industrial-border animate-pulse ${className ?? ''}`}>
                <div className="h-4 w-24 bg-industrial-hover rounded mb-6" />
                <div className="h-20 w-full bg-industrial-hover rounded-full" />
            </div>
        );
    }

    const resolved = resolveBinding(widget, equipmentMap, machines);
    
    const numericValue = resolved.value == null
        ? null
        : typeof resolved.value === 'number'
            ? resolved.value
            : typeof resolved.value === 'string'
                ? (() => {
                    const parsed = parseFloat(resolved.value);
                    return Number.isNaN(parsed) ? 0 : parsed;
                })()
                : 0;

    const opts = widget.displayOptions;
    const mode = opts?.kpiMode ?? 'circular';
    const min = opts?.min ?? 0;
    const max = opts?.max ?? 100;

    // Si la unidad no está en binding, tomar la predeterminada del widget (compatibilidad)
    const unit = resolved.unit ?? widget.binding?.unit ?? '';
    const iconSetting = opts?.icon;
    const isPendingIconSelection = iconSetting === undefined;
    const isNoIconSelection = iconSetting === null;
    const configuredIcon = typeof iconSetting === 'string' ? ICON_MAP[iconSetting] : undefined;
    const isInvalidConfiguredIcon = typeof iconSetting === 'string' && configuredIcon === undefined;

    const Icon = isPendingIconSelection
        ? HelpCircle
        : isNoIconSelection
          ? undefined
          : configuredIcon ?? HelpCircle;

    // subtitle: texto en el HEADER (debajo del título). Solo desde displayOptions.subtitle.
    // subtext:  texto en el FOOTER (parte inferior). Solo desde displayOptions.subtext.
    // Son conceptos distintos. No existe fallback entre ellos.
    const subtitle = opts?.subtitle;
    const footerSubtext = opts?.subtext;

    // Color de ícono y subtítulo de header: variable CSS según estado
    const isDynamic = !!opts?.dynamicColor;
    const dynamicMode = isDynamic && numericValue !== null ? getDynamicColors(numericValue, widget.thresholds) : null;
    const iconColor = isPendingIconSelection || isInvalidConfiguredIcon
        ? 'var(--color-industrial-muted)'
        : dynamicMode
          ? dynamicMode.textColor
          : 'var(--color-widget-icon)';

    return (
        <div className={`p-5 glass-panel group relative w-full h-full ${className ?? ''}`}>
            <WidgetCenteredContentLayout
                headerOffsetClassName="-translate-y-1"
                contentClassName="translate-y-3"
                header={(
                    <WidgetHeader
                        title={widget.title ?? 'KPI'}
                        icon={Icon}
                        iconColor={iconColor}
                        subtitle={subtitle}
                        alignment="none"
                        className="mb-2"
                    />
                )}
            >
                <div className="w-full h-full min-h-0">
                    {mode === 'circular' ? (
                        <CircularKpi value={numericValue} min={min} max={max} unit={unit} dynamicColor={!!opts?.dynamicColor} thresholds={widget.thresholds} />
                    ) : (
                        <BarKpi value={numericValue} min={min} max={max} unit={unit} dynamicColor={!!opts?.dynamicColor} thresholds={widget.thresholds} />
                    )}
                </div>
            </WidgetCenteredContentLayout>

            {/* Footer subtext — texto aclaratorio inferior, sin alterar el centrado del KPI */}
            {footerSubtext && (
                <div className="absolute left-5 bottom-3 z-20 text-[10px] font-black uppercase tracking-widest leading-none text-industrial-muted truncate max-w-[calc(100%-2.5rem)]">
                    {footerSubtext}
                </div>
            )}
        </div>
    );
}

function getDynamicColors(value: number, thresholds?: ThresholdRule[]) {
    if (!thresholds || thresholds.length === 0) return null;
    
    const criticalRule = thresholds.find(t => t.severity === 'critical');
    const warningRule = thresholds.find(t => t.severity === 'warning');

    // Basado en requerimientos del usuario para mayor profundidad y semántica
    if (criticalRule && value >= criticalRule.value) {
        return { 
            svgColor: 'url(#kpi-critical-gradient)', 
            cssColor: 'linear-gradient(90deg, var(--color-dynamic-critical-from), var(--color-dynamic-critical-to))', 
            glow: 'color-mix(in srgb, var(--color-accent-ruby) 50%, transparent)',
            textColor: 'var(--color-status-critical)'
        };
    }
    if (warningRule && value >= warningRule.value) {
        return { 
            svgColor: 'url(#kpi-warning-gradient)', 
            cssColor: 'linear-gradient(90deg, var(--color-dynamic-warning-from), var(--color-dynamic-warning-to))', 
            glow: 'color-mix(in srgb, var(--color-accent-amber) 50%, transparent)',
            textColor: 'var(--color-status-warning)'
        };
    }
    return { 
        svgColor: 'url(#kpi-normal-gradient)', 
        cssColor: 'linear-gradient(90deg, var(--color-dynamic-normal-from), var(--color-dynamic-normal-to))', 
        glow: 'color-mix(in srgb, var(--color-accent-green) 50%, transparent)',
        textColor: 'var(--color-status-normal)'
    };
}

function CircularKpi({ value, min, max, unit, dynamicColor, thresholds }: { value: number | null, min: number, max: number, unit?: string, dynamicColor?: boolean, thresholds?: ThresholdRule[] }) {
    const safeValue = value ?? min;
    const clamp = Math.min(Math.max(safeValue, min), max);
    const range = max - min;
    const percentage = range === 0 ? 0 : ((clamp - min) / range) * 100;
    
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const dynamicMode = dynamicColor && value !== null ? getDynamicColors(value, thresholds) : null;
    const strokeColor = dynamicMode ? dynamicMode.svgColor : 'url(#kpi-gradient)';
    const glowShadow = dynamicMode ? `drop-shadow(0 0 15px ${dynamicMode.glow})` : 'drop-shadow(0 0 15px color-mix(in srgb, var(--color-accent-purple) 40%, transparent))';

    return (
        <div className="relative flex items-center justify-center w-full h-full min-h-[140px]">
            <svg 
                className="w-full h-full transform -rotate-90 origin-center transition-all duration-500 ease-out" 
                viewBox="-10 -10 160 160" 
                preserveAspectRatio="xMidYMid meet"
                style={{ filter: glowShadow }}
            >
                <defs>
                    <linearGradient id="kpi-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="var(--color-widget-gradient-to)" />
                        <stop offset="100%" stopColor="var(--color-widget-gradient-from)" />
                    </linearGradient>
                    <linearGradient id="kpi-normal-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="var(--color-dynamic-normal-to)" />
                        <stop offset="100%" stopColor="var(--color-dynamic-normal-from)" />
                    </linearGradient>
                    <linearGradient id="kpi-warning-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="var(--color-dynamic-warning-to)" />
                        <stop offset="100%" stopColor="var(--color-dynamic-warning-from)" />
                    </linearGradient>
                    <linearGradient id="kpi-critical-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="var(--color-dynamic-critical-to)" />
                        <stop offset="100%" stopColor="var(--color-dynamic-critical-from)" />
                    </linearGradient>
                    <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="5" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>
                <circle
                    cx="70" cy="70" r={radius}
                    stroke="color-mix(in srgb, white 3%, transparent)"
                    strokeWidth="8"
                    fill="none"
                />
                <circle
                    cx="70" cy="70" r={radius}
                    stroke={strokeColor}
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-out"
                    filter="url(#glow-filter)"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-6xl font-black text-white leading-none tracking-tighter mb-1">{value === null ? '--' : value % 1 !== 0 ? value.toFixed(1) : value}</span>
                {unit && value !== null && <span className="text-xs font-bold text-industrial-muted uppercase tracking-widest">{unit}</span>}
            </div>
        </div>
    );
}

function BarKpi({ value, min, max, unit, dynamicColor, thresholds }: { value: number | null, min: number, max: number, unit?: string, dynamicColor?: boolean, thresholds?: ThresholdRule[] }) {
    const safeValue = value ?? min;
    const clamp = Math.min(Math.max(safeValue, min), max);
    const range = max - min;
    const percentage = range === 0 ? 0 : ((clamp - min) / range) * 100;

    const dynamicMode = dynamicColor && value !== null ? getDynamicColors(value, thresholds) : null;
    const backgroundStyle = dynamicMode 
        ? { background: dynamicMode.cssColor, boxShadow: `0 0 15px ${dynamicMode.glow}` }
        : { background: `linear-gradient(90deg, var(--color-widget-gradient-from), var(--color-widget-gradient-to))`, boxShadow: '0 0 15px color-mix(in srgb, var(--color-accent-purple) 40%, transparent)' };

    return (
        <div className="flex flex-col w-full h-full justify-center px-2">
            <div className="flex items-end gap-2 mb-3">
                <span className="text-6xl font-black text-white leading-none tracking-tighter">{value === null ? '--' : value % 1 !== 0 ? value.toFixed(1) : value}</span>
                {unit && value !== null && <span className="text-xs font-bold text-industrial-muted uppercase tracking-widest mb-1.5">{unit}</span>}
            </div>
            
            <div className="h-2 w-full bg-white/5 rounded-full relative">
                <div 
                    className="absolute top-0 left-0 h-full rounded-full transition-all duration-500 ease-out"
                    style={{ 
                        width: `${percentage}%`,
                        ...backgroundStyle
                    }}
                />
            </div>
            
            <div className="flex justify-between items-center mt-3 text-[10px] font-bold uppercase tracking-wider text-industrial-muted">
                <span>{min} {unit}</span>
                <span>{max} {unit}</span>
            </div>
        </div>
    );
}
