import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Key, Server, User, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { JiraIssue, JiraApiIssue } from '@/types/jira';

interface JiraConnectorProps {
  onConnect: (data: JiraIssue[]) => void;
}

const STORAGE_KEY = 'jira_credentials';

const JiraConnector: React.FC<JiraConnectorProps> = ({ onConnect }) => {
  const [credentials, setCredentials] = useState({
    serverUrl: '',
    email: '',
    apiToken: '',
    projectKey: ''
  });
  const [isConnecting, setIsConnecting] = useState(false);

  // Carregar dados salvos do localStorage ao montar o componente
  useEffect(() => {
    try {
      const savedCredentials = localStorage.getItem(STORAGE_KEY);
      if (savedCredentials) {
        const parsed = JSON.parse(savedCredentials);
        setCredentials(parsed);
        toast.success('Credenciais carregadas do armazenamento local');
      }
    } catch (error) {
      console.error('Erro ao carregar credenciais do localStorage:', error);
    }
  }, []);

  // Salvar credenciais no localStorage sempre que mudarem
  const saveCredentials = (newCredentials: typeof credentials) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newCredentials));
    } catch (error) {
      console.error('Erro ao salvar credenciais no localStorage:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    const newCredentials = {
      ...credentials,
      [field]: value
    };
    setCredentials(newCredentials);
    saveCredentials(newCredentials);
  };

  const calculateCycleTime = (created: string, resolved: string | null): number => {
    if (!resolved) return 0;
    
    const createdDate = new Date(created);
    const resolvedDate = new Date(resolved);
    const diffTime = Math.abs(resolvedDate.getTime() - createdDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const mapJiraIssueToLocal = (jiraIssue: JiraApiIssue): JiraIssue => {
    const created = jiraIssue.fields.created;
    const resolved = jiraIssue.fields.resolutiondate;
    
    return {
      id: jiraIssue.key,
      summary: jiraIssue.fields.summary || 'Sem título',
      issueType: jiraIssue.fields.issuetype?.name || 'Unknown',
      status: jiraIssue.fields.status?.name || 'Unknown',
      category: jiraIssue.fields.components?.[0]?.name || jiraIssue.fields.customfield_10000 || 'Sem Categoria',
      labels: jiraIssue.fields.labels || [],
      cycleTime: calculateCycleTime(created, resolved),
      leadTime: calculateCycleTime(created, resolved), // Pode ser refinado com outros campos
      storyPoints: jiraIssue.fields.customfield_10016 || jiraIssue.fields.customfield_10004 || 0,
      created: created,
      resolved: resolved,
      assignee: jiraIssue.fields.assignee?.displayName || 'Não atribuído',
      project: jiraIssue.fields.project?.key || credentials.projectKey || 'UNKNOWN'
    };
  };

  const fetchJiraData = async (): Promise<JiraIssue[]> => {
    const auth = btoa(`${credentials.email}:${credentials.apiToken}`);
    const baseUrl = credentials.serverUrl.replace(/\/$/, ''); // Remove trailing slash
    
    // JQL para buscar issues - pode ser customizado conforme necessário
    const jql = credentials.projectKey 
      ? `project = "${credentials.projectKey}" ORDER BY created DESC`
      : 'ORDER BY created DESC';
    
    const url = `${baseUrl}/rest/api/3/search`;
    
    let allIssues: JiraIssue[] = [];
    let startAt = 0;
    const maxResults = 100; // Buscar em lotes de 100
    let hasMoreResults = true;

    try {
      while (hasMoreResults) {
        const params = new URLSearchParams({
          jql: jql,
          maxResults: maxResults.toString(),
          startAt: startAt.toString(),
          fields: 'key,summary,issuetype,status,assignee,created,resolutiondate,labels,components,project,customfield_10016,customfield_10004,customfield_10000'
        });

        const response = await fetch(`${url}?${params}`, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Credenciais inválidas. Verifique seu email e API token.');
          } else if (response.status === 403) {
            throw new Error('Acesso negado. Verifique as permissões da sua conta.');
          } else if (response.status === 404) {
            throw new Error('URL do servidor ou projeto não encontrado.');
          } else {
            throw new Error(`Erro ${response.status}: ${response.statusText}`);
          }
        }

        const data = await response.json();
        
        if (data.issues && data.issues.length > 0) {
          const mappedIssues = data.issues.map(mapJiraIssueToLocal);
          allIssues = [...allIssues, ...mappedIssues];
          
          // Verificar se há mais resultados
          startAt += maxResults;
          hasMoreResults = data.total > startAt;
          
          // Limite de segurança para evitar buscar demais
          if (allIssues.length >= 1000) {
            break;
          }
        } else {
          hasMoreResults = false;
        }
      }
      
      if (allIssues.length === 0) {
        throw new Error('Nenhum issue encontrado no projeto especificado.');
      }

      return allIssues;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Erro de rede ou CORS. Verifique se a URL está correta e se o servidor permite requisições do navegador.');
      }
      console.error('Erro ao buscar dados do Jira:', error);
      throw error;
    }
  };

  const handleConnect = async () => {
    if (!credentials.serverUrl || !credentials.email || !credentials.apiToken) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setIsConnecting(true);
    
    try {
      const jiraData = await fetchJiraData();
      
      toast.success(`Conectado ao Jira com sucesso! ${jiraData.length} issues carregados.`);
      onConnect(jiraData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao conectar com o Jira. Verifique suas credenciais.';
      toast.error(errorMessage);
      console.error('Erro de conexão:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-2xl border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4">
            <Server className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Conectar ao Jira</CardTitle>
          <p className="text-muted-foreground">
            Configure sua conexão com a API do Jira para começar a analisar seus dados
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serverUrl" className="flex items-center gap-2">
                <Server className="w-4 h-4" />
                URL do Servidor Jira *
              </Label>
              <Input
                id="serverUrl"
                placeholder="https://yourcompany.atlassian.net"
                value={credentials.serverUrl}
                onChange={(e) => handleInputChange('serverUrl', e.target.value)}
                className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="projectKey" className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                Chave do Projeto
              </Label>
              <Input
                id="projectKey"
                placeholder="PROJ"
                value={credentials.projectKey}
                onChange={(e) => handleInputChange('projectKey', e.target.value)}
                className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu.email@empresa.com"
                value={credentials.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="apiToken" className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                API Token *
              </Label>
              <Input
                id="apiToken"
                type="password"
                placeholder="Seu token de API"
                value={credentials.apiToken}
                onChange={(e) => handleInputChange('apiToken', e.target.value)}
                className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 mb-1">Como obter seu API Token:</p>
                <ol className="text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Acesse as configurações da sua conta Atlassian</li>
                  <li>Vá para "Security" → "Create and manage API tokens"</li>
                  <li>Clique em "Create API token" e dê um nome descritivo</li>
                  <li>Copie o token gerado e cole no campo acima</li>
                </ol>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 h-12"
          >
            {isConnecting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Conectando...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Conectar ao Jira
              </div>
            )}
          </Button>
          
          <div className="text-center text-sm text-muted-foreground">
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              ⚡ Conectando diretamente à API do Jira
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JiraConnector;
