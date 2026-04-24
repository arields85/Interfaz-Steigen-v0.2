import { useId } from 'react';

export type GaugeMode = 'circular' | 'bar';

export interface GaugeDisplayAnimation {
    enabled: boolean;
    intensity: 'none' | 'subtle' | 'active';
    durationMs?: number;
}

export interface GaugeDisplayProps {
    normalizedValue: number;
    color: {
        primary: string;
        gradient: [string, string];
    };
    mode?: GaugeMode;
    animation?: GaugeDisplayAnimation;
    size?: 'sm' | 'md' | 'lg' | number;
    className?: string;
}

const CIRCULAR_RADIUS = 60;
const CIRCULAR_DIAMETER = 140;
const CIRCULAR_VIEWBOX_SIZE = 160;
const CIRCULAR_CENTER = 70;
const BAR_HEIGHT = 8;
const BAR_HEIGHT_PRESETS = {
    sm: 6,
    md: BAR_HEIGHT,
    lg: 10,
} as const;
const CIRCULAR_SIZE_PRESETS = {
    sm: 112,
    md: CIRCULAR_DIAMETER,
    lg: 160,
} as const;
const ANIMATION_DURATION_PRESETS = {
    none: 0,
    subtle: 550,
    active: 350,
} as const;

function clampNormalizedValue(value: number) {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.min(Math.max(value, 0), 1);
}

export default function GaugeDisplay({
    normalizedValue,
    color,
    mode = 'circular',
    animation,
    size,
    className,
}: GaugeDisplayProps) {
    const normalized = clampNormalizedValue(normalizedValue);
    const gradientId = useId().replace(/:/g, '');
    const glowFilterId = `${gradientId}-glow`;
    const strokeWidth = 8;
    const animationEnabled = animation?.enabled !== false;
    const animationIntensity = animation?.intensity ?? 'subtle';
    const animationDuration = animationEnabled
        ? (animation?.durationMs ?? ANIMATION_DURATION_PRESETS[animationIntensity])
        : 0;
    const showGlow = animationEnabled && animationIntensity !== 'none';
    const gradientColors = color.gradient;
    const primaryColor = color.primary;

    if (mode === 'bar') {
        const backgroundStyle = `linear-gradient(90deg, ${gradientColors[0]}, ${gradientColors[1]})`;
        const barHeight = typeof size === 'number'
            ? size
            : size
                ? BAR_HEIGHT_PRESETS[size]
                : BAR_HEIGHT;

        return (
            <div className={`w-full ${className ?? ''}`.trim()}>
                <div
                    className="h-2 w-full bg-white/5 rounded-full relative"
                    data-testid="gauge-bar-track"
                    style={{ height: `${barHeight}px` }}
                >
                    <div
                        className="absolute top-0 left-0 h-full rounded-full transition-all duration-500 ease-out"
                        data-testid="gauge-bar-fill"
                        style={{
                            width: `${normalized * 100}%`,
                            background: backgroundStyle,
                            transitionDuration: `${animationDuration}ms`,
                            boxShadow: showGlow ? `0 0 15px ${primaryColor}` : undefined,
                        }}
                    />
                </div>
            </div>
        );
    }

    const circularSize = typeof size === 'number'
        ? size
        : size
            ? CIRCULAR_SIZE_PRESETS[size]
            : undefined;
    const radius = circularSize ? Math.max((circularSize - strokeWidth) / 2, 0) : CIRCULAR_RADIUS;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - normalized * circumference;
    const svgSize = circularSize ?? CIRCULAR_DIAMETER;
    const viewBoxInset = strokeWidth + 2;
    const center = circularSize ? svgSize / 2 : CIRCULAR_CENTER;
    const viewBoxSize = circularSize ? svgSize : CIRCULAR_VIEWBOX_SIZE;
    const strokeColor = `url(#${gradientId})`;

    return (
        <svg
            className={`w-full h-full transform -rotate-90 origin-center transition-all duration-500 ease-out ${className ?? ''}`.trim()}
            data-testid="gauge-circular"
            viewBox={`${-viewBoxInset} ${-viewBoxInset} ${viewBoxSize} ${viewBoxSize}`}
            preserveAspectRatio="xMidYMid meet"
            style={{
                filter: showGlow ? `drop-shadow(0 0 15px ${primaryColor})` : undefined,
                transitionDuration: `${animationDuration}ms`,
            }}
        >
            <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop data-testid="gauge-circular-gradient-stop" offset="0%" stopColor={gradientColors[1]} />
                    <stop data-testid="gauge-circular-gradient-stop" offset="100%" stopColor={gradientColors[0]} />
                </linearGradient>
                <filter id={glowFilterId} x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>
            <circle
                cx={center}
                cy={center}
                r={radius}
                stroke="color-mix(in srgb, white 3%, transparent)"
                strokeWidth={strokeWidth}
                fill="none"
            />
            <circle
                cx={center}
                cy={center}
                r={radius}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-500 ease-out"
                data-testid="gauge-circular-arc"
                filter={showGlow ? `url(#${glowFilterId})` : undefined}
                style={{ transitionDuration: `${animationDuration}ms` }}
            />
        </svg>
    );
}

export { BAR_HEIGHT, CIRCULAR_DIAMETER, CIRCULAR_RADIUS };
