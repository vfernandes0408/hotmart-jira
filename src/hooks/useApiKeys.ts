import { useQuery, useQueryClient } from '@tanstack/react-query';

export const API_KEYS_QUERY_KEY = ['api', 'keys'];

interface ApiKeys {
  openai?: string;
  gemini?: string;
  hotmartjedai?: string;
  github?: string;
  [key: string]: string | undefined;
}

export function useApiKeys() {
  const queryClient = useQueryClient();

  const { data: apiKeys = {} } = useQuery<ApiKeys>({
    queryKey: API_KEYS_QUERY_KEY,
    queryFn: () => {
      try {
        return JSON.parse(localStorage.getItem('iaKeys') || '{}');
      } catch {
        return {};
      }
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const saveKey = (key: string, value: string) => {
    try {
      const newKeys = { ...apiKeys, [key]: value };
      localStorage.setItem('iaKeys', JSON.stringify(newKeys));
      queryClient.setQueryData(API_KEYS_QUERY_KEY, newKeys);
    } catch (error) {
      console.error('Error saving key:', error);
    }
  };

  const removeKey = (key: string) => {
    try {
      const { [key]: _, ...rest } = apiKeys;
      localStorage.setItem('iaKeys', JSON.stringify(rest));
      queryClient.setQueryData(API_KEYS_QUERY_KEY, rest);
    } catch (error) {
      console.error('Error removing key:', error);
    }
  };

  const getKey = (key: string) => apiKeys[key];

  const isConfigured = (key: string) => Boolean(apiKeys[key]);

  return {
    apiKeys,
    saveKey,
    removeKey,
    getKey,
    isConfigured,
  };
} 