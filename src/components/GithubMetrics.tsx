import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  RefreshCw,
  Github,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Loader2,
  Plus,
  X,
  UserPlus,
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

import { fetchGithubUserDataGraphQL } from '@/utils/github';
import { OpenAIConfig } from "./OpenAIConfig";

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
    allEmails?: string[];
  };
  dateRange: {
    from: Date;
    to: Date;
  };
  isFirstQuery?: boolean;
}



const GithubMetrics: React.FC<GithubMetricsProps> = ({ data, dateRange, isFirstQuery = true }) => {
  // All hooks must be called before any early returns
  const { isConfigured } = useApiKeys();
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [activeEmails, setActiveEmails] = useState<string[]>([]);
  
  // Memoize as datas para evitar recriações desnecessárias
  const memoizedDateRange = useMemo(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    
    if (!dateRange?.from || !dateRange?.to) {
      return { from: startOfYear, to: endOfYear };
    }
    
    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    
    // Validação de datas
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      console.warn('Datas inválidas fornecidas, usando padrão do ano atual');
      return { from: startOfYear, to: endOfYear };
    }
    
    return {
      from: fromDate,
      to: toDate,
    };
  }, [dateRange?.from, dateRange?.to]);

  // Hook para buscar dados em lote
  const mutation = useGithubBulkData();
  
  // Use bulk data approach to avoid dynamic hooks issues
  const [githubUsers, setGithubUsers] = useState<GithubUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [notFoundUsers, setNotFoundUsers] = useState<string[]>([]);
  const [manualUsernames, setManualUsernames] = useState<string[]>([]);
  const [newUsername, setNewUsername] = useState("");
  
  const loadGithubData = async () => {
    if (!activeEmails.length) return;
    
    setIsLoadingUsers(true);
    try {
      const results = await mutation.mutateAsync({
        emails: activeEmails,
        startDate: memoizedDateRange.from,
        endDate: memoizedDateRange.to,
      });
      
      // Extrai os dados válidos dos resultados
      console.log('Resultados recebidos:', results);
      
      const validUsers = results
        .filter((result: any) => result.data && !result.error)
        .map((result: any) => ({
          ...result.data,
          email: result.email,
          comments: 0,
          reactions: 0,
          lastUpdated: new Date().toISOString(),
        }));
      
      const failedUsers = results.filter((result: any) => result.error || !result.data);
      
      console.log('Usuários válidos processados:', validUsers);
      console.log('Usuários que falharam:', failedUsers);
      
      setGithubUsers(validUsers);
      setNotFoundUsers(failedUsers.map((u: any) => u.email));
      
      if (failedUsers.length > 0) {
        toast.success(`${validUsers.length} usuários carregados. ${failedUsers.length} não encontrados no GitHub.`);
      } else {
        toast.success(`${validUsers.length} usuários carregados com sucesso!`);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados do GitHub');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Initialize with all emails on first load
  useEffect(() => {
    if (isFirstQuery && data?.allEmails && activeEmails.length === 0) {
      const allEmails = Array.isArray(data.allEmails) ? data.allEmails : [];
      setActiveEmails(allEmails);
    }
  }, [data?.allEmails, isFirstQuery, activeEmails.length]);
  
  // Auto-load data when activeEmails is set for the first time
  useEffect(() => {
    if (activeEmails.length > 0 && githubUsers.length === 0 && !isLoadingUsers) {
      loadGithubData();
    }
  }, [activeEmails.length, githubUsers.length, isLoadingUsers]);

  const handleApplyFilters = async () => {
    const filteredEmails = Array.isArray(data?.emails) ? data.emails : [];
    console.log('=== DEBUG FILTROS ===');
    console.log('data?.emails recebido:', data?.emails);
    console.log('filteredEmails processado:', filteredEmails);
    console.log('Quantidade de emails:', filteredEmails.length);
    
    setActiveEmails(filteredEmails);
    
    if (filteredEmails.length > 0) {
      setIsLoadingUsers(true);
      try {
        const results = await mutation.mutateAsync({
          emails: filteredEmails,
          startDate: memoizedDateRange.from,
          endDate: memoizedDateRange.to,
        });
        
        // Extrai os dados válidos dos resultados
        console.log('Emails filtrados enviados:', filteredEmails);
        console.log('Resultados dos filtros:', results);
        
        const validUsers = results
          .filter((result: any) => result.data && !result.error)
          .map((result: any) => ({
            ...result.data,
            email: result.email,
            comments: 0,
            reactions: 0,
            lastUpdated: new Date().toISOString(),
          }));
        
        const failedUsers = results.filter((result: any) => result.error || !result.data);
        
        setGithubUsers(validUsers);
        setNotFoundUsers(failedUsers.map((u: any) => u.email));
        
        if (failedUsers.length > 0) {
          toast.success(`Filtros aplicados! ${validUsers.length} de ${filteredEmails.length} usuários encontrados no GitHub.`);
          console.log('Usuários não encontrados:', failedUsers.map(u => u.email));
        } else {
          toast.success(`Filtros aplicados! ${validUsers.length} usuários encontrados.`);
        }
      } catch (error) {
        console.error('Erro ao aplicar filtros:', error);
        toast.error('Erro ao aplicar filtros');
      } finally {
        setIsLoadingUsers(false);
      }
    }
  };

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



  // Calcula métricas totais baseado nos dados carregados
  const githubData = useMemo(() => {
    if (!githubUsers.length) {
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
      commits: githubUsers.reduce((acc, user) => acc + (user?.commits || 0), 0),
      pullRequests: githubUsers.reduce(
        (acc, user) => acc + (user?.prsCreated || 0),
        0
      ),
      reviews: githubUsers.reduce(
        (acc, user) => acc + (user?.prsReviewed || 0),
        0
      ),
      comments: githubUsers.reduce(
        (acc, user) => acc + (user?.comments || 0),
        0
      ),
      reactions: githubUsers.reduce(
        (acc, user) => acc + (user?.reactions || 0),
        0
      ),
      changedFiles: githubUsers.reduce(
        (acc, user) => acc + (user?.changedFiles || 0),
        0
      ),
      additions: githubUsers.reduce(
        (acc, user) => acc + (user?.additions || 0),
        0
      ),
      deletions: githubUsers.reduce(
        (acc, user) => acc + (user?.deletions || 0),
        0
      ),
      lastUpdated: new Date().toISOString(),
    };

    return totals;
  }, [githubUsers]);

  const isLoading = isLoadingUsers || mutation.isPending;
  const isError = false;

  const handleRefresh = () => {
    loadGithubData();
  };

  const addManualUsername = () => {
    if (!newUsername.trim()) return;
    
    const username = newUsername.trim();
    if (username.includes('@') || username.includes(' ')) {
      toast.error('Por favor, insira apenas o username do GitHub (sem @ ou espaços)');
      return;
    }
    
    if (manualUsernames.includes(username)) {
      toast.error('Este username já foi adicionado');
      return;
    }
    
    setManualUsernames(prev => [...prev, username]);
    setNewUsername('');
    toast.success('Username adicionado à lista manual');
  };

  const removeManualUsername = (username: string) => {
    setManualUsernames(prev => prev.filter(u => u !== username));
  };

  const loadManualUsers = async () => {
    if (!manualUsernames.length) {
      toast.error('Nenhum username manual para buscar');
      return;
    }
    
    setIsLoadingUsers(true);
    try {
      const results = await Promise.all(
        manualUsernames.map(async (username) => {
          try {

            const data = await fetchGithubUserDataGraphQL(username, {
              from: memoizedDateRange.from,
              to: memoizedDateRange.to,
            });
            return { username, email: `${username}@manual.github`, data };
          } catch (error) {
            console.error(`Erro ao buscar dados para ${username}:`, error);
            return { username, email: `${username}@manual.github`, error };
          }
        })
      );
      
      const validUsers = results
        .filter((result: any) => result.data && !result.error)
        .map((result: any) => ({
          ...result.data,
          email: result.email,
          comments: 0,
          reactions: 0,
          lastUpdated: new Date().toISOString(),
        }));
      
      const failedUsers = results.filter((result: any) => result.error || !result.data);
      
      // Adiciona aos usuários existentes em vez de substituir
      setGithubUsers(prev => {
        const existingEmails = prev.map(u => u.email);
        const newUsers = validUsers.filter(u => !existingEmails.includes(u.email));
        return [...prev, ...newUsers];
      });
      
      setNotFoundUsers(prev => [...prev, ...failedUsers.map((u: any) => u.username)]);
      
      toast.success(`${validUsers.length} usuários manuais adicionados!`);
    } catch (error) {
      console.error('Erro ao carregar usuários manuais:', error);
      toast.error('Erro ao carregar usuários manuais');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleImport = () => {
    if (!Array.isArray(activeEmails) || activeEmails.length === 0) {
      toast.error("Nenhum email válido para importar");
      return;
    }
    mutation.mutate({
      emails: activeEmails,
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
    if (!githubUsers.length) return [];

    return [...githubUsers].sort((a, b) => {
      const aValue = a[sortField] ?? 0;
      const bValue = b[sortField] ?? 0;

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [githubUsers, sortField, sortOrder]);

  const { mutate: generateInsights, data: insightsData, isPending: isGeneratingInsights, error: insightsError } = useOpenAI();



  // Early return if data is invalid (after all hooks)
  if (!data || (!data.emails && !data.allEmails)) {
    return (
      <Card className="col-span-full xl:col-span-2">
        <CardContent>
          <div className="flex flex-col items-center justify-center p-4 text-center">
            <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
          </div>
        </CardContent>
      </Card>
    );
  }

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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Métricas do GitHub</CardTitle>
            <CardDescription>
              Métricas de contribuição do GitHub para o período selecionado
            </CardDescription>
          </div>
          <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            {activeEmails.length === (data?.allEmails?.length || 0) ? 'Todas as pessoas' : `${activeEmails.length} pessoa(s) selecionada(s)`}
          </div>
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
            size="sm"
            onClick={handleApplyFilters}
            disabled={isLoading}
          >
            Aplicar Filtros
          </Button>
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
              isLoading || !Array.isArray(activeEmails) || activeEmails.length === 0
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
            
            {notFoundUsers.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                  <ChevronDown className="h-4 w-4" />
                  Usuários não encontrados no GitHub ({notFoundUsers.length})
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 mb-2">
                      Os seguintes usuários não foram encontrados no GitHub:
                    </p>
                    <div className="space-y-1">
                      {notFoundUsers.map((email) => (
                        <div key={email} className="text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                          {email}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-yellow-600 mt-2">
                      Isso pode acontecer se o usuário não tiver conta no GitHub ou se o username gerado não corresponder ao username real.
                    </p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
            
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <UserPlus className="h-4 w-4" />
                Adicionar Usuários Manualmente ({manualUsernames.length})
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                  <p className="text-sm text-blue-800">
                    Adicione usernames do GitHub que não aparecem nos filtros da aplicação:
                  </p>
                  
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="username-github"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addManualUsername()}
                      className="flex-1"
                    />
                    <Button
                      onClick={addManualUsername}
                      size="sm"
                      disabled={!newUsername.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {manualUsernames.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-blue-800">
                        Usernames adicionados ({manualUsernames.length}):
                      </p>
                      <div className="space-y-1">
                        {manualUsernames.map((username) => (
                          <div key={username} className="flex items-center justify-between bg-blue-100 px-3 py-2 rounded">
                            <span className="text-sm text-blue-700">{username}</span>
                            <Button
                              onClick={() => removeManualUsername(username)}
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <Button
                        onClick={loadManualUsers}
                        disabled={isLoading}
                        className="w-full"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Carregando...
                          </>
                        ) : (
                          <>
                            <Github className="h-4 w-4 mr-2" />
                            Buscar no GitHub
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
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
 