import { Database, Zap, Plus, Trash2 } from 'lucide-react';
import type { WidgetConfig, WidgetBinding } from '../../domain/admin.types';
import type { EquipmentSummary } from '../../domain/equipment.types';

interface BindingEditorProps {
    widget: WidgetConfig;
    equipmentMap: Map<string, EquipmentSummary>;
    onUpdate: (widget: WidgetConfig) => void;
}

// =============================================================================
// BindingEditor
// Sub-panel de propiedades para configurar la fuente de datos del widget y sus
// umbrales (Thresholds). Permite conmutar entre origen simulado y real.
// =============================================================================

export default function BindingEditor({ widget, equipmentMap, onUpdate }: BindingEditorProps) {
    const binding = widget.binding || { mode: 'simulated_value', simulatedValue: 0 };
    const thresholds = widget.thresholds || [];

    const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const mode = e.target.value as WidgetBinding['mode'];
        onUpdate({ 
            ...widget, 
            binding: { ...binding, mode }
        });
    };

    const handleSimulatedValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        onUpdate({ 
            ...widget, 
            binding: { ...binding, simulatedValue: isNaN(Number(val)) ? val : Number(val) }
        });
    };

    const handleAssetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const assetId = e.target.value;
        onUpdate({ 
            ...widget, 
            binding: { ...binding, assetId, variableKey: undefined } // Reset variable when asset changes
        });
    };

    const handleVariableChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        // En un caso real, la unidad se autocompletaría del diccionario de métricas. 
        // Aquí pasamos unidad fija para RPM o kN según mock, o dejamos que resuelva.
        const variableKey = e.target.value;
        onUpdate({ 
            ...widget, 
            binding: { ...binding, variableKey } 
        });
    };

    const handleAddThreshold = (severity: 'warning' | 'critical') => {
        onUpdate({
            ...widget,
            thresholds: [...thresholds, { severity, value: 0 }]
        });
    };

    const handleUpdateThreshold = (index: number, value: number) => {
        const newThresholds = [...thresholds];
        newThresholds[index] = { ...newThresholds[index], value };
        onUpdate({ ...widget, thresholds: newThresholds });
    };

    const handleRemoveThreshold = (index: number) => {
        onUpdate({
            ...widget,
            thresholds: thresholds.filter((_, i) => i !== index)
        });
    };

    // Obtener variables disponibles según el activo seleccionado (modo Real)
    const selectedAsset = binding.assetId ? equipmentMap.get(binding.assetId) : undefined;

    return (
        <div className="space-y-6">
            
            {/* ORIGEN DE DATOS */}
            <div className="border-t border-white/5 pt-6">
                <label className="text-[10px] font-black uppercase tracking-widest text-industrial-muted block mb-3 flex items-center gap-2">
                    <Database size={12} /> Origen de Datos
                </label>
                
                <div className="space-y-4">
                    <select 
                        className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-cyan/50 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_10px_center]"
                        value={binding.mode}
                        onChange={handleModeChange}
                    >
                        <option value="simulated_value">Valor Simulado (Mock)</option>
                        <option value="real_variable">Variable Real de Planta</option>
                    </select>

                    {binding.mode === 'simulated_value' && (
                        <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg space-y-2">
                            <label className="text-[10px] text-industrial-muted font-bold block">Valor actual simulado</label>
                            {widget.type === 'connection-status' ? (
                                <select
                                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent-cyan/50 appearance-none"
                                    value={(() => {
                                        const simulated = binding.simulatedValue;
                                        if (simulated === true || simulated === 1 || simulated === '1' || simulated === 'true' || simulated === 'conectado') {
                                            return 'connected';
                                        }
                                        return 'disconnected';
                                    })()}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        onUpdate({
                                            ...widget,
                                            binding: {
                                                ...binding,
                                                simulatedValue: value === 'connected' ? 1 : 0,
                                            },
                                        });
                                    }}
                                >
                                    <option value="connected">Conectado</option>
                                    <option value="disconnected">Desconectado</option>
                                </select>
                            ) : (
                                <input 
                                    type="number"
                                    step="any" 
                                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-1.5 text-sm text-accent-cyan font-mono focus:outline-none focus:border-accent-cyan/50"
                                    value={(binding.simulatedValue as string | number) ?? ''}
                                    onChange={handleSimulatedValueChange}
                                    placeholder="Ej. 1500"
                                />
                            )}
                        </div>
                    )}

                    {binding.mode === 'real_variable' && (
                        <div className="p-3 bg-white/[0.02] border border-accent-cyan/10 rounded-lg space-y-3">
                            <div>
                                <label className="text-[10px] text-industrial-muted font-bold block mb-1">Activo / Equipo</label>
                                <select 
                                    className="w-full bg-black/60 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-accent-cyan/50 appearance-none"
                                    value={binding.assetId || ''}
                                    onChange={handleAssetChange}
                                >
                                    <option value="" disabled>Seleccione un equipo...</option>
                                    {Array.from(equipmentMap.values()).map(eq => (
                                        <option key={eq.id} value={eq.id}>{eq.name} ({eq.id})</option>
                                    ))}
                                </select>
                            </div>

                            {selectedAsset && widget.type !== 'connection-status' && (
                                <div>
                                    <label className="text-[10px] text-industrial-muted font-bold block mb-1">Variable Mapeada</label>
                                    <select 
                                        className="w-full bg-black/60 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-accent-cyan/50 appearance-none"
                                        value={binding.variableKey || ''}
                                        onChange={handleVariableChange}
                                    >
                                        <option value="" disabled>Seleccione variable...</option>
                                        {selectedAsset.primaryMetrics.map(m => (
                                            <option key={m.label} value={m.label}>{m.label}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* THRESHOLDS (Solo útil para kpis o métricas, pero expuesto para demo) */}
            {(widget.type === 'metric-card' || widget.type === 'kpi') && (
                <div className="border-t border-white/5 pt-6">
                    <label className="text-[10px] font-black uppercase tracking-widest text-industrial-muted block mb-3 flex items-center justify-between">
                        <span className="flex items-center gap-2"><Zap size={12} /> Umbrales (Thresholds)</span>
                    </label>

                    <div className="space-y-3">
                        {thresholds.length === 0 && (
                            <div className="text-[10px] text-industrial-muted italic">Sin umbrales. El valor será normal.</div>
                        )}
                        
                        {thresholds.map((th, index) => (
                            <div key={index} className="flex flex-col gap-1 p-2 bg-white/[0.02] border border-white/5 rounded">
                                <div className="flex justify-between items-center">
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${th.severity === 'critical' ? 'text-red-400' : 'text-amber-400'}`}>
                                        {th.severity === 'critical' ? 'CRÍTICO SI >' : 'ALERTA SI >'}
                                    </span>
                                    <button onClick={() => handleRemoveThreshold(index)} className="text-white/20 hover:text-red-400"><Trash2 size={12} /></button>
                                </div>
                                <input 
                                    type="number"
                                    className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none"
                                    value={th.value}
                                    onChange={(e) => handleUpdateThreshold(index, parseFloat(e.target.value))}
                                />
                            </div>
                        ))}

                        <div className="flex gap-2 pt-2">
                            <button 
                                onClick={() => handleAddThreshold('warning')}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase hover:bg-amber-500/20 transition-colors"
                            >
                                <Plus size={10} /> Alerta
                            </button>
                            <button 
                                onClick={() => handleAddThreshold('critical')}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold uppercase hover:bg-red-500/20 transition-colors"
                            >
                                <Plus size={10} /> Crítico
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
