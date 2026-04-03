import { PlugZap, Unplug } from 'lucide-react';
import type { ConnectionStatusDisplayOptions, WidgetConfig } from '../../domain/admin.types';
import type { EquipmentSummary } from '../../domain/equipment.types';
import ConnectionStatusBadge from '../../components/ui/ConnectionStatusBadge';
import WidgetCenteredContentLayout from '../../components/ui/WidgetCenteredContentLayout';
import WidgetHeader from '../../components/ui/WidgetHeader';
import {
    normalizeSimulatedConnectionStatus,
    resolveConnectionStatusLabel,
} from '../../utils/connectionWidget';

interface ConnectionStatusWidgetProps {
    widget: WidgetConfig;
    equipmentMap: Map<string, EquipmentSummary>;
    className?: string;
}

export default function ConnectionStatusWidget({
    widget,
    equipmentMap,
    className,
}: ConnectionStatusWidgetProps) {
    const options = (widget.displayOptions as ConnectionStatusDisplayOptions | undefined);

    const binding = widget.binding;
    const isConnected = binding?.mode === 'simulated_value'
        ? normalizeSimulatedConnectionStatus(binding.simulatedValue)
        : (() => {
            const assetId = binding?.assetId;
            const equipment = assetId ? equipmentMap.get(assetId) : undefined;
            return equipment?.connectionState === 'online';
        })();

    const statusLabel = resolveConnectionStatusLabel(isConnected, options);
    const icon = isConnected ? PlugZap : Unplug;
    const iconColor = isConnected ? 'var(--color-status-normal)' : 'var(--color-industrial-muted)';

    return (
        <div className={`p-5 glass-panel group w-full h-full ${className ?? ''}`}>
            <WidgetCenteredContentLayout
                header={(
                    <WidgetHeader
                        title={widget.title ?? 'Estado'}
                        icon={icon}
                        iconColor={iconColor}
                    />
                )}
            >
                <ConnectionStatusBadge
                    isConnected={isConnected}
                    label={statusLabel}
                />
            </WidgetCenteredContentLayout>
        </div>
    );
}
