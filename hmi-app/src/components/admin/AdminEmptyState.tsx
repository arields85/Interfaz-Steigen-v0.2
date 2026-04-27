import type { LucideIcon } from 'lucide-react';

interface AdminEmptyStateProps {
    icon: LucideIcon;
    message: string;
}

export default function AdminEmptyState({ icon: Icon, message }: AdminEmptyStateProps) {
    return (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Icon size={22} className="text-industrial-muted" />
            <p className="text-industrial-muted">
                {message}
            </p>
        </div>
    );
}
