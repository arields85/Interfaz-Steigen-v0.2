import type {
    ConnectionIndicatorDisplayOptions,
    ConnectionStatusDisplayOptions,
} from '../domain/admin.types';
import type { ConnectionState } from '../domain/equipment.types';

type ConnectionStatusKey = 'connected' | 'disconnected';
type ConnectionIndicatorTextKey = Exclude<keyof ConnectionIndicatorDisplayOptions, 'showLastUpdate'>;

export const CONNECTION_STATE_VALUES: ConnectionState[] = [
    'online',
    'degraded',
    'stale',
    'offline',
    'unknown',
];

export const DEFAULT_CONNECTION_INDICATOR_LABELS: Record<ConnectionState, string> = {
    online: 'Online',
    degraded: 'Degradado',
    stale: 'Dato desactualizado',
    offline: 'Sin señal',
    unknown: 'Sin datos de conexión',
};

export const CONNECTION_INDICATOR_TEXT_OPTION_KEY: Record<
    ConnectionState,
    ConnectionIndicatorTextKey
> = {
    online: 'onlineText',
    degraded: 'degradedText',
    stale: 'staleText',
    offline: 'offlineText',
    unknown: 'unknownText',
};

export function createDefaultConnectionIndicatorDisplayOptions(): ConnectionIndicatorDisplayOptions {
    return CONNECTION_STATE_VALUES.reduce<ConnectionIndicatorDisplayOptions>((acc, state) => {
        acc[CONNECTION_INDICATOR_TEXT_OPTION_KEY[state]] = DEFAULT_CONNECTION_INDICATOR_LABELS[state];
        return acc;
    }, {});
}

export function normalizeSimulatedConnectionState(value: number | string | boolean | undefined): ConnectionState {
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (CONNECTION_STATE_VALUES.includes(normalized as ConnectionState)) {
            return normalized as ConnectionState;
        }
        if (normalized === '1' || normalized === 'true' || normalized === 'online' || normalized === 'conectado') {
            return 'online';
        }
        if (normalized === '0' || normalized === 'false' || normalized === 'offline' || normalized === 'desconectado') {
            return 'offline';
        }
        return 'unknown';
    }

    if (typeof value === 'number') {
        if (value === 1) return 'online';
        if (value === 0) return 'offline';
    }

    if (typeof value === 'boolean') {
        return value ? 'online' : 'offline';
    }

    return 'unknown';
}

export function resolveConnectionIndicatorLabel(
    state: ConnectionState,
    options?: ConnectionIndicatorDisplayOptions,
): string {
    const optionKey = CONNECTION_INDICATOR_TEXT_OPTION_KEY[state];
    const customText = optionKey ? options?.[optionKey] : undefined;
    return customText?.trim() || DEFAULT_CONNECTION_INDICATOR_LABELS[state];
}

export const DEFAULT_CONNECTION_STATUS_LABELS: Record<ConnectionStatusKey, string> = {
    connected: 'Conectado',
    disconnected: 'Sin datos de conexion.',
};

export const CONNECTION_STATUS_TEXT_OPTION_KEY: Record<
    ConnectionStatusKey,
    keyof ConnectionStatusDisplayOptions
> = {
    connected: 'connectedText',
    disconnected: 'disconnectedText',
};

export function createDefaultConnectionStatusDisplayOptions(): ConnectionStatusDisplayOptions {
    return {
        [CONNECTION_STATUS_TEXT_OPTION_KEY.connected]: DEFAULT_CONNECTION_STATUS_LABELS.connected,
        [CONNECTION_STATUS_TEXT_OPTION_KEY.disconnected]: DEFAULT_CONNECTION_STATUS_LABELS.disconnected,
    };
}

export function normalizeSimulatedConnectionStatus(value: number | string | boolean | undefined): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        return normalized === '1'
            || normalized === 'true'
            || normalized === 'conectado'
            || normalized === 'connected';
    }
    return false;
}

export function resolveConnectionStatusLabel(
    isConnected: boolean,
    options?: ConnectionStatusDisplayOptions,
): string {
    const statusKey: ConnectionStatusKey = isConnected ? 'connected' : 'disconnected';
    const optionKey = CONNECTION_STATUS_TEXT_OPTION_KEY[statusKey];
    const customText = optionKey ? options?.[optionKey] : undefined;
    return customText?.trim() || DEFAULT_CONNECTION_STATUS_LABELS[statusKey];
}
