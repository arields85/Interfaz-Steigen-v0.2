import type { ButtonHTMLAttributes } from 'react';

type AdminActionButtonVariant = 'primary' | 'secondary' | 'critical';

interface AdminActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant: AdminActionButtonVariant;
}

const ADMIN_ACTION_BUTTON_BASE_CLS = 'flex items-center gap-2 rounded-md px-4 py-1.5 transition-all';

const ADMIN_ACTION_BUTTON_VARIANT_CLS: Record<AdminActionButtonVariant, string> = {
    secondary: 'border border-white/10 bg-white/5 text-industrial-muted hover:border-white/20 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-transparent disabled:text-industrial-muted disabled:opacity-50',
    primary: 'admin-accent-ghost disabled:cursor-not-allowed disabled:border disabled:border-white/5 disabled:bg-transparent disabled:text-industrial-muted disabled:opacity-50 disabled:shadow-none disabled:hover:bg-transparent',
    critical: 'uppercase border border-status-critical/40 bg-status-critical/10 text-status-critical hover:border-status-critical/60 hover:bg-status-critical/20 disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-transparent disabled:text-industrial-muted disabled:opacity-50',
};

export default function AdminActionButton({
    variant,
    className,
    type = 'button',
    ...props
}: AdminActionButtonProps) {
    const resolvedClassName = [
        ADMIN_ACTION_BUTTON_BASE_CLS,
        ADMIN_ACTION_BUTTON_VARIANT_CLS[variant],
        className,
    ].filter(Boolean).join(' ');

    return (
        <button
            type={type}
            className={resolvedClassName}
            {...props}
        />
    );
}
