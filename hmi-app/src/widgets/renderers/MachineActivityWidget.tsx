import type { MachineActivityDisplayOptions, MachineActivityWidgetConfig } from '../../domain/admin.types';
import type { ContractMachine } from '../../domain/dataContract.types';
import type { EquipmentSummary } from '../../domain/equipment.types';
import { Activity, Thermometer, Zap, Droplet, Wind, Settings, Gauge, Fan, FoldVertical, HelpCircle, type LucideIcon } from 'lucide-react';
import GaugeDisplay from '../../components/ui/GaugeDisplay';
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
                        <div className="relative flex items-center justify-center w-full h-full min-h-[140px]">
                            <GaugeDisplay
                                normalizedValue={activityIndex / 100}
                                color={gaugeColor}
                                mode="circular"
                                animation={gaugeAnimation}
                            />
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span
                                    className="text-6xl text-white leading-none tracking-tighter mb-1"
                                    style={{ fontFamily: 'var(--font-widget-value)', fontWeight: 'var(--font-weight-widget-value)' }}
                                >
                                    {isValid ? Math.round(activityIndex) : '--'}
                                </span>
                                {displayUnit && isValid && <span className="text-xs font-bold text-industrial-muted uppercase tracking-widest">{displayUnit}</span>}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col w-full h-full justify-center px-2">
                            <div className="flex items-end gap-2 mb-3">
                                <span
                                    className="text-6xl text-white leading-none tracking-tighter"
                                    style={{ fontFamily: 'var(--font-widget-value)', fontWeight: 'var(--font-weight-widget-value)' }}
                                >
                                    {isValid ? Math.round(activityIndex) : '--'}
                                </span>
                                {displayUnit && isValid && <span className="text-xs font-bold text-industrial-muted uppercase tracking-widest mb-1.5">{displayUnit}</span>}
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
                <div className="absolute left-5 bottom-3 z-20 text-[10px] font-black uppercase tracking-widest leading-none text-industrial-muted truncate max-w-[calc(100%-2.5rem)]">
                    {isValid ? `${smoothedPower.toFixed(2)} ${realUnit}` : `-- ${realUnit}`}
                </div>
            )}
        </div>
    );
}
