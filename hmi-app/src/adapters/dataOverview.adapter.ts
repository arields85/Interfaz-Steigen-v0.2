// =============================================================================
// Adapter: Data Overview
// Anti-corruption layer entre la respuesta cruda del endpoint y el dominio.
//
// Este adapter es DUAL — soporta dos shapes de respuesta:
//
// 1. Contrato oficial v1.0 (con connection, machines[].status, etc.)
//    → Passthrough: mapea directamente a los tipos del dominio.
//
// 2. Respuesta legacy (sin connection, sin status por máquina)
//    → Mapeo seguro: llena los campos faltantes con defaults seguros.
//    → Esto NO es derivación de health — es el adapter cumpliendo su rol
//      de mapear cualquier forma de respuesta a los tipos del dominio.
//
// Cuando la API se actualice al contrato oficial, los defaults dejan de
// usarse automáticamente (el passthrough toma precedencia).
//
// Contrato oficial: docs/DATA_CONTRACT.md
// =============================================================================

import type {
    ConnectionHealth,
    ContractMachine,
    ContractMetricValue,
    ContractStatus,
} from '../domain/dataContract.types';

// -----------------------------------------------------------------------------
// Tipos internos para la respuesta cruda (cualquier shape)
// -----------------------------------------------------------------------------

interface RawValue {
    value?: number | string | null;
    unit?: string;
    timestamp?: string;
    displayName?: string;
}

interface RawMachine {
    unitId: number;
    name: string;
    status?: string;
    lastSuccess?: string | null;
    ageMs?: number | null;
    values?: Record<string, RawValue>;
    variables?: Array<{ key: string; value: number | string | null; unit?: string; timestamp?: string }>;
}

interface RawConnection {
    globalStatus?: string;
    lastSuccess?: string | null;
    ageMs?: number | null;
}

interface RawResponse {
    contractVersion?: string;
    timestamp?: string;
    connection?: RawConnection;
    machines?: RawMachine[];
}

// -----------------------------------------------------------------------------
// Adapter público
// -----------------------------------------------------------------------------

/**
 * Resultado adaptado listo para consumo por la capa de queries/hooks.
 */
export interface AdaptedDataOverview {
    connection: ConnectionHealth;
    machines: ContractMachine[];
}

const VALID_STATUSES: ContractStatus[] = ['online', 'degradado', 'offline', 'unknown'];

function toContractStatus(raw: string | undefined): ContractStatus {
    if (!raw) return 'unknown';
    const normalized = raw.trim().toLowerCase();
    return VALID_STATUSES.includes(normalized as ContractStatus)
        ? (normalized as ContractStatus)
        : 'unknown';
}

/**
 * Adapta la respuesta cruda del endpoint al dominio del contrato.
 * Soporta tanto el contrato oficial como la respuesta legacy.
 */
export function adaptDataOverview(raw: unknown): AdaptedDataOverview {
    const response = (raw ?? {}) as RawResponse;

    return {
        connection: adaptConnection(response.connection),
        machines: adaptMachines(response.machines),
    };
}

// -----------------------------------------------------------------------------
// Helpers internos
// -----------------------------------------------------------------------------

function adaptConnection(raw: RawConnection | undefined): ConnectionHealth {
    if (!raw) {
        return {
            globalStatus: 'unknown',
            lastSuccess: null,
            ageMs: null,
        };
    }

    return {
        globalStatus: toContractStatus(raw.globalStatus),
        lastSuccess: raw.lastSuccess ?? null,
        ageMs: raw.ageMs ?? null,
    };
}

function adaptMachines(raw: RawMachine[] | undefined): ContractMachine[] {
    if (!raw || !Array.isArray(raw)) {
        return [];
    }

    return raw
        .filter((machine) => machine.unitId != null && machine.name)
        .map((machine) => ({
            unitId: machine.unitId,
            name: machine.name,
            status: toContractStatus(machine.status),
            lastSuccess: machine.lastSuccess ?? null,
            ageMs: machine.ageMs ?? null,
            values: adaptValues(machine),
        }));
}

/**
 * Adapta los values de una máquina.
 * Soporta dos shapes:
 * - Contrato oficial: `values: Record<string, { value, unit, timestamp }>`
 * - Legacy: `values: Record<string, { value, unit?, timestamp? }>`
 *
 * También soporta el shape legacy con array `variables[]` como fallback.
 */
function adaptValues(machine: RawMachine): Record<string, ContractMetricValue> {
    const result: Record<string, ContractMetricValue> = {};

    // Shape principal: values como Record
    if (machine.values && typeof machine.values === 'object') {
        for (const [key, raw] of Object.entries(machine.values)) {
            result[key] = {
                value: raw?.value != null ? toNumericValue(raw.value) : null,
                unit: raw?.unit ?? null,
                timestamp: raw?.timestamp ?? null,
                displayName: raw?.displayName,
            };
        }
        return result;
    }

    // Fallback legacy: variables como array
    if (machine.variables && Array.isArray(machine.variables)) {
        for (const variable of machine.variables) {
            if (!variable.key) continue;
            result[variable.key] = {
                value: variable.value != null ? toNumericValue(variable.value) : null,
                unit: variable.unit ?? null,
                timestamp: variable.timestamp ?? null,
            };
        }
        return result;
    }

    return result;
}

function toNumericValue(raw: number | string | null): number | null {
    if (raw === null) return null;
    if (typeof raw === 'number') return raw;
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? null : parsed;
}
