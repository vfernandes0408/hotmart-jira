import { useMutation, useQueryClient } from '@tanstack/react-query';

interface HotmartJedaiParams {
  prompt: string;
  apiKey: string;
}

const callHotmartJedai = async (params: HotmartJedaiParams): Promise<string> => {
  const requestBody = {
    prompt: "example-prompt",
    context: {
      prompt: params.prompt
    }
  };

  const response = await fetch('https://hotmart-ai-v2.buildstaging.com/v2/completions/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${params.apiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("HotmartJedai Error Response:", errorText);
    throw new Error(`Erro da API HotmartJedai: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.result || data.completion || data.text || data.response || JSON.stringify(data);
};

export const useHotmartJedai = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: callHotmartJedai,
    onSuccess: (data, variables) => {
      // Cache the response using the prompt as part of the key
      queryClient.setQueryData(
        ['hotmartjedai', variables.prompt],
        data
      );
    },
    onError: (error: Error) => {
      console.error('Erro ao chamar API HotmartJedai:', error);
      throw error;
    }
  });
}; 