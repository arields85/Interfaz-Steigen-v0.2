import { useCallback, useEffect, useRef, useState, type ComponentPropsWithoutRef, type ReactNode } from 'react';

const TOOLTIP_OFFSET_PX = 6;

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipCoordinates {
    top: number;
    left: number;
    transform: string;
}

export interface HoverTooltipProps extends ComponentPropsWithoutRef<'div'> {
    children: ReactNode;
    label: string;
    position: TooltipPosition;
}

const getTooltipCoordinates = (rect: DOMRect, position: TooltipPosition): TooltipCoordinates => {
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    switch (position) {
        case 'top':
            return { top: rect.top - TOOLTIP_OFFSET_PX, left: centerX, transform: 'translate(-50%, -100%)' };
        case 'bottom':
            return { top: rect.bottom + TOOLTIP_OFFSET_PX, left: centerX, transform: 'translate(-50%, 0)' };
        case 'left':
            return { top: centerY, left: rect.left - TOOLTIP_OFFSET_PX, transform: 'translate(-100%, -50%)' };
        case 'right':
            return { top: centerY, left: rect.right + TOOLTIP_OFFSET_PX, transform: 'translate(0, -50%)' };
    }
};

export default function HoverTooltip({
    children,
    label,
    position,
    className,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
    ...rest
}: HoverTooltipProps) {
    const triggerRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [coordinates, setCoordinates] = useState<TooltipCoordinates | null>(null);

    const updatePosition = useCallback(() => {
        if (!triggerRef.current) {
            return;
        }

        setCoordinates(getTooltipCoordinates(triggerRef.current.getBoundingClientRect(), position));
    }, [position]);

    const showTooltip = useCallback(() => {
        updatePosition();
        setIsVisible(true);
    }, [updatePosition]);

    const hideTooltip = useCallback(() => {
        setIsVisible(false);
    }, []);

    useEffect(() => {
        if (!isVisible) {
            return;
        }

        const handleViewportChange = () => updatePosition();

        window.addEventListener('scroll', handleViewportChange, true);
        window.addEventListener('resize', handleViewportChange);

        return () => {
            window.removeEventListener('scroll', handleViewportChange, true);
            window.removeEventListener('resize', handleViewportChange);
        };
    }, [isVisible, updatePosition]);

    return (
        <div
            ref={triggerRef}
            className={className}
            onMouseEnter={(event) => {
                showTooltip();
                onMouseEnter?.(event);
            }}
            onMouseLeave={(event) => {
                hideTooltip();
                onMouseLeave?.(event);
            }}
            onFocus={(event) => {
                showTooltip();
                onFocus?.(event);
            }}
            onBlur={(event) => {
                hideTooltip();
                onBlur?.(event);
            }}
            {...rest}
        >
            {children}
            {isVisible && coordinates ? (
                <span
                    role="tooltip"
                    className="pointer-events-none fixed z-50 whitespace-nowrap rounded border border-white bg-industrial-surface/90 px-2 py-1 text-xs text-white"
                    style={coordinates}
                >
                    {label}
                </span>
            ) : null}
        </div>
    );
}
