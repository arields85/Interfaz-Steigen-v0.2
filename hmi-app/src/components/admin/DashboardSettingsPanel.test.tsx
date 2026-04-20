import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DashboardSettingsPanel from './DashboardSettingsPanel';

describe('DashboardSettingsPanel', () => {
    it('forwards aspect and cols changes and rejects rows outside the supported range', async () => {
        const user = userEvent.setup();
        const onAspectChange = vi.fn();
        const onColsChange = vi.fn();
        const onRowsChange = vi.fn();

        render(
            <DashboardSettingsPanel
                aspect="16:9"
                cols={20}
                rows={12}
                onAspectChange={onAspectChange}
                onColsChange={onColsChange}
                onRowsChange={onRowsChange}
            />,
        );

        await user.click(screen.getByRole('radio', { name: '21:9' }));

        expect(onAspectChange).toHaveBeenCalledWith('21:9');

        const colsInput = screen.getByRole('textbox', { name: 'COLUMNAS' });
        await user.clear(colsInput);
        await user.type(colsInput, '24{enter}');

        expect(onColsChange).toHaveBeenCalledWith(24);

        const rowsInput = screen.getByRole('textbox', { name: 'Filas' });
        await user.clear(rowsInput);
        await user.type(rowsInput, '3{enter}');

        expect(onRowsChange).not.toHaveBeenCalled();
        expect(screen.getByRole('alert')).toHaveTextContent('Ingresá un valor entero entre 4 y 24.');
    });
});
