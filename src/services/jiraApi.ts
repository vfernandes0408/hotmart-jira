import { JiraComment } from '@/types/jira';

export const fetchJiraComments = async (
  issueId: string,
  credentials: {
    email: string;
    apiToken: string;
    serverUrl: string;
  }
): Promise<JiraComment[]> => {
  const auth = btoa(`${credentials.email}:${credentials.apiToken}`);
  const url = `${credentials.serverUrl}/rest/api/3/issue/${issueId}/comment`;

  try {
    console.log('Fetching comments from:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Jira API Error:', {
        status: response.status,
        statusText: response.statusText,
        errorText,
        url,
      });
      throw new Error(`Erro ao buscar comentários: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Comments response:', data);

    if (!data.comments || !Array.isArray(data.comments)) {
      console.error('Invalid response format:', data);
      throw new Error('Formato de resposta inválido da API do Jira');
    }

    return data.comments.map((comment: any) => ({
      id: comment.id,
      author: {
        displayName: comment.author.displayName,
        emailAddress: comment.author.emailAddress,
      },
      body: comment.body,
      created: comment.created,
      updated: comment.updated,
    }));
  } catch (error) {
    console.error('Erro ao buscar comentários:', {
      error,
      issueId,
      serverUrl: credentials.serverUrl,
    });
    throw error;
  }
}; 