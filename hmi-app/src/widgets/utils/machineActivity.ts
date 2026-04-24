import type { ProductiveState } from '../../domain/admin.types';

export interface StateVisuals {
    primary: string;
    gradientColors: [string, string];
    glowColor: string;
    animationDuration: number;
}

const STATE_VISUALS: Record<ProductiveState, StateVisuals> = {
    stopped: {
        primary: 'var(--color-state-stopped)',
        gradientColors: ['var(--color-state-stopped-from)', 'var(--color-state-stopped-to)'],
        glowColor: 'color-mix(in srgb, var(--color-state-stopped) 35%, transparent)',
        animationDuration: 900,
    },
    calibrating: {
        primary: 'var(--color-state-calibrating)',
        gradientColors: ['var(--color-state-calibrating-from)', 'var(--color-state-calibrating-to)'],
        glowColor: 'color-mix(in srgb, var(--color-state-calibrating) 45%, transparent)',
        animationDuration: 550,
    },
    producing: {
        primary: 'var(--color-state-producing)',
        gradientColors: ['var(--color-state-producing-from)', 'var(--color-state-producing-to)'],
        glowColor: 'color-mix(in srgb, var(--color-state-producing) 50%, transparent)',
        animationDuration: 350,
    },
};

function isInvalidPower(value: number | null | undefined): value is null | undefined {
    return value == null || Number.isNaN(value);
}

export function calculateActivityIndex(
    power: number | null | undefined,
    powerMin: number,
    powerMax: number,
): number {
    if (isInvalidPower(power) || powerMax <= powerMin) {
        return 0;
    }

    const normalized = ((power - powerMin) / (powerMax - powerMin)) * 100;

    return Math.min(100, Math.max(0, normalized));
}

export function smoothValue(values: number[], window: number): number {
    if (values.length === 0) {
        return 0;
    }

    if (window <= 0) {
        return values[values.length - 1] ?? 0;
    }

    const recentValues = values.slice(-window);
    const total = recentValues.reduce((sum, value) => sum + value, 0);

    return total / recentValues.length;
}

export function determineProductiveState(
    power: number | null | undefined,
    thresholds: { stopped: number; producing: number },
    hysteresis: number,
    previousState: ProductiveState,
): ProductiveState {
    if (isInvalidPower(power)) {
        return 'stopped';
    }

    if (previousState === 'producing' && power > thresholds.producing - hysteresis) {
        return 'producing';
    }

    if (previousState === 'calibrating' && power > thresholds.stopped - hysteresis && power < thresholds.producing) {
        return 'calibrating';
    }

    if (power >= thresholds.producing) {
        return 'producing';
    }

    if (power >= thresholds.stopped) {
        return 'calibrating';
    }

    return 'stopped';
}

export function getStateVisuals(state: ProductiveState): StateVisuals {
    return STATE_VISUALS[state];
}
