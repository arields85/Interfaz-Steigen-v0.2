import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { type ReactNode } from 'react';

// =============================================================================
// APP PROVIDERS
// Único punto de bootstrap de QueryClient y Router.
// Mantener providers globales aquí evita scatter por el árbol de componentes.
// =============================================================================

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 2,
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
            refetchOnWindowFocus: false, // HMIs industriales: evitar refetch por alt-tab
        },
    },
});

interface AppProvidersProps {
    children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                {children}
            </BrowserRouter>
        </QueryClientProvider>
    );
}
