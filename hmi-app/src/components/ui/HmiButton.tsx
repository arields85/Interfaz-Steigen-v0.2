import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface HmiButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger';
    size?: 'sm' | 'md';
    fullWidth?: boolean;
    children: ReactNode;
}

const HMI_BUTTON_BASE_CLS = 'inline-flex items-center justify-center gap-2 rounded-md border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none';

const HMI_BUTTON_SIZE_CLS = {
    sm: 'px-3 py-1',
    md: 'px-4 py-1.5',
} satisfies Record<NonNullable<HmiButtonProps['size']>, string>;

const HMI_BUTTON_VARIANT_CLS = {
    primary: 'admin-accent-ghost disabled:border-industrial-border disabled:bg-transparent disabled:text-industrial-muted disabled:hover:bg-transparent',
    secondary: 'border-industrial-border bg-industrial-hover text-industrial-muted hover:border-admin-accent/30 hover:bg-industrial-surface hover:text-industrial-text disabled:border-industrial-border disabled:bg-industrial-bg/40 disabled:text-industrial-muted',
    danger: 'border-status-critical/40 bg-status-critical/10 text-status-critical hover:border-status-critical/60 hover:bg-status-critical/20 disabled:border-industrial-border disabled:bg-transparent disabled:text-industrial-muted',
} satisfies Record<NonNullable<HmiButtonProps['variant']>, string>;

export type { HmiButtonProps };

export default function HmiButton({
    variant = 'secondary',
    size = 'md',
    fullWidth = false,
    className,
    type = 'button',
    children,
    ...props
}: HmiButtonProps) {
    const resolvedClassName = [
        HMI_BUTTON_BASE_CLS,
        HMI_BUTTON_SIZE_CLS[size],
        HMI_BUTTON_VARIANT_CLS[variant],
        fullWidth ? 'w-full' : null,
        className,
    ].filter(Boolean).join(' ');

    return (
        <button
            type={type}
            className={resolvedClassName}
            {...props}
        >
            {children}
        </button>
    );
}
