interface HoverHighlight {
    /** X coordinate of the highlight dot */
    x: number;
    /** Y coordinate of the highlight dot */
    y: number;
    /** CSS color of the dot */
    color: string;
}

interface ChartHoverLayerProps {
    /** Number of data points (columns) */
    dataLength: number;
    /** X coordinate of the first data point */
    x0: number;
    /** Horizontal step between data points */
    step: number;
    /** Top margin of the plot area */
    marginTop: number;
    /** Left margin of the plot area */
    marginLeft: number;
    /** Width of the plot area */
    plotWidth: number;
    /** Height of the plot area */
    plotHeight: number;
    /** Currently hovered index (null = no hover) */
    hoveredIndex: number | null;
    /** Callback when hover changes. Receives the index and x coordinate, or null to clear. */
    onHoverChange: (index: number | null, x?: number) => void;
    /** Optional highlight dots to show at the hovered point */
    highlights?: HoverHighlight[];
    /** Color of the vertical indicator line. Default: use muted token. */
    indicatorColor?: string;
    /** Color for highlight dot borders. Default: use background token. */
    highlightBorderColor?: string;
}

/**
 * Shared SVG hover interaction layer for charts.
 *
 * Renders:
 * - Invisible hit-area rectangles (one per data column) for mouse detection
 * - A vertical dashed indicator line at the hovered column
 * - Optional highlight dots at specified coordinates
 *
 * Place this as the LAST element inside your `<svg>` so hit areas are on top.
 * The indicator and highlights use `pointerEvents="none"` to avoid interference.
 */
export default function ChartHoverLayer({
    dataLength,
    x0,
    step,
    marginTop,
    marginLeft,
    plotWidth,
    plotHeight,
    hoveredIndex,
    onHoverChange,
    highlights,
    indicatorColor = 'var(--color-industrial-muted)',
    highlightBorderColor = 'var(--color-industrial-bg)',
}: ChartHoverLayerProps) {
    const isValidHover = hoveredIndex !== null && hoveredIndex >= 0 && hoveredIndex < dataLength;

    return (
        <g>
            {/* Hit areas — one transparent rect per data column */}
            {Array.from({ length: dataLength }, (_, index) => {
                const cx = x0 + (index * step);
                const hitWidth = step > 0 ? step : plotWidth;
                const hitX = cx - (hitWidth / 2);
                return (
                    <rect
                        key={`hit-${index}`}
                        x={Math.max(hitX, marginLeft)}
                        y={marginTop}
                        width={Math.min(hitWidth, plotWidth)}
                        height={plotHeight}
                        fill="transparent"
                        onMouseEnter={() => onHoverChange(index, cx)}
                        onMouseLeave={() => onHoverChange(null)}
                    />
                );
            })}

            {/* Vertical indicator line */}
            {isValidHover && (() => {
                const cx = x0 + (hoveredIndex * step);
                return (
                    <line
                        x1={cx}
                        y1={marginTop}
                        x2={cx}
                        y2={marginTop + plotHeight}
                        stroke={indicatorColor}
                        strokeWidth={1}
                        strokeDasharray="4 3"
                        opacity={0.6}
                        pointerEvents="none"
                    />
                );
            })()}

            {/* Highlight dots */}
            {isValidHover && highlights && highlights.length > 0 && (
                <g pointerEvents="none">
                    {highlights.map((h, i) => (
                        <circle
                            key={`highlight-${i}`}
                            cx={h.x}
                            cy={h.y}
                            r={5}
                            fill={h.color}
                            stroke={highlightBorderColor}
                            strokeWidth={2}
                        />
                    ))}
                </g>
            )}
        </g>
    );
}
