import { useEffect, useRef, useState } from 'react';
import type { MachineActivityDisplayOptions, MachineActivityWidgetConfig } from '../../domain/admin.types';
import type { ContractMachine } from '../../domain/dataContract.types';
import type { EquipmentSummary } from '../../domain/equipment.types';
import { Activity, Thermometer, Zap, Droplet, Wind, Settings, Gauge, Fan, FoldVertical, HelpCircle, type LucideIcon } from 'lucide-react';
import GaugeDisplay, { CIRCULAR_VIEWBOX_SIZE } from '../../components/ui/GaugeDisplay';
import WidgetHeader from '../../components/ui/WidgetHeader';
import WidgetCenteredContentLayout from '../../components/ui/WidgetCenteredContentLayout';
import { useMachineActivity } from '../../hooks/useMachineActivity';
import { resolveBinding } from '../resolvers/bindingResolver';

const ICON_MAP: Record<string, LucideIcon> = {
    Gauge,
    Activity,
    Thermometer,
    Zap,
    Droplet,
    Wind,
    Settings,
    Fan,
    FoldVertical,
};

interface MachineActivityWidgetProps {
    widget: MachineActivityWidgetConfig;
    equipmentMap: Map<string, EquipmentSummary>;
    machines?: ContractMachine[];
    isLoadingData?: boolean;
    className?: string;
}

const WIDGET_VALUE_TEXT_STYLE = {
    fontFamily: 'var(--font-widget-value-gauge)',
    fontWeight: 'var(--font-weight-widget-value-gauge)',
    fontSize: 'var(--font-size-widget-value-gauge)',
    letterSpacing: 'var(--tracking-widget-value-gauge)',
} as const;

const WIDGET_UNIT_TEXT_STYLE = {
    fontFamily: 'var(--font-widget-value-gauge)',
    fontWeight: 'var(--font-weight-widget-value-gauge)',
    fontSize: 'var(--font-size-widget-unit-gauge)',
    letterSpacing: 'var(--tracking-widget-value-gauge)',
} as const;

const CIRCULAR_WIDGET_VALUE_TEXT_STYLE = {
    fontFamily: 'var(--font-widget-value-gauge)',
    fontWeight: 'var(--font-weight-widget-value-gauge)',
    letterSpacing: 'var(--tracking-widget-value-gauge)',
} as const;

const CIRCULAR_WIDGET_UNIT_TEXT_STYLE = {
    fontFamily: 'var(--font-widget-value-gauge)',
    fontWeight: 'var(--font-weight-widget-value-gauge)',
    letterSpacing: 'var(--tracking-widget-value-gauge)',
} as const;

const DEFAULT_CIRCULAR_TEXT_SIZING = {
    value: 0,
    unit: 0,
} as const;

function resolveCappedSvgFontSize(desiredPixels: number, renderedSize: number) {
    if (!(desiredPixels > 0)) {
        return 0;
    }

    const scale = renderedSize > 0 ? renderedSize / CIRCULAR_VIEWBOX_SIZE : 1;

    return desiredPixels / Math.max(1, scale);
}

function readCssPixelValue(element: Element, propertyName: string) {
    const rawValue = getComputedStyle(element).getPropertyValue(propertyName);
    const parsedValue = Number.parseFloat(rawValue);

    return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function renderCircularGaugeText(
    value: string,
    unit: string | undefined,
    isValid: boolean,
    textSizing: { value: number; unit: number },
) {
    return ({ center, radius }: { center: number; radius: number; viewBoxSize: number; renderedSize: number }) => (
        <>
            <text
                x={center}
                y={center - radius * 0.15}
                textAnchor="middle"
                dominantBaseline="central"
                className="text-white"
                fill="currentColor"
                fontSize={textSizing.value > 0 ? textSizing.value : undefined}
                style={CIRCULAR_WIDGET_VALUE_TEXT_STYLE}
            >
                {value}
            </text>
            {unit && isValid && (
                <text
                    x={center}
                    y={center + radius * 0.25}
                    textAnchor="middle"
                    dominantBaseline="hanging"
                    className="text-industrial-muted uppercase"
                    fill="currentColor"
                    fontSize={textSizing.unit > 0 ? textSizing.unit : undefined}
                    style={CIRCULAR_WIDGET_UNIT_TEXT_STYLE}
                >
                    {unit}
                </text>
            )}
        </>
    );
}

function resolveIcon(displayOptions?: MachineActivityDisplayOptions) {
    const iconSetting = displayOptions?.icon;
    const configuredIcon = typeof iconSetting === 'string' ? ICON_MAP[iconSetting] : undefined;

    if (iconSetting === null) {
        return undefined;
    }

    if (iconSetting === undefined) {
        return Activity;
    }

    return configuredIcon ?? HelpCircle;
}

export default function MachineActivityWidget({
    widget,
    equipmentMap,
    machines,
    isLoadingData,
    className,
}: MachineActivityWidgetProps) {
    const circularGaugeContainerRef = useRef<HTMLDivElement>(null);
    const [circularTextSizing, setCircularTextSizing] = useState(DEFAULT_CIRCULAR_TEXT_SIZING);
    const resolved = isLoadingData
        ? { value: null, unit: null }
        : resolveBinding(widget, equipmentMap, machines);
    const opts = widget.displayOptions ?? {};
    const mode = opts.kpiMode ?? 'circular';
    const isSimulatedBinding = widget.binding?.mode === 'simulated_value';
    const resolvedUnit = resolved.unit?.trim() ?? '';
    const bindingUnit = widget.binding?.unit?.trim() ?? '';
    const customUnit = opts.unit?.trim() ?? '';
    const simulatedUnit = bindingUnit || customUnit;
    const liveUnit = isSimulatedBinding
        ? simulatedUnit
        : (resolvedUnit || bindingUnit);
    const displayUnit = opts.unitOverride
        ? (isSimulatedBinding ? (simulatedUnit || '%') : (customUnit || '%'))
        : (liveUnit || 'kW');
    const realUnit = isSimulatedBinding
        ? (simulatedUnit || 'kW')
        : (liveUnit || 'kW');
    const Icon = resolveIcon(widget.displayOptions);
    const usesDynamicColor = opts.showDynamicColor !== false;
    const showsAnimation = opts.showStateAnimation !== false;
    const {
        activityIndex,
        productiveState,
        stateLabel,
        stateVisuals,
        smoothedPower,
        isValid,
    } = useMachineActivity(resolved.value, opts, {
        simulated: isSimulatedBinding,
        sourceKey: isSimulatedBinding
            ? 'simulated'
            : `${widget.binding?.bindingVersion ?? 'legacy'}:${widget.binding?.assetId ?? ''}:${widget.binding?.machineId ?? ''}:${widget.binding?.variableKey ?? ''}`,
    });

    if (isLoadingData) {
        return (
            <div className={`p-5 rounded-3xl bg-industrial-surface border border-industrial-border animate-pulse ${className ?? ''}`}>
                <div className="h-4 w-24 bg-industrial-hover rounded mb-6" />
                <div className="h-20 w-full bg-industrial-hover rounded-full" />
            </div>
        );
    }

    const gaugePrimaryColor = usesDynamicColor
        ? stateVisuals.primary
        : 'color-mix(in srgb, var(--color-accent-purple) 40%, transparent)';
    const gaugeColor = {
        primary: gaugePrimaryColor,
        gradient: usesDynamicColor
            ? stateVisuals.gradientColors
            : ['var(--color-widget-gradient-from)', 'var(--color-widget-gradient-to)'] as [string, string],
    };
    const gaugeAnimation = showsAnimation
        ? {
            enabled: true,
            intensity: productiveState === 'producing'
                ? 'active'
                : productiveState === 'calibrating'
                    ? 'subtle'
                    : 'none',
            durationMs: stateVisuals.animationDuration,
        } as const
        : {
            enabled: false,
            intensity: 'none',
            durationMs: 0,
        } as const;
    const activityIndexLabel = isValid ? String(Math.round(activityIndex)) : '--';

    useEffect(() => {
        if (mode !== 'circular') {
            setCircularTextSizing(DEFAULT_CIRCULAR_TEXT_SIZING);
            return undefined;
        }

        const element = circularGaugeContainerRef.current;

        if (!element) {
            return undefined;
        }

        const updateCircularTextSizing = (width: number, height: number) => {
            const renderedSize = Math.min(width, height);
            const valueFontSize = readCssPixelValue(element, '--font-size-widget-value-gauge');
            const unitFontSize = readCssPixelValue(element, '--font-size-widget-unit-gauge');

            setCircularTextSizing({
                value: resolveCappedSvgFontSize(valueFontSize, renderedSize),
                unit: resolveCappedSvgFontSize(unitFontSize, renderedSize),
            });
        };

        updateCircularTextSizing(element.clientWidth, element.clientHeight);

        const resizeObserver = typeof ResizeObserver === 'undefined'
            ? null
            : new ResizeObserver(([entry]) => {
                updateCircularTextSizing(entry.contentRect.width, entry.contentRect.height);
            });

        resizeObserver?.observe(element);

        const mutationObserver = typeof MutationObserver === 'undefined'
            ? null
            : new MutationObserver(() => {
                updateCircularTextSizing(element.clientWidth, element.clientHeight);
            });

        mutationObserver?.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['style'],
        });

        return () => {
            resizeObserver?.disconnect();
            mutationObserver?.disconnect();
        };
    }, [mode]);

    return (
        <div className={`p-5 glass-panel group relative w-full h-full ${className ?? ''}`} data-state={productiveState}>
            <WidgetCenteredContentLayout
                headerOffsetClassName="-translate-y-1"
                contentClassName="translate-y-3"
                header={(
                    <WidgetHeader
                        title={widget.title ?? 'Actividad de Máquina'}
                        icon={Icon}
                        iconColor={usesDynamicColor ? stateVisuals.primary : 'var(--color-widget-icon)'}
                        subtitle={opts.showStateSubtitle !== false ? stateLabel : undefined}
                        alignment="none"
                        className="mb-2"
                    />
                )}
            >
                <div className="w-full h-full min-h-0">
                    {mode === 'circular' ? (
                        <div ref={circularGaugeContainerRef} className="relative flex flex-1 items-center justify-center w-full h-full min-h-0">
                            <GaugeDisplay
                                normalizedValue={activityIndex / 100}
                                color={gaugeColor}
                                mode="circular"
                                animation={gaugeAnimation}
                                circularContent={renderCircularGaugeText(activityIndexLabel, displayUnit, isValid, circularTextSizing)}
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col w-full h-full justify-center px-2">
                            <div className="flex items-baseline gap-2 mb-3">
                                <span
                                    className="text-white leading-none"
                                    style={WIDGET_VALUE_TEXT_STYLE}
                                >
                                    {activityIndexLabel}
                                </span>
                                {displayUnit && isValid && <span className="text-industrial-muted uppercase" style={WIDGET_UNIT_TEXT_STYLE}>{displayUnit}</span>}
                            </div>
                            <GaugeDisplay
                                normalizedValue={activityIndex / 100}
                                color={gaugeColor}
                                mode="bar"
                                animation={gaugeAnimation}
                            />
                        </div>
                    )}
                </div>
            </WidgetCenteredContentLayout>

            {opts.showPowerSubtext !== false && (
                <div className="absolute left-5 bottom-3 z-20 uppercase leading-none text-industrial-muted truncate max-w-[calc(100%-2.5rem)]">
                    {isValid ? `${smoothedPower.toFixed(2)} ${realUnit}` : `-- ${realUnit}`}
                </div>
            )}
        </div>
    );
}
