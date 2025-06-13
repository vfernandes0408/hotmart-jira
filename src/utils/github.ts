import { githubHeaders } from '@/config/github';

const GITHUB_GRAPHQL_ENDPOINT = 'https://api.github.com/graphql';

interface GithubGraphQLResponse {
  data: {
    user: {
      login: string;
      contributionsCollection: {
        totalCommitContributions: number;
        totalPullRequestContributions: number;
        totalPullRequestReviewContributions: number;
        commitContributionsByRepository: Array<{
          repository: {
            name: string;
            owner: {
              login: string;
            };
          };
          contributions: {
            nodes: Array<{
              commit: {
                additions: number;
                deletions: number;
                changedFiles: number;
              };
            }>;
          };
        }>;
        pullRequestContributionsByRepository: Array<{
          repository: {
            name: string;
            owner: {
              login: string;
            };
          };
          contributions: {
            nodes: Array<{
              occurredAt: string;
              pullRequest: {
                additions: number;
                deletions: number;
                changedFiles: number;
              };
            }>;
          };
        }>;
        pullRequestReviewContributionsByRepository: Array<{
          repository: {
            name: string;
          };
          contributions: {
            totalCount: number;
          };
        }>;
      };
    };
  };
}

export const fetchGithubUserDataGraphQL = async (username: string, dateRange: { from: Date; to: Date }): Promise<{
  name: string;
  commits: number;
  prsCreated: number;
  prsReviewed: number;
  additions: number;
  deletions: number;
  changedFiles: number;
}> => {
  console.log('Buscando dados do GitHub para username:', username);
  console.log('Período recebido:', dateRange);

  // Formata as datas para o formato GitTimestamp (YYYY-MM-DDTHH:mm:ssZ)
  const formatDate = (date: Date | undefined) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
  };

  const fromDate = formatDate(dateRange?.from) || "2025-01-01T00:00:00Z";
  const toDate = formatDate(dateRange?.to) || "2025-12-31T23:59:59Z";

  console.log('Datas formatadas:', { fromDate, toDate });

  const query = `
    query($username: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $username) {
        login
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
          }
          commitContributionsByRepository {
            repository {
              name
            }
            contributions {
              totalCount
            }
          }
          pullRequestContributionsByRepository {
            repository {
              name
            }
            contributions(first: 100) {
              nodes {
                pullRequest {
                  additions
                  deletions
                  changedFiles
                  commits {
                    totalCount
                  }
                }
              }
            }
          }
          pullRequestReviewContributionsByRepository {
            repository {
              name
            }
            contributions {
              totalCount
            }
          }
        }
      }
    }
  `;

  const response = await fetchGithubWithRetry(GITHUB_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      ...githubHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: { 
        username,
        from: fromDate,
        to: toDate
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Erro na resposta GraphQL:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText
    });
    throw new Error(`Erro ao buscar dados via GraphQL: ${errorText}`);
  }

  const data = await response.json();
  console.log('Resposta GraphQL completa:', JSON.stringify(data, null, 2));
  console.log('Dados do usuário:', {
    login: data.data?.user?.login,
    contributions: data.data?.user?.contributionsCollection?.contributionCalendar?.totalContributions,
    repositories: data.data?.user?.contributionsCollection?.commitContributionsByRepository?.map((repo: any) => ({
      name: repo.repository.name,
      contributions: repo.contributions.totalCount
    }))
  });

  if (data.errors) {
    console.error('Erros na resposta GraphQL:', data.errors);
    throw new Error(`Erro na resposta GraphQL: ${data.errors[0].message}`);
  }

  if (!data.data?.user) {
    console.warn(`Usuário não encontrado: ${username}`);
    return {
      name: username,
      commits: 0,
      prsCreated: 0,
      prsReviewed: 0,
      additions: 0,
      deletions: 0,
      changedFiles: 0,
    };
  }

  const { user } = data.data;
  const { contributionsCollection } = user;

  // Calcula totais de adições, deleções e arquivos alterados dos PRs
  const stats = contributionsCollection.pullRequestContributionsByRepository.reduce(
    (acc, repo) => {
      console.log('Processando repositório:', repo.repository.name);
      const repoStats = repo.contributions.nodes.reduce(
        (repoAcc, node) => {
          const pr = node.pullRequest;
          console.log('Processando PR:', {
            additions: pr?.additions,
            deletions: pr?.deletions,
            changedFiles: pr?.changedFiles,
            commits: pr?.commits.totalCount
          });

          // Soma as adições, deleções e arquivos alterados do PR
          return {
            additions: repoAcc.additions + (pr?.additions || 0),
            deletions: repoAcc.deletions + (pr?.deletions || 0),
            changedFiles: repoAcc.changedFiles + (pr?.changedFiles || 0),
          };
        },
        { additions: 0, deletions: 0, changedFiles: 0 }
      );

      console.log('Estatísticas do repositório:', repoStats);

      return {
        additions: acc.additions + repoStats.additions,
        deletions: acc.deletions + repoStats.deletions,
        changedFiles: acc.changedFiles + repoStats.changedFiles,
      };
    },
    { additions: 0, deletions: 0, changedFiles: 0 }
  );

  console.log('Estatísticas finais:', stats);

  // Calcula totais de commits, PRs e reviews
  const commits = contributionsCollection.commitContributionsByRepository.reduce(
    (acc, repo) => acc + repo.contributions.totalCount,
    0
  );

  const prsCreated = contributionsCollection.pullRequestContributionsByRepository.reduce(
    (acc, repo) => acc + repo.contributions.nodes.length,
    0
  );

  const prsReviewed = contributionsCollection.pullRequestReviewContributionsByRepository.reduce(
    (acc, repo) => acc + repo.contributions.totalCount,
    0
  );

  const result = {
    name: user.login,
    commits,
    prsCreated,
    prsReviewed,
    additions: stats.additions,
    deletions: stats.deletions,
    changedFiles: stats.changedFiles,
  };

  console.log('Resultado final:', result);
  return result;
};

export const fetchGithubWithRetry = async (url: string, options: RequestInit = {}) => {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 segundo

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...githubHeaders,
          ...options.headers,
        },
      });

      // Log do rate limit
      const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
      const rateLimitReset = response.headers.get('x-ratelimit-reset');
      
      if (rateLimitRemaining) {
        console.log(`GitHub Rate Limit - Restantes: ${rateLimitRemaining}, Reset em: ${new Date(Number(rateLimitReset) * 1000).toLocaleString()}`);
        
        // Aviso quando estiver próximo do limite
        if (Number(rateLimitRemaining) < 100) {
          console.warn(`⚠️ GitHub Rate Limit está baixo! Restantes: ${rateLimitRemaining}`);
        }
      }

      if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
        const resetTime = response.headers.get('x-ratelimit-reset');
        const waitTime = resetTime ? (Number(resetTime) * 1000) - Date.now() : baseDelay * Math.pow(2, attempt);
        console.warn(`Rate limit excedido. Aguardando ${waitTime/1000} segundos...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response;
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(`Tentativa ${attempt + 1} falhou. Aguardando ${delay/1000} segundos...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Máximo de tentativas excedido');
}; 