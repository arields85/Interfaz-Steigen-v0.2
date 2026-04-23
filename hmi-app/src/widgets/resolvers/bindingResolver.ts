import type { WidgetConfig, WidgetBinding } from '../../domain/admin.types';
import type { EquipmentSummary } from '../../domain/equipment.types';
import type { ContractMachine } from '../../domain/dataContract.types';
import type { ResolvedBinding, MetricStatus } from '../../domain/widget.types';
import { evaluateThresholds } from './thresholdEvaluator';

// =============================================================================
// bindingResolver
// Función pura que traduce un WidgetConfig + datos de dominio → ResolvedBinding.
//
// Esta es la anti-corruption layer entre el builder de widgets y el dominio.
// Los componentes de presentación NUNCA llaman esto directamente.
// Solo los renderers lo consumen.
//
// Modos de binding:
//   'simulated_value' → usa el valor de la config directamente
//   'real_variable'   → busca el dato en el mapa de equipos del dominio
//
// Arquitectura Técnica v1.3 §6 y §15
// =============================================================================

type EquipmentMap = Map<string, EquipmentSummary>;

/**
 * Resuelve el binding de un widget a un valor tipado del dominio.
 * El resultado es consumible directamente por los renderers sin lógica adicional.
 */
export function resolveBinding(
    widget: WidgetConfig,
    equipmentMap: EquipmentMap,
    machines?: ContractMachine[],
): ResolvedBinding {
    const binding = widget.binding;

    // -------------------------------------------------------------------------
    // CASO 1: Sin binding — el widget no tiene fuente de dato configurada
    // -------------------------------------------------------------------------
    if (!binding) {
        // Si tiene simulatedValue directo en el widget (shorthand de config)
        if (widget.simulatedValue !== undefined) {
            return resolveSimulated(
                widget.simulatedValue,
                undefined,
                widget.thresholds,
            );
        }
        return noDataResult();
    }

    // -------------------------------------------------------------------------
    // CASO 2: Simulated value — dato de configuración, siempre disponible
    // -------------------------------------------------------------------------
    if (binding.mode === 'simulated_value') {
        return resolveSimulated(
            binding.simulatedValue,
            binding.unit,
            widget.thresholds,
        );
    }

    // -------------------------------------------------------------------------
    // CASO 3: Real variable — dato del dominio vía equipmentMap
    // -------------------------------------------------------------------------
    return resolveReal(binding, equipmentMap, widget, machines);
}

// -----------------------------------------------------------------------------
// Helpers internos
// -----------------------------------------------------------------------------

function resolveSimulated(
    rawValue: number | string | boolean | undefined,
    unit: string | undefined,
    thresholds: WidgetConfig['thresholds'],
): ResolvedBinding {
    if (rawValue === undefined || rawValue === null) {
        return noDataResult();
    }

    // Normalize boolean → no evaluable contra thresholds numéricos
    const value: number | string | null =
        typeof rawValue === 'boolean' ? String(rawValue) : rawValue;

    const numericValue = typeof value === 'number' ? value : null;
    const status = evaluateThresholds(numericValue, thresholds);

    return {
        value,
        unit,
        status,
        source: 'simulated',
    };
}

function resolveReal(
    binding: WidgetBinding,
    equipmentMap: EquipmentMap,
    widget: WidgetConfig,
    machines?: ContractMachine[],
): ResolvedBinding {
    // Acepta ambos bindingVersion durante la transición:
    // - 'node-red-v1' (legacy, dashboards existentes)
    // - 'real-variable-v1' (contrato oficial)
    const isContractBinding =
        binding.bindingVersion === 'real-variable-v1' ||
        binding.bindingVersion === 'node-red-v1';

    if (isContractBinding && machines) {
        return resolveContractMachine(binding, machines, widget);
    }

    // Sin assetId → no se puede resolver
    if (!binding.assetId) {
        return noDataResult();
    }

    const equipment = equipmentMap.get(binding.assetId);

    // Equipo no encontrado en el mapa
    if (!equipment) {
        return errorResult();
    }

    const connectionState = equipment.connectionState;

    // Fuente offline → no hay dato disponible
    if (connectionState === 'offline') {
        // Si lastKnownValueAllowed y hay dato en primaryMetrics, usarlo como fallback
        if (binding.lastKnownValueAllowed) {
            const metric = findMetric(equipment, binding.variableKey);
            if (metric !== null) {
                return {
                    value: metric.value,
                    unit: metric.unit ?? binding.unit,
                    status: 'stale',
                    lastUpdateAt: equipment.lastUpdateAt,
                    connectionState,
                    source: 'fallback',
                };
            }
        }
        return {
            value: null,
            status: 'no-data',
            connectionState,
            lastUpdateAt: equipment.lastUpdateAt,
            source: 'error',
        };
    }

    // Resolver el valor del campo solicitado
    const metric = findMetric(equipment, binding.variableKey);

    if (metric === null || metric.value === null) {
        return {
            value: null,
            status: 'no-data',
            connectionState,
            lastUpdateAt: equipment.lastUpdateAt,
            source: 'real',
        };
    }

    // Evaluar staleTimeout si está configurado
    let isStale = connectionState === 'stale';
    if (!isStale && binding.staleTimeout && equipment.lastUpdateAt) {
        const secondsOld = (Date.now() - new Date(equipment.lastUpdateAt).getTime()) / 1000;
        if (secondsOld > binding.staleTimeout) {
            isStale = true;
        }
    }

    const numericValue = typeof metric.value === 'number' ? metric.value : null;
    const thresholdStatus = evaluateThresholds(numericValue, widget.thresholds);
    const finalStatus: MetricStatus = isStale && thresholdStatus === 'normal' ? 'stale' : thresholdStatus;

    return {
        value: metric.value,
        unit: metric.unit ?? binding.unit,
        status: finalStatus,
        lastUpdateAt: equipment.lastUpdateAt,
        connectionState,
        source: isStale ? 'fallback' : 'real',
    };
}

function resolveContractMachine(
    binding: WidgetBinding,
    machines: ContractMachine[],
    widget: WidgetConfig,
): ResolvedBinding {
    const machine = binding.machineId !== undefined
        ? machines.find((candidate) => candidate.unitId === binding.machineId)
        : undefined;

    if (!machine) {
        return noDataRealResult();
    }

    // Resolver variable por variableKey dentro de values (Record<string, ContractMetricValue>)
    const variable = binding.variableKey
        ? machine.values[binding.variableKey]
        : undefined;

    if (!variable || variable.value === null) {
        return noDataRealResult();
    }

    const numericValue = typeof variable.value === 'number' ? variable.value : null;

    return {
        value: variable.value,
        unit: variable.unit ?? binding.unit,
        status: evaluateThresholds(numericValue, widget.thresholds),
        source: 'real',
        lastUpdateAt: variable.timestamp ?? undefined,
    };
}

/**
 * Busca una métrica por variableKey en primaryMetrics del equipo.
 * Si variableKey no está definido, devuelve la primera métrica disponible.
 * Si no se encuentra nada, devuelve null.
 */
function findMetric(
    equipment: EquipmentSummary,
    variableKey: string | undefined,
): { value: number | string | null; unit?: string } | null {
    if (!equipment.primaryMetrics || equipment.primaryMetrics.length === 0) {
        return null;
    }

    if (!variableKey) {
        // Sin variableKey → usar la primera métrica disponible
        return equipment.primaryMetrics[0];
    }

    // Buscar por label (la clave semántica del dominio en mocks)
    const found = equipment.primaryMetrics.find(
        (m) => m.label.toLowerCase() === variableKey.toLowerCase(),
    );
    return found ?? equipment.primaryMetrics[0];
}

function noDataResult(): ResolvedBinding {
    return { value: null, status: 'no-data', source: 'error' };
}

function noDataRealResult(): ResolvedBinding {
    return { value: null, status: 'no-data', source: 'real' };
}

function errorResult(): ResolvedBinding {
    return { value: null, status: 'no-data', source: 'error' };
}
