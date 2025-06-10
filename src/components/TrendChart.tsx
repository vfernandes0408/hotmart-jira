import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, HelpCircle, Download } from 'lucide-react';
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

    return { monthlyData, assignees: assigneesToShow };
  };

  const { monthlyData, assignees } = processDataForTrend();
  const hasAssignees = assignees.length > 0;
  const showOnlyAverage = !hasAssignees;

  return (
    <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Análise de Tendências
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
          <div ref={chartRef} className="space-y-8 bg-white p-4 rounded-lg">
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
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="month" 
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
                      if (name === 'avgCycleTime') return [`${value} dias`, 'Média Geral'];
                      const assignee = name.replace('avgCycleTime_', '');
                      return [`${value} dias`, assignee];
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
                      <p className="text-sm">Um valor de 100% significa que todas as tarefas criadas no mês foram concluídas, enquanto valores menores indicam que algumas tarefas ainda estão em andamento ou pendentes.</p>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="month" 
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
                      if (name === 'completionRate') return [`${value}%`, 'Média Geral'];
                      const assignee = name.replace('completionRate_', '');
                      return [`${value}%`, assignee];
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
