// =============================================================================
// LoadingSkeleton
// Skeletons de carga coherentes con el layout real de la app.
// Tres variantes: card (glass-panel KPI), row (fila de lista), chart (área).
// Arquitectura Técnica v1.3 §9.10
// =============================================================================

type SkeletonVariant = 'card' | 'row' | 'chart';

interface LoadingSkeletonProps {
    variant?: SkeletonVariant;
    /** Número de skeletons a renderizar */
    count?: number;
    className?: string;
}

function SkeletonCard() {
    return (
        <div className="p-5 rounded-3xl bg-industrial-surface border border-industrial-border animate-pulse">
            <div className="flex justify-between mb-4">
                <div className="h-2 w-20 bg-industrial-hover rounded" />
                <div className="h-5 w-5 bg-industrial-hover rounded" />
            </div>
            <div className="h-10 w-24 bg-industrial-hover rounded mb-4" />
            <div className="h-2 w-28 bg-industrial-hover rounded" />
        </div>
    );
}

function SkeletonRow() {
    return (
        <div className="p-4 rounded-xl bg-industrial-surface border border-industrial-border animate-pulse flex items-center gap-4">
            <div className="w-1.5 h-full min-h-[48px] rounded-full bg-industrial-hover shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
                <div className="h-2 w-32 bg-industrial-hover rounded" />
                <div className="h-3 w-48 bg-industrial-hover rounded" />
                <div className="h-2 w-24 bg-industrial-hover rounded" />
            </div>
        </div>
    );
}

function SkeletonChart() {
    return (
        <div className="glass-panel p-5 animate-pulse">
            <div className="flex justify-between mb-6">
                <div className="h-3 w-40 bg-industrial-hover rounded" />
                <div className="h-3 w-16 bg-industrial-hover rounded" />
            </div>
            <div className="w-full h-[200px] bg-industrial-hover rounded-2xl" />
        </div>
    );
}

export default function LoadingSkeleton({
    variant = 'card',
    count = 1,
    className = '',
}: LoadingSkeletonProps) {
    const Skeleton = variant === 'card' ? SkeletonCard : variant === 'row' ? SkeletonRow : SkeletonChart;
    const items = Array.from({ length: count });

    return (
        <>
            {items.map((_, i) => (
                <div key={i} className={className}>
                    <Skeleton />
                </div>
            ))}
        </>
    );
}
