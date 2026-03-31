import { Settings2, Trash2, LayoutTemplate } from 'lucide-react';
import type { WidgetConfig, WidgetLayout } from '../../domain/admin.types';
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
            <aside className="w-72 border-l border-white/5 bg-industrial-panel/50 flex flex-col pt-4 shrink-0 z-10 overflow-y-auto">
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

    const handleDisplayOptionChange = (key: string, value: string | number | boolean) => {
        if (!selectedWidget) return;

        const displayOptions: Record<string, unknown> = { ...(selectedWidget.displayOptions || {}) };
        if (!value) {
            displayOptions[key] = undefined;
        } else {
            displayOptions[key] = value;
        }
        onUpdateWidget({ ...selectedWidget, displayOptions });
    };

    const handleUnitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const binding = { ...selectedWidget.binding, mode: selectedWidget.binding?.mode || 'simulated_value', unit: e.target.value };
        if (!e.target.value) delete (binding as any).unit;
        onUpdateWidget({ ...selectedWidget, binding });
    };

    return (
        <aside className="w-72 border-l border-white/5 bg-industrial-panel/50 flex flex-col pt-4 shrink-0 z-10 overflow-y-auto">
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

                {/* 3. SUBTEXTO */}
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-industrial-muted block mb-2">Subtexto Aclaratorio</label>
                    <input
                        type="text"
                        className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-cyan/50 transition-colors"
                        value={(selectedWidget.displayOptions?.subtext as string) || ''}
                        onChange={e => handleDisplayOptionChange('subtext', e.target.value)}
                        placeholder="ej. Target 12.0"
                    />
                </div>

                {/* 4. VISUALIZACIÓN & FORMATO */}
                <div className="border-t border-white/5 pt-6 space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-industrial-muted flex items-center gap-2">
                        Visualización & Formato
                    </h4>

                    {/* ÍCONO */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-industrial-muted block mb-2">Ícono Principal</label>
                        <select
                            className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-cyan/50 appearance-none"
                            value={(selectedWidget.displayOptions?.icon as string) || 'Gauge'}
                            onChange={e => handleDisplayOptionChange('icon', e.target.value)}
                        >
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
                    </div>

                    {/* UNIDAD */}
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
                </div>

                {selectedWidget.type === 'kpi' && (
                    <div className="border-t border-white/5 pt-6 space-y-6">
                        {/* 5. ESTILO VISUAL */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-industrial-muted block mb-2">Estilo Visual</label>
                            <select
                                className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-cyan/50 appearance-none"
                                value={(selectedWidget.displayOptions?.kpiMode as string) || 'circular'}
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
                                    value={selectedWidget.displayOptions?.min !== undefined ? Number(selectedWidget.displayOptions.min) : 0}
                                    onChange={e => handleDisplayOptionChange('min', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-industrial-muted block mb-2">Valor Máximo</label>
                                <input
                                    type="number"
                                    step="any"
                                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-cyan/50 transition-colors"
                                    value={selectedWidget.displayOptions?.max !== undefined ? Number(selectedWidget.displayOptions.max) : 100}
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
                                        checked={!!selectedWidget.displayOptions?.dynamicColor}
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

                {/* 7 y 8 resueltos internamente en BindingEditor */}
                <BindingEditor
                    widget={selectedWidget}
                    equipmentMap={equipmentMap}
                    onUpdate={onUpdateWidget}
                />

            </div>
        </aside>
    );
}
