import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { JiraIssue } from '@/types/jira';
import { GitCommit, GitPullRequest, GitPullRequestClosed, Calendar } from 'lucide-react';
import { githubHeaders } from '@/config/github';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface GithubUser {
  name: string;
  email: string;
  commits: number;
  prsReviewed: number;
  prsCreated: number;
  comments: number;
  reactions: number;
  changes: number;
}

interface GithubMetricsProps {
  data: JiraIssue[];
  dateRange: { start: string; end: string };
}

const GithubMetrics: React.FC<GithubMetricsProps> = ({ data, dateRange }) => {
  const [loading, setLoading] = useState(true);
  const [githubData, setGithubData] = useState<GithubUser[]>([]);
  const [hasToken, setHasToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localDateRange, setLocalDateRange] = useState(dateRange);

  // Cache para armazenar resultados
  const cache = new Map<string, any>();
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos em milissegundos

  useEffect(() => {
    const token = localStorage.getItem('githubToken');
    setHasToken(!!token);
  }, []);

  useEffect(() => {
    setLocalDateRange(dateRange);
  }, [dateRange]);

  useEffect(() => {
    const fetchGithubData = async () => {
      const token = localStorage.getItem('githubToken');
      if (!token) {
        setLoading(false);
        setError('Token do GitHub não configurado');
        return;
      }

      // Testar permissões do token
      try {
        console.log('🔍 Testando permissões do token...');
        
        // Testar acesso à API
        const testResponse = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
          }
        });

        if (!testResponse.ok) {
          const errorData = await testResponse.json();
          console.log('❌ Erro ao testar token:', errorData);
          setError('Token do GitHub inválido ou sem permissões necessárias. Por favor, gere um novo token com as permissões: repo, read:org, read:user, user:email');
          setLoading(false);
          return;
        }

        const userData = await testResponse.json();
        console.log('✅ Token válido! Usuário autenticado:', userData.login);
        console.log('✅ Escopos do token:', testResponse.headers.get('x-oauth-scopes'));

        // Verificar se tem acesso à organização
        const orgResponse = await fetch('https://api.github.com/orgs/Hotmart-Org', {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
          }
        });

        if (!orgResponse.ok) {
          console.log('❌ Erro ao acessar organização:', await orgResponse.json());
          setError('Token não tem permissão para acessar a organização Hotmart-Org. Adicione o escopo read:org');
          setLoading(false);
          return;
        }

        console.log('✅ Acesso à organização confirmado!');

      } catch (error) {
        console.error('❌ Erro ao testar permissões:', error);
        setError('Erro ao testar permissões do token. Por favor, gere um novo token com as permissões necessárias.');
        setLoading(false);
        return;
      }

      if (!localDateRange.start || !localDateRange.end) {
        setLoading(false);
        setError('Selecione um período para visualizar as métricas');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Obter assignees únicos dos dados do Jira, filtrando emails undefined ou vazios
        const uniqueAssignees = Array.from(
          new Set(
            data
              .filter(item => item.assigneeEmail && item.assigneeEmail.trim() !== '')
              .map(item => item.assigneeEmail)
          )
        );

        if (uniqueAssignees.length === 0) {
          setLoading(false);
          setError('Nenhum assignee com email válido encontrado nos dados do Jira');
          return;
        }

        // Buscar dados do GitHub para cada assignee
        const githubUsersData = await Promise.all(
          uniqueAssignees.map(async (email) => {
            try {
              console.log(`\n=== Buscando dados para email: ${email} ===`);
              
              // Transformar email em username do GitHub
              const emailParts = email.split('@')[0].split('.');
              const githubUsername = `${emailParts.join('')}-hotmart`;
              console.log(`🔍 Buscando usuário com username: ${githubUsername}`);

              // Buscar usuário no GitHub
              const userResponse = await fetch(
                `https://api.github.com/users/${githubUsername}`,
                { 
                  headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github.v3+json',
                  }
                }
              );

              if (!userResponse.ok) {
                const errorData = await userResponse.json();
                console.log(`❌ Erro ao buscar usuário ${githubUsername}:`, errorData);
                throw new Error(`Erro ao buscar usuário: ${errorData.message || userResponse.statusText}`);
              }

              const userData = await userResponse.json();
              console.log(`✅ Usuário encontrado: ${githubUsername}`, {
                id: userData.id,
                type: userData.type,
                public_repos: userData.public_repos
              });

              // Função auxiliar para fazer requisições com retry e cache
              const fetchWithRetry = async (url: string, options: any, maxRetries = 3) => {
                // Verificar cache
                const cacheKey = `${url}-${JSON.stringify(options)}`;
                const cachedData = cache.get(cacheKey);
                if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
                  console.log('📦 Usando dados do cache');
                  return cachedData.response;
                }

                let retries = 0;
                while (retries < maxRetries) {
                  try {
                    const response = await fetch(url, options);
                    
                    // Se for erro de limite de taxa
                    if (response.status === 403) {
                      const errorData = await response.json();
                      if (errorData.message?.includes('rate limit')) {
                        // Verificar headers de rate limit
                        const resetTime = response.headers.get('x-ratelimit-reset');
                        const remaining = response.headers.get('x-ratelimit-remaining');
                        
                        console.log(`⚠️ Limite de taxa atingido. Tentativas restantes: ${remaining}`);
                        
                        if (resetTime) {
                          const waitTime = (parseInt(resetTime) * 1000) - Date.now() + 1000; // Adiciona 1 segundo de margem
                          if (waitTime > 0) {
                            console.log(`⏳ Aguardando ${Math.ceil(waitTime/1000)} segundos até o reset do limite...`);
                            await new Promise(resolve => setTimeout(resolve, waitTime));
                            continue;
                          }
                        }
                        
                        retries++;
                        if (retries < maxRetries) {
                          const waitTime = Math.pow(2, retries) * 1000; // Backoff exponencial
                          console.log(`⚠️ Tentativa ${retries + 1} de ${maxRetries}. Aguardando ${waitTime/1000} segundos...`);
                          await new Promise(resolve => setTimeout(resolve, waitTime));
                          continue;
                        }
                      }
                      throw new Error(errorData.message || 'Erro na requisição');
                    }
                    
                    if (!response.ok) {
                      const errorData = await response.json();
                      throw new Error(errorData.message || response.statusText);
                    }

                    // Clonar a resposta para poder ser lida múltiplas vezes
                    const clonedResponse = response.clone();
                    
                    // Salvar no cache
                    cache.set(cacheKey, {
                      response: clonedResponse,
                      timestamp: Date.now()
                    });
                    
                    return response;
                  } catch (error) {
                    retries++;
                    if (retries === maxRetries) throw error;
                    const waitTime = Math.pow(2, retries) * 1000; // Backoff exponencial
                    console.log(`⚠️ Erro na requisição. Tentativa ${retries + 1} de ${maxRetries}. Aguardando ${waitTime/1000} segundos...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                  }
                }
                throw new Error('Número máximo de tentativas excedido');
              };

              // Buscar PRs criados
              const prsCreatedResponse = await fetchWithRetry(
                `https://api.github.com/search/issues?q=author:${githubUsername}+org:Hotmart-Org+type:pr+created:${localDateRange.start}..${localDateRange.end}`,
                { 
                  headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github.v3+json',
                  }
                }
              );

              const prsCreatedData = await prsCreatedResponse.json();
              console.log(`✅ PRs criados encontrados para ${githubUsername}:`, {
                total_count: prsCreatedData.total_count,
                items: prsCreatedData.items?.map((item: any) => ({
                  number: item.number,
                  title: item.title,
                  state: item.state,
                  created_at: item.created_at,
                  closed_at: item.closed_at,
                  user: item.user?.login
                }))
              });

              // Buscar PRs revisados
              const prsReviewedResponse = await fetchWithRetry(
                `https://api.github.com/search/issues?q=reviewed-by:${githubUsername}+org:Hotmart-Org+type:pr+created:${localDateRange.start}..${localDateRange.end}`,
                { 
                  headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github.v3+json',
                  }
                }
              );

              const prsReviewedData = await prsReviewedResponse.json();
              console.log(`✅ PRs revisados encontrados para ${githubUsername}:`, {
                total_count: prsReviewedData.total_count,
                items: prsReviewedData.items?.map((item: any) => ({
                  number: item.number,
                  title: item.title,
                  state: item.state,
                  created_at: item.created_at,
                  closed_at: item.closed_at,
                  user: item.user?.login
                }))
              });

              // Buscar commits
              const commitsResponse = await fetchWithRetry(
                `https://api.github.com/search/commits?q=author:${githubUsername}+org:Hotmart-Org+committer-date:${localDateRange.start}..${localDateRange.end}`,
                { 
                  headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github.v3+json',
                  }
                }
              );

              const commitsData = await commitsResponse.json();
              console.log(`✅ Commits encontrados para ${githubUsername}:`, {
                total_count: commitsData.total_count,
                items: commitsData.items?.map((item: any) => ({
                  sha: item.sha,
                  committer_date: item.commit.committer.date,
                  message: item.commit.message,
                  additions: item.stats?.additions,
                  deletions: item.stats?.deletions,
                  total_changes: item.stats?.total
                }))
              });

              // Buscar discussões e comentários
              const discussionsResponse = await fetchWithRetry(
                `https://api.github.com/search/issues?q=commenter:${githubUsername}+org:Hotmart-Org+created:${localDateRange.start}..${localDateRange.end}`,
                { 
                  headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github.v3+json',
                  }
                }
              );

              const discussionsData = await discussionsResponse.json();
              console.log(`✅ Discussões e comentários encontrados para ${githubUsername}:`, {
                total_count: discussionsData.total_count,
                items: discussionsData.items?.map((item: any) => ({
                  number: item.number,
                  title: item.title,
                  type: item.pull_request ? 'PR' : 'Issue',
                  state: item.state,
                  created_at: item.created_at,
                  comments: item.comments,
                  reactions: item.reactions?.total_count
                }))
              });

              // Calcular métricas adicionais
              const totalComments = (discussionsData.items || []).reduce((total: number, item: any) => total + (item.comments || 0), 0);
              const totalReactions = (discussionsData.items || []).reduce((total: number, item: any) => total + (item.reactions?.total_count || 0), 0);
              const totalChanges = (commitsData.items || []).reduce((total: number, item: any) => total + (item.stats?.total || 0), 0);

              console.log('\n📊 Resumo final:', {
                usuario: githubUsername,
                totalCommits: commitsData.total_count,
                totalPRsCreated: prsCreatedData.total_count,
                totalPRsReviewed: prsReviewedData.total_count,
                totalComments,
                totalReactions,
                totalChanges,
                period: `${localDateRange.start} até ${localDateRange.end}`
              });

              return {
                name: githubUsername,
                email: email,
                commits: commitsData.total_count,
                prsReviewed: prsReviewedData.total_count,
                prsCreated: prsCreatedData.total_count,
                comments: totalComments,
                reactions: totalReactions,
                changes: totalChanges
              };
            } catch (error) {
              console.error(`❌ Erro ao buscar dados do GitHub para ${email}:`, error);
              if (error instanceof Error && error.message.includes('Token do GitHub inválido')) {
                setError(error.message);
                return null;
              }
              toast.error(`Erro ao buscar dados do GitHub para ${email}`);
              return {
                name: email.split('@')[0],
                email: email,
                commits: 0,
                prsReviewed: 0,
                prsCreated: 0,
                comments: 0,
                reactions: 0,
                changes: 0
              };
            }
          })
        );

        // Filtrar resultados nulos (erros de autenticação)
        const validGithubData = githubUsersData.filter(data => data !== null);
        
        if (validGithubData.length === 0) {
          setError('Não foi possível buscar dados do GitHub. Verifique o token de acesso.');
          return;
        }

        setGithubData(validGithubData);
      } catch (error) {
        console.error('❌ Erro ao buscar dados do GitHub:', error);
        setError(error instanceof Error ? error.message : 'Erro ao buscar dados do GitHub');
        toast.error('Erro ao buscar dados do GitHub');
      } finally {
        setLoading(false);
      }
    };

    fetchGithubData();
  }, [data, localDateRange, hasToken]);

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    setLocalDateRange(prev => ({
      ...prev,
      [type]: value
    }));
  };

  if (!hasToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCommit className="w-5 h-5" />
            Métricas do GitHub
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Token do GitHub não configurado</h3>
            <p className="text-gray-600 mb-4">
              Para visualizar as métricas do GitHub, você precisa configurar um token de acesso pessoal.
            </p>
            <Button
              onClick={() => {
                localStorage.removeItem('jira_dashboard_session');
                window.location.reload();
              }}
              variant="outline"
            >
              Configurar Token
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCommit className="w-5 h-5" />
            Métricas do GitHub
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Erro ao carregar métricas</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button
              onClick={() => {
                localStorage.removeItem('jira_dashboard_session');
                window.location.reload();
              }}
              variant="outline"
            >
              Tentar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Métricas do GitHub</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (githubData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCommit className="w-5 h-5" />
            Métricas do GitHub
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum dado encontrado</h3>
            <p className="text-gray-600 mb-6">
              Não foram encontradas métricas do GitHub para os assignees selecionados.
            </p>
            <div className="w-full max-w-md space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="startDate">Data Inicial</Label>
                  <div className="relative">
                    <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      id="startDate"
                      type="date"
                      value={localDateRange.start}
                      onChange={(e) => handleDateChange('start', e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="endDate">Data Final</Label>
                  <div className="relative">
                    <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      id="endDate"
                      type="date"
                      value={localDateRange.end}
                      onChange={(e) => handleDateChange('end', e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>
              <Button
                onClick={() => {
                  setLoading(true);
                  setGithubData([]);
                }}
                className="w-full"
              >
                Buscar Métricas
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitCommit className="w-5 h-5" />
          Métricas do GitHub
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <GitCommit className="w-4 h-4" />
                  Commits
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <GitPullRequest className="w-4 h-4" />
                  PRs Criados
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <GitPullRequestClosed className="w-4 h-4" />
                  PRs Revisados
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <GitCommit className="w-4 h-4" />
                  Comentários
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <GitPullRequest className="w-4 h-4" />
                  Reações
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <GitPullRequestClosed className="w-4 h-4" />
                  Mudanças
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {githubData.map((user) => (
              <TableRow key={user.email}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell className="text-center">{user.commits}</TableCell>
                <TableCell className="text-center">{user.prsCreated}</TableCell>
                <TableCell className="text-center">{user.prsReviewed}</TableCell>
                <TableCell className="text-center">{user.comments}</TableCell>
                <TableCell className="text-center">{user.reactions}</TableCell>
                <TableCell className="text-center">{user.changes}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default GithubMetrics; 