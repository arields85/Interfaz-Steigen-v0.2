import { useState } from 'react';
import { Settings2, Trash2, X, Database, Zap, Eye, Sliders, Tag, Copy, Gauge, Activity, Thermometer, Droplet, Wind, Settings, Fan, FoldVertical, History, HelpCircle, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import type { WidgetConfig, WidgetBinding, WidgetLayout, KpiDisplayOptions, MetricCardDisplayOptions, AlertHistoryDisplayOptions, ConnectionStatusDisplayOptions, ConnectionIndicatorDisplayOptions, StatusDisplayOptions } from '../../domain/admin.types';
import type { ConnectionState, EquipmentSummary } from '../../domain/equipment.types';
import AdminSelect from './AdminSelect';
import AdminNumberInput from './AdminNumberInput';
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
    isOpen: boolean;
    onToggleOpen: () => void;
    equipmentMap: Map<string, EquipmentSummary>;
    onUpdateWidget: (w: WidgetConfig) => void;
    onUpdateLayout: (l: WidgetLayout) => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onDeselect: () => void;
}

// --- Shared input class tokens ---
const INPUT_CLS = 'w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-admin-accent/50 transition-colors';
const LABEL_CLS = 'text-[9px] font-bold uppercase whitespace-nowrap text-industrial-muted w-14';
const SECTION_HEADER_CLS = 'text-[10px] font-black uppercase tracking-widest text-industrial-muted flex items-center gap-1.5 mb-2';

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

export default function PropertyDock({
    selectedWidget,
    selectedLayout,
    isOpen,
    onToggleOpen,
    equipmentMap,
    onUpdateWidget,
    onDelete,
    onDuplicate,
    onDeselect
}: PropertyDockProps) {
    // Track which tab is active for mobile/overflow — optional future enhancement 
    const [_activeTab] = useState(0);
    void _activeTab; // suppress unused warning for now

    const [isCustomUnit, setIsCustomUnit] = useState(false);

    const isVisible = !!selectedWidget && !!selectedLayout;

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

    const handleUnitChange = (val: string) => {
        if (!selectedWidget) return;
        const binding = { ...selectedWidget.binding, mode: selectedWidget.binding?.mode || 'simulated_value' as const, unit: val };
        if (!val) delete (binding as any).unit;
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

    const handleUpdateThreshold = (index: number, value: number) => {
        if (!selectedWidget) return;
        const newThresholds = [...thresholds];
        newThresholds[index] = { ...newThresholds[index], value };
        onUpdateWidget({ ...selectedWidget, thresholds: newThresholds });
    };


    const selectedAsset = binding.assetId ? equipmentMap.get(binding.assetId) : undefined;
    const isKpi = selectedWidget?.type === 'kpi';
    const showThresholds = isKpi || selectedWidget?.type === 'metric-card';

    if (!isVisible) {
        return null;
    }

    return (
        <>
            {!isOpen && (
                <div className="fixed bottom-3 right-4 z-50">
                    <button
                        type="button"
                        onClick={onToggleOpen}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-industrial-surface/95 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-industrial-muted shadow-lg backdrop-blur-sm transition-colors hover:text-white hover:border-admin-accent/40"
                        title="Expandir panel de propiedades"
                        aria-label="Expandir panel de propiedades"
                    >
                        <Settings2 size={12} />
                        Propiedades
                        <ChevronUp size={12} />
                    </button>
                </div>
            )}

            {/* Dock container */}
            <div
                className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
                aria-hidden={!isOpen}
            >
            <div className="bg-industrial-surface/95 backdrop-blur-xl border-t border-white/10 rounded-t-2xl shadow-2xl">
                {/* Top bar: Title + Close */}
                <div className="flex items-center justify-between px-5 pt-3 pb-2 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <Settings2 size={14} className="text-industrial-muted" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-industrial-muted">
                            Propiedades
                        </span>
                        {selectedWidget && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase admin-accent-ghost">
                                {selectedWidget.type}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={onToggleOpen}
                            className="p-1.5 text-industrial-muted hover:text-white hover:bg-white/5 rounded transition-colors"
                            title="Colapsar panel"
                            aria-label="Colapsar panel"
                        >
                            <ChevronDown size={14} />
                        </button>
                        <button
                            onClick={onDuplicate}
                            className="p-1.5 text-industrial-muted hover:text-white hover:bg-white/5 rounded transition-colors"
                            title="Duplicar widget"
                        >
                            <Copy size={14} />
                        </button>
                        <button
                            onClick={onDelete}
                            className="p-1.5 text-industrial-muted hover:text-white hover:bg-white/5 rounded transition-colors"
                            title="Eliminar widget"
                        >
                            <Trash2 size={14} />
                        </button>
                        <button
                            onClick={onDeselect}
                            className="p-1.5 text-industrial-muted hover:text-white hover:bg-white/5 rounded transition-colors"
                            title="Cerrar panel"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Sections row */}
                {selectedWidget && (
                    <div className="flex items-stretch px-4 py-3 gap-0 overflow-x-auto">

                        {/* ─── GENERAL ─── */}
                        <DockSection icon={<Tag size={11} />} title="General">
                            <div className="flex items-center gap-2">
                                <span className={LABEL_CLS}>Título</span>
                                <input
                                    type="text"
                                    className={INPUT_CLS}
                                    value={selectedWidget.title || ''}
                                    onChange={e => onUpdateWidget({ ...selectedWidget, title: e.target.value })}
                                    placeholder="ej. Velocidad"
                                />
                            </div>
                            {/* Subtítulo: header del widget (debajo del título). KPI y MetricCard. */}
                            {(selectedWidget.type === 'kpi' || selectedWidget.type === 'metric-card') && (
                                <div className="flex items-center gap-2">
                                    <span className={LABEL_CLS}>Subtítulo</span>
                                    <input
                                        type="text"
                                        className={INPUT_CLS}
                                        value={(selectedWidget.displayOptions as KpiDisplayOptions | MetricCardDisplayOptions | undefined)?.subtitle || ''}
                                        onChange={e => handleDisplayOptionChange('subtitle', e.target.value)}
                                        placeholder="ej. Estado: OK"
                                    />
                                </div>
                            )}
                            {/* Subtexto: footer del widget (parte inferior). KPI y MetricCard. */}
                            {(selectedWidget.type === 'kpi' || selectedWidget.type === 'metric-card') && (
                                <div className="flex items-center gap-2">
                                    <span className={LABEL_CLS}>Subtexto</span>
                                    <input
                                        type="text"
                                        className={INPUT_CLS}
                                        value={(selectedWidget.displayOptions as KpiDisplayOptions | MetricCardDisplayOptions | undefined)?.subtext || ''}
                                        onChange={e => handleDisplayOptionChange('subtext', e.target.value)}
                                        placeholder="ej. Límite: 45°C"
                                    />
                                </div>
                            )}

                            {selectedWidget.type === 'connection-status' && (
                                <>
                                    {CONNECTION_STATUS_TEXT_FIELDS.map(({ key, label, placeholder }) => (
                                        <div key={key} className="flex items-center gap-2">
                                            <span className={LABEL_CLS}>{label}</span>
                                            <input
                                                type="text"
                                                className={INPUT_CLS}
                                                value={(selectedWidget.displayOptions as ConnectionStatusDisplayOptions | undefined)?.[key] || ''}
                                                onChange={e => handleDisplayOptionChange(key, e.target.value)}
                                                placeholder={placeholder}
                                            />
                                        </div>
                                    ))}
                                </>
                            )}

                            {selectedWidget.type === 'connection-indicator' && (
                                <>
                                    {CONNECTION_INDICATOR_TEXT_FIELDS.map(({ key, label, placeholder }) => (
                                        <div key={key} className="flex items-center gap-2">
                                            <span className={LABEL_CLS}>{label}</span>
                                            <input
                                                type="text"
                                                className={INPUT_CLS}
                                                value={(selectedWidget.displayOptions as ConnectionIndicatorDisplayOptions | undefined)?.[key] || ''}
                                                onChange={e => handleDisplayOptionChange(key, e.target.value)}
                                                placeholder={placeholder}
                                            />
                                        </div>
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
                                        <div key={key} className="flex items-center gap-2">
                                            <span className={LABEL_CLS}>{label}</span>
                                            <input
                                                type="text"
                                                className={INPUT_CLS}
                                                value={(selectedWidget.displayOptions as StatusDisplayOptions | undefined)?.[key] || ''}
                                                onChange={e => handleDisplayOptionChange(key, e.target.value)}
                                                placeholder={placeholder}
                                            />
                                        </div>
                                    ))}
                                </>
                            )}
                        </DockSection>

                        {/* ─── VISUAL ─── */}
                        {selectedWidget.type !== 'connection-status' && selectedWidget.type !== 'connection-indicator' && selectedWidget.type !== 'status' && (
                            <DockSection icon={<Eye size={11} />} title="Visual">
                                <div className="flex items-center gap-2">
                                    <span className={LABEL_CLS}>Ícono</span>
                                    <AdminSelect
                                        value={(() => {
                                            const currentIcon = selectedWidget.type === 'alert-history'
                                                ? (selectedWidget.displayOptions as AlertHistoryDisplayOptions | undefined)?.icon
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
                                            // History solo aparece como primera opción en alert-history
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
                                </div>
                                {/* Unidad: no aplica para alert-history */}
                                {selectedWidget.type !== 'alert-history' && (() => {
                                const PRESET_UNITS = ['°C', '°F', 'RPM', '%', 'bar', 'psi', 'kW', 'A', 'V', 'Hz', 'mm', 'kg', 'L/min', 'm³/h', 'N', 'kN'];
                                const currentUnit = selectedWidget.binding?.unit || '';
                                const isPreset = PRESET_UNITS.includes(currentUnit);
                                const showCustom = isCustomUnit || (!isPreset && currentUnit !== '');
                                const selectValue = showCustom ? '__custom__' : currentUnit;
                                return (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <span className={LABEL_CLS}>Unidad</span>
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
                                        </div>
                                        {showCustom && (
                                            <div className="flex items-center gap-2">
                                                <span className={LABEL_CLS}></span>
                                                <input
                                                    type="text"
                                                    className={INPUT_CLS}
                                                    value={currentUnit}
                                                    onChange={e => handleUnitChange(e.target.value)}
                                                    placeholder="Unidad personalizada"
                                                    autoFocus
                                                />
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                                {isKpi && (
                                    <div className="flex items-center gap-2">
                                    <span className={LABEL_CLS}>Estilo</span>
                                    <AdminSelect
                                        value={(selectedWidget.displayOptions as KpiDisplayOptions | undefined)?.kpiMode || 'circular'}
                                        onChange={val => handleDisplayOptionChange('kpiMode', val)}
                                        options={[
                                            { value: 'circular', label: 'Radial' },
                                            { value: 'bar', label: 'Barra' },
                                        ]}
                                    />
                                </div>
                                )}
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
                                {/* ALR > field */}
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`text-[9px] font-bold uppercase whitespace-nowrap w-14 ${thresholds.length > 0 ? '' : 'text-industrial-muted'}`}
                                        style={thresholds.length > 0 ? { color: 'var(--color-status-warning)' } : undefined}
                                    >
                                        ALR &gt;
                                    </span>
                                    <AdminNumberInput
                                        value={thresholds.find(t => t.severity === 'warning')?.value ?? 0}
                                        disabled={thresholds.length === 0}
                                        onChange={val => {
                                            const idx = thresholds.findIndex(t => t.severity === 'warning');
                                            if (idx >= 0) handleUpdateThreshold(idx, parseFloat(val) || 0);
                                        }}
                                    />
                                </div>
                                {/* CRI > field */}
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`text-[9px] font-bold uppercase whitespace-nowrap w-14 ${thresholds.length > 0 ? '' : 'text-industrial-muted'}`}
                                        style={thresholds.length > 0 ? { color: 'var(--color-status-critical)' } : undefined}
                                    >
                                        CRI &gt;
                                    </span>
                                    <AdminNumberInput
                                        value={thresholds.find(t => t.severity === 'critical')?.value ?? 0}
                                        disabled={thresholds.length === 0}
                                        onChange={val => {
                                            const idx = thresholds.findIndex(t => t.severity === 'critical');
                                            if (idx >= 0) handleUpdateThreshold(idx, parseFloat(val) || 0);
                                        }}
                                    />
                                </div>
                                {/* Toggle Activar Umbrales */}
                                <label className="flex items-center gap-2 cursor-pointer group mt-1">
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
                                                        ]
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
                            </DockSection>
                        )}

                        {/* ─── DATOS — no aplica para alert-history (usa evaluación de widgets hermanos) ─── */}
                        {selectedWidget.type !== 'alert-history' && (
                            <DockSection icon={<Database size={11} />} title="Datos" noBorder>
                                <div className="flex items-center gap-2">
                                    <span className={LABEL_CLS}>Origen</span>
                                    <AdminSelect
                                        value={binding.mode}
                                        onChange={val => handleModeChange(val as WidgetBinding['mode'])}
                                        options={[
                                            { value: 'simulated_value', label: 'Simulado' },
                                            { value: 'real_variable', label: 'Variable Real' },
                                        ]}
                                    />
                                </div>

                                {binding.mode === 'simulated_value' && (
                                    <div className="flex items-center gap-2">
                                        <span className={LABEL_CLS}>Valor</span>
                                        {selectedWidget.type === 'connection-status' ? (
                                            <AdminSelect
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
                                                onChange={handleSimulatedValueChange}
                                                placeholder="Ej. 1500"
                                            />
                                        )}

                                    </div>
                                )}

                                {binding.mode === 'real_variable' && (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <span className={LABEL_CLS}>Equipo</span>
                                            <AdminSelect
                                                value={binding.assetId || ''}
                                                onChange={val => handleAssetChange(val)}
                                                placeholder="Seleccione..."
                                                options={Array.from(equipmentMap.values()).map(eq => ({
                                                    value: eq.id,
                                                    label: eq.name,
                                                }))}
                                            />
                                        </div>
                                        {selectedAsset && selectedWidget.type !== 'connection-status' && selectedWidget.type !== 'connection-indicator' && selectedWidget.type !== 'status' && (
                                            <div className="flex items-center gap-2">
                                                <span className={LABEL_CLS}>Variable</span>
                                                <AdminSelect
                                                    value={binding.variableKey || ''}
                                                    onChange={val => handleVariableChange(val)}
                                                    placeholder="Seleccione..."
                                                    options={selectedAsset.primaryMetrics.map(m => ({
                                                        value: m.label,
                                                        label: m.label,
                                                    }))}
                                                />
                                            </div>
                                        )}
                                    </>
                                )}
                            </DockSection>
                        )}

                    </div>
                )}
            </div>
            </div>
        </>
    );
}

// =============================================================================
// DockSection — Columna individual dentro del dock
// =============================================================================
function DockSection({
    icon,
    title,
    children,
    noBorder = false
}: {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
    noBorder?: boolean;
}) {
    return (
        <div className={`flex flex-col gap-2 px-4 min-w-[150px] ${!noBorder ? 'border-r border-white/5' : ''}`}>
            <div className={SECTION_HEADER_CLS}>
                {icon}
                {title}
            </div>
            <div className="flex flex-col gap-2">
                {children}
            </div>
        </div>
    );
}
