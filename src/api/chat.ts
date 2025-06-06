// API handler para integração com ChatGPT
interface ChatRequest {
  message: string;
  model?: string;
}

interface ChatResponse {
  message: string;
  error?: string;
}

export async function chatHandler(req: ChatRequest): Promise<ChatResponse> {
  try {
    // Configuração da API do OpenAI
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key não configurada');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: req.model || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em análise de dados do Jira e métricas de desenvolvimento de software. Forneça insights práticos e acionáveis.'
          },
          {
            role: 'user',
            content: req.message
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      message: data.choices[0]?.message?.content || 'Nenhuma resposta gerada'
    };
    
  } catch (error) {
    console.error('Erro na API do ChatGPT:', error);
    return {
      message: '',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

// Função utilitária para simular insights quando a API não estiver disponível
interface MockInsightsData {
  label1Stats: {
    count: number;
    avgCycleTime: number;
    avgStoryPoints: number;
    completionRate: number;
  };
  label2Stats: {
    count: number;
    avgCycleTime: number;
    avgStoryPoints: number;
    completionRate: number;
  };
}

export function generateMockInsights(label1: string, label2: string, data: MockInsightsData): string {
  return `
## Análise Comparativa: ${label1} vs ${label2}

### 📊 Resumo Executivo

Com base nos dados analisados, identificamos diferenças significativas entre as duas labels:

**${label1}**: ${data.label1Stats.count} issues | Cycle time: ${data.label1Stats.avgCycleTime.toFixed(1)} dias
**${label2}**: ${data.label2Stats.count} issues | Cycle time: ${data.label2Stats.avgCycleTime.toFixed(1)} dias

### 🎯 Performance Comparativa

${data.label1Stats.avgCycleTime < data.label2Stats.avgCycleTime ? 
  `**${label1}** apresenta melhor performance com cycle time ${((data.label2Stats.avgCycleTime - data.label1Stats.avgCycleTime) / data.label2Stats.avgCycleTime * 100).toFixed(1)}% menor.` :
  `**${label2}** apresenta melhor performance com cycle time ${((data.label1Stats.avgCycleTime - data.label2Stats.avgCycleTime) / data.label1Stats.avgCycleTime * 100).toFixed(1)}% menor.`
}

### 💡 Insights Principais

1. **Volume de Trabalho**: ${data.label1Stats.count > data.label2Stats.count ? label1 : label2} tem maior volume de issues
2. **Complexidade**: Story points médios indicam ${data.label1Stats.avgStoryPoints > data.label2Stats.avgStoryPoints ? `${label1} trabalha com tasks mais complexas` : `${label2} trabalha com tasks mais complexas`}
3. **Taxa de Conclusão**: ${data.label1Stats.completionRate > data.label2Stats.completionRate ? label1 : label2} tem melhor taxa de entrega

### 🚀 Recomendações

**Para ${data.label1Stats.avgCycleTime > data.label2Stats.avgCycleTime ? label1 : label2} (cycle time maior):**
- Revisar processo de desenvolvimento
- Identificar gargalos no workflow
- Considerar quebrar tasks em partes menores

**Para ambas as labels:**
- Padronizar boas práticas da label com melhor performance
- Monitorar métricas semanalmente
- Implementar retrospectivas focadas em eficiência

### 📈 Próximos Passos

1. Investigar causas específicas das diferenças
2. Aplicar melhorias incrementais
3. Acompanhar evolução das métricas
4. Compartilhar learnings entre equipes
  `;
} 