import { useQuery, useQueryClient } from '@tanstack/react-query';
import { JiraIssue, JiraApiIssue } from '@/types/jira';

interface JiraCredentials {
  email: string;
  apiToken: string;
  projectKey?: string;
}

const mapJiraIssueToLocal = (apiIssue: JiraApiIssue): JiraIssue | null => {
  try {

    // Helper function to validate and parse story points
    const parseStoryPoints = (value: unknown): number => {
      // Log the raw value for debugging

      // Handle number case
      if (typeof value === 'number' && !isNaN(value)) {
        return value;
      }

      // Handle string case
      if (typeof value === 'string') {
        const parsed = parseFloat(value);
        if (!isNaN(parsed)) {
          return parsed;
        }
      }

      // Handle object case (some Jira instances return an object)
      if (value && typeof value === 'object' && 'value' in value) {
        const objValue = (value as { value: unknown }).value;
        if (typeof objValue === 'number' && !isNaN(objValue)) {
          return objValue;
        }
        if (typeof objValue === 'string') {
          const parsed = parseFloat(objValue);
          if (!isNaN(parsed)) {
            return parsed;
          }
        }
      }

      return 0;
    };

    // Try different custom fields that might contain story points
    const customFields = [
      apiIssue.fields.customfield_10016,
      apiIssue.fields.customfield_10004,
      apiIssue.fields.customfield_10002,
      apiIssue.fields.customfield_10020,
      apiIssue.fields.customfield_10011,
      apiIssue.fields.customfield_10028,
      apiIssue.fields.customfield_10024,
      apiIssue.fields.storypoints,
      apiIssue.fields.story_points
    ];



    // Try each field and use the first valid value
    let storyPoints = 0;
    for (const field of customFields) {
      const parsedValue = parseStoryPoints(field);
      if (parsedValue > 0) {
        storyPoints = parsedValue;
        break;
      }
    }

    // Log the final story points value

    // Status que indicam desenvolvimento ativo
    const developmentStatuses = ['Em Desenvolvimento', 'Developing', 'In Progress', 'Em Progresso'];
    // Status que indicam conclusão
    const completionStatuses = ['Done', 'Closed', 'Resolved', 'Concluído', 'Finalizado'];
    // Status que pausam o desenvolvimento
    const pausedStatuses = ['Blocked', 'On Hold', 'Waiting', 'Impediment', 'Bloqueado', 'Aguardando'];

    // Processar histórico de status
    const statusHistory = (apiIssue.changelog?.histories || [])
      .filter(history => history.items.some(item => item.field === 'status'))
      .map(history => ({
        status: history.items.find(item => item.field === 'status')?.toString || '',
        fromStatus: history.items.find(item => item.field === 'status')?.fromString || '',
        date: history.created,
        author: history.author.displayName
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Adicionar o status inicial se houver histórico
    if (statusHistory.length > 0 && statusHistory[0].fromStatus) {
      statusHistory.unshift({
        status: statusHistory[0].fromStatus,
        fromStatus: '',
        date: apiIssue.fields.created,
        author: 'System'
      });
    }

    // Encontrar a data de início (primeira vez que entrou em desenvolvimento)
    const startDate = statusHistory.find(history => 
      history.status === 'Em Desenvolvimento' || 
      (developmentStatuses.includes(history.status) && !pausedStatuses.includes(history.status))
    )?.date || null;

    // Encontrar a data de conclusão mais recente
    let completionDate: Date | null = null;
    if (apiIssue.fields.resolutiondate) {
      completionDate = new Date(apiIssue.fields.resolutiondate);
    } else {
      // Se não tem resolutiondate, procurar a última mudança para um status de conclusão
      const lastCompletionStatus = [...statusHistory]
        .reverse()
        .find(history => completionStatuses.includes(history.status));
      
      if (lastCompletionStatus) {
        completionDate = new Date(lastCompletionStatus.date);
      }
    }

    // Calcular Cycle Time (tempo desde o início até a conclusão ou data atual)
    let cycleTime = 0;
    if (startDate) {
      const endDate = completionDate || new Date();
      cycleTime = Math.ceil((endDate.getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
    }

    // Calcular Lead Time
    const leadTime = completionDate
      ? Math.ceil((completionDate.getTime() - new Date(apiIssue.fields.created).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const mappedIssue = {
      id: apiIssue.key,
      summary: apiIssue.fields.summary || '',
      issueType: apiIssue.fields.issuetype?.name || '',
      status: apiIssue.fields.status?.name || '',
      assignee: apiIssue.fields.assignee?.emailAddress || '',
      assigneeEmail: apiIssue.fields.assignee?.emailAddress || '',
      created: apiIssue.fields.created,
      startDate: startDate,
      resolved: completionDate?.toISOString() || null,
      resolutiondate: apiIssue.fields.resolutiondate || null,
      labels: apiIssue.fields.labels || [],
      project: apiIssue.fields.project?.key || '',
      storyPoints: storyPoints,
      cycleTime: cycleTime,
      leadTime: leadTime,
      statusHistory: statusHistory,
      comments: apiIssue.fields.comment?.comments || [],
      components: apiIssue.fields.components?.map(c => c.name) || [],
    };

    return mappedIssue;
  } catch (error) {
    console.error('Error mapping Jira issue:', error);
    return null;
  }
};

const fetchJiraData = async (credentials: JiraCredentials): Promise<JiraIssue[]> => {
  const auth = btoa(`${credentials.email}:${credentials.apiToken}`);
  const url = "/api/jira/rest/api/3/search";

  const jql = credentials.projectKey
    ? `project = "${credentials.projectKey}" ORDER BY created DESC`
    : "ORDER BY created DESC";


  let allIssues: JiraIssue[] = [];
  let startAt = 0;
  const maxResults = 100;
  let hasMoreResults = true;

  while (hasMoreResults) {
    const params = new URLSearchParams({
      jql: jql,
      maxResults: maxResults.toString(),
      startAt: startAt.toString(),
      fields: "*all",
      expand: "changelog"
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
        throw new Error("Credenciais inválidas. Verifique seu email e API token.");
      } else if (response.status === 403) {
        throw new Error("Acesso negado. Verifique as permissões da sua conta.");
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


      startAt += maxResults;
      hasMoreResults = data.total > startAt;

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
};

export const useJiraData = (credentials: JiraCredentials | null) => {
  const queryClient = useQueryClient();
  const queryKey = ['jiraData', credentials?.email, credentials?.projectKey];

  // Check if we have data in the cache
  const cachedData = queryClient.getQueryData<JiraIssue[]>(queryKey);

  return useQuery({
    queryKey,
    queryFn: () => credentials ? fetchJiraData(credentials) : Promise.reject('No credentials'),
    enabled: !!credentials?.email && !!credentials?.apiToken,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    refetchOnMount: !cachedData, // Only refetch on mount if we don't have cached data
    refetchOnReconnect: false, // Don't refetch on reconnect
    refetchOnWindowFocus: false, // Don't refetch on window focus
    retry: 3,
    initialData: cachedData, // Use cached data as initial data
  });
}; 