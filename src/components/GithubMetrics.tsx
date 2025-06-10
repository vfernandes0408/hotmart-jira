import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Github, ChevronDown, ChevronUp } from 'lucide-react';
import { useApiKeys } from '@/hooks/useApiKeys';
import { toast } from 'sonner';
import { JiraIssue } from '@/types/jira';
import { useGithubBulkData } from '@/hooks/useGithubQuery';
import { format, startOfMonth, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface GithubMetricsProps {
  data: JiraIssue[];
  dateRange: {
    start: string;
    end: string;
  };
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

const GithubMetrics: React.FC<GithubMetricsProps> = ({ data, dateRange }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [githubData, setGithubData] = useState<GithubData | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(true);
  const { isConfigured } = useApiKeys();
  
  // Estado para as datas
  const [startDate, setStartDate] = useState<string>(dateRange.start);
  const [endDate, setEndDate] = useState<string>(dateRange.end);

  // Efeito para atualizar as datas quando o dateRange mudar
  useEffect(() => {
    setStartDate(dateRange.start);
    setEndDate(dateRange.end);
  }, [dateRange]);
  
  console.log('GithubMetrics render - Initial data:', data);
  
  const emails = data
    .map(issue => issue.assigneeEmail)
    .filter((email): email is string => {
      const isValid = Boolean(email);
      if (!isValid) {
        console.log('Filtered out invalid email:', email);
      }
      return isValid;
    });

  console.log('Filtered emails:', emails);

  const { userQueries, cachedData, mutation } = useGithubBulkData(emails);
  
  console.log('useGithubBulkData result:', {
    userQueries: userQueries.map(q => ({ email: q.email, hasData: !!q.data })),
    hasCachedData: !!cachedData,
    hasMutation: !!mutation
  });

  // Use cached data when available
  useEffect(() => {
    console.log('useEffect - cachedData changed:', cachedData);
    if (cachedData && !githubData) {
      console.log('Setting githubData from cache');
      setGithubData(cachedData);
    }
  }, [cachedData]);

  const handleImport = async () => {
    console.log('handleImport called');
    
    if (!isConfigured('github')) {
      toast.error('Configure o token do GitHub primeiro!');
      return;
    }

    if (emails.length === 0) {
      toast.error('Nenhum email encontrado para buscar dados do GitHub.');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Starting mutation');
      const result = await mutation.mutateAsync({
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      });
      console.log('Mutation result:', result);
      setGithubData(result);
      toast.success('Dados do GitHub importados com sucesso!');
    } catch (error) {
      console.error('Import error:', error);
      if (!githubData) {
        toast.error('Erro ao importar dados do GitHub. Tente novamente.');
      } else {
        toast.error('Erro ao atualizar dados. Usando dados em cache.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!isConfigured('github')) {
      toast.error('Configure o token do GitHub primeiro!');
      return;
    }

    if (!githubData) {
      toast.error('Execute a importação primeiro!');
      return;
    }

    if (emails.length === 0) {
      toast.error('Nenhum email encontrado para buscar dados do GitHub.');
      return;
    }

    await handleImport();
  };

  const renderMetricValue = (value: number | undefined) => {
    console.log('renderMetricValue called with:', value);
    return value ?? 0;
  };

  console.log('Current githubData:', githubData);
  console.log('Current userQueries:', userQueries.map(q => ({
    email: q.email,
    hasData: !!q.data,
    isLoading: q.isLoading,
    isError: q.isError
  })));

  return (
    <Card className="col-span-full xl:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex flex-col">
          <CardTitle className="text-sm font-medium">Métricas do GitHub</CardTitle>
          {githubData?.lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Atualizado em {format(new Date(githubData.lastUpdated), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
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
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleImport}
            disabled={isLoading || emails.length === 0}
          >
            <Github className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {githubData ? (
          <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <span className="text-2xl font-bold">{renderMetricValue(githubData?.commits)}</span>
                <span className="text-xs text-muted-foreground">Commits</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold">{renderMetricValue(githubData?.pullRequests)}</span>
                <span className="text-xs text-muted-foreground">Pull Requests</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold">{renderMetricValue(githubData?.reviews)}</span>
                <span className="text-xs text-muted-foreground">Code Reviews</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold">{renderMetricValue(githubData?.comments)}</span>
                <span className="text-xs text-muted-foreground">Comentários</span>
              </div>
            </div>

            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full mt-4 flex items-center justify-center gap-2"
              >
                {isDetailsOpen ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Ocultar detalhes
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Ver detalhes por usuário
                  </>
                )}
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="mt-4 space-y-4">
              {userQueries
                .filter(query => {
                  const isValid = query.data !== null && !query.isError;
                  console.log(`Filtering query for ${query.email}:`, { isValid, hasData: !!query.data, isError: query.isError });
                  return isValid;
                })
                .map(({ email, data: userData, isLoading, isError }) => {
                  console.log(`Rendering user data for ${email}:`, userData);
                  return (
                    <div key={email} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium">{userData?.name || email}</h4>
                        <div className="flex items-center gap-2">
                          {isLoading && (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          )}
                          <span className="text-xs text-muted-foreground">
                            {userData?.lastUpdated && format(new Date(userData.lastUpdated), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Commits:</span>{' '}
                          <span className="font-medium">{renderMetricValue(userData?.commits)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">PRs:</span>{' '}
                          <span className="font-medium">{renderMetricValue(userData?.prsCreated)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Reviews:</span>{' '}
                          <span className="font-medium">{renderMetricValue(userData?.prsReviewed)}</span>
                        </div>
                      </div>
                      {isError && (
                        <div className="mt-2 text-xs text-red-500">
                          Erro ao carregar dados. Tente novamente.
                        </div>
                      )}
                    </div>
                  );
                })}
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <div className="flex items-center justify-center h-24">
            <span className="text-sm text-muted-foreground">
              {isLoading ? 'Carregando dados...' : emails.length === 0 ? 'Nenhum email encontrado' : 'Clique no ícone do GitHub para importar dados'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GithubMetrics; 