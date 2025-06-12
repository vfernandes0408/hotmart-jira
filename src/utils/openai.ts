// Utilitário para gerenciar a chave da API OpenAI e fazer chamadas

export function getOpenAIApiKey(): string | null {
  try {
    const credentials = localStorage.getItem('jira_credentials');
    if (credentials) {
      const parsed = JSON.parse(credentials);
      return parsed.openaiApiKey || null;
    }
  } catch (error) {
    console.error('Erro ao recuperar chave da API OpenAI:', error);
  }
  return null;
}

export function setOpenAIApiKey(apiKey: string): void {
  try {
    const credentials = localStorage.getItem('jira_credentials');
    let parsedCredentials = {};
    
    if (credentials) {
      parsedCredentials = JSON.parse(credentials);
    }
    
    const updatedCredentials = {
      ...parsedCredentials,
      openaiApiKey: apiKey
    };
    
    localStorage.setItem('jira_credentials', JSON.stringify(updatedCredentials));
  } catch (error) {
    console.error('Erro ao salvar chave da API OpenAI:', error);
    throw error;
  }
}

export async function callOpenAIApi(prompt: string): Promise<string> {
  const apiKey = getOpenAIApiKey();
  
  if (!apiKey) {
    throw new Error('Chave da API OpenAI não configurada');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em análise de dados do Jira e métricas de desenvolvimento de software. Forneça insights práticos e acionáveis em português.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Chave da API OpenAI inválida');
      } else if (response.status === 429) {
        throw new Error('Limite de requisições da API OpenAI excedido');
      } else {
        throw new Error(`Erro da API OpenAI: ${response.status}`);
      }
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Resposta inválida da API OpenAI');
    }

    return data.choices[0].message.content;
    
  } catch (error) {
    console.error('Erro ao chamar API OpenAI:', error);
    throw error;
  }
}
