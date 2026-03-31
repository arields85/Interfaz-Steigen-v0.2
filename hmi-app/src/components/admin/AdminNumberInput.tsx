import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

// =============================================================================
// AdminNumberInput
// Input numérico custom con flechas estilizadas admin-accent.
// Selecciona todo al focus para reemplazar el "0" fácilmente.
// =============================================================================

interface AdminNumberInputProps {
    value: number | string;
    onChange: (value: string) => void;
    step?: number;
    min?: number;
    max?: number;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export default function AdminNumberInput({
    value,
    onChange,
    step = 1,
    min,
    max,
    placeholder,
    disabled = false,
    className = '',
}: AdminNumberInputProps) {
    const [localValue, setLocalValue] = useState(String(value ?? ''));
    const [isFocused, setIsFocused] = useState(false);

    // Sync external value → localValue ONLY when NOT focused
    useEffect(() => {
        if (!isFocused) {
            setLocalValue(String(value ?? ''));
        }
    }, [value, isFocused]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalValue(e.target.value);
        onChange(e.target.value);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(true);
        e.target.select();
    };

    const handleBlur = () => {
        setIsFocused(false);
        if (localValue === '' || localValue === '-') {
            setLocalValue('0');
            onChange('0');
        }
    };

    const nudge = (delta: number) => {
        const current = parseFloat(localValue) || 0;
        let next = parseFloat((current + delta).toFixed(10));
        if (min !== undefined) next = Math.max(min, next);
        if (max !== undefined) next = Math.min(max, next);
        setLocalValue(String(next));
        onChange(String(next));
    };

    return (
        <div className={`relative flex items-center ${className}`}>
            <input
                type="text"
                inputMode="decimal"
                disabled={disabled}
                value={localValue}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder={placeholder}
                className={`w-16 bg-black/40 border border-white/10 rounded pl-2 pr-5 py-1 text-xs focus:outline-none focus:border-admin-accent/50 transition-colors ${
                    disabled ? 'text-white/30 cursor-not-allowed' : 'text-white'
                }`}
            />
            {!disabled && (
                <div className="absolute right-0.5 top-0 bottom-0 flex flex-col justify-center">
                    <button
                        type="button"
                        tabIndex={-1}
                        onMouseDown={e => { e.preventDefault(); nudge(step); }}
                        className="flex items-center justify-center h-3 w-4 text-white/30 hover:text-admin-accent transition-colors"
                    >
                        <ChevronUp size={10} strokeWidth={2.5} />
                    </button>
                    <button
                        type="button"
                        tabIndex={-1}
                        onMouseDown={e => { e.preventDefault(); nudge(-step); }}
                        className="flex items-center justify-center h-3 w-4 text-white/30 hover:text-admin-accent transition-colors"
                    >
                        <ChevronDown size={10} strokeWidth={2.5} />
                    </button>
                </div>
            )}
        </div>
    );
}
