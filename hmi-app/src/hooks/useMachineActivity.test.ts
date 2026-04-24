import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMachineActivity } from './useMachineActivity';

interface HookProps {
    rawValue: number | string | null | undefined;
    sourceKey?: string;
    simulated?: boolean;
}

describe('useMachineActivity', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns safe invalid-data output for nullish or non-numeric values', () => {
        const { result, rerender } = renderHook<ReturnType<typeof useMachineActivity>, HookProps>(
            ({ rawValue, sourceKey, simulated }: HookProps) => useMachineActivity(rawValue, {}, { sourceKey, simulated }),
            { initialProps: { rawValue: null as number | string | null | undefined } },
        );

        expect(result.current).toEqual({
            activityIndex: 0,
            productiveState: 'stopped',
            stateLabel: 'Sin datos',
            stateVisuals: {
                primary: 'var(--color-state-stopped)',
                gradientColors: ['var(--color-state-stopped-from)', 'var(--color-state-stopped-to)'],
                glowColor: 'color-mix(in srgb, var(--color-state-stopped) 35%, transparent)',
                animationDuration: 900,
            },
            smoothedPower: 0,
            rawPower: null,
            isValid: false,
        });

        rerender({ rawValue: 'no-es-numero' });

        expect(result.current.isValid).toBe(false);
        expect(result.current.rawPower).toBe(null);
        expect(result.current.stateLabel).toBe('Sin datos');
    });

    it('parses strings, smooths values, and confirms state changes after dwell time', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-04-23T20:00:00.000Z'));

        const displayOptions = {
            thresholdStopped: 0.15,
            thresholdProducing: 0.25,
            hysteresis: 0.05,
            confirmationTime: 2000,
            smoothingWindow: 3,
            powerMin: 0,
            powerMax: 1,
            labelStopped: 'Detenida',
            labelCalibrating: 'Calibrando',
            labelProducing: 'Produciendo',
        };

        const { result, rerender } = renderHook<ReturnType<typeof useMachineActivity>, HookProps>(
            ({ rawValue, sourceKey, simulated }: HookProps) => useMachineActivity(rawValue, displayOptions, { sourceKey, simulated }),
            { initialProps: { rawValue: '0.10' } },
        );

        expect(result.current.rawPower).toBe(0.1);
        expect(result.current.smoothedPower).toBeCloseTo(0.1);
        expect(result.current.activityIndex).toBe(0);
        expect(result.current.productiveState).toBe('stopped');
        expect(result.current.stateLabel).toBe('Detenida');

        rerender({ rawValue: 0.30 });

        expect(result.current.smoothedPower).toBeCloseTo(0.2);
        expect(result.current.productiveState).toBe('stopped');
        expect(result.current.stateLabel).toBe('Detenida');

        rerender({ rawValue: 0.50 });

        expect(result.current.smoothedPower).toBeCloseTo(0.3);
        expect(result.current.activityIndex).toBe(0);
        expect(result.current.productiveState).toBe('stopped');

        act(() => {
            vi.advanceTimersByTime(1999);
        });
        rerender({ rawValue: 0.50 });

        expect(result.current.productiveState).toBe('stopped');

        act(() => {
            vi.advanceTimersByTime(1);
        });
        rerender({ rawValue: 0.50 });

        expect(result.current.productiveState).toBe('producing');
        expect(result.current.stateLabel).toBe('Produciendo');
        expect(result.current.stateVisuals).toEqual({
            primary: 'var(--color-state-producing)',
            gradientColors: ['var(--color-state-producing-from)', 'var(--color-state-producing-to)'],
            glowColor: 'color-mix(in srgb, var(--color-state-producing) 50%, transparent)',
            animationDuration: 350,
        });
        expect(result.current.activityIndex).toBeCloseTo(30);
    });

    it('forces the activity index to zero while the confirmed state is stopped', () => {
        const { result } = renderHook<ReturnType<typeof useMachineActivity>, HookProps>(
            ({ rawValue, sourceKey, simulated }: HookProps) => useMachineActivity(rawValue, {
                powerMin: 0,
                powerMax: 1,
                thresholdStopped: 0.15,
                thresholdProducing: 0.25,
            }, { sourceKey, simulated }),
            { initialProps: { rawValue: 0.05 } },
        );

        expect(result.current.productiveState).toBe('stopped');
        expect(result.current.activityIndex).toBe(0);
    });

    it('uses simulated values directly without smoothing carryover or confirmation delay', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-04-24T12:00:00.000Z'));

        const { result, rerender } = renderHook<ReturnType<typeof useMachineActivity>, HookProps>(
            ({ rawValue, sourceKey, simulated }: HookProps) => useMachineActivity(rawValue, {
                powerMin: 0,
                powerMax: 40,
                thresholdStopped: 0.15,
                thresholdProducing: 0.25,
                confirmationTime: 2000,
                smoothingWindow: 5,
            }, { sourceKey, simulated }),
            {
                initialProps: {
                    rawValue: 1,
                    sourceKey: 'real:101:activePower',
                    simulated: false,
                },
            },
        );

        rerender({ rawValue: 1, sourceKey: 'real:101:activePower', simulated: false });
        act(() => {
            vi.advanceTimersByTime(2000);
        });
        rerender({ rawValue: 1, sourceKey: 'real:101:activePower', simulated: false });

        expect(result.current.productiveState).toBe('producing');

        rerender({ rawValue: 30, sourceKey: 'simulated', simulated: true });

        expect(result.current.rawPower).toBe(30);
        expect(result.current.smoothedPower).toBe(30);
        expect(result.current.productiveState).toBe('producing');
        expect(result.current.activityIndex).toBe(75);
    });
});
