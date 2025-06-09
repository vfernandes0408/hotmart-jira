import { JiraComment, JiraChangelog } from '@/types/jira';

export const fetchJiraComments = async (
  issueId: string,
  credentials: {
    email: string;
    apiToken: string;
    serverUrl: string;
  }
): Promise<JiraComment[]> => {
  try {
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
  } catch (error) {
    console.error('Erro ao buscar comentários:', error);
    throw error;
  }
};

export const fetchJiraChangelog = async (
  issueId: string,
  credentials: {
    email: string;
    apiToken: string;
    serverUrl: string;
  }
): Promise<JiraChangelog[]> => {
  try {
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
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    throw error;
  }
}; 