import { Inbox } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// =============================================================================
// EmptyState
// Estado vacío estándar. Se renderiza cuando una query no devuelve resultados
// o cuando no hay datos disponibles para mostrar.
// Arquitectura Técnica v1.3 §9.8 — Directiva Maestra §14.2
// =============================================================================

interface EmptyStateProps {
    icon?: LucideIcon;
    title?: string;
    message?: string;
    action?: React.ReactNode;
    className?: string;
}

export default function EmptyState({
    icon: Icon = Inbox,
    title = 'Sin datos',
    message,
    action,
    className = '',
}: EmptyStateProps) {
    return (
        <div className={`flex flex-col items-center justify-center py-16 px-6 gap-4 text-center ${className}`}>
            <div className="w-14 h-14 rounded-2xl bg-industrial-hover border border-industrial-border flex items-center justify-center">
                <Icon size={24} className="text-industrial-muted" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col gap-1">
                <p className="text-sm font-bold text-industrial-text">{title}</p>
                {message && (
                    <p className="text-xs text-industrial-muted max-w-xs">{message}</p>
                )}
            </div>
            {action && <div className="mt-2">{action}</div>}
        </div>
    );
}
