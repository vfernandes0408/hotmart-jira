import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface OpenAIError {
  error: {
    message: string;
    code: string;
  };
}

// Cache para armazenar as últimas chamadas
const requestCache = new Map<string, { timestamp: number; data: string }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos

const callOpenAI = async (params: { prompt: string; apiKey: string }): Promise<string> => {
  // Verifica se existe uma resposta em cache
  const cacheKey = params.prompt;
  const cachedResponse = requestCache.get(cacheKey);
  if (cachedResponse && Date.now() - cachedResponse.timestamp < CACHE_DURATION) {
    return cachedResponse.data;
  }

  try {
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
            content: 'Você é um especialista em análise de dados de desenvolvimento de software, com foco em métricas do GitHub. Forneça insights práticos e acionáveis em português, destacando padrões de contribuição, pontos fortes e áreas de oportunidade.'
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
      const errorText = await response.text();
      const errorData = JSON.parse(errorText) as OpenAIError;
      
      if (response.status === 429) {
        throw new Error('rate_limit_exceeded');
      }

      throw new Error(errorData.error.message || `Erro da API OpenAI: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Resposta inválida da API OpenAI');
    }

    const result = data.choices[0].message.content;
    
    // Salva a resposta no cache
    requestCache.set(cacheKey, {
      timestamp: Date.now(),
      data: result
    });

    return result;
  } catch (error) {
    if (error instanceof Error && error.message === 'rate_limit_exceeded') {
      throw new Error('rate_limit_exceeded');
    }
    throw error;
  }
};

export const useOpenAI = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { users: any[] }) => {
      const iaKeys = JSON.parse(localStorage.getItem('iaKeys') || '{}');
      const apiKey = iaKeys.openai;
      if (!apiKey) {
        throw new Error('Chave da API OpenAI não configurada');
      }

      const prompt = `Analise os seguintes dados de performance de desenvolvedores e forneça insights relevantes sobre suas contribuições. Considere apenas os desenvolvedores que tiveram alguma contribuição (ignore os que têm todos os valores zerados). Use todas as métricas disponíveis para cada pessoa.

Dados dos desenvolvedores:
${JSON.stringify(data.users, null, 2)}

Por favor, forneça insights sobre:
1. Padrões de contribuição
2. Pontos fortes de cada desenvolvedor
3. Áreas de oportunidade
4. Comparações relevantes entre os desenvolvedores
5. Sugestões de melhoria

Formate a resposta em português, usando linguagem profissional e objetiva.`;

      return callOpenAI({ prompt, apiKey });
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        ['openai', variables.users],
        data
      );
    },
    onError: (error: Error) => {
      console.error('Erro ao chamar API OpenAI:', error);
      if (error.message === 'rate_limit_exceeded') {
        toast.error('Limite de requisições excedido. Tente novamente mais tarde.', {
          duration: 5000,
          position: 'bottom-right'
        });
      } else {
        toast.error(error.message, {
          duration: 5000,
          position: 'bottom-right'
        });
      }
    }
  });
};
