import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface JiraCredentials {
  serverUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
}

const STORAGE_KEY = 'jira_credentials';

export const useJiraCredentials = () => {
  const [credentials, setCredentials] = useState<JiraCredentials>({
    serverUrl: '',
    email: '',
    apiToken: '',
    projectKey: '',
  });

  // Load credentials from localStorage on mount
  useEffect(() => {
    try {
      const savedCredentials = localStorage.getItem(STORAGE_KEY);
      if (savedCredentials) {
        const parsed = JSON.parse(savedCredentials);
        // Validate that we have valid credentials structure
        if (parsed && typeof parsed === 'object' && parsed.serverUrl) {
          setCredentials(parsed);
          toast.success('Credenciais carregadas do armazenamento local');
        }
      }
    } catch (error) {
      console.error('Erro ao carregar credenciais do localStorage:', error);
      // Clear corrupted data
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Save credentials to localStorage
  const saveCredentials = useCallback((newCredentials: JiraCredentials) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newCredentials));
      setCredentials(newCredentials);
    } catch (error) {
      console.error('Erro ao salvar credenciais no localStorage:', error);
      toast.error('Erro ao salvar credenciais');
    }
  }, []);

  // Update a single field
  const updateCredential = useCallback((field: keyof JiraCredentials, value: string) => {
    const newCredentials = {
      ...credentials,
      [field]: value,
    };
    saveCredentials(newCredentials);
  }, [credentials, saveCredentials]);

  // Clear credentials
  const clearCredentials = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setCredentials({
        serverUrl: '',
        email: '',
        apiToken: '',
        projectKey: '',
      });
      toast.success('Credenciais removidas');
    } catch (error) {
      console.error('Erro ao limpar credenciais:', error);
      toast.error('Erro ao limpar credenciais');
    }
  }, []);

  return {
    credentials,
    updateCredential,
    clearCredentials,
    isComplete: !!(credentials.serverUrl && credentials.email && credentials.apiToken),
  };
};
