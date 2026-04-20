import { useState } from 'react';
import type { DashboardAspect } from '../../domain/admin.types';
import AdminNumberInput from './AdminNumberInput';
import {
    ADMIN_CONTEXT_BAR_LABEL_CLS,
    ADMIN_SIDEBAR_PANEL_STACK_CLS,
    ADMIN_SIDEBAR_SECTION_BODY_CLS,
    ADMIN_SIDEBAR_SECTION_CLS,
    ADMIN_SIDEBAR_SECTION_HEADER_CLS,
} from './adminSidebarStyles';

interface DashboardSettingsPanelProps {
    aspect: DashboardAspect;
    cols: number;
    rows: number;
    onAspectChange: (aspect: DashboardAspect) => void;
    onColsChange: (cols: number) => void;
    onRowsChange: (rows: number) => void;
}

const ASPECT_OPTIONS: readonly DashboardAspect[] = ['16:9', '21:9', '4:3'];
const MIN_COLS = 4;
const MAX_COLS = 40;
const MIN_ROWS = 4;
const MAX_ROWS = 24;

export default function DashboardSettingsPanel({
    aspect,
    cols,
    rows,
    onAspectChange,
    onColsChange,
    onRowsChange,
}: DashboardSettingsPanelProps) {
    const [colsError, setColsError] = useState<string | null>(null);
    const [rowsError, setRowsError] = useState<string | null>(null);

    const handleColsChange = (value: string) => {
        const parsed = Number(value);

        if (!Number.isInteger(parsed) || parsed < MIN_COLS || parsed > MAX_COLS) {
            setColsError(`Ingresá un valor entero entre ${MIN_COLS} y ${MAX_COLS}.`);
            return;
        }

        setColsError(null);
        onColsChange(parsed);
    };

    const handleRowsChange = (value: string) => {
        const parsed = Number(value);

        if (!Number.isInteger(parsed) || parsed < MIN_ROWS || parsed > MAX_ROWS) {
            setRowsError(`Ingresá un valor entero entre ${MIN_ROWS} y ${MAX_ROWS}.`);
            return;
        }

        setRowsError(null);
        onRowsChange(parsed);
    };

    return (
        <section
            aria-label="Configuración del dashboard"
            className="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border border-white/10 bg-industrial-surface/95 shadow-2xl backdrop-blur-sm"
        >
            <div className="border-b border-white/5 px-4 py-3">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-white">Configuración del dashboard</h2>
            </div>

            <div className={`${ADMIN_SIDEBAR_PANEL_STACK_CLS} max-h-80 overflow-y-auto hmi-scrollbar`}>
                <div className={ADMIN_SIDEBAR_SECTION_CLS}>
                    <div className={ADMIN_SIDEBAR_SECTION_BODY_CLS}>
                        <div className="pt-3">
                            <p className={ADMIN_SIDEBAR_SECTION_HEADER_CLS}>Canvas</p>
                        </div>

                        <fieldset>
                            <legend className={ADMIN_CONTEXT_BAR_LABEL_CLS}>Aspect</legend>
                            <div role="radiogroup" aria-label="Aspect" className="mt-2 grid grid-cols-3 gap-2">
                                {ASPECT_OPTIONS.map((option) => {
                                    const isSelected = option === aspect;

                                    return (
                                        <label
                                            key={option}
                                            className={[
                                                'flex cursor-pointer items-center justify-center rounded-md border px-2 py-1.5 text-xs font-bold transition-colors',
                                                isSelected
                                                    ? 'border-admin-accent/60 bg-admin-accent/15 text-white'
                                                    : 'border-white/10 bg-black/20 text-industrial-muted hover:border-white/20 hover:text-white',
                                            ].join(' ')}
                                        >
                                            <input
                                                checked={isSelected}
                                                className="sr-only"
                                                name="dashboard-aspect"
                                                type="radio"
                                                value={option}
                                                onChange={() => onAspectChange(option)}
                                            />
                                            {option}
                                        </label>
                                    );
                                })}
                            </div>
                        </fieldset>

                        <div>
                            <label className={`${ADMIN_CONTEXT_BAR_LABEL_CLS} block`} htmlFor="dashboard-settings-cols-input">
                                COLUMNAS
                            </label>
                            <div className="mt-2 flex items-center gap-2">
                                <AdminNumberInput
                                    inputId="dashboard-settings-cols-input"
                                    ariaLabel="COLUMNAS"
                                    ariaInvalid={Boolean(colsError)}
                                    value={cols}
                                    min={MIN_COLS}
                                    max={MAX_COLS}
                                    step={1}
                                    commitOnBlur
                                    onChange={handleColsChange}
                                />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-industrial-muted">
                                    {MIN_COLS}–{MAX_COLS}
                                </span>
                            </div>
                            {colsError ? (
                                <p role="alert" className="mt-2 text-[11px] font-semibold text-status-critical">
                                    {colsError}
                                </p>
                            ) : (
                                <p className="mt-2 text-[11px] text-industrial-muted">
                                    Ajustá la densidad horizontal del canvas sin salir del builder.
                                </p>
                            )}
                        </div>

                        <div>
                            <label className={`${ADMIN_CONTEXT_BAR_LABEL_CLS} block`} htmlFor="dashboard-settings-rows-input">
                                Filas
                            </label>
                            <div className="mt-2 flex items-center gap-2">
                                <AdminNumberInput
                                    inputId="dashboard-settings-rows-input"
                                    ariaLabel="Filas"
                                    ariaInvalid={Boolean(rowsError)}
                                    value={rows}
                                    min={MIN_ROWS}
                                    max={MAX_ROWS}
                                    step={1}
                                    commitOnBlur
                                    onChange={handleRowsChange}
                                />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-industrial-muted">
                                    {MIN_ROWS}–{MAX_ROWS}
                                </span>
                            </div>
                            {rowsError ? (
                                <p role="alert" className="mt-2 text-[11px] font-semibold text-status-critical">
                                    {rowsError}
                                </p>
                            ) : (
                                <p className="mt-2 text-[11px] text-industrial-muted">
                                    Ajustá la densidad vertical del canvas sin salir del builder.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
