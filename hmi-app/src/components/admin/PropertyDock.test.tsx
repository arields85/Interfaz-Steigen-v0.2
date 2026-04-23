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
