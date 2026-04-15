// =============================================================================
// AdminTag
// Primitive reutilizable para tags/badges en el admin UI.
// UN solo estilo visual: misma tipografía, mismo alto, mismo padding.
// Lo único que varía es el color (variant) y el texto (label).
// =============================================================================

interface AdminTagProps {
    label: string;
    /** Color variant that controls border and text color */
    variant: 'cyan' | 'green' | 'amber' | 'red' | 'muted' | 'pink';
    className?: string;
}

const BASE_CLS = 'inline-flex items-center rounded border bg-white/5 px-2 py-0.5 text-[9px] font-sans font-bold uppercase tracking-widest';

const VARIANT_CLS: Record<AdminTagProps['variant'], string> = {
    cyan: 'border-accent-cyan/40 text-accent-cyan',
    green: 'border-accent-green/40 text-accent-green',
    amber: 'border-accent-amber/40 text-accent-amber',
    red: 'border-accent-ruby/40 text-accent-ruby',
    muted: 'border-white/10 text-industrial-muted',
    pink: 'border-accent-pink/40 text-accent-pink',
};

export default function AdminTag({ label, variant, className }: AdminTagProps) {
    return (
        <span className={`${BASE_CLS} ${VARIANT_CLS[variant]}${className ? ` ${className}` : ''}`}>
            {label}
        </span>
    );
}

export type { AdminTagProps };
