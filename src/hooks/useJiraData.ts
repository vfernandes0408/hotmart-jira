import { useQuery, useQueryClient } from '@tanstack/react-query';
import { JiraIssue, JiraApiIssue } from '@/types/jira';

interface JiraCredentials {
  email: string;
  apiToken: string;
  projectKey?: string;
}

const mapJiraIssueToLocal = (apiIssue: JiraApiIssue): JiraIssue | null => {
  try {
    const storyPoints = 
      apiIssue.fields.customfield_10016 || // Try different custom fields that might contain story points
      apiIssue.fields.customfield_10004 ||
      apiIssue.fields.customfield_10002 ||
      apiIssue.fields.storypoints ||
      apiIssue.fields.story_points ||
      0;

    return {
      id: apiIssue.key,
      summary: apiIssue.fields.summary || '',
      issueType: apiIssue.fields.issuetype?.name || '',
      status: apiIssue.fields.status?.name || '',
      assignee: apiIssue.fields.assignee?.displayName || '',
      created: apiIssue.fields.created,
      resolved: apiIssue.fields.resolutiondate || null,
      labels: apiIssue.fields.labels || [],
      project: apiIssue.fields.project?.key || '',
      storyPoints: storyPoints,
      cycleTime: apiIssue.fields.resolutiondate
        ? Math.ceil((new Date(apiIssue.fields.resolutiondate).getTime() - new Date(apiIssue.fields.created).getTime()) / (1000 * 60 * 60 * 24))
        : 0,
      leadTime: 0 // You might want to calculate this based on your specific workflow
    };
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