import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, Zap, Brain, BarChart3, Loader2 } from 'lucide-react';
import { JiraIssue } from '@/types/jira';

interface LabelComparisonProps {
  data: JiraIssue[];
}

interface ComparisonData {
  label1Data: JiraIssue[];
  label2Data: JiraIssue[];
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

const LabelComparison: React.FC<LabelComparisonProps> = ({ data }) => {
  const [selectedLabel1, setSelectedLabel1] = useState<string>('');
  const [selectedLabel2, setSelectedLabel2] = useState<string>('');
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [insights, setInsights] = useState<string>('');

  // Filtrar dados para mostrar apenas itens que começam com "SCH"
  const filteredData = useMemo(() => {
    return data.filter(issue => issue.id && issue.id.startsWith('SCH'));
  }, [data]);

  // Extrair todas as labels únicas dos dados filtrados (SCH)
  const availableLabels = useMemo(() => {
    const labelSet = new Set<string>();
    filteredData.forEach(issue => {
      if (issue.labels && Array.isArray(issue.labels)) {
        issue.labels.forEach(label => labelSet.add(label));
      }
    });
    return Array.from(labelSet).sort();
  }, [filteredData]);

  // Calcular dados de comparação usando apenas dados SCH
  const comparisonData = useMemo((): ComparisonData | null => {
    if (!selectedLabel1 || !selectedLabel2) return null;

    const label1Data = filteredData.filter(issue => 
      issue.labels && issue.labels.includes(selectedLabel1)
    );
    
    const label2Data = filteredData.filter(issue => 
      issue.labels && issue.labels.includes(selectedLabel2)
    );

    const calculateStats = (issues: JiraIssue[]) => {
      const completed = issues.filter(issue => issue.resolved);
      const cycleTimes = completed.map(issue => issue.cycleTime).filter(ct => ct > 0);
      const storyPoints = issues.map(issue => issue.storyPoints).filter(sp => sp > 0);
      
      return {
        count: issues.length,
        avgCycleTime: cycleTimes.length > 0 ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length : 0,
        avgStoryPoints: storyPoints.length > 0 ? storyPoints.reduce((a, b) => a + b, 0) / storyPoints.length : 0,
        completionRate: issues.length > 0 ? (completed.length / issues.length) * 100 : 0
      };
    };

    return {
      label1Data,
      label2Data,
      label1Stats: calculateStats(label1Data),
      label2Stats: calculateStats(label2Data)
    };
  }, [filteredData, selectedLabel1, selectedLabel2]);

  // Dados para o gráfico de barras
  const chartData = useMemo(() => {
    if (!comparisonData) return [];

    return [
      {
        metric: 'Issues',
        [selectedLabel1]: comparisonData.label1Stats.count,
        [selectedLabel2]: comparisonData.label2Stats.count,
      },
      {
        metric: 'Cycle Time Médio',
        [selectedLabel1]: Number(comparisonData.label1Stats.avgCycleTime.toFixed(1)),
        [selectedLabel2]: Number(comparisonData.label2Stats.avgCycleTime.toFixed(1)),
      },
      {
        metric: 'Story Points Médio',
        [selectedLabel1]: Number(comparisonData.label1Stats.avgStoryPoints.toFixed(1)),
        [selectedLabel2]: Number(comparisonData.label2Stats.avgStoryPoints.toFixed(1)),
      },
      {
        metric: 'Taxa de Conclusão (%)',
        [selectedLabel1]: Number(comparisonData.label1Stats.completionRate.toFixed(1)),
        [selectedLabel2]: Number(comparisonData.label2Stats.completionRate.toFixed(1)),
      }
    ];
  }, [comparisonData, selectedLabel1, selectedLabel2]);

  // Gerar insights com ChatGPT
  const generateInsights = async () => {
    if (!comparisonData) return;

    setIsGeneratingInsights(true);
    
    try {
      const promptData = {
        label1: {
          name: selectedLabel1,
          ...comparisonData.label1Stats
        },
        label2: {
          name: selectedLabel2,
          ...comparisonData.label2Stats
        }
      };

      const prompt = `
        Analise os dados comparativos entre duas labels do Jira e forneça insights acionáveis:

        Label 1: "${selectedLabel1}"
        - Total de issues: ${comparisonData.label1Stats.count}
        - Cycle time médio: ${comparisonData.label1Stats.avgCycleTime.toFixed(1)} dias
        - Story points médio: ${comparisonData.label1Stats.avgStoryPoints.toFixed(1)}
        - Taxa de conclusão: ${comparisonData.label1Stats.completionRate.toFixed(1)}%

        Label 2: "${selectedLabel2}"
        - Total de issues: ${comparisonData.label2Stats.count}
        - Cycle time médio: ${comparisonData.label2Stats.avgCycleTime.toFixed(1)} dias
        - Story points médio: ${comparisonData.label2Stats.avgStoryPoints.toFixed(1)}
        - Taxa de conclusão: ${comparisonData.label2Stats.completionRate.toFixed(1)}%

        Forneça insights em português sobre:
        1. Qual label performa melhor e por quê
        2. Possíveis causas das diferenças
        3. Recomendações para melhorar a performance
        4. Padrões ou tendências identificados

        Mantenha a resposta concisa e focada em ações práticas.
      `;

      // Simular chamada para API do ChatGPT (substitua pela implementação real)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: prompt,
          model: 'gpt-3.5-turbo'
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar insights');
      }

      const result = await response.json();
      setInsights(result.message || 'Insights gerados com sucesso');
      
         } catch (error) {
       console.error('Erro ao gerar insights:', error);
       // Usar insights melhorados como fallback
       const { generateMockInsights } = await import('../api/chat');
       const mockInsights = generateMockInsights(selectedLabel1, selectedLabel2, {
         label1Stats: comparisonData.label1Stats,
         label2Stats: comparisonData.label2Stats
       });
       setInsights(mockInsights);
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  return (
    <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            Comparação de Labels
          </CardTitle>
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            Apenas issues SCH ({filteredData.length} issues)
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Seletores de Labels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Label 1</label>
            <Select value={selectedLabel1} onValueChange={setSelectedLabel1}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a primeira label" />
              </SelectTrigger>
              <SelectContent>
                {availableLabels.map(label => (
                  <SelectItem key={label} value={label} disabled={label === selectedLabel2}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Label 2</label>
            <Select value={selectedLabel2} onValueChange={setSelectedLabel2}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a segunda label" />
              </SelectTrigger>
              <SelectContent>
                {availableLabels.map(label => (
                  <SelectItem key={label} value={label} disabled={label === selectedLabel1}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Estatísticas Resumidas */}
        {comparisonData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">
                {comparisonData.label1Stats.count} vs {comparisonData.label2Stats.count}
              </div>
              <div className="text-sm text-blue-600">Total de Issues</div>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <div className="text-2xl font-bold text-green-700">
                {comparisonData.label1Stats.avgCycleTime.toFixed(1)} vs {comparisonData.label2Stats.avgCycleTime.toFixed(1)}
              </div>
              <div className="text-sm text-green-600">Cycle Time (dias)</div>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
              <div className="text-2xl font-bold text-orange-700">
                {comparisonData.label1Stats.avgStoryPoints.toFixed(1)} vs {comparisonData.label2Stats.avgStoryPoints.toFixed(1)}
              </div>
              <div className="text-sm text-orange-600">Story Points</div>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
              <div className="text-2xl font-bold text-purple-700">
                {comparisonData.label1Stats.completionRate.toFixed(1)}% vs {comparisonData.label2Stats.completionRate.toFixed(1)}%
              </div>
              <div className="text-sm text-purple-600">Taxa Conclusão</div>
            </div>
          </div>
        )}

        {/* Gráfico Comparativo */}
        {chartData.length > 0 && (
          <div className="h-80">
            <h4 className="text-lg font-semibold mb-4">Comparação Visual</h4>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="metric" tick={{ fill: '#6B7280', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey={selectedLabel1} fill="#3B82F6" />
                <Bar dataKey={selectedLabel2} fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Botão para Gerar Insights */}
        {comparisonData && (
          <div className="flex justify-center">
            <Button
              onClick={generateInsights}
              disabled={isGeneratingInsights}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              {isGeneratingInsights ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando Insights...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Gerar Insights com IA
                </>
              )}
            </Button>
          </div>
        )}

        {/* Insights Gerados */}
        {insights && (
          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-800">
                <Zap className="w-5 h-5" />
                Insights Gerados por IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none text-gray-700">
                <pre className="whitespace-pre-wrap font-sans">{insights}</pre>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Estado vazio */}
        {!selectedLabel1 || !selectedLabel2 ? (
          <div className="text-center py-8 text-gray-500">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">Selecione duas labels para comparar</p>
            <p className="text-sm">Escolha duas labels diferentes para ver a análise comparativa dos issues SCH</p>
            {availableLabels.length === 0 && (
              <p className="text-xs text-red-500 mt-2">
                Nenhuma label encontrada em issues SCH
              </p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default LabelComparison; 