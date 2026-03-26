import { useQuery } from '@tanstack/react-query';
import { getEquipmentList, type EquipmentListFilters } from '../services/equipment.service';
import type { EquipmentSummary } from '../domain';

// =============================================================================
// QUERY: useEquipmentList
// Hook de React Query para obtener la lista resumida de equipos.
// Polling cada 30s — ajustar refetchInterval según necesidad operativa.
// =============================================================================

export function useEquipmentList(filters?: EquipmentListFilters) {
    return useQuery<EquipmentSummary[]>({
        queryKey: ['equipment-list', filters],
        queryFn: () => getEquipmentList(filters),
        refetchInterval: 30_000, // polling cada 30s
        staleTime: 15_000,
    });
}
