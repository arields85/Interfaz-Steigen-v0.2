import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// =============================================================================
// STORE: Shader Params (Zustand)
//
// Contiene los parámetros runtime del fondo WebGL EventHorizon.
// Persistido en localStorage para que los ajustes sobrevivan recargas.
//
// Los valores se consumen desde EventHorizonBackground (frame loop)
// y se editan desde GlobalSettingsDialog > BackgroundSettingsTab.
// =============================================================================

// ---------------------------------------------------------------------------
// Default parameter values (single source of truth)
// ---------------------------------------------------------------------------

export const SHADER_DEFAULTS = {
    // Nebula
    nebShow: 1,
    nebSpeed: 0.11,
    nebIntensity: 0.5,
    nebVariation: 0.14,
    nebHue: 0.0,
    nebContrast: 0.48,
    nebDensity: 0.3,
    nebSat: 0.5,
    nebColorVar: 1.0,
    nebColorShift: 1.0,
    // Stars
    starShow: 1,
    starDensity: 1.1,
    starBrightness: 0.8,
    starTwinkle: 0.6,
    starSize: 0.95,
    starParallax: 1.0,
    // Lensing (magnifying-glass distortion)
    lensShow: 1,
    lensMass: 0.08,
    lensSize: 0.27,
    lensOpacity: 0.21,
    lensAutoOpacity: 1,
    lensAutoSpeed: 0.25,
    lensDriftSpeed: 0.45,
    // Chromatic aberration
    chromShow: 1,
    chromIntensity: 0.5,
    // Mouse nebula displacement (purple cloud reacting to cursor)
    nebMouseShow: 1,
    nebMouseIntensity: 0.45,
    nebMouseLag: 0.01,
    // Cursor nebula
    cursorNebShow: 1,
    cursorNebIntensity: 0.76,
    cursorNebRadius: 1.2,
    cursorNebLag: 0.01,
    // Cursor halo
    haloShow: 1,
    haloIntensity: 0.11,
    haloLag: 0.21,
    // Click ring
    ringShow: 1,
    ringIntensity: 0.3,
    ringSpeed: 0.25,
    ringWidth: 0.72,
    ringLife: 1.0,
    ringHue: 0.84,
    ringSaturation: 1.0,
    // Vignette
    vigShow: 1,
} as const;

export type ShaderParams = { -readonly [K in keyof typeof SHADER_DEFAULTS]: number };

// ---------------------------------------------------------------------------
// Uniform name mapping (param key -> GLSL uniform name)
// ---------------------------------------------------------------------------

export const UNIFORM_MAP: Partial<Record<keyof ShaderParams, string>> = {
    nebShow: 'u_nebShow',
    nebSpeed: 'u_nebSpeed',
    nebIntensity: 'u_nebIntensity',
    nebVariation: 'u_nebVariation',
    nebHue: 'u_nebHue',
    nebContrast: 'u_nebContrast',
    nebDensity: 'u_nebDensity',
    nebSat: 'u_nebSat',
    nebColorVar: 'u_nebColorVar',
    nebColorShift: 'u_nebColorShift',
    starShow: 'u_starShow',
    starDensity: 'u_starDensity',
    starBrightness: 'u_starBrightness',
    starTwinkle: 'u_starTwinkle',
    starSize: 'u_starSize',
    starParallax: 'u_starParallax',
    lensShow: 'u_lensShow',
    lensMass: 'u_lensMass',
    lensSize: 'u_lensSize',
    lensOpacity: 'u_lensOpacity',
    chromShow: 'u_chromShow',
    chromIntensity: 'u_chromIntensity',
    nebMouseShow: 'u_nebMouseShow',
    nebMouseIntensity: 'u_nebMouseIntensity',
    cursorNebShow: 'u_cursorNebShow',
    cursorNebIntensity: 'u_cursorNebIntensity',
    cursorNebRadius: 'u_cursorNebRadius',
    haloShow: 'u_haloShow',
    haloIntensity: 'u_haloIntensity',
    ringShow: 'u_ringShow',
    ringIntensity: 'u_ringIntensity',
    ringSpeed: 'u_ringSpeed',
    ringWidth: 'u_ringWidth',
    ringLife: 'u_ringLife',
    ringHue: 'u_ringHue',
    ringSaturation: 'u_ringSaturation',
    vigShow: 'u_vigShow',
};

// ---------------------------------------------------------------------------
// Panel section definitions (used by BackgroundSettingsTab)
// ---------------------------------------------------------------------------

export type ControlDef = {
    key: keyof ShaderParams;
    label: string;
    min: number;
    max: number;
    step: number;
};

export type SectionDef = {
    title: string;
    toggleKey?: keyof ShaderParams;
    controls: ControlDef[];
};

export const SHADER_SECTIONS: SectionDef[] = [
    {
        title: 'Nebula',
        toggleKey: 'nebShow',
        controls: [
            { key: 'nebSpeed', label: 'Speed', min: 0, max: 0.5, step: 0.005 },
            { key: 'nebIntensity', label: 'Intensity', min: 0, max: 2, step: 0.02 },
            { key: 'nebVariation', label: 'Variation', min: 0, max: 1, step: 0.02 },
            { key: 'nebContrast', label: 'Contrast', min: 0, max: 1, step: 0.02 },
            { key: 'nebDensity', label: 'Density', min: 0, max: 1, step: 0.01 },
            { key: 'nebHue', label: 'Hue', min: 0, max: 1, step: 0.01 },
            { key: 'nebSat', label: 'Saturation', min: 0, max: 2, step: 0.02 },
            { key: 'nebColorVar', label: 'Color Variation', min: 0, max: 1, step: 0.02 },
            { key: 'nebColorShift', label: 'Color Shift', min: 0, max: 1, step: 0.01 },
        ],
    },
    {
        title: 'Stars',
        toggleKey: 'starShow',
        controls: [
            { key: 'starDensity', label: 'Density', min: 0, max: 3, step: 0.05 },
            { key: 'starBrightness', label: 'Brightness', min: 0, max: 2.5, step: 0.05 },
            { key: 'starSize', label: 'Size', min: 0.3, max: 2.5, step: 0.05 },
            { key: 'starTwinkle', label: 'Twinkle', min: 0, max: 1, step: 0.02 },
            { key: 'starParallax', label: 'Parallax Depth', min: 0, max: 3, step: 0.05 },
        ],
    },
    {
        title: 'Gravitational Lensing',
        toggleKey: 'lensShow',
        controls: [
            { key: 'lensMass', label: 'Intensity', min: 0.01, max: 0.3, step: 0.005 },
            { key: 'lensSize', label: 'Size', min: 0.05, max: 1.0, step: 0.01 },
            { key: 'lensOpacity', label: 'Max Opacity', min: 0, max: 1, step: 0.01 },
            { key: 'lensAutoOpacity', label: 'Auto Breathing (0=Off 1=On)', min: 0, max: 1, step: 1 },
            { key: 'lensAutoSpeed', label: 'Breathing Speed', min: 0.05, max: 2.0, step: 0.05 },
            { key: 'lensDriftSpeed', label: 'Drift Speed', min: 0.1, max: 3.0, step: 0.05 },
        ],
    },
    {
        title: 'Chromatic Aberration',
        toggleKey: 'chromShow',
        controls: [
            { key: 'chromIntensity', label: 'Intensity', min: 0, max: 2, step: 0.02 },
        ],
    },
    {
        title: 'Mouse Nebula',
        toggleKey: 'nebMouseShow',
        controls: [
            { key: 'nebMouseIntensity', label: 'Intensity', min: 0, max: 2.5, step: 0.05 },
            { key: 'nebMouseLag', label: 'Follow Delay', min: 0.003, max: 0.2, step: 0.002 },
        ],
    },
    {
        title: 'Cursor Nebula',
        toggleKey: 'cursorNebShow',
        controls: [
            { key: 'cursorNebIntensity', label: 'Intensity', min: 0, max: 1.5, step: 0.02 },
            { key: 'cursorNebRadius', label: 'Radius', min: 0.5, max: 4.0, step: 0.1 },
            { key: 'cursorNebLag', label: 'Follow Delay', min: 0.005, max: 0.3, step: 0.005 },
        ],
    },
    {
        title: 'Cursor Halo',
        toggleKey: 'haloShow',
        controls: [
            { key: 'haloIntensity', label: 'Intensity', min: 0, max: 0.5, step: 0.01 },
            { key: 'haloLag', label: 'Follow Delay', min: 0.005, max: 0.3, step: 0.005 },
        ],
    },
    {
        title: 'Click Ring',
        toggleKey: 'ringShow',
        controls: [
            { key: 'ringIntensity', label: 'Intensity', min: 0, max: 3.0, step: 0.05 },
            { key: 'ringSpeed', label: 'Expansion Speed', min: 0.1, max: 3.5, step: 0.05 },
            { key: 'ringWidth', label: 'Width', min: 0, max: 1, step: 0.02 },
            { key: 'ringLife', label: 'Duration', min: 0.2, max: 3.0, step: 0.05 },
            { key: 'ringHue', label: 'Color Hue', min: 0, max: 1, step: 0.01 },
            { key: 'ringSaturation', label: 'Saturation', min: 0, max: 2, step: 0.02 },
        ],
    },
    {
        title: 'Vignette',
        toggleKey: 'vigShow',
        controls: [],
    },
];

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface ShaderParamsStore {
    params: ShaderParams;
    updateParam: (key: keyof ShaderParams, value: number) => void;
    resetAll: () => void;
}

export const useShaderParamsStore = create<ShaderParamsStore>()(
    persist(
        (set) => ({
            params: { ...SHADER_DEFAULTS } as ShaderParams,

            updateParam: (key, value) =>
                set((s) => ({
                    params: { ...s.params, [key]: value },
                })),

            resetAll: () =>
                set({ params: { ...SHADER_DEFAULTS } as ShaderParams }),
        }),
        {
            name: 'hmi-shader-params',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ params: state.params }),
        },
    ),
);
