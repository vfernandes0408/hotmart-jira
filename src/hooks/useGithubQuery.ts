import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchGithubWithRetry, fetchGithubUserDataGraphQL } from '@/utils/github';
import { githubHeaders } from '@/config/github';
import { useMemo } from 'react';
import { toast } from 'sonner';

export interface GithubUser {
  name: string;
  email: string;
  commits: number;
  prsCreated: number;
  prsReviewed: number;
  comments: number;
  reactions: number;
  additions: number;
  deletions: number;
  changedFiles: number;
  lastUpdated?: string;
}

interface GithubData {
  commits: number;
  pullRequests: number;
  reviews: number;
  comments: number;
  reactions: number;
  changedFiles: number;
  additions: number;
  deletions: number;
  lastUpdated?: string;
}

interface GithubQueryParams {
  startDate: Date;
  endDate: Date;
}

const fetchGithubUserData = async (email: string): Promise<GithubUser | null> => {
  try {
    // Extrai o nome do usuário do email (parte antes do @) e remove pontos
    const username = email.split('@')[0].replace(/\./g, '') + '-hotmart';
    console.log('Email original:', email);
    console.log('Username convertido:', username);
    console.log('Parte antes do @:', email.split('@')[0]);
    console.log('Após remover pontos:', email.split('@')[0].replace(/\./g, ''));
    console.log('Username final:', username);

    // Busca todos os dados via GraphQL
    const query = `
      query($username: String!) {
        user(login: $username) {
          login
          contributionsCollection {
            totalCommitContributions
            totalPullRequestContributions
            totalPullRequestReviewContributions
            commitContributionsByRepository(maxRepositories: 100) {
              repository {
                name
                owner {
                  login
                }
              }
              contributions(first: 100) {
                nodes {
                  occurredAt
                  commitCount
                  repository {
                    name
                  }
                }
              }
            }
          }
        }
      }
    `;

    console.log('Enviando query GraphQL com username:', username);
    console.log('Headers:', githubHeaders);

    const graphqlResponse = await fetchGithubWithRetry(
      'https://api.github.com/graphql',
      {
        method: 'POST',
        headers: {
          ...githubHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: { username },
        }),
      }
    );

    if (!graphqlResponse.ok) {
      const errorText = await graphqlResponse.text();
      console.error('Erro na resposta GraphQL:', {
        status: graphqlResponse.status,
        statusText: graphqlResponse.statusText,
        error: errorText
      });
      throw new Error(`Erro ao buscar dados via GraphQL: ${errorText}`);
    }

    const graphqlData = await graphqlResponse.json();
    console.log('Resposta GraphQL:', graphqlData);

    if (graphqlData.errors) {
      console.error('Erros na resposta GraphQL:', graphqlData.errors);
      throw new Error(`Erro na resposta GraphQL: ${graphqlData.errors[0].message}`);
    }

    const { user: githubUser } = graphqlData.data;

    if (!githubUser) {
      console.warn(`Usuário não encontrado para o email: ${email} (tentou buscar por: ${username})`);
      return null;
    }

    // Calcula totais de adições, deleções e mudanças
    const stats = githubUser.contributionsCollection.commitContributionsByRepository.reduce(
      (acc: any, repo: any) => {
        const repoStats = repo.contributions.nodes.reduce(
          (repoAcc: any, node: any) => ({
            additions: repoAcc.additions + (node.commitCount || 0),
            deletions: repoAcc.deletions + (node.commitCount || 0),
            changes: repoAcc.changes + (node.commitCount || 0),
          }),
          { additions: 0, deletions: 0, changes: 0 }
        );

        return {
          additions: acc.additions + repoStats.additions,
          deletions: acc.deletions + repoStats.deletions,
          changes: acc.changes + repoStats.changes,
        };
      },
      { additions: 0, deletions: 0, changes: 0 }
    );

    const result = {
      name: githubUser.login,
      email,
      commits: githubUser.contributionsCollection.totalCommitContributions,
      prsCreated: githubUser.contributionsCollection.totalPullRequestContributions,
      prsReviewed: githubUser.contributionsCollection.totalPullRequestReviewContributions,
      comments: 0, // Não disponível via GraphQL
      reactions: 0, // Não disponível via GraphQL
      changes: stats.changes,
      additions: stats.additions,
      deletions: stats.deletions,
      changedFiles: 0, // Não disponível via GraphQL
      lastUpdated: new Date().toISOString(),
    };

    console.log('Dados processados:', result);
    return result;
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
      changedFiles: 0,
      additions: 0,
      deletions: 0,
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
    changedFiles: validUsers.reduce((total, user) => total + (user?.changedFiles ?? 0), 0),
    additions: validUsers.reduce((total, user) => total + (user?.additions ?? 0), 0),
    deletions: validUsers.reduce((total, user) => total + (user?.deletions ?? 0), 0),
    lastUpdated,
  };

  console.log('Aggregated result:', result);
  return result;
};

// Hook para buscar dados de um único usuário
export const useGithubQuery = (email: string, dateRange: { from: Date; to: Date }) => {
  console.log('useGithubQuery iniciado para email:', email);
  console.log('Período:', dateRange);
  
  return useQuery<GithubUser | null>({
    queryKey: ['github', email, dateRange],
    queryFn: async () => {
      try {
        // Extrai o nome do usuário do email (parte antes do @) e remove pontos
        const username = email.split('@')[0].replace(/\./g, '') + '-hotmart';
        console.log('Email original:', email);
        console.log('Username convertido:', username);
        console.log('Parte antes do @:', email.split('@')[0]);
        console.log('Após remover pontos:', email.split('@')[0].replace(/\./g, ''));
        console.log('Username final:', username);

        // Busca dados via GraphQL
        const result = await fetchGithubUserDataGraphQL(username, dateRange);
        console.log('Dados processados:', result);

        // Adiciona campos extras necessários para a interface GithubUser
        return {
          ...result,
          email,
          comments: 0, // Não disponível via GraphQL
          reactions: 0, // Não disponível via GraphQL
          lastUpdated: new Date().toISOString(),
        };
      } catch (error) {
        console.error(`Erro ao buscar dados do GitHub para ${email}:`, error);
        throw error;
      }
    },
    enabled: !!email,
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: 3,
  });
};

// Hook para buscar dados em lote
export const useGithubBulkData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ emails, startDate, endDate }: { 
      emails: string[]; 
      startDate: Date; 
      endDate: Date; 
    }) => {
      console.log('Iniciando busca em lote para emails:', emails);
      console.log('Período:', { startDate, endDate });

      const results = await Promise.all(
        emails.map(async (email) => {
          try {
            const username = email.split('@')[0].replace(/\./g, '') + '-hotmart';
            console.log(`Buscando dados para ${email} (${username})`);
            const data = await fetchGithubUserDataGraphQL(username, { from: startDate, to: endDate });
            return { email, data };
          } catch (error) {
            console.error(`Erro ao buscar dados para ${email}:`, error);
            return { email, error };
          }
        })
      );

      // Atualiza o cache para cada email
      results.forEach(({ email, data, error }) => {
        if (data) {
          queryClient.setQueryData(['github', email], {
            ...data,
            email,
            comments: 0,
            reactions: 0,
            lastUpdated: new Date().toISOString(),
          });
        }
      });

      return results;
    },
    onSuccess: () => {
      toast.success('Dados do GitHub atualizados com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao buscar dados em lote:', error);
      toast.error('Erro ao buscar dados do GitHub');
    },
  });
}; 