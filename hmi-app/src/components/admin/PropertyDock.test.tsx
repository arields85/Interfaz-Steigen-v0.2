import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { WidgetConfig, WidgetLayout } from '../../domain/admin.types';
import type { ContractMachine } from '../../domain/dataContract.types';
import PropertyDock from './PropertyDock';

vi.mock('../ui/AnchoredOverlay', () => ({
    default: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) => (isOpen ? <div>{children}</div> : null),
}));

const MACHINES: ContractMachine[] = [
    {
        unitId: 101,
        name: 'Extrusora 101',
        status: 'online',
        lastSuccess: '2026-04-21T13:00:00.000Z',
        ageMs: 0,
        values: {
            temp: { value: 42, unit: '°C', timestamp: null },
            pressure: { value: 8, unit: 'bar', timestamp: null },
        },
    },
    {
        unitId: 202,
        name: 'Mezcladora 202',
        status: 'online',
        lastSuccess: '2026-04-21T13:00:00.000Z',
        ageMs: 0,
        values: {
            flow: { value: 120, unit: 'L/min', timestamp: null },
        },
    },
];

const DEFAULT_LAYOUT: WidgetLayout = {
    widgetId: 'widget-1',
    x: 0,
    y: 0,
    w: 4,
    h: 3,
};

function makeWidget(binding: WidgetConfig['binding'] = { mode: 'real_variable' }): WidgetConfig {
    return {
        id: 'widget-1',
        type: 'kpi',
        title: 'Temperatura',
        position: { x: 0, y: 0 },
        size: { w: 4, h: 3 },
        binding,
        thresholds: [],
        displayOptions: {},
    };
}

function renderPropertyDock(options?: {
    binding?: WidgetConfig['binding'];
    type?: WidgetConfig['type'];
    title?: string;
    displayOptions?: WidgetConfig['displayOptions'];
    machines?: ContractMachine[];
    dataLoading?: boolean;
    dataError?: boolean;
    dataEnabled?: boolean;
}) {
    const updates: WidgetConfig[] = [];

    function Harness() {
        const [widget, setWidget] = useState<WidgetConfig>({
            ...makeWidget(options?.binding),
            type: options?.type ?? 'kpi',
            title: options?.title ?? 'Temperatura',
            displayOptions: options?.displayOptions ?? {},
        });

        return (
            <PropertyDock
                selectedWidget={widget}
                selectedLayout={DEFAULT_LAYOUT}
                equipmentMap={new Map()}
                catalogVariables={[]}
                usedCatalogVariableIds={[]}
                machines={options?.machines ?? MACHINES}
                dataLoading={options?.dataLoading}
                dataError={options?.dataError}
                dataEnabled={options?.dataEnabled ?? true}
                onCreateVariable={vi.fn()}
                onDeleteVariable={vi.fn()}
                onUpdateWidget={(nextWidget) => {
                    updates.push(nextWidget);
                    setWidget(nextWidget);
                }}
                onUpdateLayout={vi.fn()}
                onDelete={vi.fn()}
                onDuplicate={vi.fn()}
                onDeselect={vi.fn()}
            />
        );
    }

    return {
        user: userEvent.setup(),
        updates,
        ...render(<Harness />),
    };
}

function getFieldButton(label: string) {
    const row = screen.getByText(label).closest('div');

    if (!row) {
        throw new Error(`No se encontró la fila ${label}`);
    }

    return within(row).getByRole('button');
}

function getSection(title: string) {
    const sectionHeader = screen.getByRole('button', { name: new RegExp(title, 'i') });
    const section = sectionHeader.closest('section');

    if (!section) {
        throw new Error(`No se encontró la sección ${title}`);
    }

    return section;
}

function getFieldButtonInSection(sectionTitle: string, label: string) {
    const section = getSection(sectionTitle);
    const row = within(section).getByText(label).closest('div');

    if (!row) {
        throw new Error(`No se encontró la fila ${label} en ${sectionTitle}`);
    }

    return within(row).getByRole('button');
}

function getInputInSection(sectionTitle: string, label: string) {
    const section = getSection(sectionTitle);
    const row = within(section).getByText(label).closest('div');

    if (!row) {
        throw new Error(`No se encontró la fila ${label} en ${sectionTitle}`);
    }

    const input = within(row).queryByRole('textbox');

    if (!input) {
        throw new Error(`No se encontró el input ${label} en ${sectionTitle}`);
    }

    return input;
}

describe('PropertyDock Node-RED binding', () => {
    it('renders Node-RED machine names when machines are available', async () => {
        const { user } = renderPropertyDock();

        await user.click(getFieldButton('Equipo'));

        expect(screen.getByRole('button', { name: 'Extrusora 101' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Mezcladora 202' })).toBeInTheDocument();
    });

    it('shows variables from machine.variables when a machine is selected', async () => {
        const { user } = renderPropertyDock();

        await user.click(getFieldButton('Equipo'));
        await user.click(screen.getByRole('button', { name: 'Extrusora 101' }));
        await user.click(getFieldButton('Variable'));

        expect(screen.getByRole('button', { name: 'temp (°C)' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'pressure (bar)' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '0' })).not.toBeInTheDocument();
    });

    it('resets variableKey when the selected machine changes to one that does not contain it', async () => {
        const { user, updates } = renderPropertyDock({
            binding: {
                mode: 'real_variable',
                machineId: 101,
                variableKey: 'temp',
                bindingVersion: 'node-red-v1',
            },
        });

        await user.click(getFieldButton('Equipo'));
        await user.click(screen.getByRole('button', { name: 'Mezcladora 202' }));

        expect(updates.at(-1)?.binding).toMatchObject({
            machineId: 202,
            bindingVersion: 'node-red-v1',
        });
        expect(updates.at(-1)?.binding?.variableKey).toBeUndefined();
        expect(getFieldButton('Variable')).toHaveTextContent('Seleccione...');
    });

    it('persists machineId, variableKey and bindingVersion when saving a Node-RED binding', async () => {
        const { user, updates } = renderPropertyDock();

        await user.click(getFieldButton('Equipo'));
        await user.click(screen.getByRole('button', { name: 'Mezcladora 202' }));
        await user.click(getFieldButton('Variable'));
        await user.click(screen.getByRole('button', { name: 'flow (L/min)' }));

        expect(updates.at(-1)?.binding).toMatchObject({
            machineId: 202,
            variableKey: 'flow',
            bindingVersion: 'node-red-v1',
        });
        expect(typeof updates.at(-1)?.binding?.machineId).toBe('number');
    });

    it('shows a loading state while Node-RED machines are loading', () => {
        renderPropertyDock({ machines: [], dataLoading: true });

        expect(screen.getAllByText('Cargando equipos...')).not.toHaveLength(0);
    });

    it('shows an error state when Node-RED loading fails', () => {
        renderPropertyDock({ machines: [], dataError: true });

        expect(screen.getAllByText('Error cargando equipos')).not.toHaveLength(0);
    });

    it('shows a not configured state when Node-RED is disabled', () => {
        renderPropertyDock({ machines: [], dataEnabled: false });

        expect(screen.getAllByText('No configurado')).not.toHaveLength(0);
    });

    it('shows an empty machine selector when Node-RED is enabled but the overview has no machines', () => {
        renderPropertyDock({ machines: [], dataEnabled: true });

        expect(getFieldButton('Equipo')).toHaveTextContent('Sin equipos');
        expect(getFieldButton('Equipo')).toBeDisabled();
        expect(getFieldButton('Variable')).toHaveTextContent('Sin variables');
        expect(getFieldButton('Variable')).toBeDisabled();
    });

    it('renders connection-status data source controls with merged origin and without generic binding fields', async () => {
        const { user } = renderPropertyDock({
            type: 'connection-status',
            title: 'Estado Conexión',
            binding: {
                mode: 'simulated_value',
                simulatedValue: 'online',
            },
            displayOptions: {
                scope: 'global',
                showLastUpdate: true,
            },
        });

        expect(screen.getByText('Datos')).toBeInTheDocument();
        expect(screen.getByText('Origen')).toBeInTheDocument();
        expect(screen.getByText('Valor')).toBeInTheDocument();
        expect(screen.getByText('Mostrar Tiempo')).toBeInTheDocument();
        expect(screen.queryByText('Unidad')).not.toBeInTheDocument();
        expect(screen.queryByText('Fuente')).not.toBeInTheDocument();
        expect(screen.queryByText('Variable')).not.toBeInTheDocument();
        expect(screen.queryByText('Operación')).not.toBeInTheDocument();
        expect(screen.queryByText('Alcance')).not.toBeInTheDocument();

        await user.click(getFieldButton('Origen'));

        expect(screen.getAllByRole('button', { name: 'Simulado' })).not.toHaveLength(0);
        expect(screen.getByRole('button', { name: 'Global' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Por Máquina' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Variable Real' })).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /textos/i }));

        expect(screen.getAllByText('Online')).not.toHaveLength(0);
        expect(screen.getAllByText('Degradado')).not.toHaveLength(0);
        expect(screen.getAllByText('Offline')).not.toHaveLength(0);
        expect(screen.getAllByText('Unknown')).not.toHaveLength(0);
        expect(screen.queryByText('Equipo')).not.toBeInTheDocument();
    });

    it('updates connection-status merged origin, machine and texts from the custom dock section', async () => {
        const { user, updates } = renderPropertyDock({
            type: 'connection-status',
            title: 'Estado Conexión',
            displayOptions: {
                scope: 'global',
                showLastUpdate: true,
            },
        });

        await user.click(getFieldButton('Origen'));
        await user.click(screen.getByRole('button', { name: 'Por Máquina' }));

        expect(updates.at(-1)?.binding).toMatchObject({
            mode: 'real_variable',
        });
        expect(updates.at(-1)?.displayOptions).toMatchObject({
            scope: 'machine',
            showLastUpdate: true,
        });

        await user.click(getFieldButtonInSection('Datos', 'Equipo'));
        await user.click(screen.getByRole('button', { name: 'Mezcladora 202' }));

        expect(updates.at(-1)?.displayOptions).toMatchObject({
            scope: 'machine',
            machineId: 202,
            showLastUpdate: true,
        });

        await user.click(getFieldButton('Origen'));
        await user.click(screen.getByRole('button', { name: 'Global' }));

        expect(updates.at(-1)?.binding).toMatchObject({
            mode: 'real_variable',
        });
        expect(updates.at(-1)?.displayOptions).toMatchObject({
            scope: 'global',
            showLastUpdate: true,
        });
        expect(updates.at(-1)?.displayOptions).not.toHaveProperty('machineId');

        await user.click(getFieldButton('Origen'));
        await user.click(screen.getByRole('button', { name: 'Simulado' }));

        expect(updates.at(-1)?.binding).toMatchObject({
            mode: 'simulated_value',
        });

        await user.click(screen.getByRole('button', { name: /textos/i }));

        const onlineInput = screen.getByPlaceholderText('Online');
        await user.clear(onlineInput);
        await user.type(onlineInput, 'Operativa');

        expect(updates.at(-1)?.displayOptions).toMatchObject({
            scope: 'global',
            onlineText: 'Operativa',
        });
    });

    it('updates connection-status simulated value from the data section', async () => {
        const { user, updates } = renderPropertyDock({
            type: 'connection-status',
            title: 'Indicador Conexión',
            binding: {
                mode: 'simulated_value',
                simulatedValue: 'online',
            },
            displayOptions: {
                scope: 'global',
                showLastUpdate: true,
            },
        });

        await user.click(getFieldButton('Valor'));
        await user.click(screen.getByRole('button', { name: 'Degradado' }));

        expect(updates.at(-1)?.binding).toMatchObject({
            mode: 'simulated_value',
            simulatedValue: 'degradado',
        });

        await user.click(getFieldButton('Origen'));
        await user.click(screen.getByRole('button', { name: 'Por Máquina' }));

        expect(updates.at(-1)?.binding).toMatchObject({
            mode: 'real_variable',
        });
        expect(screen.getByText('Equipo')).toBeInTheDocument();
        expect(screen.queryByText('Variable')).not.toBeInTheDocument();
    });

    it('toggles connection-status showLastUpdate from the data section', async () => {
        const { user, updates } = renderPropertyDock({
            type: 'connection-status',
            title: 'Estado Conexión',
            displayOptions: {
                scope: 'global',
                showLastUpdate: true,
            },
        });

        const toggle = screen.getByLabelText('Mostrar Tiempo');

        expect(toggle).toBeChecked();

        await user.click(toggle);

        expect(updates.at(-1)?.displayOptions).toMatchObject({
            scope: 'global',
            showLastUpdate: false,
        });

        await user.click(toggle);

        expect(updates.at(-1)?.displayOptions).toMatchObject({
            scope: 'global',
            showLastUpdate: true,
        });
    });
});

describe('PropertyDock machine-activity', () => {
    it('renders machine-activity sections with KPI-like general/data controls and default values', () => {
        renderPropertyDock({
            type: 'machine-activity',
            title: 'Actividad de Máquina',
            binding: {
                mode: 'real_variable',
                unit: 'kW',
            },
        });

        expect(screen.getByRole('button', { name: /general/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /datos/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /escala visual/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /estados productivos/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /visualización/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /textos/i })).toBeInTheDocument();

        const sectionButtons = screen.getAllByRole('button').map((button) => button.textContent ?? '');
        const dataIndex = sectionButtons.findIndex((text) => /datos/i.test(text));
        const scaleIndex = sectionButtons.findIndex((text) => /escala visual/i.test(text));
        const productiveStatesIndex = sectionButtons.findIndex((text) => /estados productivos/i.test(text));

        expect(dataIndex).toBeGreaterThanOrEqual(0);
        expect(scaleIndex).toBeGreaterThan(dataIndex);
        expect(productiveStatesIndex).toBeGreaterThan(scaleIndex);

        expect(screen.getByDisplayValue('Actividad de Máquina')).toBeInTheDocument();
        expect(getFieldButtonInSection('General', 'Ícono')).toHaveTextContent('(Ícono pendiente)');
        expect(getFieldButtonInSection('General', 'Estilo')).toHaveTextContent('Radial');

        expect(getFieldButtonInSection('Datos', 'Origen')).toHaveTextContent('Variable Real');
        expect(getFieldButtonInSection('Datos', 'Equipo')).toHaveTextContent('Seleccione...');
        expect(getFieldButtonInSection('Datos', 'Variable')).toHaveTextContent('Seleccione...');
        expect(screen.getByLabelText('Unidad custom')).toBeChecked();
        expect(getFieldButtonInSection('Datos', 'Unidad')).toHaveTextContent('%');

        const productiveStatesSection = getSection('Estados Productivos');
        expect(within(productiveStatesSection).getByText('Calib. ≥')).toBeInTheDocument();
        expect(within(productiveStatesSection).getByText('Prod. ≥')).toBeInTheDocument();
        expect(within(productiveStatesSection).getByText('Conf. (ms)')).toBeInTheDocument();
        expect(within(productiveStatesSection).getByDisplayValue('0.15')).toBeInTheDocument();
        expect(within(productiveStatesSection).getByDisplayValue('0.25')).toBeInTheDocument();
        expect(within(productiveStatesSection).getByDisplayValue('0.05')).toBeInTheDocument();
        expect(within(productiveStatesSection).getByDisplayValue('2000')).toBeInTheDocument();
        expect(within(productiveStatesSection).getByDisplayValue('5')).toBeInTheDocument();

        const visualScaleSection = getSection('Escala Visual');
        expect(within(visualScaleSection).getByText('kW mín')).toBeInTheDocument();
        expect(within(visualScaleSection).getByText('kW máx')).toBeInTheDocument();
        expect(within(visualScaleSection).getByDisplayValue('0')).toBeInTheDocument();
        expect(within(visualScaleSection).getByDisplayValue('1')).toBeInTheDocument();

        expect(screen.getByLabelText('Mostrar subtítulo de estado')).toBeChecked();
        expect(screen.getByLabelText('Mostrar variable en subtexto')).toBeChecked();
        expect(screen.getByLabelText('Color dinámico por estado')).toBeChecked();
        expect(screen.getByLabelText('Animación por estado')).toBeChecked();

        const textsSection = getSection('Textos');
        expect(within(textsSection).getByDisplayValue('Detenida')).toBeInTheDocument();
        expect(within(textsSection).getByDisplayValue('Calibrando')).toBeInTheDocument();
        expect(within(textsSection).getByDisplayValue('Produciendo')).toBeInTheDocument();
    });

    it('updates machine-activity display options from the custom property sections', async () => {
        const { user, updates } = renderPropertyDock({
            type: 'machine-activity',
            title: 'Actividad de Máquina',
            binding: {
                mode: 'real_variable',
                unit: 'kW',
            },
        });

        await user.click(getFieldButtonInSection('General', 'Estilo'));
        await user.click(screen.getByRole('button', { name: 'Barra' }));

        expect(updates.at(-1)?.displayOptions).toMatchObject({
            kpiMode: 'bar',
        });

        const productiveStatesSection = getSection('Estados Productivos');
        const confirmationInput = within(productiveStatesSection).getByDisplayValue('2000');
        await user.clear(confirmationInput);
        await user.type(confirmationInput, '3500');
        await user.tab();

        expect(updates.at(-1)?.displayOptions).toMatchObject({
            confirmationTime: 3500,
        });

        const subtitleToggle = screen.getByLabelText('Mostrar subtítulo de estado');
        await user.click(subtitleToggle);

        expect(updates.at(-1)?.displayOptions).toMatchObject({
            showStateSubtitle: false,
        });

        const textsSection = getSection('Textos');
        const producingInput = within(textsSection).getByDisplayValue('Produciendo');
        await user.type(producingInput, ' avanzada');

        expect(updates.at(-1)?.displayOptions).toMatchObject({
            labelProducing: 'Produciendo avanzada',
        });
    });

    it('shows the custom unit toggle for real machine-activity bindings and enables editing only when active', async () => {
        const { user, updates } = renderPropertyDock({
            type: 'machine-activity',
            title: 'Actividad de Máquina',
            binding: {
                mode: 'real_variable',
                machineId: 101,
                variableKey: 'temp',
                bindingVersion: 'node-red-v1',
                unit: 'kW',
            },
            displayOptions: {
                unitOverride: false,
                unit: '%',
            },
        });

        const toggle = screen.getByLabelText('Unidad custom');
        const unitSelect = getFieldButtonInSection('Datos', 'Unidad');

        expect(toggle).not.toBeChecked();
        expect(unitSelect).toHaveTextContent('°C');
        expect(unitSelect).toBeDisabled();

        await user.click(toggle);

        expect(updates.at(-1)?.displayOptions).toMatchObject({
            unitOverride: true,
            unit: '%',
        });
        expect(getFieldButtonInSection('Datos', 'Unidad')).toHaveTextContent('%');
        expect(getFieldButtonInSection('Datos', 'Unidad')).not.toBeDisabled();
    });

    it('keeps the unit editable without toggle for simulated machine-activity bindings', () => {
        renderPropertyDock({
            type: 'machine-activity',
            title: 'Actividad de Máquina',
            binding: {
                mode: 'simulated_value',
                simulatedValue: 12,
                unit: '%',
            },
            displayOptions: {
                unitOverride: true,
                unit: '%',
            },
        });

        expect(screen.queryByLabelText('Unidad custom')).not.toBeInTheDocument();
        expect(getFieldButtonInSection('Datos', 'Unidad')).toHaveTextContent('%');
        expect(getFieldButtonInSection('Datos', 'Unidad')).not.toBeDisabled();
    });

    it('updates the simulated machine-activity unit atomically without reverting to the previous value', async () => {
        const { user, updates } = renderPropertyDock({
            type: 'machine-activity',
            title: 'Actividad de Máquina',
            binding: {
                mode: 'simulated_value',
                simulatedValue: 12,
                unit: '%',
            },
            displayOptions: {
                unitOverride: true,
                unit: '%',
            },
        });

        await user.click(getFieldButtonInSection('Datos', 'Unidad'));
        await user.click(screen.getByRole('button', { name: 'RPM' }));

        expect(updates.at(-1)).toMatchObject({
            binding: {
                mode: 'simulated_value',
                unit: 'RPM',
            },
            displayOptions: {
                unitOverride: true,
                unit: 'RPM',
            },
        });
        expect(getFieldButtonInSection('Datos', 'Unidad')).toHaveTextContent('RPM');
        expect(within(getSection('Escala Visual')).getByText('RPM mín')).toBeInTheDocument();
        expect(within(getSection('Escala Visual')).getByText('RPM máx')).toBeInTheDocument();
    });

    it('uses the selected variable unit for scale labels and falls back when no unit is available', () => {
        const { rerender } = renderPropertyDock({
            type: 'machine-activity',
            title: 'Actividad de Máquina',
            binding: {
                mode: 'real_variable',
                machineId: 101,
                variableKey: 'temp',
                bindingVersion: 'node-red-v1',
            },
        });

        const visualScaleSection = getSection('Escala Visual');
        expect(within(visualScaleSection).getByText('°C mín')).toBeInTheDocument();
        expect(within(visualScaleSection).getByText('°C máx')).toBeInTheDocument();

        rerender(
            <PropertyDock
                selectedWidget={{
                    ...makeWidget({
                        mode: 'real_variable',
                        machineId: 101,
                        variableKey: 'temp',
                        bindingVersion: 'node-red-v1',
                    }),
                    type: 'machine-activity',
                    title: 'Actividad de Máquina',
                    displayOptions: {},
                }}
                selectedLayout={DEFAULT_LAYOUT}
                equipmentMap={new Map()}
                catalogVariables={[]}
                usedCatalogVariableIds={[]}
                machines={[
                    {
                        ...MACHINES[0],
                        values: {
                            temp: { value: 42, unit: '', timestamp: null },
                        },
                    },
                ]}
                dataEnabled
                onCreateVariable={vi.fn()}
                onDeleteVariable={vi.fn()}
                onUpdateWidget={vi.fn()}
                onUpdateLayout={vi.fn()}
                onDelete={vi.fn()}
                onDuplicate={vi.fn()}
                onDeselect={vi.fn()}
            />,
        );

        expect(within(getSection('Escala Visual')).getByText('Valor mín')).toBeInTheDocument();
        expect(within(getSection('Escala Visual')).getByText('Valor máx')).toBeInTheDocument();
    });

    it('uses the simulated unit for machine-activity scale labels even when a previous real variable exists', () => {
        renderPropertyDock({
            type: 'machine-activity',
            title: 'Actividad de Máquina',
            binding: {
                mode: 'simulated_value',
                simulatedValue: 12,
                machineId: 101,
                variableKey: 'temp',
                bindingVersion: 'node-red-v1',
                unit: 'Hz',
            },
        });

        const visualScaleSection = getSection('Escala Visual');
        expect(within(visualScaleSection).getByText('Hz mín')).toBeInTheDocument();
        expect(within(visualScaleSection).getByText('Hz máx')).toBeInTheDocument();
        expect(within(visualScaleSection).queryByText('°C mín')).not.toBeInTheDocument();
    });

    it('falls back to the current simulated display unit for machine-activity scale labels when binding.unit is empty', () => {
        renderPropertyDock({
            type: 'machine-activity',
            title: 'Actividad de Máquina',
            binding: {
                mode: 'simulated_value',
                simulatedValue: 12,
                unit: '',
            },
            displayOptions: {
                unit: '°F',
                unitOverride: true,
            },
        });

        const visualScaleSection = getSection('Escala Visual');
        expect(within(visualScaleSection).getByText('°F mín')).toBeInTheDocument();
        expect(within(visualScaleSection).getByText('°F máx')).toBeInTheDocument();
    });

    it('syncs the simulated unit into scale labels when switching machine-activity from real to simulated', async () => {
        const { user, updates } = renderPropertyDock({
            type: 'machine-activity',
            title: 'Actividad de Máquina',
            binding: {
                mode: 'real_variable',
                machineId: 101,
                variableKey: 'temp',
                bindingVersion: 'node-red-v1',
                unit: '°C',
            },
            displayOptions: {
                unitOverride: true,
                unit: 'RPM',
            },
        });

        expect(within(getSection('Escala Visual')).getByText('°C mín')).toBeInTheDocument();

        await user.click(getFieldButtonInSection('Datos', 'Origen'));
        await user.click(screen.getByRole('button', { name: 'Simulado' }));

        expect(updates.at(-1)?.binding).toMatchObject({
            mode: 'simulated_value',
            unit: 'RPM',
        });
        expect(within(getSection('Escala Visual')).getByText('RPM mín')).toBeInTheDocument();
        expect(within(getSection('Escala Visual')).getByText('RPM máx')).toBeInTheDocument();
        expect(within(getSection('Escala Visual')).queryByText('°C mín')).not.toBeInTheDocument();
    });

    it('uses dynamic KPI scale labels for real and simulated units', () => {
        const { rerender } = renderPropertyDock({
            type: 'kpi',
            title: 'Potencia',
            binding: {
                mode: 'real_variable',
                machineId: 101,
                variableKey: 'temp',
                bindingVersion: 'node-red-v1',
            },
        });

        const scaleSection = getSection('Escala Visual');
        expect(within(scaleSection).getByText('°C mín')).toBeInTheDocument();
        expect(within(scaleSection).getByText('°C máx')).toBeInTheDocument();

        rerender(
            <PropertyDock
                selectedWidget={{
                    ...makeWidget({
                        mode: 'simulated_value',
                        simulatedValue: 12,
                        machineId: 101,
                        variableKey: 'temp',
                        bindingVersion: 'node-red-v1',
                        unit: 'bar',
                    }),
                    title: 'Potencia',
                    displayOptions: {},
                }}
                selectedLayout={DEFAULT_LAYOUT}
                equipmentMap={new Map()}
                catalogVariables={[]}
                usedCatalogVariableIds={[]}
                machines={MACHINES}
                dataEnabled
                onCreateVariable={vi.fn()}
                onDeleteVariable={vi.fn()}
                onUpdateWidget={vi.fn()}
                onUpdateLayout={vi.fn()}
                onDelete={vi.fn()}
                onDuplicate={vi.fn()}
                onDeselect={vi.fn()}
            />,
        );

        expect(within(getSection('Escala Visual')).getByText('bar mín')).toBeInTheDocument();
        expect(within(getSection('Escala Visual')).getByText('bar máx')).toBeInTheDocument();
    });

    it('falls back to the current simulated display unit for KPI scale labels when binding.unit is empty', () => {
        renderPropertyDock({
            type: 'kpi',
            title: 'Potencia',
            binding: {
                mode: 'simulated_value',
                simulatedValue: 12,
                unit: '',
            },
            displayOptions: {
                unit: 'RPM',
                unitOverride: true,
            },
        });

        const scaleSection = getSection('Escala Visual');
        expect(within(scaleSection).getByText('RPM mín')).toBeInTheDocument();
        expect(within(scaleSection).getByText('RPM máx')).toBeInTheDocument();
    });

    it('disables smoothing and renames the subtext toggle when machine-activity uses simulated values', () => {
        renderPropertyDock({
            type: 'machine-activity',
            title: 'Actividad de Máquina',
            binding: {
                mode: 'simulated_value',
                simulatedValue: 12,
                unit: '%',
            },
            displayOptions: {
                showPowerSubtext: true,
            },
        });

        const productiveStatesSection = getSection('Estados Productivos');
        const smoothingInput = within(productiveStatesSection).getByDisplayValue('5');

        expect(smoothingInput).toBeDisabled();
        expect(screen.getByLabelText('Mostrar valor en subtexto')).toBeChecked();
        expect(screen.queryByLabelText('Mostrar variable en subtexto')).not.toBeInTheDocument();
    });
});
