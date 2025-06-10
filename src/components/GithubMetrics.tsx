import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Github, Play, Pause } from 'lucide-react';
import { useApiKeys } from '@/hooks/useApiKeys';
import { toast } from 'sonner';
import { JiraIssue } from '@/types/jira';
import { githubHeaders, getGithubToken } from '@/config/github';

interface GithubMetricsProps {
  data: JiraIssue[];
}

interface GithubData {
  commits: number;
  pullRequests: number;
  reviews: number;
  comments: number;
  reactions: number;
  changes: number;
}

interface GithubUser {
  name: string;
  email: string;
  commits: number;
  prsCreated: number;
  prsReviewed: number;
  comments: number;
  reactions: number;
  changes: number;
}

const GithubMetrics: React.FC<GithubMetricsProps> = ({ data }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [githubData, setGithubData] = useState<GithubData | null>(null);
  const { isConfigured } = useApiKeys();
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleImport = async () => {
    if (!isConfigured('github')) {
      toast.error('Configure o token do GitHub primeiro!');
      return;
    }

    if (isPaused) {
      setIsPaused(false);
      return;
    }

    if (isImporting) {
      setIsPaused(true);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      return;
    }

    setIsImporting(true);
    setIsPaused(false);
    try {
      const token = getGithubToken();
      if (!token) {
        toast.error('Token do GitHub não encontrado');
        return;
      }

      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      // Testa o token e as permissões
      const testResponse = await fetch('https://api.github.com/user', {
        headers: githubHeaders,
        signal
      });

      if (!testResponse.ok) {
        const errorData = await testResponse.json();
        console.error('Erro ao testar token:', errorData);
        toast.error('Token do GitHub inválido ou sem permissões necessárias');
        return;
      }

      // Testa acesso à organização
      const orgResponse = await fetch('https://api.github.com/orgs/Hotmart-Org', {
        headers: githubHeaders,
        signal
      });

      if (!orgResponse.ok) {
        console.error('Erro ao acessar organização:', await orgResponse.json());
        toast.error('Token não tem permissão para acessar a organização Hotmart-Org');
        return;
      }

      // Busca os dados do GitHub
      const uniqueAssignees = [...new Set(data.map(issue => issue.assigneeEmail).filter(Boolean))];
      
      if (uniqueAssignees.length === 0) {
        toast.error('Nenhum assignee com email válido encontrado nos dados do Jira');
        return;
      }

      const githubDataPromises = uniqueAssignees.map(async (email) => {
        try {
          if (signal.aborted) {
            throw new Error('Operação cancelada');
          }

          // Busca usuário do GitHub pelo email
          const userResponse = await fetch(`https://api.github.com/search/users?q=${email}+in:email`, {
            headers: githubHeaders,
            signal
          });

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
          const commitsResponse = await fetch(`https://api.github.com/search/commits?q=author:${user.login}+org:Hotmart-Org`, {
            headers: { ...githubHeaders, Accept: 'application/vnd.github.cloak-preview' },
            signal
          });

          if (!commitsResponse.ok) {
            throw new Error('Erro ao buscar commits');
          }

          const commitsData = await commitsResponse.json();

          // Busca PRs criados
          const prsCreatedResponse = await fetch(`https://api.github.com/search/issues?q=author:${user.login}+org:Hotmart-Org+type:pr`, {
            headers: githubHeaders,
            signal
          });

          if (!prsCreatedResponse.ok) {
            throw new Error('Erro ao buscar PRs criados');
          }

          const prsCreatedData = await prsCreatedResponse.json();

          // Busca PRs revisados
          const prsReviewedResponse = await fetch(`https://api.github.com/search/issues?q=reviewed-by:${user.login}+org:Hotmart-Org+type:pr`, {
            headers: githubHeaders,
            signal
          });

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
            comments: 0, // TODO: Implementar
            reactions: 0, // TODO: Implementar
            changes: 0, // TODO: Implementar
          };
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            console.log('Requisição cancelada para:', email);
            return null;
          }
          console.error(`Erro ao buscar dados do GitHub para ${email}:`, error);
          return null;
        }
      });

      const results = await Promise.all(githubDataPromises);
      
      if (signal.aborted) {
        toast.info('Importação pausada');
        return;
      }

      const validGithubData = results.filter((data): data is GithubUser => data !== null);

      if (validGithubData.length === 0) {
        toast.error('Não foi possível buscar dados do GitHub. Verifique o token de acesso.');
        return;
      }

      // Agrega os dados
      setGithubData({
        commits: validGithubData.reduce((total, user) => total + user.commits, 0),
        pullRequests: validGithubData.reduce((total, user) => total + user.prsCreated, 0),
        reviews: validGithubData.reduce((total, user) => total + user.prsReviewed, 0),
        comments: validGithubData.reduce((total, user) => total + user.comments, 0),
        reactions: validGithubData.reduce((total, user) => total + user.reactions, 0),
        changes: validGithubData.reduce((total, user) => total + user.changes, 0)
      });
      
      toast.success('Dados do GitHub importados com sucesso!');
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          toast.info('Importação pausada');
        } else {
          console.error('Erro ao importar dados do GitHub:', error.message);
          toast.error(`Erro ao importar dados do GitHub: ${error.message}`);
        }
      } else {
        console.error('Erro ao importar dados do GitHub:', error);
        toast.error('Erro ao importar dados do GitHub. Tente novamente.');
      }
    } finally {
      if (!isPaused) {
        setIsImporting(false);
        abortControllerRef.current = null;
      }
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

    setIsLoading(true);
    try {
      await handleImport();
      toast.success('Dados do GitHub atualizados com sucesso!');
    } catch (error) {
      if (error instanceof Error) {
        console.error('Erro ao atualizar dados do GitHub:', error.message);
        toast.error(`Erro ao atualizar dados do GitHub: ${error.message}`);
      } else {
        console.error('Erro ao atualizar dados do GitHub:', error);
        toast.error('Erro ao atualizar dados do GitHub. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Métricas do GitHub</CardTitle>
        <div className="flex items-center gap-2">
          {githubData && !isImporting && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || isImporting || !isConfigured('github')}
              className={`h-8 w-8 p-0 ${isLoading ? 'opacity-50' : ''}`}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleImport}
            disabled={isLoading || !isConfigured('github')}
            className={`h-8 ${(isImporting || isPaused) ? 'opacity-50' : ''}`}
          >
            {isImporting ? (
              <>
                <Pause className={`h-4 w-4 mr-2 ${isPaused ? '' : 'animate-pulse'}`} />
                {isPaused ? 'Continuar' : 'Pausar'}
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Importar
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!isConfigured('github') ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Github className="h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">Configure o token do GitHub para visualizar as métricas</p>
          </div>
        ) : !githubData ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Github className="h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">Clique no botão de importar para carregar os dados</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col space-y-1">
                <span className="text-xs text-gray-500">Commits</span>
                <span className="text-2xl font-bold">{githubData.commits}</span>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-xs text-gray-500">Pull Requests</span>
                <span className="text-2xl font-bold">{githubData.pullRequests}</span>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-xs text-gray-500">Reviews</span>
                <span className="text-2xl font-bold">{githubData.reviews}</span>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-xs text-gray-500">Comments</span>
                <span className="text-2xl font-bold">{githubData.comments}</span>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-xs text-gray-500">Reactions</span>
                <span className="text-2xl font-bold">{githubData.reactions}</span>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-xs text-gray-500">Changes</span>
                <span className="text-2xl font-bold">{githubData.changes}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GithubMetrics; 