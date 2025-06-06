
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Clock, TrendingUp, BarChart3 } from 'lucide-react';
import { JiraIssue } from '@/types/jira';

interface CycleTimeScatterplotProps {
  data: JiraIssue[];
}

const CycleTimeScatterplot: React.FC<CycleTimeScatterplotProps> = ({ data }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Cores para diferentes categorias
  const categoryColors = {
    'Frontend': '#3B82F6',
    'Backend': '#10B981', 
    'DevOps': '#F59E0B',
    'Design': '#8B5CF6',
    'QA': '#EF4444',
    'all': '#6B7280'
  };

  // Filtrar e preparar dados para o gráfico
  const chartData = useMemo(() => {
    let filteredData = data.filter(item => item.resolved); // Apenas issues resolvidos
    
    if (selectedCategory !== 'all') {
      filteredData = filteredData.filter(item => item.category === selectedCategory);
    }
    
    return filteredData.map(item => ({
      x: item.storyPoints || 1,
      y: item.cycleTime,
      category: item.category,
      issueType: item.issueType,
      id: item.id,
      summary: item.summary
    }));
  }, [data, selectedCategory]);

  // Calcular estatísticas
  const statistics = useMemo(() => {
    if (chartData.length === 0) return null;
    
    const cycleTimes = chartData.map(item => item.y);
    const avg = cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length;
    const sorted = [...cycleTimes].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const p85 = sorted[Math.floor(sorted.length * 0.85)];
    
    return { avg: avg.toFixed(1), median, p85 };
  }, [chartData]);

  // Obter categorias únicas
  const categories = useMemo(() => {
    const unique = [...new Set(data.map(item => item.category))];
    return ['all', ...unique];
  }, [data]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{data.id}</p>
          <p className="text-sm text-gray-600 mb-2">{data.summary}</p>
          <div className="space-y-1 text-sm">
            <p><span className="font-medium">Story Points:</span> {data.x}</p>
            <p><span className="font-medium">Cycle Time:</span> {data.y} dias</p>
            <p><span className="font-medium">Categoria:</span> {data.category}</p>
            <p><span className="font-medium">Tipo:</span> {data.issueType}</p>
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
        
        {/* Filtros de categoria */}
        <div className="flex flex-wrap gap-2 mt-4">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category === 'all' ? 'Todas' : category}
            </button>
          ))}
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Estatísticas */}
        {statistics && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">{statistics.avg}</div>
              <div className="text-sm text-blue-600">Média (dias)</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{statistics.median}</div>
              <div className="text-sm text-green-600">Mediana (dias)</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
              <div className="text-2xl font-bold text-orange-700">{statistics.p85}</div>
              <div className="text-sm text-orange-600">85º Percentil (dias)</div>
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
                name="Story Points"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontSize: 12 }}
              />
              <YAxis 
                type="number" 
                dataKey="y" 
                name="Cycle Time (dias)"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {selectedCategory === 'all' ? (
                // Mostrar todas as categorias com cores diferentes
                categories.slice(1).map(category => (
                  <Scatter
                    key={category}
                    name={category}
                    data={chartData.filter(item => item.category === category)}
                    fill={categoryColors[category as keyof typeof categoryColors]}
                  />
                ))
              ) : (
                // Mostrar apenas a categoria selecionada
                <Scatter
                  name={selectedCategory}
                  data={chartData}
                  fill={categoryColors[selectedCategory as keyof typeof categoryColors]}
                />
              )}
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
