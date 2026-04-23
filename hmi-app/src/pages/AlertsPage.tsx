import { useState } from 'react';
import { AlertTriangle, Filter } from 'lucide-react';
import { useAlerts } from '../queries/useAlerts';
import { EmptyState, ErrorState, LoadingSkeleton } from '../components/ui';
import type { AlertSeverity, AlertStatus } from '../domain/alert.types';

// =============================================================================
// AlertsPage
// Vista de eventos y alertas activas del sistema.
// Alimentada por useAlerts() con datos mock de src/mocks/alerts.mock.ts.
// Directiva Maestra v3.1 §13.4 — Arquitectura Técnica v1.3 §17.3
// =============================================================================

const SEVERITY_FILTERS: { label: string; value: AlertSeverity | 'all' }[] = [
    { label: 'Todas', value: 'all' },
    { label: 'Críticas', value: 'critical' },
    { label: 'Advertencias', value: 'warning' },
    { label: 'Informativas', value: 'info' },
];

const STATUS_FILTERS: { label: string; value: AlertStatus | 'all' }[] = [
    { label: 'Activas', value: 'active' },
    { label: 'Reconocidas', value: 'acknowledged' },
    { label: 'Resueltas', value: 'resolved' },
    { label: 'Todas', value: 'all' },
];

const SEVERITY_CONFIG: Record<AlertSeverity, { label: string; barClass: string; textClass: string; bgClass: string; borderClass: string }> = {
    critical: {
        label: 'CRÍTICA',
        barClass: 'bg-accent-ruby',
        textClass: 'text-accent-ruby',
        bgClass: 'bg-[#1a0b0f]',
        borderClass: 'border-accent-ruby/30',
    },
    warning: {
        label: 'ADVERTENCIA',
        barClass: 'bg-accent-amber',
        textClass: 'text-accent-amber',
        bgClass: 'bg-[#15100a]',
        borderClass: 'border-accent-amber/30',
    },
    info: {
        label: 'INFO',
        barClass: 'bg-accent-blue',
        textClass: 'text-accent-blue',
        bgClass: 'bg-industrial-surface',
        borderClass: 'border-accent-blue/20',
    },
};

function formatRelativeTime(isoString: string): string {
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000 / 60);
    if (diff < 1) return 'hace un momento';
    if (diff < 60) return `hace ${diff} min`;
    if (diff < 1440) return `hace ${Math.floor(diff / 60)}h`;
    return `hace ${Math.floor(diff / 1440)}d`;
}

export default function AlertsPage() {
    const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<AlertStatus | 'all'>('active');

    const { data: alerts, isLoading, isError, refetch } = useAlerts();

    const filtered = (alerts ?? []).filter((alert) => {
        const matchSeverity = severityFilter === 'all' || alert.severity === severityFilter;
        const matchStatus = statusFilter === 'all' || alert.status === statusFilter;
        return matchSeverity && matchStatus;
    });

    const criticalCount = (alerts ?? []).filter(a => a.severity === 'critical' && a.status === 'active').length;

    return (
        <div className="flex flex-col h-full space-y-6 max-w-5xl mx-auto mt-4 px-2">

            {/* HEADER */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-5xl font-black tracking-tight text-industrial-text mb-2">
                        Alertas y Eventos
                    </h1>
                    <p className="text-industrial-muted text-[11px] font-bold uppercase tracking-widest mt-1">
                        Registro de condiciones observadas en planta.
                    </p>
                </div>
                {criticalCount > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-[#1a0b0f] border border-accent-ruby/30 rounded-2xl">
                        <AlertTriangle size={16} className="text-accent-ruby animate-pulse-slow" strokeWidth={2} />
                        <span className="text-accent-ruby text-xs font-black uppercase tracking-widest">
                            {criticalCount} crítica{criticalCount > 1 ? 's' : ''} activa{criticalCount > 1 ? 's' : ''}
                        </span>
                    </div>
                )}
            </div>

            {/* FILTROS */}
            <div className="flex flex-wrap gap-6 items-center">
                {/* Severidad */}
                <div className="flex items-center gap-2">
                    <Filter size={14} className="text-industrial-muted" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-industrial-muted mr-1">Severidad</span>
                    <div className="flex gap-1">
                        {SEVERITY_FILTERS.map((f) => (
                            <button
                                key={f.value}
                                onClick={() => setSeverityFilter(f.value)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors border ${severityFilter === f.value
                                    ? 'bg-white/8 border-industrial-border text-white'
                                    : 'border-transparent text-industrial-muted hover:text-industrial-text hover:bg-industrial-hover'
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Estado */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-industrial-muted mr-1">Estado</span>
                    <div className="flex gap-1">
                        {STATUS_FILTERS.map((f) => (
                            <button
                                key={f.value}
                                onClick={() => setStatusFilter(f.value)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors border ${statusFilter === f.value
                                    ? 'bg-white/8 border-industrial-border text-white'
                                    : 'border-transparent text-industrial-muted hover:text-industrial-text hover:bg-industrial-hover'
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* LISTA DE ALERTAS */}
            <div className="flex flex-col gap-2">
                {isLoading && (
                    <div className="flex flex-col gap-2">
                        <LoadingSkeleton variant="row" count={5} />
                    </div>
                )}

                {isError && (
                    <div className="glass-panel">
                        <ErrorState
                            title="Error al cargar alertas"
                            message="No se pudo obtener el listado de eventos del sistema."
                            onRetry={() => refetch()}
                        />
                    </div>
                )}

                {!isLoading && !isError && filtered.length === 0 && (
                    <div className="glass-panel">
                        <EmptyState
                            icon={AlertTriangle}
                            title="Sin alertas en este filtro"
                            message="No hay eventos que coincidan con los criterios seleccionados."
                        />
                    </div>
                )}

                {!isLoading && !isError && filtered.map((alert) => {
                    const cfg = SEVERITY_CONFIG[alert.severity];
                    return (
                        <div
                            key={alert.id}
                            className={`relative overflow-hidden flex items-start gap-0 rounded-xl border backdrop-blur-md transition-colors hover:brightness-110 ${cfg.bgClass} ${cfg.borderClass}`}
                        >
                            {/* Barra lateral semántica */}
                            <div className={`w-[5px] shrink-0 self-stretch rounded-l-xl ${cfg.barClass}`} />

                            <div className="flex-1 p-4 flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${cfg.textClass}`}>
                                        {cfg.label} · {formatRelativeTime(alert.createdAt)}
                                    </span>
                                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${alert.status === 'active'
                                        ? 'text-accent-ruby border-accent-ruby/30 bg-accent-ruby/10'
                                        : alert.status === 'acknowledged'
                                            ? 'text-accent-amber border-accent-amber/30 bg-accent-amber/10'
                                            : 'text-industrial-muted border-industrial-border bg-industrial-hover'
                                        }`}>
                                        {alert.status === 'active' ? 'Activa' : alert.status === 'acknowledged' ? 'Reconocida' : 'Resuelta'}
                                    </span>
                                </div>
                                <p className="text-sm font-bold text-industrial-text leading-snug">{alert.title}</p>
                                {alert.description && (
                                    <p className="text-xs text-industrial-muted">{alert.description}</p>
                                )}
                                {alert.source && (
                                    <p className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mt-1" style={{ fontWeight: 'var(--font-weight-mono)' }}>
                                        Fuente: {alert.source}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* CONTADOR FINAL */}
            {!isLoading && !isError && filtered.length > 0 && (
                <p className="text-[9px] font-bold uppercase tracking-widest text-industrial-muted pb-6">
                    {filtered.length} evento{filtered.length !== 1 ? 's' : ''} · filtro activo: {severityFilter === 'all' ? 'todas las severidades' : severityFilter} / {statusFilter === 'all' ? 'todos los estados' : statusFilter}
                </p>
            )}
        </div>
    );
}
