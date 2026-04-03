interface ConnectionStatusBadgeProps {
    isConnected: boolean;
    label: string;
    className?: string;
}

export default function ConnectionStatusBadge({
    isConnected,
    label,
    className = '',
}: ConnectionStatusBadgeProps) {
    const dotClass = isConnected ? 'bg-status-normal animate-pulse-slow' : 'bg-industrial-muted';
    const textClass = isConnected ? 'text-status-normal' : 'text-industrial-muted';

    return (
        <span className={`inline-flex items-center gap-2 ${className}`}>
            <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${dotClass}`} />
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${textClass}`}>
                {label}
            </span>
        </span>
    );
}
