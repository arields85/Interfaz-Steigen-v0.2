import { useEffect, useMemo, useState } from 'react';
import AdminActionButton from './AdminActionButton';
import {
    ADMIN_SIDEBAR_HINT_CLS,
    ADMIN_SIDEBAR_INPUT_CLS,
    ADMIN_SIDEBAR_LABEL_CLS,
} from './adminSidebarStyles';

const FONT_STORAGE_KEY = 'hmi-theme-fonts';
const COLOR_STORAGE_KEY = 'hmi-theme-colors';

const FONT_TOKENS = [
    { key: '--font-sans', label: 'Tipografia General', description: 'Textos, titulos, UI', weightKey: '--font-weight-sans' },
    { key: '--font-mono', label: 'Tipografia Monoespaciada', description: 'Codigo, URLs, valores', weightKey: '--font-weight-mono' },
    { key: '--font-chart', label: 'Tipografia Graficos', description: 'Ejes, labels de charts', weightKey: '--font-weight-chart' },
    { key: '--font-dashboard-title', label: 'Titulos de Dashboard', description: 'Titulo principal de cada dashboard', weightKey: '--font-weight-dashboard-title' },
    { key: '--font-widget-value', label: 'Valores de Widgets', description: 'Valor numerico en KPI y Metric Card', weightKey: '--font-weight-widget-value' },
] as const;

const AVAILABLE_FONTS = [
    'Plus Jakarta Sans',
    'Magistral',
    'Poppins',
    'SpaceGrotesk',
    'JetBrainsMono',
    'AtkinsonHyperlegible',
    'IBMPlexSans',
    'IBMPlexMono',
    'Ubuntu',
    'Lato',
    'Mojang',
    'PixelArial',
] as const;

const AVAILABLE_WEIGHTS = [
    { name: 'Light', value: '300' },
    { name: 'Book', value: '400' },
    { name: 'Medium', value: '500' },
    { name: 'Semi Bold', value: '600' },
    { name: 'Bold', value: '700' },
    { name: 'Extra Bold', value: '800' },
    { name: 'Black', value: '900' },
] as const;

const COLOR_GROUPS = [
    {
        title: 'Base',
        colors: [
            { key: '--color-industrial-bg', label: 'Fondo Principal', defaultValue: '#05070a' },
            { key: '--color-industrial-surface', label: 'Superficie', defaultValue: '#0e1117' },
            { key: '--color-industrial-hover', label: 'Hover', defaultValue: '#161b22' },
            { key: '--color-industrial-border', label: 'Borde Industrial', defaultValue: '#ffffff14' },
            { key: '--color-industrial-text', label: 'Texto Principal', defaultValue: '#f1f5f9' },
            { key: '--color-industrial-muted', label: 'Texto Secundario', defaultValue: '#94a3b8' },
        ],
    },
    {
        title: 'Acentos',
        colors: [
            { key: '--color-accent-cyan', label: 'Cian', defaultValue: '#22d3ee' },
            { key: '--color-accent-purple', label: 'Violeta', defaultValue: '#a855f7' },
            { key: '--color-accent-purple-light', label: 'Violeta Claro', defaultValue: '#927bec' },
            { key: '--color-accent-pink', label: 'Rosa', defaultValue: '#ec4899' },
            { key: '--color-accent-blue', label: 'Azul', defaultValue: '#3b82f6' },
            { key: '--color-accent-blue-glow', label: 'Azul Glow', defaultValue: '#60a5fa' },
            { key: '--color-accent-green', label: 'Verde', defaultValue: '#10b981' },
            { key: '--color-accent-green-glow', label: 'Verde Glow', defaultValue: '#22d3ee' },
            { key: '--color-accent-amber', label: 'Ambar', defaultValue: '#f59e0b' },
            { key: '--color-accent-ruby', label: 'Rojo Ruby', defaultValue: '#ef4444' },
        ],
    },
    {
        title: 'Admin',
        colors: [
            { key: '--color-admin-accent', label: 'Acento Admin', defaultValue: '#a48dff' },
        ],
    },
    {
        title: 'Widgets',
        colors: [
            { key: '--color-widget-gradient-from', label: 'Gradiente Desde', defaultValue: '#3b82f6' },
            { key: '--color-widget-gradient-to', label: 'Gradiente Hasta', defaultValue: '#a855f7' },
            { key: '--color-widget-icon', label: 'Icono Widget', defaultValue: '#927bec' },
        ],
    },
    {
        title: 'Umbrales Dinamicos',
        colors: [
            { key: '--color-dynamic-normal-from', label: 'Normal Desde', defaultValue: '#22d3ee' },
            { key: '--color-dynamic-normal-to', label: 'Normal Hasta', defaultValue: '#10b981' },
            { key: '--color-dynamic-warning-from', label: 'Alerta Desde', defaultValue: '#f59e0b' },
            { key: '--color-dynamic-warning-to', label: 'Alerta Hasta', defaultValue: '#ef4444' },
            { key: '--color-dynamic-critical-from', label: 'Critico Desde', defaultValue: '#ef4444' },
            { key: '--color-dynamic-critical-to', label: 'Critico Hasta', defaultValue: '#ef4444' },
        ],
    },
    {
        title: 'Estado',
        colors: [
            { key: '--color-status-normal', label: 'Estado Normal', defaultValue: '#10b981' },
            { key: '--color-status-warning', label: 'Estado Alerta', defaultValue: '#f59e0b' },
            { key: '--color-status-critical', label: 'Estado Critico', defaultValue: '#ef4444' },
        ],
    },
] as const;

type FontTokenKey = (typeof FONT_TOKENS)[number]['key'];
type FontName = (typeof AVAILABLE_FONTS)[number];
type ColorTokenKey = (typeof COLOR_GROUPS)[number]['colors'][number]['key'];

const DEFAULT_FONT_VALUES: Record<FontTokenKey, FontName> = {
    '--font-sans': 'Plus Jakarta Sans',
    '--font-mono': 'IBMPlexMono',
    '--font-chart': 'IBMPlexMono',
    '--font-dashboard-title': 'Plus Jakarta Sans',
    '--font-widget-value': 'Plus Jakarta Sans',
};

const DEFAULT_WEIGHT_VALUES: Record<string, string> = {
    '--font-weight-sans': '400',
    '--font-weight-mono': '400',
    '--font-weight-chart': '400',
    '--font-weight-dashboard-title': '900',
    '--font-weight-widget-value': '900',
};

const DEFAULT_COLOR_VALUES: Record<ColorTokenKey, string> = COLOR_GROUPS.reduce((accumulator, group) => {
    for (const color of group.colors) {
        accumulator[color.key] = color.defaultValue;
    }

    return accumulator;
}, {} as Record<ColorTokenKey, string>);

function isRecord(value: unknown): value is Record<string, string> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }

    return Object.values(value).every((entry) => typeof entry === 'string');
}

function readStoredOverrides(storageKey: string): Record<string, string> {
    try {
        const storedValue = localStorage.getItem(storageKey);
        if (!storedValue) {
            return {};
        }

        const parsedValue: unknown = JSON.parse(storedValue);
        return isRecord(parsedValue) ? parsedValue : {};
    } catch {
        return {};
    }
}

function writeStoredOverrides(storageKey: string, overrides: Record<string, string>): void {
    if (Object.keys(overrides).length === 0) {
        localStorage.removeItem(storageKey);
        return;
    }

    localStorage.setItem(storageKey, JSON.stringify(overrides));
}

function normalizeColorForInput(colorValue: string): string {
    const trimmedValue = colorValue.trim();

    if (/^#[0-9a-f]{6}$/i.test(trimmedValue)) {
        return trimmedValue.toLowerCase();
    }

    if (/^#[0-9a-f]{8}$/i.test(trimmedValue)) {
        return trimmedValue.slice(0, 7).toLowerCase();
    }

    const rgbMatch = trimmedValue.match(/rgba?\(([^)]+)\)/i);
    if (!rgbMatch) {
        return '#000000';
    }

    const [red = '0', green = '0', blue = '0'] = rgbMatch[1].split(',').map((part) => part.trim());
    const toHex = (value: string) => Math.max(0, Math.min(255, Number.parseInt(value, 10))).toString(16).padStart(2, '0');

    return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

export function applyThemeOverrides(): void {
    try {
        const fonts = localStorage.getItem('hmi-theme-fonts');
        if (fonts) {
            const parsed = JSON.parse(fonts) as Record<string, string>;
            for (const [key, value] of Object.entries(parsed)) {
                document.documentElement.style.setProperty(key, value);
            }
        }
        const colors = localStorage.getItem('hmi-theme-colors');
        if (colors) {
            const parsed = JSON.parse(colors) as Record<string, string>;
            for (const [key, value] of Object.entries(parsed)) {
                document.documentElement.style.setProperty(key, value);
            }
        }
    } catch { /* ignore corrupt data */ }
}

export default function DesignSettingsTab() {
    const [fontValues, setFontValues] = useState<Record<FontTokenKey, FontName>>(DEFAULT_FONT_VALUES);
    const [weightValues, setWeightValues] = useState<Record<string, string>>(DEFAULT_WEIGHT_VALUES);
    const [colorValues, setColorValues] = useState<Record<ColorTokenKey, string>>(DEFAULT_COLOR_VALUES);

    useEffect(() => {
        applyThemeOverrides();

        const storedFonts = readStoredOverrides(FONT_STORAGE_KEY);
        const storedColors = readStoredOverrides(COLOR_STORAGE_KEY);

        setFontValues({
            ...DEFAULT_FONT_VALUES,
            ...(storedFonts as Partial<Record<FontTokenKey, FontName>>),
        });
        for (const token of FONT_TOKENS) {
            if (token.weightKey && storedFonts[token.weightKey]) {
                setWeightValues(prev => ({ ...prev, [token.weightKey!]: storedFonts[token.weightKey!] }));
            }
        }
        setColorValues({
            ...DEFAULT_COLOR_VALUES,
            ...(storedColors as Partial<Record<ColorTokenKey, string>>),
        });
    }, []);

    const fontStorageOverrides = useMemo(() => {
        return FONT_TOKENS.reduce((accumulator, fontToken) => {
            const selectedFont = fontValues[fontToken.key];
            if (selectedFont !== DEFAULT_FONT_VALUES[fontToken.key]) {
                accumulator[fontToken.key] = selectedFont;
            }

            if (fontToken.weightKey) {
                const selectedWeight = weightValues[fontToken.weightKey] ?? DEFAULT_WEIGHT_VALUES[fontToken.weightKey];
                if (selectedWeight !== DEFAULT_WEIGHT_VALUES[fontToken.weightKey]) {
                    accumulator[fontToken.weightKey] = selectedWeight;
                }
            }

            return accumulator;
        }, {} as Record<string, string>);
    }, [fontValues, weightValues]);

    const colorStorageOverrides = useMemo(() => {
        return Object.entries(colorValues).reduce((accumulator, [key, value]) => {
            const colorKey = key as ColorTokenKey;
            if (normalizeColorForInput(value) !== normalizeColorForInput(DEFAULT_COLOR_VALUES[colorKey])) {
                accumulator[colorKey] = value;
            }

            return accumulator;
        }, {} as Record<string, string>);
    }, [colorValues]);

    const handleFontChange = (fontKey: FontTokenKey, nextFont: FontName) => {
        const nextValues = {
            ...fontValues,
            [fontKey]: nextFont,
        } satisfies Record<FontTokenKey, FontName>;

        setFontValues(nextValues);

        if (nextFont === DEFAULT_FONT_VALUES[fontKey]) {
            document.documentElement.style.removeProperty(fontKey);
        } else {
            document.documentElement.style.setProperty(fontKey, nextFont);
        }

        const nextOverrides = FONT_TOKENS.reduce((accumulator, fontToken) => {
            const selectedFont = nextValues[fontToken.key];
            if (selectedFont !== DEFAULT_FONT_VALUES[fontToken.key]) {
                accumulator[fontToken.key] = selectedFont;
            }

            if (fontToken.weightKey) {
                const selectedWeight = weightValues[fontToken.weightKey] ?? DEFAULT_WEIGHT_VALUES[fontToken.weightKey];
                if (selectedWeight !== DEFAULT_WEIGHT_VALUES[fontToken.weightKey]) {
                    accumulator[fontToken.weightKey] = selectedWeight;
                }
            }

            return accumulator;
        }, {} as Record<string, string>);

        writeStoredOverrides(FONT_STORAGE_KEY, nextOverrides);
    };

    const handleColorChange = (colorKey: ColorTokenKey, nextColor: string) => {
        const defaultPickerValue = normalizeColorForInput(DEFAULT_COLOR_VALUES[colorKey]);
        const shouldRemoveOverride = normalizeColorForInput(nextColor) === defaultPickerValue;
        const resolvedColor = shouldRemoveOverride ? DEFAULT_COLOR_VALUES[colorKey] : nextColor;
        const nextValues = {
            ...colorValues,
            [colorKey]: resolvedColor,
        } satisfies Record<ColorTokenKey, string>;

        setColorValues(nextValues);

        if (shouldRemoveOverride) {
            document.documentElement.style.removeProperty(colorKey);
        } else {
            document.documentElement.style.setProperty(colorKey, nextColor);
        }

        const nextOverrides = Object.entries(nextValues).reduce((accumulator, [key, value]) => {
            const typedKey = key as ColorTokenKey;
            if (normalizeColorForInput(value) !== normalizeColorForInput(DEFAULT_COLOR_VALUES[typedKey])) {
                accumulator[typedKey] = value;
            }

            return accumulator;
        }, {} as Record<string, string>);

        writeStoredOverrides(COLOR_STORAGE_KEY, nextOverrides);
    };

    const handleWeightChange = (weightKey: string, nextWeight: string) => {
        setWeightValues(prev => ({ ...prev, [weightKey]: nextWeight }));
        document.documentElement.style.setProperty(weightKey, nextWeight);

        const currentFontOverrides = readStoredOverrides(FONT_STORAGE_KEY);
        if (nextWeight === DEFAULT_WEIGHT_VALUES[weightKey]) {
            delete currentFontOverrides[weightKey];
        } else {
            currentFontOverrides[weightKey] = nextWeight;
        }
        writeStoredOverrides(FONT_STORAGE_KEY, currentFontOverrides);
    };

    const handleResetFonts = () => {
        localStorage.removeItem(FONT_STORAGE_KEY);
        for (const fontToken of FONT_TOKENS) {
            document.documentElement.style.removeProperty(fontToken.key);
            if (fontToken.weightKey) {
                document.documentElement.style.removeProperty(fontToken.weightKey);
            }
        }
        setFontValues(DEFAULT_FONT_VALUES);
        setWeightValues(DEFAULT_WEIGHT_VALUES);
    };

    const handleReset = () => {
        localStorage.removeItem(FONT_STORAGE_KEY);
        localStorage.removeItem(COLOR_STORAGE_KEY);

        for (const fontToken of FONT_TOKENS) {
            document.documentElement.style.removeProperty(fontToken.key);
            if (fontToken.weightKey) {
                document.documentElement.style.removeProperty(fontToken.weightKey);
            }
        }

        for (const group of COLOR_GROUPS) {
            for (const color of group.colors) {
                document.documentElement.style.removeProperty(color.key);
            }
        }

        setFontValues(DEFAULT_FONT_VALUES);
        setWeightValues(DEFAULT_WEIGHT_VALUES);
        setColorValues(DEFAULT_COLOR_VALUES);
    };

    return (
        <div className="max-h-[55vh] overflow-y-auto hmi-scrollbar pr-1">
            <section>
                <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-industrial-muted">
                        Tipografias
                    </h4>
                    <p className={`mt-1 ${ADMIN_SIDEBAR_HINT_CLS}`}>
                        Personaliza las familias tipograficas de la interfaz sin tocar los tokens base.
                    </p>
                </div>

                <div className="mt-3 space-y-3">
                    {FONT_TOKENS.map((fontToken) => {
                        const selectedFont = fontValues[fontToken.key];

                        return (
                            <div key={fontToken.key} className="space-y-1.5">
                                <label className={`${ADMIN_SIDEBAR_LABEL_CLS} block`}>
                                    {fontToken.label}
                                </label>
                                <select
                                    value={selectedFont}
                                    onChange={(event) => handleFontChange(fontToken.key, event.target.value as FontName)}
                                    className={`${ADMIN_SIDEBAR_INPUT_CLS} w-full px-3 py-2 text-sm`}
                                    style={{ fontFamily: selectedFont }}
                                >
                                    {AVAILABLE_FONTS.map((fontName) => (
                                        <option key={fontName} value={fontName} style={{ fontFamily: fontName }}>
                                            {fontName}
                                        </option>
                                    ))}
                                </select>
                                {fontToken.weightKey && (
                                    <div className="flex items-center justify-end gap-2 mt-1">
                                        <span className="text-[10px] text-industrial-muted uppercase tracking-wider">Peso</span>
                                        <select
                                            value={weightValues[fontToken.weightKey] ?? DEFAULT_WEIGHT_VALUES[fontToken.weightKey]}
                                            onChange={(e) => handleWeightChange(fontToken.weightKey!, e.target.value)}
                                            className={`${ADMIN_SIDEBAR_INPUT_CLS} max-w-[10rem] px-2 py-1 text-xs`}
                                        >
                                            {AVAILABLE_WEIGHTS.map((w) => (
                                                <option key={w.value} value={w.value}>{w.name} ({w.value})</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div className="flex items-center justify-between gap-3">
                                    <p className={ADMIN_SIDEBAR_HINT_CLS}>{fontToken.description}</p>
                                    <span className="text-[10px] text-industrial-muted" style={{ fontFamily: selectedFont }}>
                                        {selectedFont}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-3 flex justify-end">
                    <AdminActionButton
                        variant="secondary"
                        onClick={handleResetFonts}
                        disabled={Object.keys(fontStorageOverrides).length === 0}
                    >
                        Restaurar tipografias
                    </AdminActionButton>
                </div>
            </section>

            <section className="border-t border-white/5 pt-4 mt-4">
                <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-industrial-muted">
                        Colores
                    </h4>
                    <p className={`mt-1 ${ADMIN_SIDEBAR_HINT_CLS}`}>
                        Ajusta la paleta activa y guarda overrides locales en este navegador.
                    </p>
                </div>

                <div className="mt-3 space-y-4">
                    {COLOR_GROUPS.map((group) => (
                        <div key={group.title} className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-industrial-muted">
                                {group.title}
                            </p>

                            <div className="space-y-2">
                                {group.colors.map((color) => {
                                    const currentColor = colorValues[color.key];

                                    return (
                                        <div
                                            key={color.key}
                                            className="flex items-center gap-3 rounded-md border border-white/5 bg-black/10 px-3 py-2"
                                        >
                                            <div
                                                className="w-4 h-4 rounded border border-white/20 shrink-0"
                                                style={{ backgroundColor: currentColor }}
                                                aria-hidden="true"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-medium text-white">{color.label}</p>
                                                <p className={ADMIN_SIDEBAR_HINT_CLS}>{color.key}</p>
                                            </div>
                                            <input
                                                type="color"
                                                value={normalizeColorForInput(currentColor)}
                                                onChange={(event) => handleColorChange(color.key, event.target.value)}
                                                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0 appearance-none"
                                                aria-label={`Elegir color para ${color.label}`}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <div className="border-t border-white/5 pt-4 mt-4 flex justify-end">
                <AdminActionButton variant="secondary" onClick={handleReset} disabled={Object.keys(fontStorageOverrides).length === 0 && Object.keys(colorStorageOverrides).length === 0}>
                    Restaurar paleta original
                </AdminActionButton>
            </div>
        </div>
    );
}
