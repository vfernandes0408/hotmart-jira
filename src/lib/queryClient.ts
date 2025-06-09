import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: Infinity,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

const localStoragePersister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'HOTMART_JIRA_CACHE',
  throttleTime: 1000,
  serialize: data => JSON.stringify(data),
  deserialize: data => JSON.parse(data),
});

persistQueryClient({
  queryClient,
  persister: localStoragePersister,
  maxAge: Infinity,
  buster: import.meta.env.VITE_APP_VERSION || 'v1',
  dehydrateOptions: {
    shouldDehydrateQuery: query => {
      // Persiste apenas as queries que têm staleTime infinito
      return query.state.data !== undefined && query.state.dataUpdateCount > 0;
    },
  },
});

export { queryClient }; 