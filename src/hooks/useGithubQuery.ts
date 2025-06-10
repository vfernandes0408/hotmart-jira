import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchGithubWithRetry } from '@/utils/github';
import { githubHeaders } from '@/config/github';
import { useMemo } from 'react';

interface GithubUser {
  name: string;
  email: string;
  commits: number;
  prsCreated: number;
  prsReviewed: number;
  comments: number;
  reactions: number;
  changes: number;
  lastUpdated?: string;
}

interface GithubData {
  commits: number;
  pullRequests: number;
  reviews: number;
  comments: number;
  reactions: number;
  changes: number;
  lastUpdated?: string;
}

const fetchGithubUserData = async (email: string): Promise<GithubUser | null> => {
  try {
    // Busca usuário do GitHub pelo email
    const userResponse = await fetchGithubWithRetry(
      `https://api.github.com/search/users?q=${email}+in:email`
    );

    if (!userResponse.ok) {
      throw new Error('Erro ao buscar usuário do GitHub');
    }

    const userData = await userResponse.json();
    const user = userData.items[0];

    if (!user) {
      console.warn(`Usuário não encontrado para o email: ${email}`);
      return null;
    }

    // Busca commits
    const commitsResponse = await fetchGithubWithRetry(
      `https://api.github.com/search/commits?q=author:${user.login}+org:Hotmart-Org`,
      {
        headers: { Accept: 'application/vnd.github.cloak-preview' }
      }
    );

    if (!commitsResponse.ok) {
      throw new Error('Erro ao buscar commits');
    }

    const commitsData = await commitsResponse.json();

    // Busca PRs criados
    const prsCreatedResponse = await fetchGithubWithRetry(
      `https://api.github.com/search/issues?q=author:${user.login}+org:Hotmart-Org+type:pr`
    );

    if (!prsCreatedResponse.ok) {
      throw new Error('Erro ao buscar PRs criados');
    }

    const prsCreatedData = await prsCreatedResponse.json();

    // Busca PRs revisados
    const prsReviewedResponse = await fetchGithubWithRetry(
      `https://api.github.com/search/issues?q=reviewed-by:${user.login}+org:Hotmart-Org+type:pr`
    );

    if (!prsReviewedResponse.ok) {
      throw new Error('Erro ao buscar PRs revisados');
    }

    const prsReviewedData = await prsReviewedResponse.json();

    return {
      name: user.login,
      email,
      commits: commitsData.total_count,
      prsCreated: prsCreatedData.total_count,
      prsReviewed: prsReviewedData.total_count,
      comments: 0,
      reactions: 0,
      changes: 0,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Erro ao buscar dados do GitHub para ${email}:`, error);
    throw error;
  }
};

// Função para agregar dados de múltiplos usuários
const aggregateGithubData = (users: (GithubUser | null)[]): GithubData => {
  console.log('Aggregating data for users:', users);

  const validUsers = users.filter((user): user is GithubUser => {
    const isValid = user !== null && user !== undefined;
    if (!isValid) {
      console.log('Filtered out invalid user:', user);
    }
    return isValid;
  });

  console.log('Valid users:', validUsers);

  // Retorna objeto com valores zerados se não houver usuários válidos
  if (validUsers.length === 0) {
    console.log('No valid users found, returning zero values');
    return {
      commits: 0,
      pullRequests: 0,
      reviews: 0,
      comments: 0,
      reactions: 0,
      changes: 0,
      lastUpdated: undefined,
    };
  }

  const lastUpdated = validUsers.length > 0
    ? validUsers.reduce((latest, user) => {
        if (!latest || !user?.lastUpdated) return latest;
        return new Date(user.lastUpdated) > new Date(latest)
          ? user.lastUpdated
          : latest;
      }, validUsers[0]?.lastUpdated)
    : undefined;

  const result = {
    commits: validUsers.reduce((total, user) => {
      const commits = user?.commits ?? 0;
      console.log(`Adding commits for user ${user?.email}:`, commits);
      return total + commits;
    }, 0),
    pullRequests: validUsers.reduce((total, user) => {
      const prs = user?.prsCreated ?? 0;
      console.log(`Adding PRs for user ${user?.email}:`, prs);
      return total + prs;
    }, 0),
    reviews: validUsers.reduce((total, user) => {
      const reviews = user?.prsReviewed ?? 0;
      console.log(`Adding reviews for user ${user?.email}:`, reviews);
      return total + reviews;
    }, 0),
    comments: validUsers.reduce((total, user) => total + (user?.comments ?? 0), 0),
    reactions: validUsers.reduce((total, user) => total + (user?.reactions ?? 0), 0),
    changes: validUsers.reduce((total, user) => total + (user?.changes ?? 0), 0),
    lastUpdated,
  };

  console.log('Aggregated result:', result);
  return result;
};

// Hook para buscar dados de um único usuário
export const useGithubUserData = (email: string, enabled: boolean = true) => {
  console.log('useGithubUserData called for email:', email, 'enabled:', enabled);
  
  return useQuery({
    queryKey: ['githubUser', email],
    queryFn: () => fetchGithubUserData(email),
    enabled: enabled && !!email,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
    retry: 3,
  });
};

// Hook principal para buscar dados em massa
export const useGithubBulkData = (emails: string[]) => {
  console.log('useGithubBulkData called with emails:', emails);
  
  const queryClient = useQueryClient();
  const uniqueEmails = [...new Set(emails)].filter(Boolean); // Remove empty emails
  
  console.log('Filtered unique emails:', uniqueEmails);

  // Queries para cada usuário individual
  const userQueries = uniqueEmails.map(email => {
    console.log('Creating query for email:', email);
    const query = useGithubUserData(email, false);
    console.log('Query result for email:', email, query);
    
    const result = {
      email,
      data: query.data ?? null,
      isLoading: query.isLoading ?? false,
      isError: query.isError ?? false,
      error: query.error ?? null,
    };
    
    console.log('Processed query result for email:', email, result);
    return result;
  });

  // Dados em cache agregados
  const cachedData = useMemo(() => {
    console.log('Computing cached data');
    
    if (uniqueEmails.length === 0) {
      console.log('No emails, returning zero values');
      return {
        commits: 0,
        pullRequests: 0,
        reviews: 0,
        comments: 0,
        reactions: 0,
        changes: 0,
        lastUpdated: undefined,
      };
    }

    const cachedUsers = uniqueEmails.map(email => {
      const data = queryClient.getQueryData<GithubUser>(['githubUser', email]);
      console.log('Cached data for email:', email, data);
      return data;
    });
    
    return aggregateGithubData(cachedUsers);
  }, [uniqueEmails, queryClient]);

  // Mutation para atualizar dados
  const mutation = useMutation({
    mutationFn: async (): Promise<GithubData> => {
      console.log('Starting mutation with emails:', uniqueEmails);
      
      if (uniqueEmails.length === 0) {
        console.log('No emails for mutation, returning zero values');
        return {
          commits: 0,
          pullRequests: 0,
          reviews: 0,
          comments: 0,
          reactions: 0,
          changes: 0,
          lastUpdated: undefined,
        };
      }

      const results = await Promise.all(
        uniqueEmails.map(async (email) => {
          try {
            console.log('Fetching data for email:', email);
            const userData = await fetchGithubUserData(email);
            console.log('Fetched data for email:', email, userData);
            
            if (userData) {
              queryClient.setQueryData(['githubUser', email], userData);
            }
            return userData;
          } catch (error) {
            console.error(`Error fetching data for ${email}:`, error);
            const cachedData = queryClient.getQueryData<GithubUser>(['githubUser', email]);
            console.log('Using cached data for email:', email, cachedData);
            return cachedData || null;
          }
        })
      );

      console.log('All results before aggregation:', results);
      const aggregatedData = aggregateGithubData(results);
      console.log('Final aggregated data:', aggregatedData);
      return aggregatedData;
    },
  });

  return {
    userQueries,
    cachedData,
    mutation,
  };
}; 