import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos em milissegundos
const GITHUB_CACHE_KEY = "github_data_cache";

interface CachedData {
  data: any;
  timestamp: number;
}

const fetchGithubData = async (token: string, dateRange: { start: string; end: string }) => {
  // Verificar cache primeiro
  const cachedData = localStorage.getItem(GITHUB_CACHE_KEY);
  if (cachedData) {
    const { data, timestamp } = JSON.parse(cachedData) as CachedData;
    if (Date.now() - timestamp < CACHE_DURATION) {
      return data;
    }
  }

  // Se não houver cache válido, fazer a requisição
  const response = await axios.get("https://api.github.com/graphql", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: {
      query: `
        query($startDate: GitTimestamp!, $endDate: GitTimestamp!) {
          viewer {
            pullRequests(first: 100, orderBy: {field: CREATED_AT, direction: DESC}) {
              nodes {
                title
                number
                state
                createdAt
                mergedAt
                closedAt
                additions
                deletions
                changedFiles
                repository {
                  name
                }
                author {
                  login
                }
                reviews(first: 10) {
                  nodes {
                    state
                    submittedAt
                  }
                }
              }
            }
          }
        }
      `,
      variables: {
        startDate: new Date(dateRange.start).toISOString(),
        endDate: new Date(dateRange.end).toISOString(),
      },
    },
  });

  // Salvar no cache
  const dataToCache = {
    data: response.data,
    timestamp: Date.now(),
  };
  localStorage.setItem(GITHUB_CACHE_KEY, JSON.stringify(dataToCache));

  return response.data;
};

export const useGithubData = (token: string, dateRange: { start: string; end: string }) => {
  return useQuery({
    queryKey: ["githubData", token, dateRange],
    queryFn: () => fetchGithubData(token, dateRange),
    staleTime: CACHE_DURATION, // Dados considerados frescos por 5 minutos
    gcTime: 30 * 60 * 1000, // Cache mantido por 30 minutos (substitui cacheTime)
    retry: 2, // Número máximo de tentativas em caso de erro
    refetchOnWindowFocus: false, // Não recarregar ao focar na janela
    refetchOnMount: false, // Não recarregar ao montar o componente
  });
}; 