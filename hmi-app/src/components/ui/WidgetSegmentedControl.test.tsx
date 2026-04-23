import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WidgetSegmentedControl from './WidgetSegmentedControl';

describe('WidgetSegmentedControl', () => {
    it('renders the full overlay structure and marks the active option as pressed', () => {
        const handleChange = vi.fn();

        const { container } = render(
            <WidgetSegmentedControl
                options={[
                    { value: 'hour', label: 'Hora' },
                    { value: 'day', label: 'Día' },
                ]}
                value="hour"
                onChange={handleChange}
            >
                <button type="button">OEE</button>
            </WidgetSegmentedControl>,
        );

        expect(container.firstChild).toHaveClass('absolute', 'right-5', 'top-5', 'z-10', 'flex', 'flex-col', 'items-end', 'gap-2');
        expect(screen.getByRole('button', { name: 'Hora' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'Día' })).toHaveAttribute('aria-pressed', 'false');
        expect(screen.getByRole('button', { name: 'OEE' })).toBeInTheDocument();
    });

    it('calls onChange with the selected option value', () => {
        const handleChange = vi.fn();

        render(
            <WidgetSegmentedControl
                options={[
                    { value: 'hour', label: 'Hora' },
                    { value: 'day', label: 'Día' },
                ]}
                value="hour"
                onChange={handleChange}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Día' }));

        expect(handleChange).toHaveBeenCalledWith('day');
    });
});
