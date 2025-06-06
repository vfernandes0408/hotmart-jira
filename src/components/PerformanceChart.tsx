
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Target } from 'lucide-react';

interface PerformanceChartProps {
  data: any[];
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ data }) => {
  // Cores para os gráficos
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  // Processar dados para performance por categoria
  const processPerformanceByCategory = () => {
    if (!data || data.length === 0) return [];

    const categoryData = data.reduce((acc: any, item: any) => {
      const category = item.category || 'Sem Categoria';
      
      if (!acc[category]) {
        acc[category] = {
          category,
          totalIssues: 0,
          totalCycleTime: 0,
          completed: 0,
          avgCycleTime: 0,
          completionRate: 0
        };
      }
      
      acc[category].totalIssues += 1;
      acc[category].totalCycleTime += item.cycleTime || 0;
      
      if (item.status === 'Done' || item.status === 'Closed') {
        acc[category].completed += 1;
      }
      
      return acc;
    }, {});

    return Object.values(categoryData).map((item: any) => ({
      ...item,
      avgCycleTime: item.totalIssues > 0 ? Math.round(item.totalCycleTime / item.totalIssues) : 0,
      completionRate: item.totalIssues > 0 ? Math.round((item.completed / item.totalIssues) * 100) : 0
    }));
  };

  // Processar dados para distribuição por status
  const processStatusDistribution = () => {
    if (!data || data.length === 0) return [];

    const statusData = data.reduce((acc: any, item: any) => {
      const status = item.status || 'Sem Status';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(statusData).map(([status, count]) => ({
      status,
      count,
      percentage: Math.round(((count as number) / data.length) * 100)
    }));
  };

  const performanceData = processPerformanceByCategory();
  const statusData = processStatusDistribution();

  return (
    <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-green-600" />
          Métricas de Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data && data.length > 0 ? (
          <div className="space-y-8">
            {/* Performance por Categoria */}
            <div>
              <h4 className="text-sm font-medium mb-3">Cycle Time Médio por Categoria</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="category" 
                    tick={{ fontSize: 12 }}
                    stroke="#64748b"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="#64748b"
                    label={{ value: 'Dias', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    formatter={(value) => [`${value} dias`, 'Cycle Time Médio']}
                    labelFormatter={(label) => `Categoria: ${label}`}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar 
                    dataKey="avgCycleTime" 
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Distribuição por Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium mb-3">Distribuição por Status</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="count"
                      label={({ status, percentage }) => `${status}: ${percentage}%`}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`${value} issues`, 'Quantidade']}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Resumo de Performance */}
              <div>
                <h4 className="text-sm font-medium mb-3">Resumo de Performance</h4>
                <div className="space-y-3">
                  {performanceData.slice(0, 5).map((item, index) => (
                    <div key={item.category} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm font-medium">{item.category}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{item.avgCycleTime} dias</div>
                        <div className="text-xs text-muted-foreground">{item.totalIssues} issues</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-96 flex items-center justify-center text-muted-foreground">
            Nenhum dado disponível para análise de performance
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PerformanceChart;
