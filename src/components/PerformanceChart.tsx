import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Target } from 'lucide-react';
import { JiraIssue } from '@/types/jira';
import { format } from 'date-fns';

interface PerformanceChartProps {
  data: JiraIssue[];
  filters: {
    dateRange: {
      start: string;
      end: string;
    };
  };
}

interface IssueTypePerformance {
  issueType: string;
  displayDate: string;
  totalIssues: number;
  totalCycleTime: number;
  completed: number;
  avgCycleTime: number;
  completionRate: number;
}

interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ data, filters }) => {
  // Cores para os gráficos
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  // Processar dados para performance por tipo de issue
  const processPerformanceByIssueType = (): IssueTypePerformance[] => {
    if (!data || data.length === 0) return [];

    const issueTypeData = data.reduce((acc: Record<string, IssueTypePerformance>, item: JiraIssue) => {
      // Verificar se está dentro do range de datas
      const itemDate = new Date(item.created);
      const startDate = filters.dateRange.start ? new Date(filters.dateRange.start) : null;
      const endDate = filters.dateRange.end ? new Date(filters.dateRange.end) : null;

      // Se tiver filtro de data e o item estiver fora do range, pular
      if (startDate && itemDate < startDate) return acc;
      if (endDate && itemDate > endDate) return acc;

      const issueType = item.issueType || 'Sem Tipo';
      
      if (!acc[issueType]) {
        acc[issueType] = {
          issueType,
          displayDate: format(itemDate, 'MM/yyyy'),
          totalIssues: 0,
          totalCycleTime: 0,
          completed: 0,
          avgCycleTime: 0,
          completionRate: 0
        };
      }
      
      acc[issueType].totalIssues += 1;
      acc[issueType].totalCycleTime += item.cycleTime || 0;
      
      if (item.status === 'Done' || item.status === 'Closed') {
        acc[issueType].completed += 1;
      }
      
      return acc;
    }, {});

    return Object.values(issueTypeData).map((item: IssueTypePerformance) => ({
      ...item,
      avgCycleTime: item.totalIssues > 0 ? Math.round(item.totalCycleTime / item.totalIssues) : 0,
      completionRate: item.totalIssues > 0 ? Math.round((item.completed / item.totalIssues) * 100) : 0
    }));
  };

  // Processar dados para distribuição por status
  const processStatusDistribution = (): StatusDistribution[] => {
    if (!data || data.length === 0) return [];

    const statusData = data.reduce((acc: Record<string, number>, item: JiraIssue) => {
      // Verificar se está dentro do range de datas
      const itemDate = new Date(item.created);
      const startDate = filters.dateRange.start ? new Date(filters.dateRange.start) : null;
      const endDate = filters.dateRange.end ? new Date(filters.dateRange.end) : null;

      // Se tiver filtro de data e o item estiver fora do range, pular
      if (startDate && itemDate < startDate) return acc;
      if (endDate && itemDate > endDate) return acc;

      const status = item.status || 'Sem Status';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const totalIssues = Object.values(statusData).reduce((sum, count) => sum + count, 0);

    return Object.entries(statusData).map(([status, count]) => ({
      status,
      count,
      percentage: Math.round((count / totalIssues) * 100)
    }));
  };

  const performanceData = processPerformanceByIssueType();
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
            {/* Performance por Tipo de Issue */}
            <div>
              <h4 className="text-sm font-medium mb-3">Cycle Time Médio por Tipo de Issue</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="displayDate" 
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
                    labelFormatter={(label) => `Tipo: ${label}`}
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
                    <div key={item.issueType} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm font-medium">{item.issueType}</span>
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
