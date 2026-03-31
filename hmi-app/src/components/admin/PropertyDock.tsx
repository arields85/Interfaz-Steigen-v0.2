import { useState } from 'react';
import { Settings2, Trash2, X, Database, Zap, Eye, Sliders, Tag, Copy, Gauge, Activity, Thermometer, Droplet, Wind, Settings, Fan, FoldVertical } from 'lucide-react';
import type { WidgetConfig, WidgetBinding, WidgetLayout } from '../../domain/admin.types';
import type { EquipmentSummary } from '../../domain/equipment.types';
import AdminSelect from './AdminSelect';
import AdminNumberInput from './AdminNumberInput';

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

export default function PropertyDock({
    selectedWidget,
    selectedLayout,
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

    // --- Handlers ---
    const handleDisplayOptionChange = (key: string, value: string | number | boolean) => {
        if (!selectedWidget) return;
        const displayOptions: Record<string, unknown> = { ...(selectedWidget.displayOptions || {}) };
        if (!value && value !== 0) {
            displayOptions[key] = undefined;
        } else {
            displayOptions[key] = value;
        }
        onUpdateWidget({ ...selectedWidget, displayOptions });
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

    return (
        <div
            className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out ${isVisible ? 'translate-y-0' : 'translate-y-full'
                }`}
        >
            {/* Dock container */}
            <div className="bg-[#0a0f1a]/95 backdrop-blur-xl border-t border-white/10 rounded-t-2xl shadow-[0_-8px_40px_rgba(0,0,0,0.6)]">
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
                            <div className="flex items-center gap-2">
                                <span className={LABEL_CLS}>Subtexto</span>
                                <input
                                    type="text"
                                    className={INPUT_CLS}
                                    value={(selectedWidget.displayOptions?.subtext as string) || ''}
                                    onChange={e => handleDisplayOptionChange('subtext', e.target.value)}
                                    placeholder="ej. Target 12.0"
                                />
                            </div>
                        </DockSection>

                        {/* ─── VISUAL ─── */}
                        <DockSection icon={<Eye size={11} />} title="Visual">
                            <div className="flex items-center gap-2">
                                <span className={LABEL_CLS}>Ícono</span>
                                <AdminSelect
                                    value={(selectedWidget.displayOptions?.icon as string) || 'Gauge'}
                                    onChange={val => handleDisplayOptionChange('icon', val)}
                                    options={[
                                        { value: 'Gauge', label: 'Medidor', icon: <Gauge size={12} /> },
                                        { value: 'Activity', label: 'Actividad', icon: <Activity size={12} /> },
                                        { value: 'Thermometer', label: 'Termómetro', icon: <Thermometer size={12} /> },
                                        { value: 'Zap', label: 'Energía', icon: <Zap size={12} /> },
                                        { value: 'Droplet', label: 'Líquido', icon: <Droplet size={12} /> },
                                        { value: 'Wind', label: 'Flujo/Viento', icon: <Wind size={12} /> },
                                        { value: 'Settings', label: 'Mecánico', icon: <Settings size={12} /> },
                                        { value: 'Fan', label: 'Rotor', icon: <Fan size={12} /> },
                                        { value: 'FoldVertical', label: 'Compresión', icon: <FoldVertical size={12} /> },
                                    ]}
                                />
                            </div>
                            {(() => {
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
                                        value={(selectedWidget.displayOptions?.kpiMode as string) || 'circular'}
                                        onChange={val => handleDisplayOptionChange('kpiMode', val)}
                                        options={[
                                            { value: 'circular', label: 'Radial' },
                                            { value: 'bar', label: 'Barra' },
                                        ]}
                                    />
                                </div>
                            )}
                        </DockSection>

                        {/* ─── RANGO (solo KPI) ─── */}
                        {isKpi && (
                            <DockSection icon={<Sliders size={11} />} title="Rango">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className={LABEL_CLS}>MIN</span>
                                        <AdminNumberInput
                                            value={selectedWidget.displayOptions?.min !== undefined ? Number(selectedWidget.displayOptions.min) : 0}
                                            onChange={val => handleDisplayOptionChange('min', val)}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={LABEL_CLS}>MAX</span>
                                        <AdminNumberInput
                                            value={selectedWidget.displayOptions?.max !== undefined ? Number(selectedWidget.displayOptions.max) : 100}
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
                                            checked={!!selectedWidget.displayOptions?.dynamicColor}
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

                        {/* ─── DATOS ─── */}
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
                                    <AdminNumberInput
                                        value={(binding.simulatedValue as string | number) ?? ''}
                                        onChange={handleSimulatedValueChange}
                                        placeholder="Ej. 1500"
                                    />

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
                                    {selectedAsset && (
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

                    </div>
                )}
            </div>
        </div>
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
