import { useState, useRef, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import AnchoredOverlay from '../ui/AnchoredOverlay';

// =============================================================================
// AdminSelect
// Dropdown custom con estilo dark-theme y hover admin-accent.
// Usa AnchoredOverlay (createPortal + position:fixed) para escapar overflow:hidden.
// Posicionamiento inteligente delegado a AnchoredOverlay.
// =============================================================================

interface AdminSelectOption {
    value: string;
    label: string;
    icon?: ReactNode;
    disabled?: boolean;
}

interface AdminSelectProps {
    value: string;
    options: AdminSelectOption[];
    onChange: (value: string) => void;
    className?: string;
    placeholder?: string;
}

export default function AdminSelect({ value, options, onChange, className = '', placeholder }: AdminSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);

    const handleToggle = () => setIsOpen(prev => !prev);

    const estimatedHeight = Math.min(options.length * 30 + 8, 300);
    const selected = options.find(o => o.value === value);
    const selectedLabel = selected?.label || placeholder || '—';

    return (
        <div className={`relative ${className}`}>
            <button
                ref={triggerRef}
                type="button"
                onClick={handleToggle}
                className="w-full flex items-center justify-between gap-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white hover:border-white/20 focus:outline-none transition-colors"
            >
                <span className="truncate flex items-center gap-1.5">
                    {selected?.icon && <span className="shrink-0 opacity-60">{selected.icon}</span>}
                    {selectedLabel}
                </span>
                <ChevronDown size={10} className={`shrink-0 text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnchoredOverlay
                triggerRef={triggerRef}
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                estimatedHeight={estimatedHeight}
                minWidth="trigger"
                align="start"
                gap={4}
            >
                <div
                    className="rounded-md border border-white/10 shadow-xl py-1"
                    style={{ background: 'var(--color-industrial-surface)' }}
                >
                    {options.map(opt => (
                        <button
                            key={opt.value}
                            disabled={opt.disabled}
                            onClick={() => {
                                if (!opt.disabled) {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }
                            }}
                            className={`block w-full text-left px-3 py-1.5 text-xs whitespace-nowrap transition-colors ${
                                opt.disabled
                                    ? 'text-white/20 cursor-not-allowed'
                                    : value === opt.value
                                        ? 'text-admin-accent bg-white/5'
                                        : 'text-slate-400 hover:text-admin-accent hover:bg-white/5'
                            }`}
                        >
                            <span className="flex items-center gap-1.5">
                                {opt.icon && <span className="shrink-0 opacity-60">{opt.icon}</span>}
                                {opt.label}
                            </span>
                        </button>
                    ))}
                </div>
            </AnchoredOverlay>
        </div>
    );
}
