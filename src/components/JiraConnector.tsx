import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Key, Server, User, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface JiraConnectorProps {
  onConnect: (data: any) => void;
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

  const generateMockData = () => {
    const issueTypes = ['Story', 'Bug', 'Task', 'Epic'];
    const statuses = ['To Do', 'In Progress', 'Code Review', 'Testing', 'Done'];
    const categories = ['Frontend', 'Backend', 'DevOps', 'Design', 'QA'];
    
    return Array.from({ length: 100 }, (_, i) => ({
      id: `PROJ-${i + 1}`,
      summary: `Issue ${i + 1}`,
      issueType: issueTypes[Math.floor(Math.random() * issueTypes.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      category: categories[Math.floor(Math.random() * categories.length)],
      cycleTime: Math.floor(Math.random() * 30) + 1, // dias
      leadTime: Math.floor(Math.random() * 45) + 5, // dias
      storyPoints: Math.floor(Math.random() * 13) + 1,
      created: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      resolved: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : null,
      assignee: `Developer ${Math.floor(Math.random() * 10) + 1}`,
      project: credentials.projectKey || 'DEMO'
    }));
  };

  const handleConnect = async () => {
    if (!credentials.serverUrl || !credentials.email || !credentials.apiToken) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setIsConnecting(true);
    
    try {
      // Simular conexão com a API do Jira
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Por enquanto, vamos usar dados mock
      const mockData = generateMockData();
      
      toast.success('Conectado ao Jira com sucesso!');
      onConnect(mockData);
    } catch (error) {
      toast.error('Erro ao conectar com o Jira. Verifique suas credenciais.');
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
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              Demo Mode: Dados de exemplo serão carregados para demonstração
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JiraConnector;
