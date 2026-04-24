import type { MouseEvent, PointerEvent } from 'react';
import type { LucideIcon } from 'lucide-react';

interface WidgetHoverAction {
    label: string;
    icon: LucideIcon;
    onClick: () => void;
}

interface WidgetHoverActionsProps {
    actions: WidgetHoverAction[];
    className?: string;
    iconSize?: number;
}

const stopEvent = (event: MouseEvent<HTMLButtonElement> | PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
};

export default function WidgetHoverActions({
    actions,
    className = '',
    iconSize = 14,
}: WidgetHoverActionsProps) {
    return (
        <div className={`pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 ${className}`} style={{ top: 'var(--widget-spacing)' }}>
            <div className="pointer-events-auto flex items-center gap-1">
                {actions.map(({ label, icon: Icon, onClick }) => (
                    <button
                        key={label}
                        type="button"
                        draggable={false}
                        aria-label={label}
                        onPointerDown={stopEvent}
                        onMouseDown={stopEvent}
                        onClick={(event) => {
                            event.stopPropagation();
                            onClick();
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-industrial-surface/90 text-industrial-muted transition-colors hover:text-admin-accent"
                    >
                        <Icon size={iconSize} />
                    </button>
                ))}
            </div>
        </div>
    );
}
