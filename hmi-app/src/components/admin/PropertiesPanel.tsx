import { Settings2, Trash2, LayoutTemplate, HelpCircle } from 'lucide-react';
import type { WidgetConfig, WidgetLayout, KpiDisplayOptions, MetricCardDisplayOptions, AlertHistoryDisplayOptions, ConnectionStatusDisplayOptions } from '../../domain/admin.types';
import type { EquipmentSummary } from '../../domain/equipment.types';
import BindingEditor from './BindingEditor';

interface PropertiesPanelProps {
    selectedWidget?: WidgetConfig;
    selectedLayout?: WidgetLayout;
    equipmentMap: Map<string, EquipmentSummary>;
    onUpdateWidget: (w: WidgetConfig) => void;
    onUpdateLayout: (l: WidgetLayout) => void;
    onDelete: () => void;
}

// =============================================================================
// PropertiesPanel
// Panel derecho del Dashboard Builder. Permite editar en vivo las propiedades,
// el aspecto (size/col-span) y eventualmente los bindings del widget seleccionado.
// =============================================================================

export default function PropertiesPanel({
    selectedWidget,
    selectedLayout,
    equipmentMap,
    onUpdateWidget,
    onDelete
}: PropertiesPanelProps) {
    if (!selectedWidget || !selectedLayout) {
        return (
            <aside className="w-72 border-l border-white/5 bg-industrial-panel/50 flex flex-col pt-4 shrink-0 z-10 overflow-y-auto hmi-scrollbar">
                <div className="px-4 mb-4 pb-4 border-b border-white/5">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-industrial-muted flex items-center gap-2">
                        <Settings2 size={12} /> Propiedades
                    </h3>
                </div>
                <div className="h-full flex flex-col items-center justify-center text-center text-industrial-muted opacity-50 px-4">
                    <LayoutTemplate className="w-10 h-10 mb-3" />
                    <p className="text-xs font-bold leading-relaxed">
                        Selecciona un widget en el canvas para editar sus propiedades y bindings.
                    </p>
                </div>
            </aside>
        );
    }

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdateWidget({ ...selectedWidget, title: e.target.value });
    };

    // -------------------------------------------------------------------------
    // handleDisplayOptionChange
    // Escritura controlada de displayOptions para el widget seleccionado.
    // El cast a Record<string,unknown> está justificado aquí: este panel es
    // el único punto de escritura de displayOptions en toda la app; los campos
    // escritos están controlados por la UI y son siempre válidos para el tipo.
    // El tipado estricto vive en los renderers — este panel es la capa de edición.
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

    const handleUnitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const binding = { ...selectedWidget.binding, mode: selectedWidget.binding?.mode || 'simulated_value', unit: e.target.value };
        if (!e.target.value) delete (binding as any).unit;
        onUpdateWidget({ ...selectedWidget, binding });
    };

    return (
        <aside className="w-72 border-l border-white/5 bg-industrial-panel/50 flex flex-col pt-4 shrink-0 z-10 overflow-y-auto hmi-scrollbar">
            <div className="px-4 mb-4 pb-4 border-b border-white/5 flex justify-between items-center">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-industrial-muted flex items-center gap-2">
                    <Settings2 size={12} /> Propiedades
                </h3>
                <button
                    onClick={onDelete}
                    className="p-1.5 text-red-500/50 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                    title="Eliminar widget"
                >
                    <Trash2 size={15} />
                </button>
            </div>

            <div className="px-4 flex-1 space-y-6 pb-6">
                {/* 1. TIPO */}
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-industrial-muted block mb-2">Tipo de Componente</label>
                    <div className="text-xs font-medium text-slate-300 bg-white/5 px-2 py-1.5 rounded inline-block border border-white/5">
                        {selectedWidget.type}
                    </div>
                </div>

                {/* 2. IDENTIDAD */}
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-industrial-muted block mb-2">Título del Widget</label>
                    <input
                        type="text"
                        className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-cyan/50 transition-colors"
                        value={selectedWidget.title || ''}
                        onChange={handleTitleChange}
                        placeholder="ej. Velocidad Principal"
                    />
                </div>

                {/* 3. SUBTÍTULO del header — para KPI y MetricCard */}
                {(selectedWidget.type === 'kpi' || selectedWidget.type === 'metric-card') && (
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-industrial-muted block mb-2">Subtítulo del Header</label>
                        <input
                            type="text"
                            className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-cyan/50 transition-colors"
                            value={(selectedWidget.displayOptions as KpiDisplayOptions | MetricCardDisplayOptions | undefined)?.subtitle || ''}
                            onChange={e => handleDisplayOptionChange('subtitle', e.target.value)}
                            placeholder="ej. Estado: Nominal"
                        />
                        <p className="mt-1 text-[9px] text-industrial-muted">Aparece debajo del título en el encabezado del widget.</p>
                    </div>
                )}

                {selectedWidget.type === 'connection-status' && (
                    <>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-industrial-muted block mb-2">Conectado</label>
                            <input
                                type="text"
                                className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-cyan/50 transition-colors"
                                value={(selectedWidget.displayOptions as ConnectionStatusDisplayOptions | undefined)?.connectedText || ''}
                                onChange={e => handleDisplayOptionChange('connectedText', e.target.value)}
                                placeholder="Conectado"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-industrial-muted block mb-2">Desconectado</label>
                            <input
                                type="text"
                                className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-cyan/50 transition-colors"
                                value={(selectedWidget.displayOptions as ConnectionStatusDisplayOptions | undefined)?.disconnectedText || ''}
                                onChange={e => handleDisplayOptionChange('disconnectedText', e.target.value)}
                                placeholder="Sin datos de conexion."
                            />
                        </div>
                    </>
                )}

                {/* 4. SUBTEXTO (footer) — para KPI y MetricCard */}
                {(selectedWidget.type === 'kpi' || selectedWidget.type === 'metric-card') && (
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-industrial-muted block mb-2">Subtexto Aclaratorio</label>
                        <input
                            type="text"
                            className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-cyan/50 transition-colors"
                            value={(selectedWidget.displayOptions as KpiDisplayOptions | MetricCardDisplayOptions | undefined)?.subtext || ''}
                            onChange={e => handleDisplayOptionChange('subtext', e.target.value)}
                            placeholder="ej. Límite: 45°C"
                        />
                        <p className="mt-1 text-[9px] text-industrial-muted">Aparece en la parte inferior del widget.</p>
                    </div>
                )}

                {/* 4. VISUALIZACIÓN & FORMATO */}
                {selectedWidget.type !== 'connection-status' && (
                    <div className="border-t border-white/5 pt-6 space-y-6">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-industrial-muted flex items-center gap-2">
                            Visualización & Formato
                        </h4>

                    {/* ÍCONO — disponible para todos los tipos con íconos */}
                        <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-industrial-muted block mb-2">Ícono Principal</label>
                        {(() => {
                            const currentIcon = selectedWidget.type === 'alert-history'
                                ? (selectedWidget.displayOptions as AlertHistoryDisplayOptions | undefined)?.icon
                                : (selectedWidget.displayOptions as KpiDisplayOptions | MetricCardDisplayOptions | undefined)?.icon;

                            const iconValue = currentIcon === undefined
                                ? '__pending__'
                                : currentIcon === null
                                  ? '__none__'
                                  : currentIcon;

                            return (
                                <select
                            className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-cyan/50 appearance-none"
                            value={iconValue}
                            onChange={e => {
                                const nextValue = e.target.value;
                                if (nextValue === '__none__') {
                                    handleDisplayOptionChange('icon', null);
                                    return;
                                }
                                if (nextValue === '__pending__') {
                                    handleDisplayOptionChange('icon', '');
                                    return;
                                }
                                handleDisplayOptionChange('icon', nextValue);
                            }}
                        >
                            <option value="__pending__">(Ícono pendiente)</option>
                            <option value="__none__">Sin ícono</option>
                            {/* Opción exclusiva de alert-history */}
                            {selectedWidget.type === 'alert-history' && (
                                <option value="History">Historial (History)</option>
                            )}
                            <option value="Gauge">Medidor (Gauge)</option>
                            <option value="Activity">Actividad (Activity)</option>
                            <option value="Thermometer">Termómetro (Thermometer)</option>
                            <option value="Zap">Energía (Zap)</option>
                            <option value="Droplet">Líquido (Droplet)</option>
                            <option value="Wind">Flujo/Viento (Wind)</option>
                            <option value="Settings">Mecánico (Settings)</option>
                            <option value="Fan">Rotor (Rotor)</option>
                            <option value="FoldVertical">Compresión (Compression)</option>
                        </select>
                            );
                        })()}
                        <p className="mt-1 text-[9px] text-industrial-muted flex items-center gap-1">
                            <HelpCircle size={10} className="text-industrial-muted" />
                            Si está pendiente, el widget muestra un placeholder gris.
                        </p>
                        </div>

                    {/* UNIDAD — no aplica para alert-history */}
                    {selectedWidget.type !== 'alert-history' && (
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-industrial-muted block mb-2">Unidad de Medida</label>
                            <input
                                type="text"
                                className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-cyan/50 transition-colors"
                                value={selectedWidget.binding?.unit || ''}
                                onChange={handleUnitChange}
                                placeholder="ej. °C, RPM, %"
                            />
                        </div>
                    )}
                    </div>
                )}

                {selectedWidget.type === 'kpi' && (
                    <div className="border-t border-white/5 pt-6 space-y-6">
                        {/* 5. ESTILO VISUAL */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-industrial-muted block mb-2">Estilo Visual</label>
                            <select
                                className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-cyan/50 appearance-none"
                                value={(selectedWidget.displayOptions as KpiDisplayOptions | undefined)?.kpiMode || 'circular'}
                                onChange={e => handleDisplayOptionChange('kpiMode', e.target.value)}
                            >
                                <option value="circular">Progreso Radial</option>
                                <option value="bar">Barra Horizontal</option>
                            </select>
                        </div>

                        {/* MIN / MAX */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-industrial-muted block mb-2">Valor Mínimo</label>
                                <input
                                    type="number"
                                    step="any"
                                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-cyan/50 transition-colors"
                                    value={(selectedWidget.displayOptions as KpiDisplayOptions | undefined)?.min ?? 0}
                                    onChange={e => handleDisplayOptionChange('min', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-industrial-muted block mb-2">Valor Máximo</label>
                                <input
                                    type="number"
                                    step="any"
                                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-cyan/50 transition-colors"
                                    value={(selectedWidget.displayOptions as KpiDisplayOptions | undefined)?.max ?? 100}
                                    onChange={e => handleDisplayOptionChange('max', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* 6. COLOR DINÁMICO */}
                        <div className="pt-2">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                    checked={!!(selectedWidget.displayOptions as KpiDisplayOptions | undefined)?.dynamicColor}
                                    onChange={e => handleDisplayOptionChange('dynamicColor', e.target.checked)}
                                    />
                                    <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-cyan"></div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-white group-hover:text-accent-cyan transition-colors">Color Dinámico</span>
                                    <span className="text-[10px] text-industrial-muted">Cambia el color al superar umbrales (Warning/Critical)</span>
                                </div>
                            </label>
                        </div>
                    </div>
                )}

                {/* Origen de datos — no aplica para alert-history (usa dashboardId propio) */}
                {selectedWidget.type !== 'alert-history' && (
                    <BindingEditor
                        widget={selectedWidget}
                        equipmentMap={equipmentMap}
                        onUpdate={onUpdateWidget}
                    />
                )}

            </div>
        </aside>
    );
}
