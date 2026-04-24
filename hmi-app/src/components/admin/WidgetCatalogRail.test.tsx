import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import WidgetCatalogRail from './WidgetCatalogRail';

describe('WidgetCatalogRail', () => {
    it('shows and dispatches the machine-activity catalog entry', async () => {
        const user = userEvent.setup();
        const onAddWidget = vi.fn();

        render(<WidgetCatalogRail onAddWidget={onAddWidget} />);

        const button = screen.getByTitle('Actividad de Máquina');
        expect(button).toBeInTheDocument();

        await user.click(button);

        expect(onAddWidget).toHaveBeenCalledWith('machine-activity');
    });
});
