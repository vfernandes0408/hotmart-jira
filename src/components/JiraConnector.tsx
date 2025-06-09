import React, { useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { JiraIssue } from "@/types/jira";
import { useJiraData } from "@/hooks/useJiraData";
import { useJiraCredentials } from "@/hooks/useJiraCredentials";

interface JiraConnectorProps {
  onConnect: (data: JiraIssue[], projectKey?: string) => void;
}

const JiraConnector: React.FC<JiraConnectorProps> = ({ onConnect }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const { credentials, updateCredential, isComplete } = useJiraCredentials();
  const { data: jiraData, isLoading, refetch } = useJiraData({
    email: credentials.email,
    apiToken: credentials.apiToken,
    projectKey: credentials.projectKey
  });

  const handleConnect = async () => {
    if (!isComplete) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    setIsConnecting(true);

    try {
      if (jiraData) {
        toast.success(
          `Conectado ao Jira com sucesso! ${jiraData.length} issues carregados.`
        );
        onConnect(jiraData, credentials.projectKey);
      } else {
        const result = await refetch();
        if (result.data) {
          toast.success(
            `Conectado ao Jira com sucesso! ${result.data.length} issues carregados.`
          );
          onConnect(result.data, credentials.projectKey);
        }
      }
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
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Conectar ao Jira</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serverUrl">
              <Server className="w-4 h-4 inline mr-2" />
              URL do Servidor Jira
            </Label>
            <Input
              id="serverUrl"
              placeholder="https://seudominio.atlassian.net"
              value={credentials.serverUrl}
              onChange={(e) => updateCredential("serverUrl", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              <User className="w-4 h-4 inline mr-2" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="seu.email@empresa.com"
              value={credentials.email}
              onChange={(e) => updateCredential("email", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiToken">
              <Key className="w-4 h-4 inline mr-2" />
              Token API
            </Label>
            <Input
              id="apiToken"
              type="password"
              placeholder="Seu token API do Jira"
              value={credentials.apiToken}
              onChange={(e) => updateCredential("apiToken", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectKey">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              Chave do Projeto (opcional)
            </Label>
            <Input
              id="projectKey"
              placeholder="KEY"
              value={credentials.projectKey}
              onChange={(e) => updateCredential("projectKey", e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <Button
            onClick={handleConnect}
            disabled={isLoading || isConnecting || !isComplete}
            className="w-full sm:w-auto"
          >
            {isLoading || isConnecting ? (
              <>
                <span className="loading loading-spinner"></span>
                Conectando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Conectar
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default JiraConnector;
