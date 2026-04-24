import { describe, expect, it } from 'vitest';
import {
    calculateActivityIndex,
    determineProductiveState,
    getStateVisuals,
    smoothValue,
} from './machineActivity';

describe('calculateActivityIndex', () => {
    it('returns 0 when power is at the minimum', () => {
        expect(calculateActivityIndex(0, 0, 1)).toBe(0);
    });

    it('returns 100 when power is at the maximum', () => {
        expect(calculateActivityIndex(1, 0, 1)).toBe(100);
    });

    it('returns the linearly interpolated value for power between the range', () => {
        expect(calculateActivityIndex(0.5, 0, 1)).toBe(50);
    });

    it('clamps values below the minimum to 0', () => {
        expect(calculateActivityIndex(-1, 0, 1)).toBe(0);
    });

    it('clamps values above the maximum to 100', () => {
        expect(calculateActivityIndex(2, 0, 1)).toBe(100);
    });

    it('returns 0 when powerMin and powerMax are equal', () => {
        expect(calculateActivityIndex(1, 1, 1)).toBe(0);
    });

    it('returns 0 for invalid power values', () => {
        expect(calculateActivityIndex(Number.NaN, 0, 1)).toBe(0);
        expect(calculateActivityIndex(null, 0, 1)).toBe(0);
        expect(calculateActivityIndex(undefined, 0, 1)).toBe(0);
    });
});

describe('determineProductiveState', () => {
    const thresholds = { stopped: 0.15, producing: 0.25 };

    it('returns stopped when power is below the stopped threshold', () => {
        expect(determineProductiveState(0.1, thresholds, 0.05, 'stopped')).toBe('stopped');
    });

    it('returns calibrating when power is between the thresholds', () => {
        expect(determineProductiveState(0.2, thresholds, 0.05, 'stopped')).toBe('calibrating');
    });

    it('returns producing when power is at or above the producing threshold', () => {
        expect(determineProductiveState(0.25, thresholds, 0.05, 'calibrating')).toBe('producing');
    });

    it('keeps producing while power remains above the producing down hysteresis boundary', () => {
        expect(determineProductiveState(0.21, thresholds, 0.05, 'producing')).toBe('producing');
    });

    it('drops from producing to calibrating below the producing down hysteresis boundary', () => {
        expect(determineProductiveState(0.19, thresholds, 0.05, 'producing')).toBe('calibrating');
    });

    it('keeps calibrating while power remains above the stopped down hysteresis boundary', () => {
        expect(determineProductiveState(0.11, thresholds, 0.05, 'calibrating')).toBe('calibrating');
    });

    it('drops from calibrating to stopped below the stopped down hysteresis boundary', () => {
        expect(determineProductiveState(0.09, thresholds, 0.05, 'calibrating')).toBe('stopped');
    });

    it('transitions upward at exact thresholds', () => {
        expect(determineProductiveState(0.15, thresholds, 0.05, 'stopped')).toBe('calibrating');
        expect(determineProductiveState(0.25, thresholds, 0.05, 'calibrating')).toBe('producing');
    });

    it('returns stopped for invalid power values', () => {
        expect(determineProductiveState(null, thresholds, 0.05, 'producing')).toBe('stopped');
        expect(determineProductiveState(undefined, thresholds, 0.05, 'calibrating')).toBe('stopped');
    });
});

describe('smoothValue', () => {
    it('averages the latest values up to the requested window', () => {
        expect(smoothValue([1, 2, 3, 4, 5], 3)).toBe(4);
    });

    it('averages all values when the window is larger than the array', () => {
        expect(smoothValue([1, 2, 3], 5)).toBe(2);
    });

    it('returns 0 for an empty array', () => {
        expect(smoothValue([], 5)).toBe(0);
    });

    it('returns the single value when only one value exists', () => {
        expect(smoothValue([7], 3)).toBe(7);
    });

    it('returns the last value when the window is zero or negative', () => {
        expect(smoothValue([1, 2, 3], 0)).toBe(3);
        expect(smoothValue([1, 2, 3], -1)).toBe(3);
        expect(smoothValue([], 0)).toBe(0);
    });
});

describe('getStateVisuals', () => {
    it('returns muted visuals and slower animation for stopped', () => {
        expect(getStateVisuals('stopped')).toEqual({
            primary: 'var(--color-state-stopped)',
            gradientColors: ['var(--color-state-stopped-from)', 'var(--color-state-stopped-to)'],
            glowColor: 'color-mix(in srgb, var(--color-state-stopped) 35%, transparent)',
            animationDuration: 900,
        });
    });

    it('returns transitional visuals and medium animation for calibrating', () => {
        expect(getStateVisuals('calibrating')).toEqual({
            primary: 'var(--color-state-calibrating)',
            gradientColors: ['var(--color-state-calibrating-from)', 'var(--color-state-calibrating-to)'],
            glowColor: 'color-mix(in srgb, var(--color-state-calibrating) 45%, transparent)',
            animationDuration: 550,
        });
    });

    it('returns active visuals and faster animation for producing', () => {
        expect(getStateVisuals('producing')).toEqual({
            primary: 'var(--color-state-producing)',
            gradientColors: ['var(--color-state-producing-from)', 'var(--color-state-producing-to)'],
            glowColor: 'color-mix(in srgb, var(--color-state-producing) 50%, transparent)',
            animationDuration: 350,
        });
    });
});
