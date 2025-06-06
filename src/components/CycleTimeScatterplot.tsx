
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Cell } from 'recharts';
import { Clock, TrendingUp, BarChart3 } from 'lucide-react';
import { JiraIssue } from '@/types/jira';

interface CycleTimeScatterplotProps {
  data: JiraIssue[];
}

const CycleTimeScatterplot: React.FC<CycleTimeScatterplotProps> = ({ data }) => {
  const [xAxisMode, setXAxisMode] = useState<'storyPoints' | 'sequence'>('storyPoints');

  // Filtrar e preparar dados para o gráfico
  const chartData = useMemo(() => {
    // Filtrar dados válidos primeiro
    const filteredData = data.filter(item => {
      // Verificar se é um objeto válido do Jira
      if (!item || typeof item !== 'object') return false;
      if (!item.id || typeof item.id !== 'string') return false;
      if (!item.resolved) return false;
      
      // Verificar se cycleTime é um número válido
      const cycleTime = Number(item.cycleTime);
      if (isNaN(cycleTime) || cycleTime < 0) return false;
      
      return true;
    });
    
    // Ordenar por data de criação para ter sequência temporal
    filteredData.sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());
    
    // Calcular percentis de cycle time para determinar cores
    const cycleTimes = filteredData.map(item => Number(item.cycleTime) || 0);
    const sortedCycleTimes = [...cycleTimes].sort((a, b) => a - b);
    const p50 = sortedCycleTimes[Math.floor(sortedCycleTimes.length * 0.5)];
    const p75 = sortedCycleTimes[Math.floor(sortedCycleTimes.length * 0.75)];
    const p90 = sortedCycleTimes[Math.floor(sortedCycleTimes.length * 0.90)];
    
    return filteredData.map((item, index) => {
      // Garantir que todos os valores são seguros
      const storyPoints = Number(item.storyPoints) || 1;
      const cycleTime = Number(item.cycleTime) || 0;
      
      // Converter data de resolução para timestamp para usar no eixo X
      const resolvedDate = new Date(item.resolved).getTime();
      
      // Determinar cor baseada nos percentis de cycle time
      const color = cycleTime <= p50 ? '#10B981' : // Verde para P50 ou menos
                   cycleTime <= p75 ? '#F59E0B' : // Amarelo para P75 ou menos
                   cycleTime <= p90 ? '#EF4444' : // Vermelho para P90 ou menos
                   '#7C2D12'; // Marrom escuro para acima de P90
      
      return {
        x: resolvedDate, // Data de resolução no eixo X
        y: cycleTime, // Cycle Time no eixo Y para as linhas de tendência
        cycleTime: cycleTime, // Cycle time original para tooltip
        storyPoints: storyPoints, // Story points original para tooltip
        sequenceIndex: index + 1, // Índice sequencial
        issueType: String(item.issueType || 'Unknown'),
        id: String(item.id),
        summary: String(item.summary || 'Sem título'),
        created: item.created,
        resolved: item.resolved,
        resolvedFormatted: new Date(item.resolved).toLocaleDateString('pt-BR'),
        color: color
      };
    });
  }, [data, xAxisMode]);

  // Calcular estatísticas e informações de data
  const statistics = useMemo(() => {
    if (chartData.length === 0) return null;
    
    const cycleTimes = chartData.map(item => item.cycleTime);
    const avg = cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length;
    const sorted = [...cycleTimes].sort((a, b) => a - b);
    
    // Calcular percentis de cycle time
    const p50 = sorted[Math.floor(sorted.length * 0.5)]; // Mediana
    const p75 = sorted[Math.floor(sorted.length * 0.75)];
    const p85 = sorted[Math.floor(sorted.length * 0.85)];
    const p90 = sorted[Math.floor(sorted.length * 0.90)];
    
    // Calcular range de datas
    const dates = chartData.map(item => item.x);
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    
    return { 
      avg: avg.toFixed(1), 
      p50,
      p75, 
      p85,
      p90,
      dateRange: {
        start: new Date(minDate).toLocaleDateString('pt-BR'),
        end: new Date(maxDate).toLocaleDateString('pt-BR')
      }
    };
  }, [chartData]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{data.id}</p>
          <p className="text-sm text-gray-600 mb-2">{data.summary}</p>
          <div className="space-y-1 text-sm">
            <p><span className="font-medium">Story Points:</span> {data.storyPoints}</p>
            <p><span className="font-medium">Cycle Time:</span> {data.cycleTime} dias</p>
            <p><span className="font-medium">Tipo:</span> {data.issueType}</p>
            <p><span className="font-medium">Sequência:</span> #{data.sequenceIndex}</p>
            <p><span className="font-medium">Criado:</span> {new Date(data.created).toLocaleDateString('pt-BR')}</p>
            <p><span className="font-medium">Resolvido:</span> {data.resolvedFormatted}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Cycle Time Scatterplot
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              {chartData.length} issues
            </Badge>
          </div>
        </div>
        

      </CardHeader>
      
      <CardContent>
        {/* Estatísticas */}
        {statistics && (
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">{statistics.avg}</div>
              <div className="text-sm text-blue-600">Cycle Time Médio (dias)</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <div className="text-lg font-bold text-green-700">{statistics.dateRange.start}</div>
              <div className="text-sm text-green-600">Primeira Resolução</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
              <div className="text-lg font-bold text-orange-700">{statistics.dateRange.end}</div>
              <div className="text-sm text-orange-600">Última Resolução</div>
            </div>
          </div>
        )}

        {/* Legenda dos Percentis */}
        {statistics && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Legenda - Percentis de Cycle Time:</h4>
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10B981' }}></div>
                <span>≤ P50 ({statistics.p50}d)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#F59E0B' }}></div>
                <span>P51-P75 ({statistics.p75}d)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#EF4444' }}></div>
                <span>P76-P90 ({statistics.p90}d)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#7C2D12' }}></div>
                <span>&gt; P90</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Gráfico */}
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                type="number" 
                dataKey="x" 
                name="Data de Resolução"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontSize: 12 }}
                domain={['dataMin', 'dataMax']}
                tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })}
              />
              <YAxis 
                type="number" 
                dataKey="y" 
                name="Cycle Time (dias)"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontSize: 12 }}
                domain={[0, 'dataMax + 1']}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Linhas de referência dos percentis */}
              {statistics && (
                <>
                  <ReferenceLine 
                    y={statistics.p50} 
                    stroke="#10B981" 
                    strokeDasharray="5 5" 
                    strokeWidth={2}
                    label={{ value: `P50: ${statistics.p50}d`, position: "top", fill: "#10B981", fontSize: 12 }}
                  />
                  <ReferenceLine 
                    y={statistics.p75} 
                    stroke="#F59E0B" 
                    strokeDasharray="5 5" 
                    strokeWidth={2}
                    label={{ value: `P75: ${statistics.p75}d`, position: "top", fill: "#F59E0B", fontSize: 12 }}
                  />
                  <ReferenceLine 
                    y={statistics.p90} 
                    stroke="#EF4444" 
                    strokeDasharray="5 5" 
                    strokeWidth={2}
                    label={{ value: `P90: ${statistics.p90}d`, position: "top", fill: "#EF4444", fontSize: 12 }}
                  />
                </>
              )}
              
              <Scatter
                name="Issues"
                data={chartData}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        
        {chartData.length === 0 && (
          <div className="h-96 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">Nenhum dado disponível</p>
              <p className="text-sm">Conecte-se ao Jira ou ajuste os filtros</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CycleTimeScatterplot;
