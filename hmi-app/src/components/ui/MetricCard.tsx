import type { LucideIcon } from 'lucide-react';

// =============================================================================
// MetricCard
// Card de métrica reutilizable. Implementa los 5 estados mínimos del sistema:
// loading, normal, warning, error, no-data.
// Arquitectura Técnica v1.3 §9.3 — UI Style Guide §15.3
// =============================================================================

interface MetricCardProps {
    label: string;
    value: number | string | null | undefined;
    unit?: string;
    /** Estado semántico que modifica borde y textura de la card */
    status?: 'normal' | 'warning' | 'critical';
    icon?: LucideIcon;
    /** Texto de contexto secundario (ej. "Límite: 45.0 °C") */
    subtext?: string;
    /** Si true, muestra skeleton de carga */
    isLoading?: boolean;
    /** Si true, muestra estado de error */
    isError?: boolean;
    className?: string;
}

const STATUS_STYLES = {
    normal: {
        card: 'glass-panel hover:border-accent-cyan',
        color: 'var(--color-widget-icon)',
        valueColor: undefined as string | undefined, // white by default
    },
    warning: {
        card: 'bg-[#15100a] border border-accent-amber/30 rounded-3xl backdrop-blur-md hover:border-accent-amber/60',
        color: 'var(--color-status-warning)',
        valueColor: 'var(--color-status-warning)',
    },
    critical: {
        card: 'bg-[#1a0b0f] border border-accent-ruby/30 rounded-3xl backdrop-blur-md hover:border-accent-ruby/60',
        color: 'var(--color-status-critical)',
        valueColor: 'var(--color-status-critical)',
    },
};

export default function MetricCard({
    label,
    value,
    unit,
    status = 'normal',
    icon: Icon,
    subtext,
    isLoading = false,
    isError = false,
    className = '',
}: MetricCardProps) {
    const styles = STATUS_STYLES[status];

    if (isLoading) {
        return (
            <div className={`p-5 rounded-3xl bg-industrial-surface border border-industrial-border animate-pulse ${className}`}>
                <div className="h-3 w-24 bg-industrial-hover rounded mb-4" />
                <div className="h-10 w-20 bg-industrial-hover rounded mb-3" />
                <div className="h-2 w-32 bg-industrial-hover rounded" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className={`p-5 rounded-3xl bg-industrial-surface border border-accent-ruby/20 flex flex-col justify-center items-center gap-2 ${className}`}>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</span>
                <span className="text-xs font-medium" style={{ color: 'var(--color-status-critical)' }}>Error de lectura</span>
            </div>
        );
    }

    const displayValue = value === null || value === undefined ? '—' : value;
    const isNoData = value === null || value === undefined;

    return (
        <div className={`p-5 flex flex-col justify-between w-full h-full transition-colors duration-300 ${styles.card} ${className}`}>
            {/* Header */}
            <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    {label}
                </span>
                {Icon && (
                    <Icon
                        size={24}
                        strokeWidth={2}
                        className="shrink-0"
                        style={{ color: styles.color }}
                    />
                )}
            </div>

            {/* Valor principal */}
            <div 
                className={`mt-3 text-4xl font-black tracking-tighter flex items-end gap-1.5 ${isNoData ? 'text-slate-600' : ''}`}
                style={!isNoData && styles.valueColor ? { color: styles.valueColor } : undefined}
            >
                {displayValue}
                {unit && !isNoData && (
                    <span className="text-lg text-slate-400 font-bold mb-0.5">{unit}</span>
                )}
            </div>

            {/* Subtext */}
            {subtext && (
                <div className="mt-3 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                    {subtext}
                </div>
            )}
        </div>
    );
}
