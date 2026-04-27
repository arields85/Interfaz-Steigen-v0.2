import { useCallback, useState } from 'react';
import { RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';
import { useShaderParamsStore, SHADER_SECTIONS } from '../../store/shaderParams.store';
import type { ShaderParams } from '../../store/shaderParams.store';
import HoverTooltip from '../ui/HoverTooltip';

// =============================================================================
// BackgroundSettingsTab
// Controles del fondo WebGL EventHorizon, migrados desde el tweaks panel.
// Lee/escribe al Zustand store que EventHorizonBackground consume en su frame loop.
// =============================================================================

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!value)}
            className={`relative w-8 h-[18px] rounded-full border transition-colors ${
                value
                    ? 'bg-admin-accent/20 border-admin-accent/50'
                    : 'bg-white/8 border-white/10'
            }`}
        >
            <span
                className={`absolute top-[2px] left-[2px] w-3 h-3 rounded-full transition-all ${
                    value
                        ? 'translate-x-3.5 bg-admin-accent shadow-[0_0_6px_var(--color-admin-accent)]'
                        : 'bg-industrial-muted'
                }`}
            />
        </button>
    );
}

export default function BackgroundSettingsTab() {
    const params = useShaderParamsStore((s) => s.params);
    const updateParam = useShaderParamsStore((s) => s.updateParam);
    const resetAll = useShaderParamsStore((s) => s.resetAll);
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

    const toggleSection = useCallback((title: string) => {
        setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
    }, []);

    return (
        <div>
            {/* Header with reset */}
            <div className="mb-3 flex items-center justify-between">
                <span className="uppercase text-industrial-muted">
                    Fondo Animado
                </span>
                <HoverTooltip label="Restaurar valores por defecto" position="bottom" className="flex">
                    <button
                        type="button"
                        aria-label="Restaurar valores por defecto"
                        onClick={resetAll}
                        className="flex items-center gap-1.5 uppercase text-industrial-muted hover:text-admin-accent transition-colors"
                    >
                        <RotateCcw size={12} />
                        Reset
                    </button>
                </HoverTooltip>
            </div>

            <div className="space-y-1">
                {SHADER_SECTIONS.map((section) => {
                    const isCollapsed = collapsed[section.title];
                    const isEnabled = section.toggleKey
                        ? params[section.toggleKey] > 0.5
                        : true;

                    return (
                        <div key={section.title} className="rounded-lg">
                            {/* Section header */}
                            <div className="flex items-center gap-2 px-2 py-1.5">
                                <button
                                    type="button"
                                    onClick={() => toggleSection(section.title)}
                                    className="text-industrial-muted hover:text-industrial-text transition-colors"
                                >
                                    {isCollapsed ? (
                                        <ChevronRight size={14} />
                                    ) : (
                                        <ChevronDown size={14} />
                                    )}
                                </button>
                                <span
                                    className={`flex-1 uppercase cursor-pointer ${
                                        isEnabled
                                            ? 'text-industrial-text'
                                            : 'text-industrial-muted'
                                    }`}
                                    onClick={() => toggleSection(section.title)}
                                >
                                    {section.title}
                                </span>
                                {section.toggleKey && (
                                    <Toggle
                                        value={isEnabled}
                                        onChange={(v) =>
                                            updateParam(
                                                section.toggleKey as keyof ShaderParams,
                                                v ? 1 : 0,
                                            )
                                        }
                                    />
                                )}
                            </div>

                            {/* Section body */}
                            {!isCollapsed && section.controls.length > 0 && (
                                <div
                                    className={`px-2 pb-2 space-y-2 ${
                                        !isEnabled
                                            ? 'opacity-30 pointer-events-none'
                                            : ''
                                    }`}
                                >
                                    {section.controls.map((ctrl) => (
                                        <div key={ctrl.key} className="space-y-0.5">
                                            <div className="flex justify-between">
                                                <span className="text-industrial-muted">
                                                    {ctrl.label}
                                                </span>
                                                <span className="font-mono text-industrial-muted/70 tabular-nums">
                                                    {params[ctrl.key].toFixed(2)}
                                                </span>
                                            </div>
                                            <input
                                                type="range"
                                                min={ctrl.min}
                                                max={ctrl.max}
                                                step={ctrl.step}
                                                value={params[ctrl.key]}
                                                onChange={(e) =>
                                                    updateParam(
                                                        ctrl.key,
                                                        parseFloat(e.target.value),
                                                    )
                                                }
                                                className="w-full h-1 appearance-none rounded-full bg-white/8 accent-admin-accent cursor-pointer [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-admin-accent [&::-webkit-slider-thumb]:shadow-[0_0_6px_var(--color-admin-accent)]"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
