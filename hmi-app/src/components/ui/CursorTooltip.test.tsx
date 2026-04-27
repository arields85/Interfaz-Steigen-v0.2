import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CursorTooltip from './CursorTooltip';

describe('CursorTooltip', () => {
    it('renders the label at the provided cursor coordinates with shared tooltip tokens', () => {
        render(<CursorTooltip label="5 × 3" x={420} y={225} data-testid="cursor-tooltip" />);

        const tooltip = screen.getByTestId('cursor-tooltip');

        expect(tooltip).toHaveTextContent('5 × 3');
        expect(tooltip).toHaveClass(
            'pointer-events-none',
            'fixed',
            'rounded',
            'border',
            'border-white',
            'bg-industrial-surface/90',
            'px-2',
            'py-1',
            'text-white',
            'whitespace-nowrap',
        );
        expect(tooltip).toHaveStyle({ left: '420px', top: '225px' });
    });

    it.each([
        ['se', 'translate(12px, 12px)'],
        ['ne', 'translate(12px, calc(-100% - 12px))'],
        ['nw', 'translate(calc(-100% - 12px), calc(-100% - 12px))'],
        ['sw', 'translate(calc(-100% - 12px), 12px)'],
    ] as const)('uses the correct transform for the %s anchor', (anchor, expectedTransform) => {
        render(
            <CursorTooltip
                label={`Anchor ${anchor}`}
                x={300}
                y={150}
                anchor={anchor}
                data-testid={`cursor-tooltip-${anchor}`}
            />,
        );

        expect(screen.getByTestId(`cursor-tooltip-${anchor}`)).toHaveStyle({ transform: expectedTransform });
    });
});
