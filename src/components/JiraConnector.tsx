import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  Key,
  Server,
  User,
  CheckCircle2,
  Brain,
} from "lucide-react";
import { toast } from "sonner";
import { JiraIssue, JiraApiIssue } from "@/types/jira";

interface JiraConnectorProps {
  onConnect: (data: JiraIssue[], projectKey?: string) => void;
}

const STORAGE_KEY = "jira_credentials";

const JiraConnector: React.FC<JiraConnectorProps> = ({ onConnect }) => {
  const [credentials, setCredentials] = useState({
    serverUrl: "",
    email: "",
    apiToken: "",
    projectKey: "",
    openaiApiKey: "",
  });
  const [isConnecting, setIsConnecting] = useState(false);

  // Carregar dados salvos do localStorage ao montar o componente
  useEffect(() => {
    try {
      const savedCredentials = localStorage.getItem(STORAGE_KEY);
      if (savedCredentials) {
        const parsed = JSON.parse(savedCredentials);
        // Validate that we have valid credentials structure
        if (parsed && typeof parsed === "object" && parsed.serverUrl) {
          setCredentials(parsed);
          toast.success("Credenciais carregadas do armazenamento local");
        }
      }
    } catch (error) {
      console.error("Erro ao carregar credenciais do localStorage:", error);
      // Clear corrupted data
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Salvar credenciais no localStorage sempre que mudarem
  const saveCredentials = (newCredentials: typeof credentials) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newCredentials));
    } catch (error) {
      console.error("Erro ao salvar credenciais no localStorage:", error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    const newCredentials = {
      ...credentials,
      [field]: value,
    };
    setCredentials(newCredentials);
    saveCredentials(newCredentials);
  };

  const calculateCycleTime = (
    created: string,
    resolved: string | null
  ): number => {
    if (!resolved) return 0;

    const createdDate = new Date(created);
    const resolvedDate = new Date(resolved);
    const diffTime = Math.abs(resolvedDate.getTime() - createdDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  const mapJiraIssueToLocal = (jiraIssue: JiraApiIssue): JiraIssue | null => {
    // Validar se o objeto é válido
    if (!jiraIssue || !jiraIssue.key || !jiraIssue.fields) {
      console.warn("Invalid Jira issue object:", jiraIssue);
      return null;
    }

    const created = jiraIssue.fields.created;
    const resolved = jiraIssue.fields.resolutiondate;

    // Calcular cycle time e garantir que é um número válido
    const cycleTime = calculateCycleTime(created, resolved);
    const leadTime = calculateCycleTime(created, resolved);

    // Validar story points - buscar em todos os custom fields possíveis
    let storyPointsRaw = 0;
    const fieldsToCheck = jiraIssue.fields as Record<string, unknown>;

    // Lista de campos conhecidos para story points (ordem de prioridade)
    const knownStoryPointFields = [
      "customfield_10016",
      "customfield_10004",
      "customfield_10002",
      "customfield_10020",
      "customfield_10011",
      "customfield_10028",
      "customfield_10024",
      "customfield_10005",
      "customfield_10001",
      "customfield_10003",
      "storypoints",
      "story_points",
    ];

    // Primeiro tentar campos conhecidos
    for (const field of knownStoryPointFields) {
      if (
        fieldsToCheck[field] &&
        typeof fieldsToCheck[field] === "number" &&
        (fieldsToCheck[field] as number) > 0
      ) {
        storyPointsRaw = fieldsToCheck[field] as number;
        break;
      }
    }

    // Se não encontrou, procurar em todos os custom fields numéricos
    if (!storyPointsRaw) {
      for (const [key, value] of Object.entries(fieldsToCheck)) {
        if (
          key.startsWith("customfield_") &&
          typeof value === "number" &&
          value > 0 &&
          value <= 100
        ) {
          // Assumir que story points normalmente são entre 1-100
          storyPointsRaw = value;
          break;
        }
      }
    }

    const storyPoints = Number(storyPointsRaw) || 0;

    return {
      id: String(jiraIssue.key),
      summary: String(jiraIssue.fields.summary || "Sem título"),
      issueType: String(jiraIssue.fields.issuetype?.name || "Unknown"),
      status: String(jiraIssue.fields.status?.name || "Unknown"),
      labels: Array.isArray(jiraIssue.fields.labels)
        ? jiraIssue.fields.labels
        : [],
      cycleTime: Math.max(0, Number(cycleTime) || 0),
      leadTime: Math.max(0, Number(leadTime) || 0),
      storyPoints: Math.max(0, storyPoints),
      created: String(created),
      resolved: resolved ? String(resolved) : null,
      assignee: String(
        jiraIssue.fields.assignee?.displayName || "Não atribuído"
      ),
      project: String(
        jiraIssue.fields.project?.key || credentials.projectKey || "UNKNOWN"
      ),
    };
  };

  const fetchJiraData = async (): Promise<JiraIssue[]> => {
    const auth = btoa(`${credentials.email}:${credentials.apiToken}`);
    // Use the Vite proxy instead of direct URL
    const url = "/api/jira/rest/api/3/search";

    // JQL para buscar issues - pode ser customizado conforme necessário
    const jql = credentials.projectKey
      ? `project = "${credentials.projectKey}" ORDER BY created DESC`
      : "ORDER BY created DESC";

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
          fields: "*all", // Buscar TODOS os campos para identificar o correto
        });

        const response = await fetch(`${url}?${params}`, {
          method: "GET",
          headers: {
            Authorization: `Basic ${auth}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error(
              "Credenciais inválidas. Verifique seu email e API token."
            );
          } else if (response.status === 403) {
            throw new Error(
              "Acesso negado. Verifique as permissões da sua conta."
            );
          } else if (response.status === 404) {
            throw new Error("URL do servidor ou projeto não encontrado.");
          } else {
            throw new Error(`Erro ${response.status}: ${response.statusText}`);
          }
        }

        const data = await response.json();

        if (data.issues && data.issues.length > 0) {
          const mappedIssues = data.issues
            .map(mapJiraIssueToLocal)
            .filter((issue): issue is JiraIssue => issue !== null);
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
        throw new Error("Nenhum issue encontrado no projeto especificado.");
      }

      return allIssues;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error(
          "Erro de rede ou CORS. Verifique se a URL está correta e se o servidor permite requisições do navegador."
        );
      }
      console.error("Erro ao buscar dados do Jira:", error);
      throw error;
    }
  };

  const handleConnect = async () => {
    if (!credentials.serverUrl || !credentials.email || !credentials.apiToken) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    setIsConnecting(true);

    try {
      const jiraData = await fetchJiraData();

      toast.success(
        `Conectado ao Jira com sucesso! ${jiraData.length} issues carregados.`
      );
      onConnect(jiraData, credentials.projectKey);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Erro ao conectar com o Jira. Verifique suas credenciais.";
      toast.error(errorMessage);
      console.error("Erro de conexão:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="text-center pb-4 bg-gray-50 rounded-t-lg">
              <div className="mx-auto w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mb-3">
                <Server className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900">
                Configuração de Conexão
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Preencha os dados abaixo para conectar
              </p>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {/* Grid principal com 2 colunas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Server URL */}
                <div className="md:col-span-2 space-y-2">
                  <Label
                    htmlFor="serverUrl"
                    className="flex items-center gap-2 text-sm font-medium text-gray-800"
                  >
                    <Server className="w-4 h-4 text-orange-600" />
                    URL do Servidor Jira *
                  </Label>
                  <Input
                    id="serverUrl"
                    placeholder="https://yourcompany.atlassian.net"
                    value={credentials.serverUrl}
                    onChange={(e) =>
                      handleInputChange("serverUrl", e.target.value)
                    }
                    className="h-9 text-sm border-gray-200 bg-white focus:border-orange-400 focus:ring-1 focus:ring-orange-100"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="flex items-center gap-2 text-sm font-medium text-gray-800"
                  >
                    <User className="w-4 h-4 text-gray-600" />
                    Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu.email@empresa.com"
                    value={credentials.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="h-9 text-sm border-gray-200 bg-white focus:border-orange-400 focus:ring-1 focus:ring-orange-100"
                  />
                </div>

                {/* Project Key */}
                <div className="space-y-2">
                  <Label
                    htmlFor="projectKey"
                    className="flex items-center gap-2 text-sm font-medium text-gray-800"
                  >
                    <Key className="w-4 h-4 text-orange-600" />
                    Projeto
                  </Label>
                  <Input
                    id="projectKey"
                    placeholder="SCH, MCG..."
                    value={credentials.projectKey}
                    onChange={(e) =>
                      handleInputChange("projectKey", e.target.value)
                    }
                    className="h-9 text-sm border-gray-200 bg-white focus:border-orange-400 focus:ring-1 focus:ring-orange-100"
                  />
                </div>
              </div>

              {/* Jira API Token - Linha separada */}
              <div className="space-y-2">
                <Label
                  htmlFor="apiToken"
                  className="flex items-center gap-2 text-sm font-medium text-gray-800"
                >
                  <Key className="w-4 h-4 text-gray-600" />
                  Jira API Token *
                </Label>
                <Input
                  id="apiToken"
                  type="password"
                  placeholder="Seu token de API do Jira"
                  value={credentials.apiToken}
                  onChange={(e) =>
                    handleInputChange("apiToken", e.target.value)
                  }
                  className="h-9 text-sm border-gray-200 bg-white focus:border-orange-400 focus:ring-1 focus:ring-orange-100"
                />
              </div>

              {/* OpenAI API Key - Linha separada */}
              <div className="space-y-2">
                <Label
                  htmlFor="openaiApiKey"
                  className="flex items-center gap-2 text-sm font-medium text-gray-800"
                >
                  <Brain className="w-4 h-4 text-orange-600" />
                  OpenAI API Key (opcional para IA)
                </Label>
                <Input
                  id="openaiApiKey"
                  type="password"
                  placeholder="sk-... (para insights com IA)"
                  value={credentials.openaiApiKey}
                  onChange={(e) =>
                    handleInputChange("openaiApiKey", e.target.value)
                  }
                  className="h-9 text-sm border-gray-200 bg-white focus:border-orange-400 focus:ring-1 focus:ring-orange-100"
                />
              </div>

              {/* Help section - Compacto */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-semibold text-gray-900 mb-1">
                      💡 API Token:
                    </p>
                    <div className="text-gray-700 space-y-0.5">
                      <p>
                        <strong>1.</strong> Atlassian Account → Security
                      </p>
                      <p>
                        <strong>2.</strong> "Create API token" → Dê um nome
                      </p>
                      <p>
                        <strong>3.</strong> Copie e cole acima
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Connect button e Status em linha */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleConnect}
                  disabled={
                    isConnecting ||
                    !credentials.serverUrl ||
                    !credentials.email ||
                    !credentials.apiToken
                  }
                  className="flex-1 h-10 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-sm"
                >
                  {isConnecting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Conectando...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Conectar</span>
                    </div>
                  )}
                </Button>

                {/* Status badges compactos */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-gray-600">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    <span className="text-xs font-medium">Seguro</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                    <span className="text-xs font-medium">API</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default JiraConnector;
