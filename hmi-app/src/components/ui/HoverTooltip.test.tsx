import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HoverTooltip from './HoverTooltip';

describe('HoverTooltip', () => {
    it('renders the tooltip on hover with the shared fixed-position tokens', () => {
        render(
            <HoverTooltip label="Duplicar widget" position="bottom">
                <button type="button">Duplicar</button>
            </HoverTooltip>,
        );

        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

        const trigger = screen.getByRole('button', { name: 'Duplicar' });
        vi.spyOn(trigger.parentElement as HTMLDivElement, 'getBoundingClientRect').mockReturnValue({
            x: 100,
            y: 200,
            width: 48,
            height: 24,
            top: 200,
            right: 148,
            bottom: 224,
            left: 100,
            toJSON: () => ({}),
        });

        fireEvent.mouseEnter(trigger);

        const tooltip = screen.getByRole('tooltip');

        expect(tooltip).toBeInTheDocument();
        expect(tooltip).toHaveClass(
            'pointer-events-none',
            'fixed',
            'z-50',
            'rounded',
            'border',
            'border-white',
            'bg-industrial-surface/90',
            'px-2',
            'py-1',
            'text-xs',
            'text-white',
            'whitespace-nowrap',
        );
        expect(tooltip).toHaveStyle({ top: '230px', left: '124px' });
    });

    it.each([
        ['top', { top: '194px', left: '124px', transform: 'translate(-50%, -100%)' }],
        ['bottom', { top: '230px', left: '124px', transform: 'translate(-50%, 0)' }],
        ['left', { top: '212px', left: '94px', transform: 'translate(-100%, -50%)' }],
        ['right', { top: '212px', left: '154px', transform: 'translate(0, -50%)' }],
    ] as const)('positions the tooltip correctly for %s', (position, expectedStyles) => {
        render(
            <HoverTooltip label={`Tooltip ${position}`} position={position}>
                <button type="button">Trigger {position}</button>
            </HoverTooltip>,
        );

        const trigger = screen.getByRole('button', { name: `Trigger ${position}` });
        vi.spyOn(trigger.parentElement as HTMLDivElement, 'getBoundingClientRect').mockReturnValue({
            x: 100,
            y: 200,
            width: 48,
            height: 24,
            top: 200,
            right: 148,
            bottom: 224,
            left: 100,
            toJSON: () => ({}),
        });

        fireEvent.mouseEnter(trigger);

        expect(screen.getByRole('tooltip')).toHaveStyle(expectedStyles);
    });

    it('hides the tooltip when the pointer leaves the trigger', () => {
        render(
            <HoverTooltip label="Eliminar" position="right">
                <button type="button">Eliminar</button>
            </HoverTooltip>,
        );

        const trigger = screen.getByRole('button', { name: 'Eliminar' });
        vi.spyOn(trigger.parentElement as HTMLDivElement, 'getBoundingClientRect').mockReturnValue({
            x: 20,
            y: 30,
            width: 40,
            height: 20,
            top: 30,
            right: 60,
            bottom: 50,
            left: 20,
            toJSON: () => ({}),
        });

        fireEvent.mouseEnter(trigger);
        expect(screen.getByRole('tooltip')).toBeInTheDocument();

        fireEvent.mouseLeave(trigger);
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
});
