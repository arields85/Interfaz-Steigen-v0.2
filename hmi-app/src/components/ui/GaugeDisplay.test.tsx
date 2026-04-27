import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import GaugeDisplay from './GaugeDisplay';

const CIRCULAR_RADIUS = 60;
const CIRCUMFERENCE = 2 * Math.PI * CIRCULAR_RADIUS;

describe('GaugeDisplay', () => {
    it('defaults to circular mode and reflects the normalized arc fill with spec animation semantics', () => {
        const { container } = render(
            <GaugeDisplay
                normalizedValue={0.75}
                color={{
                    primary: 'var(--color-accent-cyan)',
                    gradient: ['var(--color-widget-gradient-from)', 'var(--color-widget-gradient-to)'],
                }}
                animation={{
                    enabled: true,
                    intensity: 'active',
                    durationMs: 750,
                }}
            />,
        );

        const svg = screen.getByTestId('gauge-circular');
        const arc = screen.getByTestId('gauge-circular-arc');
        const gradientStops = screen.getAllByTestId('gauge-circular-gradient-stop');

        expect(svg).toBeInTheDocument();
        expect(container.firstElementChild).toBe(svg);
        expect(svg).toHaveClass('w-full', 'h-full', 'transform', '-rotate-90', 'origin-center');
        expect(svg.style.width).toBe('');
        expect(svg.style.height).toBe('');
        expect(Number(arc.getAttribute('stroke-dasharray'))).toBeCloseTo(CIRCUMFERENCE, 5);
        expect(Number(arc.getAttribute('stroke-dashoffset'))).toBeCloseTo(CIRCUMFERENCE * 0.25, 5);
        expect(gradientStops).toHaveLength(2);
        expect(gradientStops[0]).toHaveAttribute('stop-color', 'var(--color-widget-gradient-to)');
        expect(gradientStops[1]).toHaveAttribute('stop-color', 'var(--color-widget-gradient-from)');
        expect(arc).toHaveStyle({ transitionDuration: '750ms' });
        expect(svg.style.filter).toBe('');
    });

    it('renders bar mode and disables animated glow when animation is disabled', () => {
        render(
            <GaugeDisplay
                normalizedValue={0.33}
                color={{
                    primary: 'var(--color-accent-purple)',
                    gradient: ['var(--color-dynamic-normal-from)', 'var(--color-dynamic-normal-to)'],
                }}
                mode="bar"
                animation={{
                    enabled: false,
                    intensity: 'none',
                    durationMs: 900,
                }}
            />,
        );

        const track = screen.getByTestId('gauge-bar-track');
        const fill = screen.getByTestId('gauge-bar-fill');

        expect(track).toBeInTheDocument();
        expect(fill).toHaveStyle({ width: '33%' });
        expect(fill.style.background).toContain('linear-gradient');
        expect(fill.style.background).toContain('var(--color-dynamic-normal-from)');
        expect(fill.style.background).toContain('var(--color-dynamic-normal-to)');
        expect(fill).toHaveStyle({ transitionDuration: '0ms' });
        expect(fill.style.boxShadow).toBe('');
    });

    it('clamps edge-case normalized values and supports preset sizes', () => {
        const { rerender } = render(
            <GaugeDisplay
                normalizedValue={0}
                color={{
                    primary: 'var(--color-accent-cyan)',
                    gradient: ['var(--color-widget-gradient-from)', 'var(--color-widget-gradient-to)'],
                }}
                mode="circular"
                size="lg"
            />,
        );

        let arc = screen.getByTestId('gauge-circular-arc');
        let svg = screen.getByTestId('gauge-circular');
        expect(Number(arc.getAttribute('stroke-dashoffset'))).toBeGreaterThan(CIRCUMFERENCE);
        expect(svg).toHaveAttribute('viewBox', '-10 -10 160 160');
        expect(svg).toHaveClass('w-full', 'h-full');

        rerender(
            <GaugeDisplay
                normalizedValue={1}
                color={{
                    primary: 'var(--color-accent-cyan)',
                    gradient: ['var(--color-widget-gradient-from)', 'var(--color-widget-gradient-to)'],
                }}
                mode="circular"
            />,
        );

        arc = screen.getByTestId('gauge-circular-arc');
        expect(Number(arc.getAttribute('stroke-dashoffset'))).toBeCloseTo(0, 5);

        rerender(
            <GaugeDisplay
                normalizedValue={1.5}
                color={{
                    primary: 'var(--color-accent-cyan)',
                    gradient: ['var(--color-widget-gradient-from)', 'var(--color-widget-gradient-to)'],
                }}
                mode="bar"
                size="sm"
            />,
        );

        expect(screen.getByTestId('gauge-bar-track')).toHaveStyle({ height: '6px' });
        expect(screen.getByTestId('gauge-bar-fill')).toHaveStyle({ width: '100%' });
    });

    it('renders optional circular center content inside the svg so it scales with the gauge', () => {
        render(
            <GaugeDisplay
                normalizedValue={0.5}
                color={{
                    primary: 'var(--color-accent-cyan)',
                    gradient: ['var(--color-widget-gradient-from)', 'var(--color-widget-gradient-to)'],
                }}
                circularContent={({ center }) => (
                    <text x={center} y={center} textAnchor="middle">
                        50
                    </text>
                )}
            />,
        );

        const svg = screen.getByTestId('gauge-circular');
        const centerContent = screen.getByTestId('gauge-circular-center-content');

        expect(centerContent.tagName.toLowerCase()).toBe('g');
        expect(centerContent).toHaveAttribute('transform', 'rotate(90 70 70)');
        expect(svg).toContainElement(centerContent);
        expect(screen.getByText('50').tagName.toLowerCase()).toBe('text');
    });
});
