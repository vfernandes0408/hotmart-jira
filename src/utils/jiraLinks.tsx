import React from 'react';
import { ExternalLink } from 'lucide-react';

interface JiraLinkProps {
  ticketId: string;
  className?: string;
  showIcon?: boolean;
}

// Função para obter a URL base do Jira do localStorage
export const getJiraBaseUrl = (): string | null => {
  try {
    const savedCredentials = localStorage.getItem('jiraCredentials');
    if (savedCredentials) {
      const credentials = JSON.parse(savedCredentials);
      return credentials.serverUrl;
    }
  } catch (error) {
    console.error('Erro ao obter URL do Jira:', error);
  }
  return null;
};

// Função para construir URL do ticket
export const buildJiraTicketUrl = (ticketId: string): string | null => {
  const baseUrl = getJiraBaseUrl();
  if (!baseUrl) return null;
  
  // Remove trailing slash se existir
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  return `${cleanBaseUrl}/browse/${ticketId}`;
};

// Componente para links do Jira
export const JiraLink: React.FC<JiraLinkProps> = ({ 
  ticketId, 
  className = '', 
  showIcon = true 
}) => {
  const jiraUrl = buildJiraTicketUrl(ticketId);
  
  if (!jiraUrl) {
    // Se não conseguir construir o link, apenas mostra o ID
    return (
      <span className={`font-mono ${className}`}>
        {ticketId}
      </span>
    );
  }
  
  return (
    <a
      href={jiraUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`font-mono hover:underline inline-flex items-center gap-1 ${className}`}
    >
      {ticketId}
      {showIcon && (
        <ExternalLink className="w-3 h-3 opacity-60" />
      )}
    </a>
  );
};

// Função para detectar e transformar IDs de tickets em texto
export const renderTextWithJiraLinks = (text: string): React.ReactNode => {
  // Regex para detectar padrões como SCH-123, ABC-456, etc.
  const ticketRegex = /\b([A-Z]{2,10}-\d+)\b/g;
  
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  // Se não encontrar nenhum padrão de ticket, retorna o texto original
  if (!ticketRegex.test(text)) {
    return text;
  }
  
  // Reset regex para usar novamente
  ticketRegex.lastIndex = 0;
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  
  while ((match = ticketRegex.exec(text)) !== null) {
    // Adiciona o texto antes do match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    // Adiciona o link do ticket
    parts.push(
      <JiraLink 
        key={`${match[1]}-${match.index}`}
        ticketId={match[1]} 
        className="text-blue-600 hover:text-blue-800"
        showIcon={false}
      />
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Adiciona o texto restante após o último match
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return <>{parts}</>;
}; 