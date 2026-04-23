// =============================================================================
// Adapter: Data History
// Anti-corruption layer entre la respuesta cruda del endpoint y el dominio.
//
// Este adapter valida el shape general de la respuesta, normaliza campos
// faltantes con defaults seguros y conserva gaps (`value: null`) para que
// la capa de visualización pueda renderizar huecos reales en la serie.
//
// Contrato oficial: docs/DATA_CONTRACT.md
// =============================================================================

import {
    HISTORY_RANGES,
    type DataHistoryResponse,
    type HistoryDataPoint,
    type HistoryRange,
    type HistorySummary,
} from '../domain/dataContract.types';

interface RawHistoryPoint {
    timestamp?: unknown;
    value?: unknown;
}

interface RawHistorySummary {
    last?: unknown;
    min?: unknown;
    max?: unknown;
    avg?: unknown;
}

interface RawHistoryResponse {
    contractVersion?: unknown;
    machineId?: unknown;
    variableKey?: unknown;
    range?: unknown;
    unit?: unknown;
    series?: unknown;
    summary?: unknown;
}

const DEFAULT_HISTORY_RANGE: HistoryRange = 'hora';
const DEFAULT_CONTRACT_VERSION = '1.0.0';
const DEFAULT_SUMMARY: HistorySummary = {
    last: null,
    min: null,
    max: null,
    avg: null,
};

/**
 * Adapta la respuesta cruda del endpoint de histórico al dominio tipado.
 */
export function adaptDataHistory(raw: unknown): DataHistoryResponse {
    const response = (raw ?? {}) as RawHistoryResponse;

    return {
        contractVersion: toNonEmptyString(response.contractVersion) ?? DEFAULT_CONTRACT_VERSION,
        machineId: toMachineId(response.machineId),
        variableKey: toNonEmptyString(response.variableKey) ?? '',
        range: toHistoryRange(response.range),
        unit: toNullableString(response.unit),
        series: adaptSeries(response.series),
        summary: adaptSummary(response.summary),
    };
}

function adaptSeries(raw: unknown): HistoryDataPoint[] {
    if (!Array.isArray(raw)) {
        return [];
    }

    return raw
        .map((point) => adaptPoint(point as RawHistoryPoint))
        .filter((point): point is HistoryDataPoint => point !== null);
}

function adaptPoint(raw: RawHistoryPoint): HistoryDataPoint | null {
    const timestamp = toNonEmptyString(raw.timestamp);

    if (!timestamp) {
        return null;
    }

    return {
        timestamp,
        value: toNumericOrNull(raw.value),
    };
}

function adaptSummary(raw: unknown): HistorySummary {
    if (!raw || typeof raw !== 'object') {
        return DEFAULT_SUMMARY;
    }

    const summary = raw as RawHistorySummary;

    return {
        last: toNumericOrNull(summary.last),
        min: toNumericOrNull(summary.min),
        max: toNumericOrNull(summary.max),
        avg: toNumericOrNull(summary.avg),
    };
}

function toHistoryRange(raw: unknown): HistoryRange {
    if (typeof raw !== 'string') {
        return DEFAULT_HISTORY_RANGE;
    }

    return HISTORY_RANGES.includes(raw as HistoryRange)
        ? (raw as HistoryRange)
        : DEFAULT_HISTORY_RANGE;
}

function toMachineId(raw: unknown): number {
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
}

function toFiniteNumber(raw: unknown): number | null {
    if (typeof raw === 'number') {
        return Number.isFinite(raw) ? raw : null;
    }

    if (typeof raw === 'string' && raw.trim() !== '') {
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

function toNumericOrNull(raw: unknown): number | null {
    if (raw === null || raw === undefined) {
        return null;
    }

    return toFiniteNumber(raw);
}

function toNonEmptyString(raw: unknown): string | null {
    if (typeof raw !== 'string') {
        return null;
    }

    const trimmed = raw.trim();
    return trimmed === '' ? null : trimmed;
}

function toNullableString(raw: unknown): string | null {
    return toNonEmptyString(raw);
}
