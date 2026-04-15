import type { ReactNode } from 'react';

/**
 * A single data row in the tooltip.
 * Each series has a name, a formatted value string, a color dot, and an optional shape.
 */
export interface ChartTooltipSeries {
    /** Display name of the series (e.g. "Producción", "OEE") */
    name: string;
    /** Pre-formatted value string (e.g. "214.5 unidades", "78.3%") */
    value: string;
    /** CSS color for the indicator dot */
    color: string;
    /** Shape of the indicator dot. Default: 'circle' */
    shape?: 'circle' | 'square';
}

interface ChartTooltipProps {
    /** Bucket/category label shown at the top (e.g. "08:00", "Lun / Turno 1") */
    label: string;
    /** Data series to display as rows */
    series: ChartTooltipSeries[];
    /** X position in pixels relative to the container */
    x: number;
    /** Width of the parent container in pixels (used for flip logic) */
    containerWidth: number;
    /** Optional extra content below the series rows */
    children?: ReactNode;
}

/**
 * Shared chart tooltip panel.
 *
 * Renders an absolute-positioned glass panel with a label header and
 * colored series rows. Automatically flips to the left when the tooltip
 * would overflow the container's right edge.
 *
 * Usage: place inside a `position: relative` container that wraps the chart.
 * The tooltip uses `pointerEvents: 'none'` so it never blocks mouse interaction.
 */
export default function ChartTooltip({ label, series, x, containerWidth, children }: ChartTooltipProps) {
    const gap = 12;
    const flipLeft = x > containerWidth - 180;

    return (
        <div
            style={{
                position: 'absolute',
                top: 8,
                left: flipLeft ? x - gap : x + gap,
                transform: flipLeft ? 'translateX(-100%)' : undefined,
                pointerEvents: 'none',
                zIndex: 20,
            }}
            className="rounded-lg border border-industrial-border bg-industrial-surface/95 backdrop-blur-sm px-3 py-2 shadow-lg"
        >
            <div className="text-[9px] font-bold uppercase tracking-widest text-industrial-muted mb-1">
                {label}
            </div>
            {series.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5 mt-0.5">
                    <span
                        className={`h-2 w-2 shrink-0 ${s.shape === 'square' ? 'rounded-[2px]' : 'rounded-full'}`}
                        style={{ backgroundColor: s.color }}
                    />
                    <span className="text-[10px] font-bold text-white">
                        {s.value}
                    </span>
                </div>
            ))}
            {children}
        </div>
    );
}
