import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import WidgetCatalogRail from './WidgetCatalogRail';

describe('WidgetCatalogRail', () => {
    it('shows a custom tooltip for the machine-activity catalog entry and dispatches on click', async () => {
        const user = userEvent.setup();
        const onAddWidget = vi.fn();

        render(<WidgetCatalogRail onAddWidget={onAddWidget} />);

        const button = screen.getByRole('button', { name: 'Actividad de Máquina' });
        expect(button).toBeInTheDocument();
        expect(button).not.toHaveAttribute('title');

        fireEvent.mouseEnter(button);
        expect(screen.getByText('Actividad de Máquina')).toBeInTheDocument();

        await user.click(button);

        expect(onAddWidget).toHaveBeenCalledWith('machine-activity');
    });
});
