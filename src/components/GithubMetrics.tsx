import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  Github,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Loader2,
} from "lucide-react";
import { useApiKeys } from "@/hooks/useApiKeys";
import { toast } from "sonner";
import { JiraIssue } from "@/types/jira";
import {
  useGithubBulkData,
  useGithubQuery,
  GithubUser,
} from "@/hooks/useGithubQuery";
import { format, startOfMonth, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useOpenAI } from '@/hooks/useOpenAI';
import { OpenAIConfig } from '@/components/OpenAIConfig';

type SortField =
  | "name"
  | "commits"
  | "prsCreated"
  | "prsReviewed"
  | "additions"
  | "deletions"
  | "changedFiles";
type SortOrder = "asc" | "desc";

interface GithubMetricsProps {
  data: {
    emails: string[];
  };
  dateRange: {
    from: Date;
    to: Date;
  };
}

// Hook personalizado para gerenciar as queries
const useGithubQueries = (
  emails: string[],
  dateRange: { from: Date; to: Date }
) => {
  // Ensure emails is an array and filter out invalid values
  const queries = useMemo(() => {
    const validEmails = (Array.isArray(emails) ? emails : [])
      .filter(email => typeof email === 'string' && email.includes('@'))
      .map((email) => {
        const username = email.split("@")[0].replace(/\./g, "") + "-hotmart";
        return { email, username };
      });
    return validEmails;
  }, []);

  const userQueries = queries.map(({ email }) =>
    useGithubQuery(email, dateRange)
  );

  return {
    queries: userQueries,
    isLoading: userQueries.some((query) => query?.isLoading),
    isError: userQueries.some((query) => query?.isError),
    refetch: () => userQueries.forEach((query) => query?.refetch()),
  };
};

const GithubMetrics: React.FC<GithubMetricsProps> = ({ data, dateRange }) => {
  // Ensure emails is always an array
  const emails = Array.isArray(data?.emails) ? data.emails : [];
  const { isConfigured } = useApiKeys();

  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ChevronsUpDown className="h-4 w-4" />;
    return sortOrder === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  // Memoize as datas para evitar recriações desnecessárias
  const memoizedDateRange = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      return { from: startOfYear, to: endOfYear };
    }
    return {
      from: new Date(dateRange.from),
      to: new Date(dateRange.to),
    };
  }, [dateRange?.from, dateRange?.to]);

  // Hook para buscar dados em lote
  const mutation = useGithubBulkData();

  // Usar o hook personalizado para gerenciar as queries

  const {
    queries: userQueries,
    isLoading: queriesLoading,
    isError: queriesError,
    refetch: refetchQueries,
  } = useGithubQueries(emails, memoizedDateRange);

  // Calcula métricas totais
  const githubData = useMemo(() => {
    if (!Array.isArray(userQueries)) return null;

    const validUsers = userQueries
      .filter((query): query is ReturnType<typeof useGithubQuery> & { data: GithubUser } => {
        return query?.data !== null && !query?.isError;
      })
      .map((query) => query.data);

    if (!validUsers || validUsers.length === 0) {
      return {
        commits: 0,
        pullRequests: 0,
        reviews: 0,
        comments: 0,
        reactions: 0,
        changedFiles: 0,
        additions: 0,
        deletions: 0,
        lastUpdated: new Date().toISOString(),
      };
    }

    const totals = {
      commits: validUsers.reduce((acc, user) => acc + (user?.commits || 0), 0),
      pullRequests: validUsers.reduce(
        (acc, user) => acc + (user?.prsCreated || 0),
        0
      ),
      reviews: validUsers.reduce(
        (acc, user) => acc + (user?.prsReviewed || 0),
        0
      ),
      comments: validUsers.reduce(
        (acc, user) => acc + (user?.comments || 0),
        0
      ),
      reactions: validUsers.reduce(
        (acc, user) => acc + (user?.reactions || 0),
        0
      ),
      changedFiles: validUsers.reduce(
        (acc, user) => acc + (user?.changedFiles || 0),
        0
      ),
      additions: validUsers.reduce(
        (acc, user) => acc + (user?.additions || 0),
        0
      ),
      deletions: validUsers.reduce(
        (acc, user) => acc + (user?.deletions || 0),
        0
      ),
      lastUpdated: new Date().toISOString(),
    };

    return totals;
  }, [userQueries]);

  const isLoading = queriesLoading || mutation.isPending;
  const isError = queriesError;

  const handleRefresh = () => {
    refetchQueries();
  };

  const handleImport = () => {
    if (!Array.isArray(emails) || emails.length === 0) {
      toast.error("Nenhum email válido para importar");
      return;
    }
    mutation.mutate({
      emails,
      startDate: memoizedDateRange.from,
      endDate: memoizedDateRange.to,
    });
  };

  const renderMetricValue = (value: number | undefined) => {
    if (value === undefined) return "-";
    return value.toLocaleString();
  };

  // Ordena os usuários válidos
  const sortedUsers = useMemo(() => {
    const validUsers = userQueries
      .filter((query) => query && query.data !== null && !query.isError)
      .map((query) => query.data as GithubUser)
      .filter(Boolean);

    if (!validUsers || validUsers.length === 0) return [];

    return [...validUsers].sort((a, b) => {
      const aValue = a[sortField] ?? 0;
      const bValue = b[sortField] ?? 0;

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [userQueries, sortField, sortOrder]);

  const { mutate: generateInsights, data: insightsData, isPending: isGeneratingInsights, error: insightsError } = useOpenAI();

  if (!isConfigured("github")) {
    return (
      <Card className="col-span-full xl:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Métricas do GitHub
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Configure o token do GitHub para ver as métricas
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const event = new CustomEvent("openGithubModal");
                window.dispatchEvent(event);
              }}
            >
              Configurar GitHub
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full xl:col-span-2">
      <CardHeader>
        <CardTitle>Métricas do GitHub</CardTitle>
        <CardDescription>
          Métricas de contribuição do GitHub para o período selecionado
        </CardDescription>
        <div className="mt-2">
          <OpenAIConfig />
        </div>
      </CardHeader>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex flex-col">
          <CardTitle className="text-sm font-medium">
            Métricas do GitHub
          </CardTitle>
          {githubData?.lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Atualizado em{" "}
              {format(
                new Date(githubData.lastUpdated),
                "dd/MM/yyyy 'às' HH:mm",
                { locale: ptBR }
              )}
            </span>
          )}
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading || !githubData}
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleImport}
            disabled={
              isLoading || !Array.isArray(emails) || emails.length === 0
            }
          >
            <Github className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {githubData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Commits</div>
                <div className="text-2xl font-bold">{githubData.commits}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Pull Requests</div>
                <div className="text-2xl font-bold">
                  {githubData.pullRequests}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Reviews</div>
                <div className="text-2xl font-bold">{githubData.reviews}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Total de Alterações</div>
                <div className="text-2xl font-bold">
                  {githubData.changedFiles.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <div className="text-sm font-medium">Linhas Adicionadas</div>
                <div className="text-2xl font-bold text-green-600">
                  +{githubData.additions.toLocaleString()}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Linhas Removidas</div>
                <div className="text-2xl font-bold text-red-600">
                  -{githubData.deletions.toLocaleString()}
                </div>
              </div>
            </div>

            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <ChevronDown className="h-4 w-4" />
                Insights de Performance
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-4 space-y-4">
                {isGeneratingInsights ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">
                      Gerando insights...
                    </span>
                  </div>
                ) : insightsError ? (
                  <div className="flex flex-col items-center justify-center p-4 space-y-4">
                    <p className="text-sm text-destructive">
                      {insightsError.message}
                    </p>
                    <Button
                      onClick={() => {
                        const usersWithContributions = sortedUsers.filter(user => 
                          user.commits > 0 || 
                          user.prsCreated > 0 || 
                          user.prsReviewed > 0 || 
                          user.additions > 0 || 
                          user.deletions > 0
                        );
                        if (usersWithContributions.length > 0) {
                          generateInsights({ users: usersWithContributions });
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Tentar novamente
                    </Button>
                  </div>
                ) : insightsData ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <div className="whitespace-pre-wrap">{insightsData}</div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Nenhum insight disponível no momento.
                    </p>
                    <Button
                      onClick={() => {
                        const usersWithContributions = sortedUsers.filter(user => 
                          user.commits > 0 || 
                          user.prsCreated > 0 || 
                          user.prsReviewed > 0 || 
                          user.additions > 0 || 
                          user.deletions > 0
                        );
                        if (usersWithContributions.length > 0) {
                          generateInsights({ users: usersWithContributions });
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Gerar insights
                    </Button>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <ChevronDown className="h-4 w-4" />
                Detalhes por Usuário
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-4 space-y-4">
                <div className="grid grid-cols-3 gap-2 text-sm font-medium mb-2">
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => handleSort("name")}
                  >
                    Nome {getSortIcon("name")}
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => handleSort("commits")}
                  >
                    Commits {getSortIcon("commits")}
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => handleSort("prsCreated")}
                  >
                    PRs {getSortIcon("prsCreated")}
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => handleSort("prsReviewed")}
                  >
                    Reviews {getSortIcon("prsReviewed")}
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => handleSort("additions")}
                  >
                    Adições {getSortIcon("additions")}
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => handleSort("deletions")}
                  >
                    Remoções {getSortIcon("deletions")}
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => handleSort("changedFiles")}
                  >
                    Mudanças {getSortIcon("changedFiles")}
                  </Button>
                </div>
                {sortedUsers.map((userData) => {
                  if (!userData) return null;
                  return (
                    <div key={userData.email} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium">
                          {userData.name || userData.email}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {userData.lastUpdated &&
                              format(
                                new Date(userData.lastUpdated),
                                "dd/MM/yyyy",
                                { locale: ptBR }
                              )}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                        <div>
                          <span className="text-muted-foreground">
                            Commits:
                          </span>{" "}
                          <span className="font-medium">
                            {renderMetricValue(userData?.commits)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">PRs:</span>{" "}
                          <span className="font-medium">
                            {renderMetricValue(userData?.prsCreated)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Reviews:
                          </span>{" "}
                          <span className="font-medium">
                            {renderMetricValue(userData?.prsReviewed)}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">
                            Adições:
                          </span>{" "}
                          <span className="font-medium text-green-600">
                            +{renderMetricValue(userData?.additions)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Remoções:
                          </span>{" "}
                          <span className="font-medium text-red-600">
                            -{renderMetricValue(userData?.deletions)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Mudanças:
                          </span>{" "}
                          <span className="font-medium">
                            {renderMetricValue(userData?.changedFiles)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {isLoading
                ? "Carregando métricas..."
                : "Nenhuma métrica disponível"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GithubMetrics;
 