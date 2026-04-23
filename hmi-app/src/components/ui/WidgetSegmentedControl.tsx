import type { ReactNode } from 'react';

export interface SegmentedOption<T extends string> {
    value: T;
    label: string;
}

export interface WidgetSegmentedControlProps<T extends string> {
    options: Array<SegmentedOption<T>>;
    value: T;
    onChange: (value: T) => void;
    /** Additional content rendered below the segmented control inside the same absolute container (e.g. OEE toggle in prod-history) */
    children?: ReactNode;
}

/**
 * Reusable widget-local segmented control overlay.
 *
 * Renders the complete absolute-positioned wrapper used by widget selectors,
 * including the glass-panel group and the optional content slot below it.
 */
export default function WidgetSegmentedControl<T extends string>({
    options,
    value,
    onChange,
    children,
}: WidgetSegmentedControlProps<T>) {
    return (
        <div className="absolute right-5 top-5 z-10 flex flex-col items-end gap-2">
            <div className="flex items-center gap-0.5">
                {options.map((option) => {
                    const isActive = option.value === value;

                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onChange(option.value)}
                            aria-pressed={isActive}
                            className={isActive
                                ? 'rounded-md border border-admin-accent/30 bg-admin-accent/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-admin-accent transition-colors'
                                : 'rounded-md px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-industrial-muted transition-colors hover:text-industrial-text'}
                        >
                            {option.label}
                        </button>
                    );
                })}
            </div>

            {children}
        </div>
    );
}
