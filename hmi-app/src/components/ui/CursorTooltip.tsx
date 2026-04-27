import type { ComponentPropsWithoutRef } from 'react';

export interface CursorTooltipProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
    label: string;
    x: number;
    y: number;
    anchor?: 'se' | 'ne' | 'nw' | 'sw';
}

const OFFSET_PX = 12;

const ANCHOR_TRANSFORMS: Record<NonNullable<CursorTooltipProps['anchor']>, string> = {
    se: `translate(${OFFSET_PX}px, ${OFFSET_PX}px)`,
    ne: `translate(${OFFSET_PX}px, calc(-100% - ${OFFSET_PX}px))`,
    nw: `translate(calc(-100% - ${OFFSET_PX}px), calc(-100% - ${OFFSET_PX}px))`,
    sw: `translate(calc(-100% - ${OFFSET_PX}px), ${OFFSET_PX}px)`,
};

export default function CursorTooltip({
    label,
    x,
    y,
    anchor = 'se',
    className = '',
    style,
    ...props
}: CursorTooltipProps) {
    return (
        <div
            role="tooltip"
            className={[
                'pointer-events-none fixed z-50 whitespace-nowrap rounded border border-white bg-industrial-surface/90 px-2 py-1 text-white',
                className,
            ].join(' ')}
            style={{
                left: `${x}px`,
                top: `${y}px`,
                transform: ANCHOR_TRANSFORMS[anchor],
                ...style,
            }}
            {...props}
        >
            {label}
        </div>
    );
}
