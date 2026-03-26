import { useQuery } from '@tanstack/react-query';
import { getEquipmentDetail } from '../services/equipment.service';
import type { Equipment } from '../domain';

// =============================================================================
// QUERY: useEquipmentDetail
// =============================================================================

export function useEquipmentDetail(id: string | undefined) {
    return useQuery<Equipment | null>({
        queryKey: ['equipment-detail', id],
        queryFn: () => (id ? getEquipmentDetail(id) : Promise.resolve(null)),
        enabled: !!id,
        refetchInterval: 15_000,
        staleTime: 10_000,
    });
}
