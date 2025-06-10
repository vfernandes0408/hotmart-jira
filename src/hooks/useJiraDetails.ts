import { useQuery } from '@tanstack/react-query';
import { JiraComment, JiraChangelog } from '@/types/jira';

interface JiraCredentials {
  email: string;
  apiToken: string;
  serverUrl: string;
}

const fetchJiraComments = async (
  issueId: string,
  credentials: JiraCredentials
): Promise<JiraComment[]> => {
  const response = await fetch(`/api/jira/rest/api/3/issue/${issueId}/comment?expand=renderedBody&orderBy=-created`, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${btoa(`${credentials.email}:${credentials.apiToken}`)}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Erro ao buscar comentários: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.comments.map((comment: any) => ({
    id: comment.id,
    author: {
      displayName: comment.author.displayName,
      emailAddress: comment.author.emailAddress,
    },
    body: comment.renderedBody || comment.body,
    created: comment.created,
    updated: comment.updated,
  }));
};

const fetchJiraChangelog = async (
  issueId: string,
  credentials: JiraCredentials
): Promise<JiraChangelog[]> => {
  const response = await fetch(`/api/jira/rest/api/3/issue/${issueId}/changelog`, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${btoa(`${credentials.email}:${credentials.apiToken}`)}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Erro ao buscar histórico: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.values.map((change: any) => ({
    id: change.id,
    author: {
      displayName: change.author.displayName,
      emailAddress: change.author.emailAddress,
    },
    created: change.created,
    items: change.items.map((item: any) => ({
      field: item.field,
      fieldtype: item.fieldtype,
      from: item.from,
      fromString: item.fromString,
      to: item.to,
      toString: item.toString,
    })),
  }));
};

export const useJiraComments = (issueId: string, credentials: JiraCredentials | null) => {
  return useQuery({
    queryKey: ['jiraComments', issueId, credentials?.email],
    queryFn: () => credentials ? fetchJiraComments(issueId, credentials) : Promise.reject('No credentials'),
    enabled: !!credentials?.email && !!credentials?.apiToken && !!issueId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    retry: 3,
  });
};

export const useJiraChangelog = (issueId: string, credentials: JiraCredentials | null) => {
  return useQuery({
    queryKey: ['jiraChangelog', issueId, credentials?.email],
    queryFn: () => credentials ? fetchJiraChangelog(issueId, credentials) : Promise.reject('No credentials'),
    enabled: !!credentials?.email && !!credentials?.apiToken && !!issueId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    retry: 3,
  });
}; 