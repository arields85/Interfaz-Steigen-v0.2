import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

// =============================================================================
// AdminSelect
// Dropdown custom con estilo dark-theme y hover admin-accent.
// Usa createPortal + position:fixed para escapar overflow:hidden.
// Posicionamiento inteligente: arriba o abajo según espacio disponible.
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
    const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Cerrar con click afuera
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            if (triggerRef.current?.contains(target)) return;
            if (menuRef.current?.contains(target)) return;
            setIsOpen(false);
        };
        // Use setTimeout to register AFTER the current click finishes
        const id = setTimeout(() => document.addEventListener('click', handler), 0);
        return () => {
            clearTimeout(id);
            document.removeEventListener('click', handler);
        };
    }, [isOpen]);

    const handleToggle = useCallback(() => {
        if (isOpen) {
            setIsOpen(false);
            return;
        }
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const estimatedH = Math.min(options.length * 30 + 8, 300);

            const style: React.CSSProperties = {
                position: 'fixed',
                left: rect.left,
                zIndex: 9999,
                width: 'fit-content',
                minWidth: Math.min(rect.width, 120),
            };

            if (spaceBelow < estimatedH) {
                style.bottom = window.innerHeight - rect.top + 4;
            } else {
                style.top = rect.bottom + 4;
            }
            setMenuStyle(style);
        }
        setIsOpen(true);
    }, [isOpen, options.length]);

    const selected = options.find(o => o.value === value);
    const selectedLabel = selected?.label || placeholder || '—';

    const menu = isOpen ? createPortal(
        <div ref={menuRef} style={menuStyle} className="rounded-md bg-[#0f1219] border border-white/10 shadow-xl py-1">
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
        </div>,
        document.body
    ) : null;

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
            {menu}
        </div>
    );
}
