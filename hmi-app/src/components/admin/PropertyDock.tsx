import { useState } from 'react';
import { Settings2, Database, Zap, Sliders, Tag, Gauge, Activity, Thermometer, Droplet, Wind, Settings, Fan, FoldVertical, History, HelpCircle, ChevronDown, MousePointerClick, TrendingUp, BarChart2, AreaChart, Lock } from 'lucide-react';
import type { AggregationMode, WidgetConfig, WidgetBinding, WidgetLayout, KpiDisplayOptions, MetricCardDisplayOptions, AlertHistoryDisplayOptions, ConnectionStatusDisplayOptions, ConnectionIndicatorDisplayOptions, StatusDisplayOptions, OeeProductionTrendDisplayOptions, ProdHistoryDisplayOptions } from '../../domain/admin.types';
import type { CatalogVariable } from '../../domain';
import type { ConnectionState, EquipmentSummary } from '../../domain/equipment.types';
import AdminSelect from './AdminSelect';
import AdminNumberInput from './AdminNumberInput';
import AdminEmptyState from './AdminEmptyState';
import CatalogVariableSelector from './CatalogVariableSelector';
import DockInfoBox from './DockInfoBox';
import {
    DEFAULT_STATUS_LABELS,
    EQUIPMENT_STATUS_VALUES,
    normalizeSimulatedEquipmentStatus,
} from '../../utils/statusWidget';
import {
    CONNECTION_INDICATOR_TEXT_OPTION_KEY,
    CONNECTION_STATE_VALUES,
    DEFAULT_CONNECTION_INDICATOR_LABELS,
    DEFAULT_CONNECTION_STATUS_LABELS,
    normalizeSimulatedConnectionState,
    normalizeSimulatedConnectionStatus,
} from '../../utils/connectionWidget';
import {
    ADMIN_SIDEBAR_INPUT_CLS,
    ADMIN_SIDEBAR_LABEL_CLS,
    ADMIN_SIDEBAR_PANEL_CLS,
    ADMIN_SIDEBAR_PANEL_HEADER_CLS,
    ADMIN_SIDEBAR_PANEL_STACK_CLS,
    ADMIN_SIDEBAR_SECTION_BODY_CLS,
    ADMIN_SIDEBAR_SECTION_BUTTON_CLS,
    ADMIN_SIDEBAR_SECTION_CLS,
    ADMIN_SIDEBAR_SECTION_HEADER_CLS,
} from './adminSidebarStyles';
import { supportsCatalogVariable, supportsHierarchy } from '../../utils/widgetCapabilities';

// =============================================================================
// PropertyDock
// Dock inferior flotante del Dashboard Builder. Organiza las propiedades del
// widget seleccionado en secciones horizontales compactas, eliminando la
// necesidad de scroll vertical del antiguo panel lateral.
//
// Secciones: General | Visual | Rango | Umbrales | Datos | Acciones
// =============================================================================

interface PropertyDockProps {
    selectedWidget?: WidgetConfig;
    selectedLayout?: WidgetLayout;
    equipmentMap: Map<string, EquipmentSummary>;
    catalogVariables: CatalogVariable[];
    usedCatalogVariableIds: string[];
    onCreateVariable: (name: string, unit: string) => void;
    onDeleteVariable: (variableId: string) => void;
    onUpdateWidget: (w: WidgetConfig) => void;
    onUpdateLayout: (l: WidgetLayout) => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onDeselect: () => void;
}

// --- Shared input class tokens ---
const INPUT_CLS = ADMIN_SIDEBAR_INPUT_CLS;
const LABEL_CLS = ADMIN_SIDEBAR_LABEL_CLS;
const SECTION_HEADER_CLS = ADMIN_SIDEBAR_SECTION_HEADER_CLS;
const FIELD_ROW_CLS = 'flex items-center gap-2';
const FIELD_LABEL_CLS = `${LABEL_CLS} shrink-0`;

const STATUS_TEXT_FIELDS: Array<{ key: keyof StatusDisplayOptions; label: string; placeholder: string }> = [
    { key: 'runningText', label: 'Running', placeholder: DEFAULT_STATUS_LABELS.running },
    { key: 'idleText', label: 'Idle', placeholder: DEFAULT_STATUS_LABELS.idle },
    { key: 'warningText', label: 'Warning', placeholder: DEFAULT_STATUS_LABELS.warning },
    { key: 'criticalText', label: 'Critical', placeholder: DEFAULT_STATUS_LABELS.critical },
    { key: 'offlineText', label: 'Offline', placeholder: DEFAULT_STATUS_LABELS.offline },
    { key: 'maintenanceText', label: 'Maint.', placeholder: DEFAULT_STATUS_LABELS.maintenance },
    { key: 'unknownText', label: 'Unknown', placeholder: DEFAULT_STATUS_LABELS.unknown },
];

const CONNECTION_STATUS_TEXT_FIELDS: Array<{
    key: keyof ConnectionStatusDisplayOptions;
    label: string;
    placeholder: string;
}> = [
    { key: 'connectedText', label: 'Conectado', placeholder: DEFAULT_CONNECTION_STATUS_LABELS.connected },
    { key: 'disconnectedText', label: 'Descon.', placeholder: DEFAULT_CONNECTION_STATUS_LABELS.disconnected },
];

const CONNECTION_FIELD_LABELS: Record<ConnectionState, string> = {
    online: 'Online',
    degraded: 'Degradado',
    stale: 'Stale',
    offline: 'Offline',
    unknown: 'Unknown',
};

const CONNECTION_INDICATOR_TEXT_FIELDS: Array<{
    key: Exclude<keyof ConnectionIndicatorDisplayOptions, 'showLastUpdate'>;
    label: string;
    placeholder: string;
}> = CONNECTION_STATE_VALUES.map(state => ({
    key: CONNECTION_INDICATOR_TEXT_OPTION_KEY[state],
    label: CONNECTION_FIELD_LABELS[state],
    placeholder: DEFAULT_CONNECTION_INDICATOR_LABELS[state],
}));

export default function PropertyDock(props: PropertyDockProps) {
    const {
        selectedWidget,
        selectedLayout,
        equipmentMap,
        catalogVariables,
        usedCatalogVariableIds,
        onCreateVariable,
        onDeleteVariable,
        onUpdateWidget,
    } = props;
    const [isCustomUnit, setIsCustomUnit] = useState(false);
    void selectedLayout;

    // -------------------------------------------------------------------------
    // handleDisplayOptionChange
    // Escritura controlada de displayOptions para el widget seleccionado.
    // El cast a Record<string,unknown> está justificado aquí: este dock es
    // el único punto de escritura de displayOptions en toda la app; los campos
    // escritos están controlados por la UI y son siempre válidos para el tipo.
    // El tipado estricto vive en los renderers — este dock es la capa de edición.
    // -------------------------------------------------------------------------
    const handleDisplayOptionChange = (key: string, value: string | number | boolean | null) => {
        if (!selectedWidget) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const current = (selectedWidget.displayOptions ?? {}) as Record<string, unknown>;
        const displayOptions = { ...current };
        if (value === null) {
            displayOptions[key] = null;
        } else if (value === '') {
            displayOptions[key] = undefined;
        } else {
            displayOptions[key] = value;
        }
        // Cast explícito: el tipo correcto de displayOptions se garantiza por la UI
        // que solo muestra campos válidos para el tipo de widget seleccionado.
        onUpdateWidget({ ...selectedWidget, displayOptions } as WidgetConfig);
    };

    const handleNumericDisplayOptionChange = (key: string, value: string) => {
        handleDisplayOptionChange(key, value === '' ? '' : Number(value));
    };

    const handleUnitChange = (val: string) => {
        if (!selectedWidget) return;
        const binding = { ...selectedWidget.binding, mode: selectedWidget.binding?.mode || 'simulated_value' as const, unit: val || undefined };
        onUpdateWidget({ ...selectedWidget, binding });
    };

    // --- Binding handlers ---
    const binding = selectedWidget?.binding || { mode: 'simulated_value' as const, simulatedValue: 0 };
    const thresholds = selectedWidget?.thresholds || [];

    const handleModeChange = (mode: WidgetBinding['mode']) => {
        if (!selectedWidget) return;
        onUpdateWidget({ ...selectedWidget, binding: { ...binding, mode } });
    };

    const handleSimulatedValueChange = (val: string) => {
        if (!selectedWidget) return;
        const parsed = val === '' ? '' : Number(val);
        onUpdateWidget({
            ...selectedWidget,
            binding: { ...binding, simulatedValue: parsed }
        });
    };

    const handleAssetChange = (assetId: string) => {
        if (!selectedWidget) return;
        onUpdateWidget({
            ...selectedWidget,
            binding: { ...binding, assetId, variableKey: undefined }
        });
    };

    const handleVariableChange = (variableKey: string) => {
        if (!selectedWidget) return;
        onUpdateWidget({
            ...selectedWidget,
            binding: { ...binding, variableKey }
        });
    };

    const handleCatalogVariableChange = (catalogVariableId: string | undefined) => {
        if (!selectedWidget) return;

        if (!catalogVariableId) {
            onUpdateWidget({
                ...selectedWidget,
                binding: {
                    ...binding,
                    catalogVariableId: undefined,
                },
            });
            return;
        }

        const selectedCatalogVariable = catalogVariables.find((variable) => variable.id === catalogVariableId);

        onUpdateWidget({
            ...selectedWidget,
            binding: {
                ...binding,
                catalogVariableId,
                unit: selectedCatalogVariable?.unit ?? binding.unit,
            },
        });
    };

    const handleUpdateThreshold = (index: number, value: number) => {
        if (!selectedWidget) return;
        const newThresholds = [...thresholds];
        newThresholds[index] = { ...newThresholds[index], value };
        onUpdateWidget({ ...selectedWidget, thresholds: newThresholds });
    };


    const selectedAsset = binding.assetId ? equipmentMap.get(binding.assetId) : undefined;
    const isKpi = selectedWidget?.type === 'kpi';
    const isMetricCard = selectedWidget?.type === 'metric-card';
    const widgetType = selectedWidget?.type ?? '';
    const hasCatalogSupport = supportsCatalogVariable(widgetType);
    const hasHierarchySupport = supportsHierarchy(widgetType);
    const isHierarchyModeEnabled = hasHierarchySupport && selectedWidget?.hierarchyMode === true;
    const isAggregationDisabled = hasHierarchySupport && !isHierarchyModeEnabled;
    const isBindingSourceDisabled = hasHierarchySupport && isHierarchyModeEnabled;
    const selectedCatalogVariable = binding.catalogVariableId
        ? catalogVariables.find((variable) => variable.id === binding.catalogVariableId)
        : undefined;
    const filteredCatalogVariables = catalogVariables.filter((variable) => variable.unit === binding.unit);
    const hasCatalogVariablesForUnit = filteredCatalogVariables.length > 0;
    const isCatalogVariableRequired = isHierarchyModeEnabled || hasCatalogVariablesForUnit;
    const isUnitLocked = Boolean(binding.catalogVariableId);
    const showThresholds = isKpi || selectedWidget?.type === 'metric-card';
    const isProdHistory = selectedWidget?.type === 'prod-history';
    const prodHistoryOptions = isProdHistory
        ? (selectedWidget.displayOptions as ProdHistoryDisplayOptions | undefined)
        : undefined;
    const prodHistoryBarWidth = (() => {
        const rawValue = prodHistoryOptions?.productionBarWidth ?? 1;
        return Math.min(1.5, Math.max(0.5, Number.isFinite(rawValue) ? rawValue : 1));
    })();
    const shouldShowGeneralIconField = selectedWidget
        && selectedWidget.type !== 'connection-status'
        && selectedWidget.type !== 'connection-indicator'
        && selectedWidget.type !== 'status'
        && selectedWidget.type !== 'oee-production-trend';
    const genericDataUnitField = selectedWidget
        && selectedWidget.type !== 'alert-history'
        && selectedWidget.type !== 'oee-production-trend'
        && selectedWidget.type !== 'prod-history'
        ? (() => {
            const PRESET_UNITS = ['°C', '°F', 'RPM', '%', 'bar', 'psi', 'kW', 'A', 'V', 'Hz', 'mm', 'kg', 'L/min', 'm³/h', 'N', 'kN'];
            const currentUnit = selectedWidget?.binding?.unit || '';
            const isPreset = PRESET_UNITS.includes(currentUnit);
            const showCustom = isCustomUnit || (!isPreset && currentUnit !== '');
            const selectValue = showCustom ? '__custom__' : currentUnit;

            return (
                <>
                    <DockFieldRow label="Unidad">
                        {isUnitLocked ? (
                            <div className={`${INPUT_CLS} flex w-full items-center justify-between gap-2 border-white/5 bg-black/20 text-industrial-muted`}>
                                <span className="truncate text-white/80">{(selectedCatalogVariable?.unit ?? currentUnit) || 'Sin unidad'}</span>
                                <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-status-warning">
                                    <Lock size={10} /> Fija
                                </span>
                            </div>
                        ) : (
                            <AdminSelect
                                value={selectValue}
                                placeholder="Seleccionar"
                                onChange={val => {
                                    if (val === '__custom__') {
                                        setIsCustomUnit(true);
                                    } else {
                                        setIsCustomUnit(false);
                                        handleUnitChange(val);
                                    }
                                }}
                                options={[
                                    { value: '', label: 'Sin unidad' },
                                    ...PRESET_UNITS.map(u => ({ value: u, label: u })),
                                    { value: '__custom__', label: '✏️ Personalizado' },
                                ]}
                            />
                        )}
                    </DockFieldRow>
                    {showCustom && !isUnitLocked && (
                        <DockFieldRow label="">
                            <input
                                type="text"
                                className={INPUT_CLS}
                                value={currentUnit}
                                onChange={e => handleUnitChange(e.target.value)}
                                placeholder="Unidad personalizada"
                                autoFocus
                            />
                        </DockFieldRow>
                    )}
                </>
            );
        })()
        : null;

    if (!selectedWidget) {
        return (
            <div className={`${ADMIN_SIDEBAR_PANEL_CLS} border-l border-white/5`}>
                <div className={`${ADMIN_SIDEBAR_PANEL_HEADER_CLS} justify-start`}>
                    <Settings2 size={14} className="text-industrial-muted" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-industrial-muted">Propiedades</span>
                </div>
                <div className="h-[calc(100%-44px)] px-5">
                    <AdminEmptyState
                        icon={MousePointerClick}
                        message="Seleccioná un widget para editar sus propiedades"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className={`${ADMIN_SIDEBAR_PANEL_CLS} border-l border-white/5`}>
            <div className={ADMIN_SIDEBAR_PANEL_HEADER_CLS}>
                <div className="flex items-center gap-2">
                    <Settings2 size={14} className="text-industrial-muted" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-industrial-muted">Propiedades</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase admin-accent-ghost">
                        {selectedWidget.type}
                    </span>
                </div>
            </div>

            <div className={ADMIN_SIDEBAR_PANEL_STACK_CLS}>

                        {/* ─── GENERAL ─── */}
                        <DockSection icon={<Tag size={11} />} title="General">
                            <DockFieldRow label="Título">
                                <input
                                    type="text"
                                    className={INPUT_CLS}
                                    value={selectedWidget.title || ''}
                                    onChange={e => onUpdateWidget({ ...selectedWidget, title: e.target.value })}
                                    placeholder="ej. Velocidad"
                                />
                            </DockFieldRow>
                            {/* Subtítulo: header del widget (debajo del título). KPI y MetricCard. */}
                            {(selectedWidget.type === 'kpi' || selectedWidget.type === 'metric-card') && (
                                <DockFieldRow label="Subtítulo">
                                    <input
                                        type="text"
                                        className={INPUT_CLS}
                                        value={(selectedWidget.displayOptions as KpiDisplayOptions | MetricCardDisplayOptions | undefined)?.subtitle || ''}
                                        onChange={e => handleDisplayOptionChange('subtitle', e.target.value)}
                                        placeholder="ej. Estado: OK"
                                    />
                                </DockFieldRow>
                            )}
                            {/* Subtexto: footer del widget (parte inferior). KPI y MetricCard. */}
                              {(selectedWidget.type === 'kpi' || selectedWidget.type === 'metric-card') && (
                                  <DockFieldRow label="Subtexto">
                                     <input
                                         type="text"
                                         className={INPUT_CLS}
                                         value={(selectedWidget.displayOptions as KpiDisplayOptions | MetricCardDisplayOptions | undefined)?.subtext || ''}
                                         onChange={e => handleDisplayOptionChange('subtext', e.target.value)}
                                         placeholder="ej. Límite: 45°C"
                                      />
                                  </DockFieldRow>
                              )}
                            {shouldShowGeneralIconField && (
                                <DockFieldRow label="Ícono">
                                    <AdminSelect
                                        value={(() => {
                                            const currentIcon = selectedWidget.type === 'alert-history'
                                                ? (selectedWidget.displayOptions as AlertHistoryDisplayOptions | undefined)?.icon
                                                : selectedWidget.type === 'prod-history'
                                                    ? prodHistoryOptions?.icon
                                                    : (selectedWidget.displayOptions as KpiDisplayOptions | MetricCardDisplayOptions | undefined)?.icon;
                                            if (currentIcon === undefined) return '__pending__';
                                            if (currentIcon === null) return '__none__';
                                            return currentIcon;
                                        })()}
                                        onChange={val => {
                                            if (val === '__none__') {
                                                handleDisplayOptionChange('icon', null);
                                                return;
                                            }
                                            if (val === '__pending__') {
                                                handleDisplayOptionChange('icon', '');
                                                return;
                                            }
                                            handleDisplayOptionChange('icon', val);
                                        }}
                                        options={[
                                            { value: '__pending__', label: '(Ícono pendiente)', icon: <HelpCircle size={12} /> },
                                            { value: '__none__', label: 'Sin ícono' },
                                            ...(selectedWidget.type === 'alert-history'
                                                ? [{ value: 'History', label: 'Historial', icon: <History size={12} /> }]
                                                : []
                                            ),
                                            { value: 'Gauge', label: 'Medidor', icon: <Gauge size={12} /> },
                                            { value: 'Activity', label: 'Actividad', icon: <Activity size={12} /> },
                                            { value: 'Thermometer', label: 'Termómetro', icon: <Thermometer size={12} /> },
                                            { value: 'Zap', label: 'Energía', icon: <Zap size={12} /> },
                                            { value: 'Droplet', label: 'Líquido', icon: <Droplet size={12} /> },
                                            { value: 'Wind', label: 'Flujo/Viento', icon: <Wind size={12} /> },
                                            { value: 'Settings', label: 'Mecánico', icon: <Settings size={12} /> },
                                            { value: 'Fan', label: 'Rotor', icon: <Fan size={12} /> },
                                            { value: 'FoldVertical', label: 'Compresión', icon: <FoldVertical size={12} /> },
                                            { value: 'TrendingUp', label: 'Tendencia', icon: <TrendingUp size={12} /> },
                                        ]}
                                    />
                                </DockFieldRow>
                            )}
                            {isKpi && (
                                <DockFieldRow label="Estilo">
                                    <AdminSelect
                                        value={(selectedWidget.displayOptions as KpiDisplayOptions | undefined)?.kpiMode || 'circular'}
                                        onChange={val => handleDisplayOptionChange('kpiMode', val)}
                                        options={[
                                            { value: 'circular', label: 'Radial' },
                                            { value: 'bar', label: 'Barra' },
                                        ]}
                                    />
                                </DockFieldRow>
                            )}
                            {selectedWidget.type === 'oee-production-trend' && (
                                <DockFieldRow label="Volumen">
                                    <AdminSelect
                                        value={(selectedWidget.displayOptions as OeeProductionTrendDisplayOptions | undefined)?.volumeChartMode ?? 'area'}
                                        onChange={val => handleDisplayOptionChange('volumeChartMode', val)}
                                        options={[
                                            { value: 'area', label: 'Área', icon: <AreaChart size={12} /> },
                                            { value: 'bars', label: 'Barras', icon: <BarChart2 size={12} /> },
                                        ]}
                                    />
                                </DockFieldRow>
                            )}
                            {selectedWidget.type === 'prod-history' && (
                                <>
                                    <DockFieldRow label="Producción">
                                        <AdminSelect
                                            value={prodHistoryOptions?.productionChartMode ?? 'bars'}
                                            onChange={val => handleDisplayOptionChange('productionChartMode', val)}
                                            options={[
                                                { value: 'bars', label: 'Barras', icon: <BarChart2 size={12} /> },
                                                { value: 'area', label: 'Área', icon: <AreaChart size={12} /> },
                                            ]}
                                        />
                                    </DockFieldRow>

                                    <label className="flex items-center gap-2 cursor-pointer group mt-1">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={!!prodHistoryOptions?.oeeShowArea}
                                                onChange={e => handleDisplayOptionChange('oeeShowArea', e.target.checked)}
                                            />
                                            <div className="w-7 h-4 rounded-full border border-transparent bg-white/10 transition-all peer peer-checked:bg-white/20 peer-checked:border-white/30 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all"></div>
                                        </div>
                                        <span className="text-[10px] font-bold text-white/70 peer-checked:text-white group-hover:!text-white group-hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.4)] transition-all whitespace-nowrap">
                                            Relleno bajo línea OEE
                                        </span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer group mt-1">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={!!prodHistoryOptions?.oeeShowPoints}
                                                onChange={e => handleDisplayOptionChange('oeeShowPoints', e.target.checked)}
                                            />
                                            <div className="w-7 h-4 rounded-full border border-transparent bg-white/10 transition-all peer peer-checked:bg-white/20 peer-checked:border-white/30 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all"></div>
                                        </div>
                                        <span className="text-[10px] font-bold text-white/70 peer-checked:text-white group-hover:!text-white group-hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.4)] transition-all whitespace-nowrap">
                                            Puntos en OEE
                                        </span>
                                    </label>

                                    <DockFieldRow label="Ancho barra">
                                        <div className="flex w-full items-center gap-3">
                                            <input
                                                type="range"
                                                min="0.5"
                                                max="1.5"
                                                step="0.1"
                                                value={prodHistoryBarWidth}
                                                onChange={e => handleDisplayOptionChange('productionBarWidth', Math.min(1.5, Math.max(0.5, Number(e.target.value))))}
                                                className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10"
                                                style={{ accentColor: 'var(--color-admin-accent)' }}
                                            />
                                            <span className="w-10 text-right text-[10px] font-black uppercase tracking-widest text-industrial-muted">
                                                ×{prodHistoryBarWidth.toFixed(1)}
                                            </span>
                                        </div>
                                    </DockFieldRow>
                                </>
                            )}

                            {selectedWidget.type === 'connection-status' && (
                                <>
                                    {CONNECTION_STATUS_TEXT_FIELDS.map(({ key, label, placeholder }) => (
                                        <DockFieldRow key={key} label={label}>
                                            <input
                                                type="text"
                                                className={INPUT_CLS}
                                                value={(selectedWidget.displayOptions as ConnectionStatusDisplayOptions | undefined)?.[key] || ''}
                                                onChange={e => handleDisplayOptionChange(key, e.target.value)}
                                                placeholder={placeholder}
                                            />
                                        </DockFieldRow>
                                    ))}
                                </>
                            )}

                            {selectedWidget.type === 'connection-indicator' && (
                                <>
                                    {CONNECTION_INDICATOR_TEXT_FIELDS.map(({ key, label, placeholder }) => (
                                        <DockFieldRow key={key} label={label}>
                                            <input
                                                type="text"
                                                className={INPUT_CLS}
                                                value={(selectedWidget.displayOptions as ConnectionIndicatorDisplayOptions | undefined)?.[key] || ''}
                                                onChange={e => handleDisplayOptionChange(key, e.target.value)}
                                                placeholder={placeholder}
                                            />
                                        </DockFieldRow>
                                    ))}
                                    <label className="flex items-center gap-2 cursor-pointer group mt-1">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={(selectedWidget.displayOptions as ConnectionIndicatorDisplayOptions | undefined)?.showLastUpdate !== false}
                                                onChange={e => handleDisplayOptionChange('showLastUpdate', e.target.checked)}
                                            />
                                            <div className="w-7 h-4 rounded-full border border-transparent bg-white/10 transition-all peer peer-checked:bg-white/20 peer-checked:border-white/30 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all"></div>
                                        </div>
                                        <span className="text-[10px] font-bold text-white/70 peer-checked:text-white group-hover:!text-white group-hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.4)] transition-all whitespace-nowrap">
                                            Mostrar Tiempo
                                        </span>
                                    </label>
                                </>
                            )}

                            {selectedWidget.type === 'status' && (
                                <>
                                    {STATUS_TEXT_FIELDS.map(({ key, label, placeholder }) => (
                                        <DockFieldRow key={key} label={label}>
                                            <input
                                                type="text"
                                                className={INPUT_CLS}
                                                value={(selectedWidget.displayOptions as StatusDisplayOptions | undefined)?.[key] || ''}
                                                onChange={e => handleDisplayOptionChange(key, e.target.value)}
                                                placeholder={placeholder}
                                            />
                                        </DockFieldRow>
                                    ))}
                                </>
                            )}
                        </DockSection>

                        {/* ─── DATOS — no aplica para alert-history, oee-production-trend ni prod-history (datos mock propios) ─── */}
                        {selectedWidget.type !== 'alert-history' && selectedWidget.type !== 'oee-production-trend' && selectedWidget.type !== 'prod-history' && (
                            <DockSection icon={<Database size={11} />} title="Datos">
                                {hasHierarchySupport && (
                                    <DockFieldRow label="Fuente">
                                        <AdminSelect
                                            value={isHierarchyModeEnabled ? 'hierarchy' : 'own'}
                                            onChange={(val) => {
                                                onUpdateWidget({
                                                    ...selectedWidget,
                                                    hierarchyMode: val === 'hierarchy',
                                                    aggregation: val === 'hierarchy'
                                                        ? (selectedWidget.aggregation ?? 'sum')
                                                        : selectedWidget.aggregation,
                                                });
                                            }}
                                            options={[
                                                { value: 'own', label: 'Usa valor propio' },
                                                { value: 'hierarchy', label: 'Calcula desde jerarquía' },
                                            ]}
                                        />
                                    </DockFieldRow>
                                )}

                                {genericDataUnitField}

                                {hasCatalogSupport && (
                                    <>
                                        <DockFieldRow label={<><span>Variable{isCatalogVariableRequired ? <span className="text-status-warning">*</span> : null}</span></>}>
                                            <CatalogVariableSelector
                                                variables={filteredCatalogVariables}
                                                selectedId={binding.catalogVariableId}
                                                usedIds={usedCatalogVariableIds}
                                                hasRequiredError={Boolean(binding.unit && hasCatalogVariablesForUnit && !binding.catalogVariableId)}
                                                disabled={!binding.unit}
                                                onChange={handleCatalogVariableChange}
                                                onDelete={onDeleteVariable}
                                                onCreateNew={(name) => {
                                                    if (!binding.unit) {
                                                        return;
                                                    }

                                                    onCreateVariable(name, binding.unit);
                                                }}
                                            />
                                        </DockFieldRow>

                                        {binding.unit && !hasCatalogVariablesForUnit && !isHierarchyModeEnabled && (
                                            <DockInfoBox variant="normal" text="Sin variables para esta unidad. Podés crear una nueva desde el selector." />
                                        )}

                                        {binding.unit && hasCatalogVariablesForUnit && !binding.catalogVariableId && (
                                            <DockInfoBox variant="warning" text="La unidad ya tiene variables. Selecciona una o crea una nueva desde el selector." />
                                        )}

                                        <DockFieldRow label="Operación">
                                            <AdminSelect
                                                value={selectedWidget.aggregation ?? 'sum'}
                                                disabled={isAggregationDisabled}
                                                onChange={val => onUpdateWidget({
                                                    ...selectedWidget,
                                                    aggregation: val as AggregationMode,
                                                })}
                                                options={[
                                                    { value: 'sum', label: 'Suma' },
                                                    { value: 'avg', label: 'Promedio' },
                                                    { value: 'max', label: 'Máximo' },
                                                    { value: 'min', label: 'Mínimo' },
                                                ]}
                                            />
                                        </DockFieldRow>
                                    </>
                                )}

                                <>
                                        <DockFieldRow label="Origen">
                                            <AdminSelect
                                                value={binding.mode}
                                                disabled={isBindingSourceDisabled}
                                                onChange={val => handleModeChange(val as WidgetBinding['mode'])}
                                                options={[
                                                    { value: 'simulated_value', label: 'Simulado' },
                                                    { value: 'real_variable', label: 'Variable Real' },
                                                ]}
                                            />
                                        </DockFieldRow>

                                        {binding.mode === 'simulated_value' && (
                                            <DockFieldRow label="Valor">
                                                {selectedWidget.type === 'connection-status' ? (
                                                    <AdminSelect
                                                        disabled={isBindingSourceDisabled}
                                                        value={(() => {
                                                            return normalizeSimulatedConnectionStatus(binding.simulatedValue)
                                                                ? 'connected'
                                                                : 'disconnected';
                                                        })()}
                                                        onChange={val => {
                                                            onUpdateWidget({
                                                                ...selectedWidget,
                                                                binding: {
                                                                    ...binding,
                                                                    simulatedValue: val === 'connected' ? 1 : 0,
                                                                }
                                                            });
                                                        }}
                                                        options={[
                                                            { value: 'connected', label: 'Conectado' },
                                                            { value: 'disconnected', label: 'Desconectado' },
                                                        ]}
                                                    />
                                                ) : selectedWidget.type === 'connection-indicator' ? (
                                                    <AdminSelect
                                                        disabled={isBindingSourceDisabled}
                                                        value={normalizeSimulatedConnectionState(binding.simulatedValue)}
                                                        onChange={val => {
                                                            onUpdateWidget({
                                                                ...selectedWidget,
                                                                binding: {
                                                                    ...binding,
                                                                    simulatedValue: val,
                                                                }
                                                            });
                                                        }}
                                                        options={CONNECTION_STATE_VALUES.map(state => ({
                                                            value: state,
                                                            label: DEFAULT_CONNECTION_INDICATOR_LABELS[state],
                                                        }))}
                                                    />
                                                ) : selectedWidget.type === 'status' ? (
                                                    <AdminSelect
                                                        disabled={isBindingSourceDisabled}
                                                        value={normalizeSimulatedEquipmentStatus(binding.simulatedValue)}
                                                        onChange={val => {
                                                            onUpdateWidget({
                                                                ...selectedWidget,
                                                                binding: {
                                                                    ...binding,
                                                                    simulatedValue: val,
                                                                }
                                                            });
                                                        }}
                                                        options={EQUIPMENT_STATUS_VALUES.map(status => ({
                                                            value: status,
                                                            label: DEFAULT_STATUS_LABELS[status],
                                                        }))}
                                                    />
                                                ) : (
                                                    <AdminNumberInput
                                                        value={(binding.simulatedValue as string | number) ?? ''}
                                                        disabled={isBindingSourceDisabled}
                                                        commitOnBlur
                                                        onChange={handleSimulatedValueChange}
                                                        placeholder="Ej. 1500"
                                                        className={`justify-end ${isBindingSourceDisabled ? 'opacity-50' : ''}`}
                                                    />
                                                )}
                                            </DockFieldRow>
                                        )}

                                        {binding.mode === 'real_variable' && (
                                            <>
                                                <DockFieldRow label="Equipo">
                                                    <AdminSelect
                                                        disabled={isBindingSourceDisabled}
                                                        value={binding.assetId || ''}
                                                        onChange={val => handleAssetChange(val)}
                                                        placeholder="Seleccione..."
                                                        options={Array.from(equipmentMap.values()).map(eq => ({
                                                            value: eq.id,
                                                            label: eq.name,
                                                        }))}
                                                    />
                                                </DockFieldRow>
                                                {selectedAsset && selectedWidget.type !== 'connection-status' && selectedWidget.type !== 'connection-indicator' && selectedWidget.type !== 'status' && (
                                                    <DockFieldRow label="Variable">
                                                        <AdminSelect
                                                            disabled={isBindingSourceDisabled}
                                                            value={binding.variableKey || ''}
                                                            onChange={val => handleVariableChange(val)}
                                                            placeholder="Seleccione..."
                                                            options={selectedAsset.primaryMetrics.map(m => ({
                                                                value: m.label,
                                                                label: m.label,
                                                            }))}
                                                        />
                                                    </DockFieldRow>
                                                )}
                                            </>
                                        )}
                                </>
                            </DockSection>
                        )}

                        {/* ─── RANGO (solo KPI) ─── */}
                        {isKpi && (
                            <DockSection icon={<Sliders size={11} />} title="Rango">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className={LABEL_CLS}>MIN</span>
                                        <AdminNumberInput
                                            value={(selectedWidget.displayOptions as KpiDisplayOptions | undefined)?.min ?? 0}
                                            onChange={val => handleDisplayOptionChange('min', val)}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={LABEL_CLS}>MAX</span>
                                        <AdminNumberInput
                                            value={(selectedWidget.displayOptions as KpiDisplayOptions | undefined)?.max ?? 100}
                                            onChange={val => handleDisplayOptionChange('max', val)}
                                        />
                                    </div>
                                </div>
                                {/* Toggle Color Dinámico */}
                                <label className="flex items-center gap-2 cursor-pointer group mt-1">
                                    <div className="relative flex items-center">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={!!(selectedWidget.displayOptions as KpiDisplayOptions | undefined)?.dynamicColor}
                                            onChange={e => handleDisplayOptionChange('dynamicColor', e.target.checked)}
                                        />
                                        <div className="w-7 h-4 rounded-full border border-transparent bg-white/10 transition-all peer peer-checked:bg-white/20 peer-checked:border-white/30 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all"></div>
                                    </div>
                                    <span className="text-[10px] font-bold text-white/70 peer-checked:text-white group-hover:!text-white group-hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.4)] transition-all whitespace-nowrap">
                                        Color Dinámico
                                    </span>
                                </label>
                            </DockSection>
                        )}

                        {/* ─── UMBRALES ─── */}
                        {showThresholds && (
                            <DockSection icon={<Zap size={11} />} title="Umbrales">
                                {/* Toggle Activar Umbrales */}
                                <label className="flex items-center gap-2 cursor-pointer group mb-1">
                                    <div className="relative flex items-center">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={thresholds.length > 0}
                                            onChange={e => {
                                                if (!selectedWidget) return;
                                                if (e.target.checked) {
                                                    onUpdateWidget({
                                                        ...selectedWidget,
                                                        thresholds: [
                                                            { severity: 'warning', value: 0 },
                                                            { severity: 'critical', value: 0 },
                                                        ],
                                                        deadbandPercent: 5,
                                                    });
                                                } else {
                                                    onUpdateWidget({ ...selectedWidget, thresholds: [] });
                                                }
                                            }}
                                        />
                                        <div className="w-7 h-4 rounded-full border border-transparent bg-white/10 transition-all peer peer-checked:bg-white/20 peer-checked:border-white/30 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all"></div>
                                    </div>
                                    <span className="text-[10px] font-bold text-white/70 peer-checked:text-white group-hover:!text-white group-hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.4)] transition-all whitespace-nowrap">
                                        Activar Umbrales
                                    </span>
                                </label>
                                {/* ALR ≥ field */}
                                <DockFieldRow
                                    label="ALR ≥"
                                    labelClassName={thresholds.length > 0 ? '' : 'text-industrial-muted'}
                                    labelStyle={thresholds.length > 0 ? { color: 'var(--color-status-warning)' } : undefined}
                                    controlClassName="flex justify-end"
                                >
                                    <AdminNumberInput
                                        value={thresholds.find(t => t.severity === 'warning')?.value ?? 0}
                                        disabled={thresholds.length === 0}
                                        commitOnBlur
                                        onChange={val => {
                                            const idx = thresholds.findIndex(t => t.severity === 'warning');
                                            if (idx >= 0) handleUpdateThreshold(idx, parseFloat(val) || 0);
                                        }}
                                    />
                                </DockFieldRow>
                                {/* CRI ≥ field */}
                                <DockFieldRow
                                    label="CRI ≥"
                                    labelClassName={thresholds.length > 0 ? '' : 'text-industrial-muted'}
                                    labelStyle={thresholds.length > 0 ? { color: 'var(--color-status-critical)' } : undefined}
                                    controlClassName="flex justify-end"
                                >
                                    <AdminNumberInput
                                        value={thresholds.find(t => t.severity === 'critical')?.value ?? 0}
                                        disabled={thresholds.length === 0}
                                        commitOnBlur
                                        onChange={val => {
                                            const idx = thresholds.findIndex(t => t.severity === 'critical');
                                            if (idx >= 0) handleUpdateThreshold(idx, parseFloat(val) || 0);
                                        }}
                                    />
                                </DockFieldRow>
                                {/* Deadband field — siempre visible, deshabilitado cuando los umbrales están inactivos */}
                                <DockFieldRow
                                    label="Deadband"
                                    labelClassName={thresholds.length > 0 ? '' : 'text-industrial-muted'}
                                    controlClassName="flex justify-end"
                                >
                                    <AdminNumberInput
                                        value={selectedWidget.deadbandPercent ?? 5}
                                        min={0}
                                        max={50}
                                        step={1}
                                        commitOnBlur
                                        prefix="%"
                                        disabled={thresholds.length === 0}
                                        onChange={val => {
                                            if (!selectedWidget) return;
                                            onUpdateWidget({
                                                ...selectedWidget,
                                                deadbandPercent: parseFloat(val) || 0,
                                            });
                                        }}
                                    />
                                </DockFieldRow>
                            </DockSection>
                        )}

                        {selectedWidget.type === 'prod-history' && (
                            <DockSection icon={<Database size={11} />} title="Datos">
                                <div className="flex items-center gap-2">
                                    <span className={LABEL_CLS}>Unidad</span>
                                    <AdminSelect
                                        value={prodHistoryOptions?.productionUnit ?? 'unidades'}
                                        onChange={val => handleDisplayOptionChange('productionUnit', val)}
                                        options={[
                                            { value: 'unidades', label: 'unidades' },
                                            { value: 'kg', label: 'kg' },
                                            { value: 'tn', label: 'tn' },
                                            { value: 'cuñetes', label: 'cuñetes' },
                                        ]}
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className={LABEL_CLS}>Origen</span>
                                    <AdminSelect
                                        value={binding.mode}
                                        onChange={val => handleModeChange(val as WidgetBinding['mode'])}
                                        options={[
                                            { value: 'simulated_value', label: 'Simulado' },
                                            { value: 'real_variable', label: 'Real' },
                                        ]}
                                    />
                                </div>

                                {binding.mode === 'real_variable' && (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <span className={LABEL_CLS}>Var. Prod.</span>
                                            {selectedAsset ? (
                                                <AdminSelect
                                                    value={prodHistoryOptions?.productionVariableKey || ''}
                                                    onChange={val => handleDisplayOptionChange('productionVariableKey', val)}
                                                    placeholder="Seleccione..."
                                                    options={selectedAsset.primaryMetrics.map(metric => ({
                                                        value: metric.label,
                                                        label: metric.label,
                                                    }))}
                                                />
                                            ) : (
                                                <input
                                                    type="text"
                                                    className={INPUT_CLS}
                                                    value={prodHistoryOptions?.productionVariableKey || ''}
                                                    onChange={e => handleDisplayOptionChange('productionVariableKey', e.target.value)}
                                                    placeholder="Clave variable producción"
                                                />
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className={LABEL_CLS}>Var. OEE</span>
                                            {selectedAsset ? (
                                                <AdminSelect
                                                    value={prodHistoryOptions?.oeeVariableKey || ''}
                                                    onChange={val => handleDisplayOptionChange('oeeVariableKey', val)}
                                                    placeholder="Seleccione..."
                                                    options={selectedAsset.primaryMetrics.map(metric => ({
                                                        value: metric.label,
                                                        label: metric.label,
                                                    }))}
                                                />
                                            ) : (
                                                <input
                                                    type="text"
                                                    className={INPUT_CLS}
                                                    value={prodHistoryOptions?.oeeVariableKey || ''}
                                                    onChange={e => handleDisplayOptionChange('oeeVariableKey', e.target.value)}
                                                    placeholder="Clave variable OEE"
                                                />
                                            )}
                                        </div>
                                    </>
                                )}
                            </DockSection>
                        )}

                        {selectedWidget.type === 'prod-history' && (
                            <DockSection icon={<Activity size={11} />} title="Series">
                                <label className="flex items-center gap-2 cursor-pointer group mt-1">
                                    <div className="relative flex items-center">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={prodHistoryOptions?.defaultShowOee !== false}
                                            onChange={e => handleDisplayOptionChange('defaultShowOee', e.target.checked)}
                                        />
                                        <div className="w-7 h-4 rounded-full border border-transparent bg-white/10 transition-all peer peer-checked:bg-white/20 peer-checked:border-white/30 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all"></div>
                                    </div>
                                    <span className="text-[10px] font-bold text-white/70 peer-checked:text-white group-hover:!text-white group-hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.4)] transition-all whitespace-nowrap">
                                        Mostrar OEE
                                    </span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer group mt-1">
                                    <div className="relative flex items-center">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={prodHistoryOptions?.useSecondaryAxis !== false}
                                            onChange={e => handleDisplayOptionChange('useSecondaryAxis', e.target.checked)}
                                        />
                                        <div className="w-7 h-4 rounded-full border border-transparent bg-white/10 transition-all peer peer-checked:bg-white/20 peer-checked:border-white/30 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all"></div>
                                    </div>
                                    <span className="text-[10px] font-bold text-white/70 peer-checked:text-white group-hover:!text-white group-hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.4)] transition-all whitespace-nowrap">
                                        Usar eje secundario para OEE
                                    </span>
                                </label>
                            </DockSection>
                        )}

                        {selectedWidget.type === 'prod-history' && (
                            <DockSection icon={<Sliders size={11} />} title="Escalas">
                                <label className="flex items-center gap-2 cursor-pointer group mt-1">
                                    <div className="relative flex items-center">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={prodHistoryOptions?.autoScale !== false}
                                            onChange={e => handleDisplayOptionChange('autoScale', e.target.checked)}
                                        />
                                        <div className="w-7 h-4 rounded-full border border-transparent bg-white/10 transition-all peer peer-checked:bg-white/20 peer-checked:border-white/30 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all"></div>
                                    </div>
                                    <span className="text-[10px] font-bold text-white/70 peer-checked:text-white group-hover:!text-white group-hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.4)] transition-all whitespace-nowrap">
                                        Autoescala
                                    </span>
                                </label>

                                <div className="flex items-center gap-2">
                                    <span className={LABEL_CLS}>Prod mín</span>
                                    <AdminNumberInput
                                        value={prodHistoryOptions?.productionAxisMin ?? ''}
                                        disabled={prodHistoryOptions?.autoScale !== false}
                                        onChange={val => handleNumericDisplayOptionChange('productionAxisMin', val)}
                                        placeholder="0"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={LABEL_CLS}>Prod máx</span>
                                    <AdminNumberInput
                                        value={prodHistoryOptions?.productionAxisMax ?? ''}
                                        disabled={prodHistoryOptions?.autoScale !== false}
                                        onChange={val => handleNumericDisplayOptionChange('productionAxisMax', val)}
                                        placeholder="250"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={LABEL_CLS}>OEE mín</span>
                                    <AdminNumberInput
                                        value={prodHistoryOptions?.oeeAxisMin ?? ''}
                                        disabled={prodHistoryOptions?.autoScale !== false}
                                        onChange={val => handleNumericDisplayOptionChange('oeeAxisMin', val)}
                                        placeholder="0"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={LABEL_CLS}>OEE máx</span>
                                    <AdminNumberInput
                                        value={prodHistoryOptions?.oeeAxisMax ?? ''}
                                        disabled={prodHistoryOptions?.autoScale !== false}
                                        onChange={val => handleNumericDisplayOptionChange('oeeAxisMax', val)}
                                        placeholder="100"
                                    />
                                </div>
                            </DockSection>
                        )}

                        {selectedWidget.type === 'prod-history' && (
                            <DockSection icon={<Settings size={11} />} title="Layout">
                                <label className="flex items-center gap-2 cursor-pointer group mt-1">
                                    <div className="relative flex items-center">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={prodHistoryOptions?.showGrid !== false}
                                            onChange={e => handleDisplayOptionChange('showGrid', e.target.checked)}
                                        />
                                        <div className="w-7 h-4 rounded-full border border-transparent bg-white/10 transition-all peer peer-checked:bg-white/20 peer-checked:border-white/30 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all"></div>
                                    </div>
                                    <span className="text-[10px] font-bold text-white/70 peer-checked:text-white group-hover:!text-white group-hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.4)] transition-all whitespace-nowrap">
                                        Mostrar grilla
                                    </span>
                                </label>
                            </DockSection>
                        )}

            </div>
        </div>
    );
}

function DockFieldRow({
    label,
    children,
    labelClassName = '',
    controlClassName = '',
    labelStyle,
}: {
    label: React.ReactNode;
    children: React.ReactNode;
    labelClassName?: string;
    controlClassName?: string;
    labelStyle?: React.CSSProperties;
}) {
    return (
        <div className={FIELD_ROW_CLS}>
            <span className={`${FIELD_LABEL_CLS} ${labelClassName}`.trim()} style={labelStyle}>
                {label}
            </span>
            <div className={`min-w-0 flex-1 ${controlClassName}`.trim()}>
                {children}
            </div>
        </div>
    );
}

// =============================================================================
// DockSection — Sección colapsable del panel lateral
// =============================================================================
function DockSection({
    icon,
    title,
    children,
    defaultOpen = true,
}: {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <section className={ADMIN_SIDEBAR_SECTION_CLS}>
            <button
                type="button"
                onClick={() => setOpen(prev => !prev)}
                className={ADMIN_SIDEBAR_SECTION_BUTTON_CLS}
            >
                <span className={SECTION_HEADER_CLS}>
                    {icon}
                    {title}
                </span>
                <ChevronDown size={14} className={`text-industrial-muted transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className={ADMIN_SIDEBAR_SECTION_BODY_CLS}>
                    {children}
                </div>
            )}
        </section>
    );
}
