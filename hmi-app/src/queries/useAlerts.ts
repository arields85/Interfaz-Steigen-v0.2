import { useQuery } from '@tanstack/react-query';
import { getAlerts, type AlertFilters } from '../services/alert.service';
import type { AlertEvent } from '../domain';

// =============================================================================
// QUERY: useAlerts
// =============================================================================

export function useAlerts(filters?: AlertFilters) {
    return useQuery<AlertEvent[]>({
        queryKey: ['alerts', filters],
        queryFn: () => getAlerts(filters),
        refetchInterval: 20_000,
        staleTime: 10_000,
    });
}
