import type { WidgetConfig, ThresholdRule } from '../../domain/admin.types';
import type { EquipmentSummary } from '../../domain/equipment.types';
import { resolveBinding } from '../resolvers/bindingResolver';
import { Activity, Thermometer, Zap, Droplet, Wind, Settings, Gauge, Fan, FoldVertical, type LucideIcon } from 'lucide-react';

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
    widget: WidgetConfig;
    equipmentMap: Map<string, EquipmentSummary>;
    isLoadingData?: boolean;
    className?: string;
}

export default function KpiWidget({ widget, equipmentMap, isLoadingData, className }: KpiWidgetProps) {
    if (isLoadingData) {
        return (
            <div className={`p-5 rounded-3xl bg-industrial-surface border border-industrial-border animate-pulse ${className ?? ''}`}>
                <div className="h-4 w-24 bg-industrial-hover rounded mb-6" />
                <div className="h-20 w-full bg-industrial-hover rounded-full" />
            </div>
        );
    }

    const resolved = resolveBinding(widget, equipmentMap);
    
    const numericValue = typeof resolved.value === 'number' 
        ? resolved.value 
        : typeof resolved.value === 'string' 
            ? parseFloat(resolved.value) || 0 
            : 0;

    const mode = (widget.displayOptions?.kpiMode as string) || 'circular';
    const min = parseFloat(String(widget.displayOptions?.min ?? '0')) || 0;
    const max = parseFloat(String(widget.displayOptions?.max ?? '100')) || 100;
    
    // Si la unidad no está en binding, tomar la predeterminada del widget (compatibilidad)
    const unit = resolved.unit ?? widget.binding?.unit ?? '';
    const iconName = typeof widget.displayOptions?.icon === 'string' ? widget.displayOptions.icon : undefined;
    const Icon = iconName ? ICON_MAP[iconName] : undefined;
    const subtext = widget.displayOptions?.subtext as string | undefined;

    // Color de ícono y subtexto: variable CSS según estado
    const isDynamic = !!widget.displayOptions?.dynamicColor;
    const dynamicMode = isDynamic ? getDynamicColors(numericValue, widget.thresholds) : null;
    const iconColor = dynamicMode ? dynamicMode.textColor : 'var(--color-widget-icon)';

    return (
        <div className={`p-4 glass-panel flex flex-col w-full h-full ${className ?? ''}`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
                <div className="flex flex-col gap-0.5 max-w-[80%]">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8] truncate">
                        {widget.title ?? 'KPI'}
                    </span>
                    {/* Subtexto aclaratorio debajo del título */}
                    {subtext && (
                        <span 
                            className="text-[10px] font-bold uppercase tracking-widest truncate"
                            style={{ color: iconColor }}
                        >
                            {subtext}
                        </span>
                    )}
                </div>
                {Icon && (
                    <Icon
                        size={24}
                        strokeWidth={2}
                        className="shrink-0"
                        style={{ color: iconColor }}
                    />
                )}
            </div>

            {/* Content */}
            <div className="flex-1 w-full min-h-0 relative">
                {mode === 'circular' ? (
                    <CircularKpi value={numericValue} min={min} max={max} unit={unit} dynamicColor={!!widget.displayOptions?.dynamicColor} thresholds={widget.thresholds} />
                ) : (
                    <BarKpi value={numericValue} min={min} max={max} unit={unit} dynamicColor={!!widget.displayOptions?.dynamicColor} thresholds={widget.thresholds} />
                )}
            </div>
            
            {/* Optional subtext for circular mode */}
            {/* Removido del fondo, ahora está en el Header */}
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
            glow: 'rgba(239,68,68,0.5)',
            textColor: 'var(--color-status-critical)'
        };
    }
    if (warningRule && value >= warningRule.value) {
        return { 
            svgColor: 'url(#kpi-warning-gradient)', 
            cssColor: 'linear-gradient(90deg, var(--color-dynamic-warning-from), var(--color-dynamic-warning-to))', 
            glow: 'rgba(245,158,11,0.5)',
            textColor: 'var(--color-status-warning)'
        };
    }
    return { 
        svgColor: 'url(#kpi-normal-gradient)', 
        cssColor: 'linear-gradient(90deg, var(--color-dynamic-normal-from), var(--color-dynamic-normal-to))', 
        glow: 'rgba(16,185,129,0.5)',
        textColor: 'var(--color-status-normal)'
    };
}

function CircularKpi({ value, min, max, unit, dynamicColor, thresholds }: { value: number, min: number, max: number, unit?: string, dynamicColor?: boolean, thresholds?: ThresholdRule[] }) {
    const clamp = Math.min(Math.max(value, min), max);
    const range = max - min;
    const percentage = range === 0 ? 0 : ((clamp - min) / range) * 100;
    
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const dynamicMode = dynamicColor ? getDynamicColors(value, thresholds) : null;
    const strokeColor = dynamicMode ? dynamicMode.svgColor : 'url(#kpi-gradient)';
    const glowShadow = dynamicMode ? `drop-shadow(0 0 15px ${dynamicMode.glow})` : 'drop-shadow(0 0 15px rgba(168,85,247,0.4))';

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
                    stroke="rgba(255,255,255,0.03)"
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
                <span className="text-6xl font-black text-white leading-none tracking-tighter mb-1">{value % 1 !== 0 ? value.toFixed(1) : value}</span>
                {unit && <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-widest">{unit}</span>}
            </div>
        </div>
    );
}

function BarKpi({ value, min, max, unit, dynamicColor, thresholds }: { value: number, min: number, max: number, unit?: string, dynamicColor?: boolean, thresholds?: ThresholdRule[] }) {
    const clamp = Math.min(Math.max(value, min), max);
    const range = max - min;
    const percentage = range === 0 ? 0 : ((clamp - min) / range) * 100;

    const dynamicMode = dynamicColor ? getDynamicColors(value, thresholds) : null;
    const backgroundStyle = dynamicMode 
        ? { background: dynamicMode.cssColor, boxShadow: `0 0 15px ${dynamicMode.glow}` }
        : { background: `linear-gradient(90deg, var(--color-widget-gradient-from), var(--color-widget-gradient-to))`, boxShadow: '0 0 15px rgba(168,85,247,0.4)' };

    return (
        <div className="flex flex-col w-full h-full justify-center px-2">
            <div className="flex items-end gap-2 mb-3">
                <span className="text-6xl font-black text-white leading-none tracking-tighter">{value % 1 !== 0 ? value.toFixed(1) : value}</span>
                {unit && <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-widest mb-1.5">{unit}</span>}
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
            
            <div className="flex justify-between items-center mt-3 text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
                <span>{min} {unit}</span>
                <span>{max} {unit}</span>
            </div>
        </div>
    );
}
