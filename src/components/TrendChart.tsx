import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, HelpCircle, Download } from 'lucide-react';
import { JiraIssue } from '@/types/jira';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { format } from 'date-fns';

interface TrendChartProps {
  data: JiraIssue[];
  filters: {
    assignee: string | string[];
    dateRange: {
      start: string;
      end: string;
    };
  };
}

// Cores para os gráficos
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

const TrendChart: React.FC<TrendChartProps> = ({ data, filters }) => {
  const [showAverage, setShowAverage] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = async () => {
    if (!chartRef.current) return;

    try {
      // Capturar o elemento do gráfico
      const canvas = await html2canvas(chartRef.current, {
        scale: 2, // Melhor qualidade
        backgroundColor: '#ffffff',
        logging: false,
      });

      // Criar novo documento PDF
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      // Adicionar a imagem do gráfico ao PDF
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);

      // Salvar o PDF
      pdf.save('analise-tendencias.pdf');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
    }
  };

  // Processar dados para criar tendência por período
  const processDataForTrend = () => {
    if (!data || data.length === 0) return { monthlyData: [], assignees: [] };

    // Identificar responsáveis únicos (excluindo null/undefined/empty)
    const uniqueAssignees = [...new Set(data.map(item => item.assignee).filter(Boolean))];

    // Filtrar responsáveis baseado nos filtros
    const selectedAssignees = filters.assignee 
      ? (Array.isArray(filters.assignee) ? filters.assignee : [filters.assignee]).filter(Boolean)
      : [];

    // Se nenhum responsável estiver selecionado, não mostrar linhas individuais
    const assigneesToShow = selectedAssignees.length > 0 ? selectedAssignees : [];

    // Agrupar por mês e responsável
    const monthlyDataByAssignee = data.reduce((acc: any, item: any) => {
      if (!item.created || !item.resolved) return acc;
      
      // Verificar se está dentro do range de datas
      const itemCreatedDate = new Date(item.created);
      const itemResolvedDate = new Date(item.resolved);
      const startDate = filters.dateRange.start ? new Date(filters.dateRange.start) : null;
      const endDate = filters.dateRange.end ? new Date(filters.dateRange.end) : null;

      // Se tiver filtro de data e o item estiver fora do range, pular
      if (startDate && itemCreatedDate < startDate) return acc;
      if (endDate && itemCreatedDate > endDate) return acc;
      if (startDate && itemResolvedDate < startDate) return acc;
      if (endDate && itemResolvedDate > endDate) return acc;
      
      // Mês de criação
      const createdDate = new Date(item.created);
      const createdMonthKey = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;
      
      // Mês de resolução
      const resolvedDate = new Date(item.resolved);
      const resolvedMonthKey = `${resolvedDate.getFullYear()}-${String(resolvedDate.getMonth() + 1).padStart(2, '0')}`;
      
      // Inicializar dados do mês de criação se não existir
      if (!acc[createdMonthKey]) {
        acc[createdMonthKey] = {
          month: createdMonthKey,
          displayMonth: format(createdDate, 'MM/yyyy'),
          totalIssues: 0,
          totalCycleTime: 0,
          avgCycleTime: 0,
          resolvedInMonth: 0,
          createdInMonth: 0,
          byAssignee: {}
        };
      }
      
      // Inicializar dados do mês de resolução se não existir
      if (!acc[resolvedMonthKey]) {
        acc[resolvedMonthKey] = {
          month: resolvedMonthKey,
          displayMonth: format(resolvedDate, 'MM/yyyy'),
          totalIssues: 0,
          totalCycleTime: 0,
          avgCycleTime: 0,
          resolvedInMonth: 0,
          createdInMonth: 0,
          byAssignee: {}
        };
      }
      
      // Inicializar dados do responsável se não existir (apenas para responsáveis válidos)
      if (item.assignee) {
        uniqueAssignees.forEach(assignee => {
          if (!acc[createdMonthKey].byAssignee[assignee]) {
            acc[createdMonthKey].byAssignee[assignee] = {
              totalIssues: 0,
              totalCycleTime: 0,
              avgCycleTime: 0,
              resolvedInMonth: 0,
              createdInMonth: 0
            };
          }
          if (!acc[resolvedMonthKey].byAssignee[assignee]) {
            acc[resolvedMonthKey].byAssignee[assignee] = {
              totalIssues: 0,
              totalCycleTime: 0,
              avgCycleTime: 0,
              resolvedInMonth: 0,
              createdInMonth: 0
            };
          }
        });
      }
      
      // Incrementar contadores gerais
      acc[createdMonthKey].createdInMonth += 1;
      acc[resolvedMonthKey].resolvedInMonth += 1;
      
      // Incrementar contadores por responsável
      if (item.assignee) {
        acc[createdMonthKey].byAssignee[item.assignee].createdInMonth += 1;
        acc[resolvedMonthKey].byAssignee[item.assignee].resolvedInMonth += 1;
        
        // Adicionar cycle time ao mês de resolução
        if (item.cycleTime) {
          acc[resolvedMonthKey].byAssignee[item.assignee].totalCycleTime += item.cycleTime;
          acc[resolvedMonthKey].byAssignee[item.assignee].totalIssues += 1;
        }
      }
      
      // Adicionar cycle time ao total geral
      if (item.cycleTime) {
        acc[resolvedMonthKey].totalCycleTime += item.cycleTime;
        acc[resolvedMonthKey].totalIssues += 1;
      }
      
      return acc;
    }, {});

    // Calcular médias e converter para array
    const monthlyData = Object.values(monthlyDataByAssignee)
      .map((item: any) => {
        const monthData: any = {
          month: item.month,
          displayMonth: item.displayMonth,
          avgCycleTime: item.totalIssues > 0 ? Math.round(item.totalCycleTime / item.totalIssues) : 0,
          completionRate: item.createdInMonth > 0 ? Math.round((item.resolvedInMonth / item.createdInMonth) * 100) : 0
        };

        // Adicionar dados por responsável apenas se houver responsáveis selecionados
        if (assigneesToShow.length > 0) {
          assigneesToShow.forEach(assignee => {
            const assigneeData = item.byAssignee[assignee];
            if (assigneeData) {
              monthData[`avgCycleTime_${assignee}`] = assigneeData.totalIssues > 0 
                ? Math.round(assigneeData.totalCycleTime / assigneeData.totalIssues) 
                : 0;
              monthData[`completionRate_${assignee}`] = assigneeData.createdInMonth > 0 
                ? Math.round((assigneeData.resolvedInMonth / assigneeData.createdInMonth) * 100) 
                : 0;
            }
          });
        }

        return monthData;
      })
      .sort((a: any, b: any) => a.month.localeCompare(b.month));

    // Calcular crescimento em relação ao mês anterior
    monthlyData.forEach((item, index) => {
      if (index > 0) {
        const previousMonth = monthlyData[index - 1];
        
        // Calcular crescimento do cycle time
        if (previousMonth.avgCycleTime > 0) {
          const cycleTimeGrowth = ((item.avgCycleTime - previousMonth.avgCycleTime) / previousMonth.avgCycleTime) * 100;
          item.cycleTimeGrowth = Math.round(cycleTimeGrowth);
        } else {
          item.cycleTimeGrowth = item.avgCycleTime > 0 ? 100 : 0;
        }

        // Calcular crescimento da taxa de conclusão
        if (previousMonth.completionRate > 0) {
          const completionRateGrowth = ((item.completionRate - previousMonth.completionRate) / previousMonth.completionRate) * 100;
          item.completionRateGrowth = Math.round(completionRateGrowth);
        } else {
          item.completionRateGrowth = item.completionRate > 0 ? 100 : 0;
        }

        // Calcular crescimento por responsável
        if (assigneesToShow.length > 0) {
          assigneesToShow.forEach(assignee => {
            // Cycle Time por responsável
            const currentAssigneeTime = item[`avgCycleTime_${assignee}`];
            const previousAssigneeTime = previousMonth[`avgCycleTime_${assignee}`];
            
            if (previousAssigneeTime > 0) {
              const assigneeGrowth = ((currentAssigneeTime - previousAssigneeTime) / previousAssigneeTime) * 100;
              item[`growth_${assignee}`] = Math.round(assigneeGrowth);
            } else {
              item[`growth_${assignee}`] = currentAssigneeTime > 0 ? 100 : 0;
            }

            // Taxa de Conclusão por responsável
            const currentCompletionRate = item[`completionRate_${assignee}`];
            const previousCompletionRate = previousMonth[`completionRate_${assignee}`];
            
            if (previousCompletionRate > 0) {
              const completionRateGrowth = ((currentCompletionRate - previousCompletionRate) / previousCompletionRate) * 100;
              item[`completionRateGrowth_${assignee}`] = Math.round(completionRateGrowth);
            } else {
              item[`completionRateGrowth_${assignee}`] = currentCompletionRate > 0 ? 100 : 0;
            }
          });
        }
      } else {
        // Para o primeiro mês, não há crescimento para calcular
        item.cycleTimeGrowth = 0;
        item.completionRateGrowth = 0;
        if (assigneesToShow.length > 0) {
          assigneesToShow.forEach(assignee => {
            item[`growth_${assignee}`] = 0;
            item[`completionRateGrowth_${assignee}`] = 0;
          });
        }
      }
    });

    return { monthlyData, assignees: assigneesToShow };
  };

  const { monthlyData, assignees } = processDataForTrend();
  const hasAssignees = assignees.length > 0;
  const showOnlyAverage = !hasAssignees;

  // Função para renderizar o indicador de crescimento
  const renderGrowthIndicator = (growth: number, isCompletionRate: boolean = false) => {
    if (growth === 0) return null;
    
    // Para taxa de conclusão: positivo é verde, negativo é vermelho
    // Para cycle time: positivo é vermelho (pior), negativo é verde (melhor)
    const isPositive = isCompletionRate ? growth > 0 : growth < 0;
    const color = isPositive ? 'text-green-600' : 'text-red-600';
    const Icon = isPositive ? TrendingUp : TrendingDown;
    
    return (
      <div className={`flex items-center gap-1 text-xs ${color}`}>
        <Icon className="w-3 h-3" />
        <span>{growth > 0 ? '+' : ''}{growth}%</span>
      </div>
    );
  };

  return (
    <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <div className="flex items-center gap-2">
              Análise de Tendências
              <HoverCard>
                <HoverCardTrigger>
                  <HelpCircle className="w-4 h-4 text-gray-400" />
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-medium">O que é Análise de Tendências?</h4>
                    <p className="text-sm">A análise de tendências mostra a evolução do desempenho da equipe ao longo do tempo, permitindo identificar padrões e melhorias no processo.</p>
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium">O gráfico mostra:</p>
                      <ul className="text-sm space-y-1 list-disc pl-4">
                        <li>Cycle Time médio por mês</li>
                        <li>Taxa de conclusão de tarefas</li>
                        <li>Comparação entre responsáveis</li>
                        <li>Percentual de crescimento mês a mês</li>
                      </ul>
                    </div>
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium">Como interpretar:</p>
                      <ul className="text-sm space-y-1 list-disc pl-4">
                        <li>Cycle Time menor indica maior eficiência</li>
                        <li>Taxa de conclusão maior indica melhor produtividade</li>
                        <li>Setas verdes (↓) indicam melhoria no processo</li>
                        <li>Setas vermelhas (↑) indicam pontos de atenção</li>
                      </ul>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </div>
          </CardTitle>
          <div className="flex items-center gap-4">
            {hasAssignees && (
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="show-average" 
                  checked={showAverage} 
                  onCheckedChange={(checked) => setShowAverage(checked as boolean)}
                />
                <Label htmlFor="show-average" className="text-sm">Mostrar Média Geral</Label>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 text-xs px-2 rounded-lg transition-all duration-200 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:from-blue-600 hover:to-blue-700"
              onClick={handleExportPDF}
            >
              <Download className="w-3 h-3" />
              Exportar PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {monthlyData.length > 0 ? (
          <div ref={chartRef} className="space-y-8 bg-white p-8 rounded-lg">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-sm font-medium">Cycle Time Médio por Mês</h4>
                <HoverCard>
                  <HoverCardTrigger>
                    <HelpCircle className="w-4 h-4 text-gray-400" />
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80">
                    <div className="space-y-2">
                      <p className="text-sm">O Cycle Time representa o tempo médio que uma tarefa leva para ser concluída, desde o início do desenvolvimento até a conclusão.</p>
                      <p className="text-sm">Um Cycle Time menor indica um fluxo de trabalho mais eficiente.</p>
                      <p className="text-sm font-medium mt-2">Indicador de Crescimento:</p>
                      <p className="text-sm">↑ Verde: Redução no tempo (positivo)</p>
                      <p className="text-sm">↓ Vermelho: Aumento no tempo (negativo)</p>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthlyData} margin={{ top: 32, right: 32, bottom: 32, left: 32 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="displayMonth" 
                    tick={{ fontSize: 12 }}
                    stroke="#64748b"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="#64748b"
                    label={{ value: 'Dias', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    formatter={(value, name: string) => {
                      if (name === 'avgCycleTime') {
                        const item = monthlyData.find(d => d.avgCycleTime === value);
                        return [
                          <>
                            <div>{value} dias</div>
                            {item && item.cycleTimeGrowth !== 0 && (
                              <div className={`text-xs ${item.cycleTimeGrowth < 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {item.cycleTimeGrowth > 0 ? '+' : ''}{item.cycleTimeGrowth}% vs mês anterior
                              </div>
                            )}
                          </>,
                          'Média Geral'
                        ];
                      }
                      const assignee = name.replace('avgCycleTime_', '');
                      const item = monthlyData.find(d => d[name] === value);
                      return [
                        <>
                          <div>{value} dias</div>
                          {item && item[`growth_${assignee}`] !== 0 && (
                            <div className={`text-xs ${item[`growth_${assignee}`] < 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {item[`growth_${assignee}`] > 0 ? '+' : ''}{item[`growth_${assignee}`]}% vs mês anterior
                            </div>
                          )}
                        </>,
                        assignee
                      ];
                    }}
                    labelFormatter={(label) => `Mês: ${label}`}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  {/* Linha da média geral */}
                  {(showOnlyAverage || showAverage) && (
                    <Line 
                      type="monotone" 
                      dataKey="avgCycleTime" 
                      stroke="#000000"
                      strokeWidth={2}
                      name="Média Geral"
                      strokeDasharray={hasAssignees ? "5 5" : undefined}
                      label={({x, y, value, index}) => {
                        const item = monthlyData[index];
                        if (!item || item.cycleTimeGrowth === 0) return null;
                        return (
                          <text 
                            x={x} 
                            y={y - 10} 
                            fill={item.cycleTimeGrowth < 0 ? "#16a34a" : "#dc2626"} 
                            fontSize={10} 
                            textAnchor="middle"
                          >
                            {item.cycleTimeGrowth > 0 ? '+' : ''}{item.cycleTimeGrowth}%
                          </text>
                        );
                      }}
                    />
                  )}
                  {/* Linhas por responsável */}
                  {hasAssignees && assignees.map((assignee, index) => (
                    <Line
                      key={assignee}
                      type="monotone"
                      dataKey={`avgCycleTime_${assignee}`}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                      name={assignee}
                      dot={{ fill: COLORS[index % COLORS.length], strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: COLORS[index % COLORS.length], strokeWidth: 2 }}
                      label={({x, y, value, index}) => {
                        const item = monthlyData[index];
                        if (!item || item[`growth_${assignee}`] === 0) return null;
                        return (
                          <text 
                            x={x} 
                            y={y - 10} 
                            fill={item[`growth_${assignee}`] < 0 ? "#16a34a" : "#dc2626"} 
                            fontSize={10} 
                            textAnchor="middle"
                          >
                            {item[`growth_${assignee}`] > 0 ? '+' : ''}{item[`growth_${assignee}`]}%
                          </text>
                        );
                      }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-sm font-medium">Taxa de Conclusão por Mês</h4>
                <HoverCard>
                  <HoverCardTrigger>
                    <HelpCircle className="w-4 h-4 text-gray-400" />
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80">
                    <div className="space-y-2">
                      <p className="text-sm">A Taxa de Conclusão representa a porcentagem de tarefas concluídas em relação ao total de tarefas criadas em cada mês.</p>
                      <p className="text-sm">Uma taxa maior indica melhor produtividade da equipe.</p>
                      <p className="text-sm font-medium mt-2">Indicador de Crescimento:</p>
                      <p className="text-sm">↑ Verde: Aumento na taxa (positivo)</p>
                      <p className="text-sm">↓ Vermelho: Redução na taxa (negativo)</p>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthlyData} margin={{ top: 32, right: 32, bottom: 32, left: 32 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="displayMonth" 
                    tick={{ fontSize: 12 }}
                    stroke="#64748b"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="#64748b"
                    label={{ value: '%', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    formatter={(value, name: string) => {
                      if (name === 'completionRate') {
                        const item = monthlyData.find(d => d.completionRate === value);
                        return [
                          <>
                            <div>{value}%</div>
                            {item && item.completionRateGrowth !== 0 && (
                              <div className={`text-xs ${item.completionRateGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {item.completionRateGrowth > 0 ? '+' : ''}{item.completionRateGrowth}% vs mês anterior
                              </div>
                            )}
                          </>,
                          'Média Geral'
                        ];
                      }
                      const assignee = name.replace('completionRate_', '');
                      const item = monthlyData.find(d => d[name] === value);
                      return [
                        <>
                          <div>{value}%</div>
                          {item && item[`completionRateGrowth_${assignee}`] !== 0 && (
                            <div className={`text-xs ${item[`completionRateGrowth_${assignee}`] > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {item[`completionRateGrowth_${assignee}`] > 0 ? '+' : ''}{item[`completionRateGrowth_${assignee}`]}% vs mês anterior
                            </div>
                          )}
                        </>,
                        assignee
                      ];
                    }}
                    labelFormatter={(label) => `Mês: ${label}`}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  {/* Linha da média geral */}
                  {(showOnlyAverage || showAverage) && (
                    <Line 
                      type="monotone" 
                      dataKey="completionRate" 
                      stroke="#000000"
                      strokeWidth={2}
                      name="Média Geral"
                      strokeDasharray={hasAssignees ? "5 5" : undefined}
                      label={({x, y, value, index}) => {
                        const item = monthlyData[index];
                        if (!item || item.completionRateGrowth === 0) return null;
                        return (
                          <text 
                            x={x} 
                            y={y - 10} 
                            fill={item.completionRateGrowth > 0 ? "#16a34a" : "#dc2626"} 
                            fontSize={10} 
                            textAnchor="middle"
                          >
                            {item.completionRateGrowth > 0 ? '+' : ''}{item.completionRateGrowth}%
                          </text>
                        );
                      }}
                    />
                  )}
                  {/* Linhas por responsável */}
                  {hasAssignees && assignees.map((assignee, index) => (
                    <Line
                      key={assignee}
                      type="monotone"
                      dataKey={`completionRate_${assignee}`}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                      name={assignee}
                      dot={{ fill: COLORS[index % COLORS.length], strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: COLORS[index % COLORS.length], strokeWidth: 2 }}
                      label={({x, y, value, index}) => {
                        const item = monthlyData[index];
                        if (!item || item[`completionRateGrowth_${assignee}`] === 0) return null;
                        return (
                          <text 
                            x={x} 
                            y={y - 10} 
                            fill={item[`completionRateGrowth_${assignee}`] > 0 ? "#16a34a" : "#dc2626"} 
                            fontSize={10} 
                            textAnchor="middle"
                          >
                            {item[`completionRateGrowth_${assignee}`] > 0 ? '+' : ''}{item[`completionRateGrowth_${assignee}`]}%
                          </text>
                        );
                      }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500">
            <p>Nenhum dado disponível</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrendChart;
