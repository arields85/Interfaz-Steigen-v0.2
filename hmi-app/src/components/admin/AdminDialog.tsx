import { useEffect, type ReactNode } from 'react';

interface AdminDialogProps {
    open: boolean;
    title: string;
    onClose: () => void;
    children: ReactNode;
    actions: ReactNode;
    maxWidth?: string;
}

export default function AdminDialog({
    open,
    title,
    onClose,
    children,
    actions,
    maxWidth = 'max-w-md',
}: AdminDialogProps) {
    useEffect(() => {
        if (!open) return;

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => {
            window.removeEventListener('keydown', handleEscape);
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
            role="presentation"
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={`w-full ${maxWidth} rounded-xl border border-white/10 bg-industrial-surface p-6 shadow-2xl`}
            >
                <h3 className="uppercase text-white">{title}</h3>
                <div className="mt-4 space-y-4">{children}</div>
                <div className="mt-6 flex justify-end gap-2">{actions}</div>
            </div>
        </div>
    );
}
