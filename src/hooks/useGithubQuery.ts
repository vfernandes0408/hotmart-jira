import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchGithubWithRetry,
  fetchGithubUserDataGraphQL,
} from "@/utils/github";
import { githubHeaders } from "@/config/github";
import { useMemo } from "react";
import { toast } from "sonner";

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

const fetchGithubUserData = async (
  email: string
): Promise<GithubUser | null> => {
  try {
    // Extrai o nome do usuário do email (parte antes do @) e remove pontos
    const username = email.split("@")[0].replace(/\./g, "") + "-hotmart";

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

    const graphqlResponse = await fetchGithubWithRetry(
      "https://api.github.com/graphql",
      {
        method: "POST",
        headers: {
          ...githubHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          variables: { username },
        }),
      }
    );

    if (!graphqlResponse.ok) {
      const errorText = await graphqlResponse.text();
      console.error("Erro na resposta GraphQL:", {
        status: graphqlResponse.status,
        statusText: graphqlResponse.statusText,
        error: errorText,
      });
      throw new Error(`Erro ao buscar dados via GraphQL: ${errorText}`);
    }

    const graphqlData = await graphqlResponse.json();

    if (graphqlData.errors) {
      console.error("Erros na resposta GraphQL:", graphqlData.errors);
      throw new Error(
        `Erro na resposta GraphQL: ${graphqlData.errors[0].message}`
      );
    }

    const { user: githubUser } = graphqlData.data;

    if (!githubUser) {
      console.warn(
        `Usuário não encontrado para o email: ${email} (tentou buscar por: ${username})`
      );
      return null;
    }

    // Calcula totais de adições, deleções e mudanças
    const stats =
      githubUser.contributionsCollection.commitContributionsByRepository.reduce(
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
      prsCreated:
        githubUser.contributionsCollection.totalPullRequestContributions,
      prsReviewed:
        githubUser.contributionsCollection.totalPullRequestReviewContributions,
      comments: 0, // Não disponível via GraphQL
      reactions: 0, // Não disponível via GraphQL
      changes: stats.changes,
      additions: stats.additions,
      deletions: stats.deletions,
      changedFiles: 0, // Não disponível via GraphQL
      lastUpdated: new Date().toISOString(),
    };

    return result;
  } catch (error) {
    console.error(`Erro ao buscar dados do GitHub para ${email}:`, error);
    throw error;
  }
};

// Hook para buscar dados de um único usuário
export const useGithubQuery = (
  email: string,
  dateRange: { from: Date; to: Date }
) => {
  return useQuery<GithubUser | null>({
    queryKey: ["github", email, dateRange],
    queryFn: async () => {
      try {
        // Extrai o nome do usuário do email (parte antes do @) e remove pontos
        const username = email.split("@")[0].replace(/\./g, "") + "-hotmart";

        // Busca dados via GraphQL
        const result = await fetchGithubUserDataGraphQL(username, dateRange);

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
    mutationFn: async ({
      emails,
      startDate,
      endDate,
    }: {
      emails: string[];
      startDate: Date;
      endDate: Date;
    }) => {
      const results = await Promise.all(
        emails.map(async (email) => {
          try {
            const username =
              email.split("@")[0].replace(/\./g, "") + "-hotmart";

            const data = await fetchGithubUserDataGraphQL(username, {
              from: startDate,
              to: endDate,
            });
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
          queryClient.setQueryData(["github", email], {
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
      toast.success("Dados do GitHub atualizados com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao buscar dados em lote:", error);
      toast.error("Erro ao buscar dados do GitHub");
    },
  });
};
