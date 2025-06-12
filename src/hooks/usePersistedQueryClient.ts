import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';

export const createPersistedQueryClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // Data is considered fresh for 5 minutes
        gcTime: 1000 * 60 * 60 * 24, // Unused data is garbage collected after 24 hours
        retry: 3, // Number of retries on failed queries
        refetchOnWindowFocus: true, // Refetch when window regains focus
      },
    },
  });

  const persister = createSyncStoragePersister({
    storage: window.localStorage,
    key: 'JIRA_REACT_QUERY_CACHE', // Cache key in localStorage
    throttleTime: 1000, // How often to persist the cache (in ms)
    serialize: data => JSON.stringify(data),
    deserialize: data => JSON.parse(data),
  });

  persistQueryClient({
    queryClient,
    persister,
    maxAge: 1000 * 60 * 60 * 24, // 24 hours - how long to keep persisted data
    buster: 'v1', // Cache buster - change this when your data structure changes
  });

  return queryClient;
};
