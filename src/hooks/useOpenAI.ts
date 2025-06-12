import { useMutation, useQueryClient } from '@tanstack/react-query';

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

const callOpenAI = async (params: { prompt: string; apiKey: string }): Promise<string> => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${params.apiKey}`,
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
          content: params.prompt
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

  const data: OpenAIResponse = await response.json();
  
  if (!data.choices?.[0]?.message?.content) {
    throw new Error('Resposta inválida da API OpenAI');
  }

  return data.choices[0].message.content;
};

export const useOpenAI = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: callOpenAI,
    onSuccess: (data, variables) => {
      // Cache the response using the prompt as part of the key
      queryClient.setQueryData(
        ['openai', variables.prompt],
        data
      );
    },
    onError: (error: Error) => {
      console.error('Erro ao chamar API OpenAI:', error);
      throw error;
    }
  });
};
