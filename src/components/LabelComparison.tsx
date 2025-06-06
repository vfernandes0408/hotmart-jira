import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  TrendingUp,
  Zap,
  Brain,
  BarChart3,
  Loader2,
  ArrowLeftRight,
} from "lucide-react";
import { JiraIssue } from "@/types/jira";

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
  const [selectedLabels1, setSelectedLabels1] = useState<string[]>([]);
  const [selectedLabels2, setSelectedLabels2] = useState<string[]>([]);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [insights, setInsights] = useState<string>("");
  const [showInsightsPanel, setShowInsightsPanel] = useState(false);
  const [additionalContext, setAdditionalContext] = useState<string>("");

  // Extrair todas as labels únicas dos dados
  const availableLabels = useMemo(() => {
    const labelSet = new Set<string>();
    data.forEach((issue) => {
      if (issue.labels && Array.isArray(issue.labels)) {
        issue.labels.forEach((label) => {
          if (label) {
            labelSet.add(label);
          }
        });
      }
    });
    return Array.from(labelSet).sort();
  }, [data]);

  // Função para alternar seleção de labels
  const handleLabelToggle = (label: string, side: 1 | 2) => {
    if (side === 1) {
      setSelectedLabels1((prev) =>
        prev.includes(label)
          ? prev.filter((l) => l !== label)
          : [...prev, label]
      );
    } else {
      setSelectedLabels2((prev) =>
        prev.includes(label)
          ? prev.filter((l) => l !== label)
          : [...prev, label]
      );
    }
    setInsights(""); // Limpa insights ao mudar seleção
  };

  // Calcular dados de comparação
  const comparisonData = useMemo(() => {
    if (selectedLabels1.length === 0 || selectedLabels2.length === 0) return null;
    const label1Data = data.filter(
      (issue) =>
        issue.labels &&
        selectedLabels1.some((label) => issue.labels.includes(label))
    );
    const label2Data = data.filter(
      (issue) =>
        issue.labels &&
        selectedLabels2.some((label) => issue.labels.includes(label))
    );
    const calculateStats = (issues: JiraIssue[]) => {
      const completed = issues.filter((issue) => !!issue.resolved);
      const cycleTimes = completed
        .map((issue) => issue.cycleTime)
        .filter((ct) => ct > 0);
      const storyPoints = issues
        .map((issue) => issue.storyPoints)
        .filter((sp) => sp > 0);
      return {
        count: issues.length,
        avgCycleTime:
          cycleTimes.length > 0
            ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length
            : 0,
        avgStoryPoints:
          storyPoints.length > 0
            ? storyPoints.reduce((a, b) => a + b, 0) / storyPoints.length
            : 0,
        completionRate:
          issues.length > 0 ? (completed.length / issues.length) * 100 : 0,
      };
    };
    return {
      label1Data,
      label2Data,
      label1Stats: calculateStats(label1Data),
      label2Stats: calculateStats(label2Data),
    };
  }, [data, selectedLabels1, selectedLabels2]);

  // Dados para o gráfico de barras
  const chartData = useMemo(() => {
    if (!comparisonData) return [];

    return [
      {
        metric: "Issues",
        [selectedLabels1.join(", ")]: comparisonData.label1Stats.count,
        [selectedLabels2.join(", ")]: comparisonData.label2Stats.count,
      },
      {
        metric: "Cycle Time Médio",
        [selectedLabels1.join(", ")]: Number(
          comparisonData.label1Stats.avgCycleTime.toFixed(1)
        ),
        [selectedLabels2.join(", ")]: Number(
          comparisonData.label2Stats.avgCycleTime.toFixed(1)
        ),
      },
      {
        metric: "Story Points Médio",
        [selectedLabels1.join(", ")]: Number(
          comparisonData.label1Stats.avgStoryPoints.toFixed(1)
        ),
        [selectedLabels2.join(", ")]: Number(
          comparisonData.label2Stats.avgStoryPoints.toFixed(1)
        ),
      },
      {
        metric: "Taxa de Conclusão (%)",
        [selectedLabels1.join(", ")]: Number(
          comparisonData.label1Stats.completionRate.toFixed(1)
        ),
        [selectedLabels2.join(", ")]: Number(
          comparisonData.label2Stats.completionRate.toFixed(1)
        ),
      },
    ];
  }, [comparisonData, selectedLabels1, selectedLabels2]);

  // Gerar insights com ChatGPT
  const generateInsights = async () => {
    if (!comparisonData) return;

    setIsGeneratingInsights(true);

    try {
      const prompt = `
        Analise os dados comparativos entre duas labels do Jira e forneça insights acionáveis:

        Label 1: "${selectedLabels1.join(", ")}"
        - Total de issues: ${comparisonData.label1Stats.count}
        - Cycle time médio: ${comparisonData.label1Stats.avgCycleTime.toFixed(
          1
        )} dias
        - Story points médio: ${comparisonData.label1Stats.avgStoryPoints.toFixed(
          1
        )}
        - Taxa de conclusão: ${comparisonData.label1Stats.completionRate.toFixed(
          1
        )}%

        Label 2: "${selectedLabels2.join(", ")}"
        - Total de issues: ${comparisonData.label2Stats.count}
        - Cycle time médio: ${comparisonData.label2Stats.avgCycleTime.toFixed(
          1
        )} dias
        - Story points médio: ${comparisonData.label2Stats.avgStoryPoints.toFixed(
          1
        )}
        - Taxa de conclusão: ${comparisonData.label2Stats.completionRate.toFixed(
          1
        )}%

        Forneça insights em português sobre:
        1. Qual label performa melhor e por quê
        2. Possíveis causas das diferenças
        3. Recomendações para melhorar a performance
        4. Padrões ou tendências identificados

        ${
          additionalContext
            ? `\nInformações adicionais do contexto:\n${additionalContext}\n`
            : ""
        }

        Mantenha a resposta concisa e focada em ações práticas.
      `;

      // Usar apenas a API real do OpenAI
      const { callOpenAIApi, getOpenAIApiKey } = await import(
        "../utils/openai"
      );

      if (!getOpenAIApiKey()) {
        throw new Error(
          "Para gerar insights com IA, configure sua chave da API OpenAI na tela de conexão."
        );
      }

      const result = await callOpenAIApi(prompt);
      setInsights(result);
      setShowInsightsPanel(true);
    } catch (error) {
      console.error("Erro ao gerar insights:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro ao gerar insights";
      setInsights(
        `❌ **Erro**: ${errorMessage}\n\nPara resolver:\n1. Configure sua chave da API OpenAI na tela de conexão\n2. Verifique se a chave está correta\n3. Verifique sua conexão com a internet`
      );
      setShowInsightsPanel(true);
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  return (
    <div className="relative flex gap-4 h-full">
      {/* Main Content */}
      <div
        className={`transition-all duration-300 ${
          showInsightsPanel ? "w-2/3" : "w-full"
        }`}
      >
        <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                Comparação de Labels
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-purple-50 text-purple-700 border-purple-200"
                >
                  Apenas issues e labels (
                  {availableLabels.length} labels)
                </Badge>
                {comparisonData && (
                  <Button
                    onClick={generateInsights}
                    disabled={isGeneratingInsights}
                    size="sm"
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  >
                    {isGeneratingInsights ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Brain className="w-3 h-3 mr-1" />
                        IA
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Seletores de Labels */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Label 1
                  </label>
                  <div className="max-h-48 overflow-y-auto border rounded p-2 bg-white/80">
                    {availableLabels.map((label) => (
                      <div key={label} className="flex items-center gap-2 mb-1">
                        <input
                          type="checkbox"
                          id={`label1-${label}`}
                          checked={selectedLabels1.includes(label)}
                          onChange={() => handleLabelToggle(label, 1)}
                          className="accent-purple-600 h-4 w-4"
                          disabled={selectedLabels2.includes(label)}
                        />
                        <label htmlFor={`label1-${label}`} className="text-xs cursor-pointer">
                          {label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Label 2
                  </label>
                  <div className="max-h-48 overflow-y-auto border rounded p-2 bg-white/80">
                    {availableLabels.map((label) => (
                      <div key={label} className="flex items-center gap-2 mb-1">
                        <input
                          type="checkbox"
                          id={`label2-${label}`}
                          checked={selectedLabels2.includes(label)}
                          onChange={() => handleLabelToggle(label, 2)}
                          className="accent-blue-600 h-4 w-4"
                          disabled={selectedLabels1.includes(label)}
                        />
                        <label htmlFor={`label2-${label}`} className="text-xs cursor-pointer">
                          {label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Botão de inversão centralizado */}
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedLabels1((prev) => [...prev].reverse());
                    setSelectedLabels2((prev) => [...prev].reverse());
                    setInsights("");
                  }}
                  disabled={selectedLabels1.length === 0 || selectedLabels2.length === 0}
                  className="flex items-center gap-2 px-4 py-2 transition-all duration-200 hover:bg-purple-50 hover:border-purple-300 disabled:opacity-50"
                  title="Inverter comparação"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  Inverter Comparação
                </Button>
              </div>
            </div>

            {/* Estatísticas Resumidas */}
            {comparisonData && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700">
                    {comparisonData.label1Stats.count} vs{" "}
                    {comparisonData.label2Stats.count}
                  </div>
                  <div className="text-sm text-blue-600">Total de Issues</div>
                </div>

                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">
                    {comparisonData.label1Stats.avgCycleTime.toFixed(1)} vs{" "}
                    {comparisonData.label2Stats.avgCycleTime.toFixed(1)}
                  </div>
                  <div className="text-sm text-green-600">
                    Cycle Time (dias)
                  </div>
                </div>

                <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
                  <div className="text-2xl font-bold text-orange-700">
                    {comparisonData.label1Stats.avgStoryPoints.toFixed(1)} vs{" "}
                    {comparisonData.label2Stats.avgStoryPoints.toFixed(1)}
                  </div>
                  <div className="text-sm text-orange-600">Story Points</div>
                </div>

                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                  <div className="text-2xl font-bold text-purple-700">
                    {comparisonData.label1Stats.completionRate.toFixed(1)}% vs{" "}
                    {comparisonData.label2Stats.completionRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-purple-600">Taxa Conclusão</div>
                </div>
              </div>
            )}

            {/* Gráfico Comparativo */}
            {chartData.length > 0 && (
              <div className="h-80">
                <h4 className="text-lg font-semibold mb-4">
                  Comparação Visual
                </h4>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="metric"
                      tick={{ fill: "#6B7280", fontSize: 12 }}
                    />
                    <YAxis tick={{ fill: "#6B7280", fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey={selectedLabels1.join(", ")} fill="#3B82F6" />
                    <Bar dataKey={selectedLabels2.join(", ")} fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Estado vazio */}
            {selectedLabels1.length === 0 || selectedLabels2.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium">
                  Selecione duas labels para comparar
                </p>
                <p className="text-sm">
                  Escolha duas labels diferentes para ver a análise comparativa
                </p>
                {availableLabels.length === 0 && (
                  <p className="text-xs text-red-500 mt-2">
                    Nenhuma label encontrada
                  </p>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Painel Lateral de Insights */}
      {showInsightsPanel && (
        <div className="w-1/3 transition-all duration-300">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 to-indigo-50 h-full">
            <CardHeader className="border-b border-purple-200/50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-purple-800">
                  <Zap className="w-5 h-5" />
                  Insights IA
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInsightsPanel(false)}
                  className="text-purple-600 hover:bg-purple-100"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 flex flex-col h-full">
              {/* Campo de contexto adicional para IA no topo do painel lateral */}

              <div className="prose prose-sm max-w-none text-gray-700 flex-1 overflow-auto">
                <pre className="whitespace-pre-wrap font-sans text-sm">
                  {insights}
                </pre>
              </div>
              <div className="space-y-2 mb-20">
                <Label
                  htmlFor="insight-context"
                  className="text-sm font-medium text-purple-700 flex items-center gap-2"
                >
                  <Brain className="w-4 h-4 text-purple-600" />
                  Detalhes/contexto para IA (ex: feriado, evento, sprint
                  especial)
                </Label>
                <Textarea
                  id="insight-context"
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  placeholder="Ex: Houve um feriado em 01/05, Label1 são demandas urgentes, Label2 são melhorias, etc."
                  className="min-h-[60px] resize-none border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                  maxLength={500}
                />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-500">
                    Informe detalhes que podem influenciar a análise da IA (ex:
                    feriados, eventos, mudanças de time, etc).
                  </p>
                  <span className="text-xs text-gray-400">
                    {additionalContext.length}/500
                  </span>
                </div>
                <Button
                  onClick={generateInsights}
                  disabled={isGeneratingInsights}
                  className="mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 w-full"
                  size="sm"
                >
                  {isGeneratingInsights ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Brain className="w-3 h-3 mr-1" />
                      Gerar novamente
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default LabelComparison;
