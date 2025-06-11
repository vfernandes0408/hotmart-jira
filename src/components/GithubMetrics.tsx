import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Github, ChevronDown, ChevronUp } from 'lucide-react';
import { useApiKeys } from '@/hooks/useApiKeys';
import { toast } from 'sonner';
import { JiraIssue } from '@/types/jira';
import { useGithubBulkData, useGithubQuery, GithubUser } from '@/hooks/useGithubQuery';
import { format, startOfMonth, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface GithubMetricsProps {
  data: {
    emails: string[];
  };
  dateRange: {
    from: Date;
    to: Date;
  };
}

const GithubMetrics: React.FC<GithubMetricsProps> = ({ data, dateRange }) => {
  const { emails = [] } = data || {};
  const { isConfigured } = useApiKeys();
  
  console.log('Emails recebidos:', emails);
  console.log('GitHub configurado:', isConfigured('github'));

  // Busca dados do GitHub para cada email
  const userQueries = emails.map(email => {
    // Extrai o nome do usuário do email (parte antes do @) e remove pontos
    const username = email.split('@')[0].replace(/\./g, '') + '-hotmart';
    console.log(`Convertendo email ${email} para username: ${username}`);
    const query = useGithubQuery(email);
    console.log('Estado da query para', email, {
      data: query.data,
      isLoading: query.isLoading,
      isError: query.isError,
      error: query.error
    });
    return query;
  });

  console.log('Queries criadas:', userQueries.map(q => ({
    email: q.data?.email,
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error
  })));

  // Hook para buscar dados em lote
  const { mutation } = useGithubBulkData(emails);

  // Calcula métricas totais
  const githubData = useMemo(() => {
    console.log('Iniciando cálculo de métricas...');
    console.log('Estado das queries:', userQueries.map(q => ({
      email: q.data?.email,
      isLoading: q.isLoading,
      isError: q.isError,
      error: q.error
    })));

    const validUsers = userQueries
      .filter(query => {
        const isValid = query.data !== null && !query.isError;
        console.log(`Filtrando usuário ${query.data?.email}:`, { 
          isValid, 
          hasData: !!query.data, 
          isError: query.isError,
          data: query.data 
        });
        return isValid;
      })
      .map(query => query.data as GithubUser);

    if (validUsers.length === 0) {
      console.log('Nenhum usuário válido encontrado');
      return null;
    }

    const totals = {
      commits: validUsers.reduce((acc, user) => acc + (user?.commits || 0), 0),
      pullRequests: validUsers.reduce((acc, user) => acc + (user?.prsCreated || 0), 0),
      reviews: validUsers.reduce((acc, user) => acc + (user?.prsReviewed || 0), 0),
      comments: validUsers.reduce((acc, user) => acc + (user?.comments || 0), 0),
      reactions: validUsers.reduce((acc, user) => acc + (user?.reactions || 0), 0),
      changedFiles: validUsers.reduce((acc, user) => acc + (user?.changedFiles || 0), 0),
      additions: validUsers.reduce((acc, user) => acc + (user?.additions || 0), 0),
      deletions: validUsers.reduce((acc, user) => acc + (user?.deletions || 0), 0),
      lastUpdated: new Date().toISOString(),
    };

    console.log('Totais calculados:', totals);
    return totals;
  }, [userQueries]);

  const isLoading = userQueries.some(query => query.isLoading) || mutation.isPending;
  const isError = userQueries.some(query => query.isError);

  console.log('Estado de loading:', isLoading);
  console.log('Estado de erro:', isError);

  const handleRefresh = () => {
    console.log('Atualizando dados do GitHub...');
    userQueries.forEach(query => query.refetch());
  };

  const handleImport = () => {
    console.log('Importando dados do GitHub...', { emails, dateRange });
    mutation.mutate({
      startDate: dateRange.from,
      endDate: dateRange.to
    });
  };

  const renderMetricValue = (value: number | undefined) => {
    if (value === undefined) return '-';
    return value.toLocaleString();
  };

  if (!isConfigured('github')) {
    return (
      <Card className="col-span-full xl:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Métricas do GitHub</CardTitle>
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
                const event = new CustomEvent('openGithubModal');
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
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Commits</div>
                <div className="text-2xl font-bold">{githubData.commits}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Pull Requests</div>
                <div className="text-2xl font-bold">{githubData.pullRequests}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Reviews</div>
                <div className="text-2xl font-bold">{githubData.reviews}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Total de Alterações</div>
                <div className="text-2xl font-bold">{githubData.changedFiles.toLocaleString()}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <div className="text-sm font-medium">Linhas Adicionadas</div>
                <div className="text-2xl font-bold text-green-600">+{githubData.additions.toLocaleString()}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Linhas Removidas</div>
                <div className="text-2xl font-bold text-red-600">-{githubData.deletions.toLocaleString()}</div>
              </div>
            </div>

            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <ChevronDown className="h-4 w-4" />
                Detalhes por Usuário
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-4 space-y-4">
                {userQueries
                  .filter(query => {
                    const isValid = query.data !== null && !query.isError;
                    console.log(`Filtering query for ${query.data?.email}:`, { isValid, hasData: !!query.data, isError: query.isError });
                    return isValid;
                  })
                  .map(({ data: userData, isLoading, isError }) => {
                    console.log(`Rendering user data for ${userData?.email}:`, userData);
                    return (
                      <div key={userData?.email} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium">{userData?.name || userData?.email}</h4>
                          <div className="flex items-center gap-2">
                            {isLoading && (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            )}
                            <span className="text-xs text-muted-foreground">
                              {userData?.lastUpdated && format(new Date(userData.lastUpdated), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm mb-2">
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
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Adições:</span>{' '}
                            <span className="font-medium text-green-600">+{renderMetricValue(userData?.additions)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Remoções:</span>{' '}
                            <span className="font-medium text-red-600">-{renderMetricValue(userData?.deletions)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Mudanças:</span>{' '}
                            <span className="font-medium">{renderMetricValue(userData?.changedFiles)}</span>
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
              {isLoading ? 'Carregando métricas...' : 'Nenhuma métrica disponível'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GithubMetrics; 