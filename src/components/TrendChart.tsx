
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface TrendChartProps {
  data: any[];
}

const TrendChart: React.FC<TrendChartProps> = ({ data }) => {
  // Processar dados para criar tendência por período
  const processDataForTrend = () => {
    if (!data || data.length === 0) return [];

    // Agrupar por mês
    const monthlyData = data.reduce((acc: any, item: any) => {
      if (!item.created) return acc;
      
      const date = new Date(item.created);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: monthKey,
          totalIssues: 0,
          totalCycleTime: 0,
          avgCycleTime: 0,
          completed: 0
        };
      }
      
      acc[monthKey].totalIssues += 1;
      acc[monthKey].totalCycleTime += item.cycleTime || 0;
      
      if (item.status === 'Done' || item.status === 'Closed') {
        acc[monthKey].completed += 1;
      }
      
      return acc;
    }, {});

    // Calcular médias e converter para array
    return Object.values(monthlyData).map((item: any) => ({
      ...item,
      avgCycleTime: item.totalIssues > 0 ? Math.round(item.totalCycleTime / item.totalIssues) : 0,
      completionRate: item.totalIssues > 0 ? Math.round((item.completed / item.totalIssues) * 100) : 0
    })).sort((a: any, b: any) => a.month.localeCompare(b.month));
  };

  const trendData = processDataForTrend();

  return (
    <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Análise de Tendências
        </CardTitle>
      </CardHeader>
      <CardContent>
        {trendData.length > 0 ? (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium mb-3">Cycle Time Médio por Mês</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
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
                    formatter={(value) => [`${value} dias`, 'Cycle Time Médio']}
                    labelFormatter={(label) => `Mês: ${label}`}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avgCycleTime" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-3">Taxa de Conclusão por Mês (%)</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
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
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    formatter={(value) => [`${value}%`, 'Taxa de Conclusão']}
                    labelFormatter={(label) => `Mês: ${label}`}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="completionRate" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="h-96 flex items-center justify-center text-muted-foreground">
            Nenhum dado disponível para análise de tendências
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrendChart;
