import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DesignSettingsTab from './DesignSettingsTab';

function getTypographyGroup(label: string) {
    const heading = screen.getByText(label);
    const group = heading.closest('div');

    if (!group) {
        throw new Error(`No se encontro el grupo para ${label}`);
    }

    return group;
}

describe('DesignSettingsTab typography controls', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.removeAttribute('style');
    });

    it('renames typography groups, removes descriptions, and persists size/tracking controls for the system font', () => {
        render(<DesignSettingsTab />);

        const systemGroup = getTypographyGroup('TEXTOS EN GENERAL');
        const sizeInput = within(systemGroup).getByLabelText('TEXTOS EN GENERAL tamano base');
        const trackingInput = within(systemGroup).getByLabelText('TEXTOS EN GENERAL tracking');

        expect(screen.getByText('TEXTOS TÉCNICOS (IDs, conteos, valores)')).toBeInTheDocument();
        expect(screen.getByText('TEXTOS WIDGET GRÁFICOS (Ejes, labels de charts)')).toBeInTheDocument();
        expect(screen.getByText('TÍTULOS DE DASHBOARD')).toBeInTheDocument();
        expect(screen.getByText('VALORES NUMERICOS MOSTRADOS POR WIDGET')).toBeInTheDocument();

        expect(screen.queryByText('Textos, titulos, UI')).not.toBeInTheDocument();
        expect(screen.queryByText('Codigo, URLs, valores')).not.toBeInTheDocument();
        expect(screen.queryByText('Ejes, labels de charts')).not.toBeInTheDocument();
        expect(screen.queryByText('Titulo principal de cada dashboard')).not.toBeInTheDocument();
        expect(screen.queryByText('Valor numerico en KPI y Metric Card')).not.toBeInTheDocument();

        expect(sizeInput).toHaveValue('12');
        expect(trackingInput).toHaveValue('0');

        fireEvent.change(sizeInput, { target: { value: '14' } });
        fireEvent.change(trackingInput, { target: { value: '0.6' } });

        expect(document.documentElement.style.getPropertyValue('--font-size-system')).toBe('14px');
        expect(document.documentElement.style.getPropertyValue('--tracking-system')).toBe('0.6px');
        expect(JSON.parse(localStorage.getItem('hmi-theme-fonts') ?? '{}')).toMatchObject({
            '--font-size-system': '14px',
            '--tracking-system': '0.6px',
        });
    });

    it('adds size and tracking controls for the mono font and persists the CSS variables', () => {
        render(<DesignSettingsTab />);

        const monoGroup = getTypographyGroup('TEXTOS TÉCNICOS (IDs, conteos, valores)');
        const sizeInput = within(monoGroup).getByLabelText('TEXTOS TÉCNICOS (IDs, conteos, valores) tamano base');
        const trackingInput = within(monoGroup).getByLabelText('TEXTOS TÉCNICOS (IDs, conteos, valores) tracking');

        expect(sizeInput).toHaveValue('12');
        expect(trackingInput).toHaveValue('0');

        fireEvent.change(sizeInput, { target: { value: '13' } });
        fireEvent.change(trackingInput, { target: { value: '0.8' } });

        expect(document.documentElement.style.getPropertyValue('--font-size-mono')).toBe('13px');
        expect(document.documentElement.style.getPropertyValue('--tracking-mono')).toBe('0.8px');
        expect(JSON.parse(localStorage.getItem('hmi-theme-fonts') ?? '{}')).toMatchObject({
            '--font-size-mono': '13px',
            '--tracking-mono': '0.8px',
        });
    });

    it('persists dashboard title size and tracking overrides', () => {
        render(<DesignSettingsTab />);

        const titleGroup = getTypographyGroup('TÍTULOS DE DASHBOARD');
        const sizeInput = within(titleGroup).getByLabelText('TÍTULOS DE DASHBOARD tamano base');
        const trackingInput = within(titleGroup).getByLabelText('TÍTULOS DE DASHBOARD tracking');

        fireEvent.change(sizeInput, { target: { value: '52' } });
        fireEvent.change(trackingInput, { target: { value: '1.5' } });

        expect(document.documentElement.style.getPropertyValue('--font-size-dashboard-title')).toBe('52px');
        expect(document.documentElement.style.getPropertyValue('--tracking-dashboard-title')).toBe('1.5px');
        expect(JSON.parse(localStorage.getItem('hmi-theme-fonts') ?? '{}')).toMatchObject({
            '--font-size-dashboard-title': '52px',
            '--tracking-dashboard-title': '1.5px',
        });
    });

    it('filters the weight dropdown for all five typography selectors', async () => {
        const user = userEvent.setup();

        render(<DesignSettingsTab />);

        const groups = [
            'TEXTOS EN GENERAL',
            'TEXTOS TÉCNICOS (IDs, conteos, valores)',
            'TEXTOS WIDGET GRÁFICOS (Ejes, labels de charts)',
            'TÍTULOS DE DASHBOARD',
            'VALORES NUMERICOS MOSTRADOS POR WIDGET',
        ] as const;

        for (const label of groups) {
            const group = getTypographyGroup(label);
            const [fontSelect, weightSelect] = within(group).getAllByRole('combobox');

            await user.selectOptions(fontSelect, 'Poppins');

            const weightOptions = within(weightSelect).getAllByRole('option');
            expect(weightOptions).toHaveLength(1);
            expect(weightOptions[0]).toHaveValue('300');
            expect(weightSelect).toHaveValue('300');
        }
    });

    it('auto-picks the nearest supported weight when a typography family changes', async () => {
        const user = userEvent.setup();

        render(<DesignSettingsTab />);

        const titleGroup = getTypographyGroup('TÍTULOS DE DASHBOARD');
        const [fontSelect, weightSelect] = within(titleGroup).getAllByRole('combobox');

        expect(weightSelect).toHaveValue('800');

        await user.selectOptions(fontSelect, 'AtkinsonHyperlegible');

        const weightOptions = within(weightSelect).getAllByRole('option');
        expect(weightOptions).toHaveLength(2);
        expect(weightOptions.map((option) => option.getAttribute('value'))).toEqual(['400', '700']);
        expect(weightSelect).toHaveValue('700');
        expect(document.documentElement.style.getPropertyValue('--font-weight-dashboard-title')).toBe('700');
    });

    it('expands typography size ranges for body, titles, and widget values', () => {
        render(<DesignSettingsTab />);

        expect(within(getTypographyGroup('TEXTOS EN GENERAL')).getByLabelText('TEXTOS EN GENERAL tamano base')).toHaveValue('12');
        expect(within(getTypographyGroup('TÍTULOS DE DASHBOARD')).getByLabelText('TÍTULOS DE DASHBOARD tamano base')).toHaveValue('48');
        expect(within(getTypographyGroup('VALORES NUMERICOS MOSTRADOS POR WIDGET')).getByLabelText('VALORES NUMERICOS MOSTRADOS POR WIDGET tamano base')).toHaveValue('60');
        expect(screen.getByLabelText('METRIC-CARD tamaño de las unidades')).toHaveValue('20');
        expect(screen.getByLabelText('VALORES EN KPI / MACHINE-ACTIVITY tamano base')).toHaveValue('60');
        expect(screen.getByLabelText('VALORES EN KPI / MACHINE-ACTIVITY tracking')).toHaveValue('0');
        expect(screen.getAllByRole('combobox')).toHaveLength(12);
        expect(screen.getByLabelText('VALORES EN KPI / MACHINE-ACTIVITY tamaño de las unidades')).toHaveValue('20');

        fireEvent.change(within(getTypographyGroup('TEXTOS EN GENERAL')).getByLabelText('TEXTOS EN GENERAL tamano base'), { target: { value: '20' } });
        fireEvent.change(within(getTypographyGroup('TÍTULOS DE DASHBOARD')).getByLabelText('TÍTULOS DE DASHBOARD tamano base'), { target: { value: '10' } });
        fireEvent.change(within(getTypographyGroup('VALORES NUMERICOS MOSTRADOS POR WIDGET')).getByLabelText('VALORES NUMERICOS MOSTRADOS POR WIDGET tamano base'), { target: { value: '72' } });
        fireEvent.change(screen.getByLabelText('METRIC-CARD tamaño de las unidades'), { target: { value: '24' } });
        fireEvent.change(screen.getByLabelText('VALORES EN KPI / MACHINE-ACTIVITY tamano base'), { target: { value: '68' } });
        fireEvent.change(screen.getByLabelText('VALORES EN KPI / MACHINE-ACTIVITY tracking'), { target: { value: '1.2' } });
        fireEvent.change(screen.getByLabelText('VALORES EN KPI / MACHINE-ACTIVITY tamaño de las unidades'), { target: { value: '28' } });

        expect(document.documentElement.style.getPropertyValue('--font-size-system')).toBe('20px');
        expect(document.documentElement.style.getPropertyValue('--font-size-dashboard-title')).toBe('10px');
        expect(document.documentElement.style.getPropertyValue('--font-size-widget-value')).toBe('72px');
        expect(document.documentElement.style.getPropertyValue('--font-size-widget-unit')).toBe('24px');
        expect(document.documentElement.style.getPropertyValue('--font-size-widget-value-gauge')).toBe('68px');
        expect(document.documentElement.style.getPropertyValue('--tracking-widget-value-gauge')).toBe('1.2px');
        expect(document.documentElement.style.getPropertyValue('--font-size-widget-unit-gauge')).toBe('28px');
    });

    it('wraps the KPI and machine-activity controls without horizontal overflow', () => {
        render(<DesignSettingsTab />);

        const gaugeSizeRow = screen.getByLabelText('VALORES EN KPI / MACHINE-ACTIVITY tamano base').parentElement?.parentElement;
        const gaugeUnitRow = screen.getByLabelText('VALORES EN KPI / MACHINE-ACTIVITY tamaño de las unidades').parentElement?.parentElement;

        expect(gaugeSizeRow).toHaveClass('flex-wrap', 'overflow-hidden');
        expect(gaugeSizeRow).not.toHaveClass('flex-nowrap', 'overflow-x-auto');
        expect(gaugeUnitRow).toHaveClass('flex-wrap', 'overflow-hidden');
        expect(gaugeUnitRow).not.toHaveClass('flex-nowrap', 'overflow-x-auto');
    });
});
