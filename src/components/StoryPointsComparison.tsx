import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, TrendingUp, Target, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { JiraIssue } from '@/types/jira';

interface StoryPointsComparisonProps {
  data: JiraIssue[];
}

interface AssigneeStoryPoints {
  assignee: string;
  totalStoryPoints: number;
  completedStoryPoints: number;
  totalTickets: number;
  completedTickets: number;
  completionRate: number;
  avgStoryPointsPerTicket: number;
}

const StoryPointsComparison: React.FC<StoryPointsComparisonProps> = ({ data }) => {
  // Estados para controle da visualização
  const [sortBy, setSortBy] = useState<'completed' | 'total' | 'rate' | 'avg'>('completed');
  const [showCount, setShowCount] = useState(10);

  // Cores para os gráficos
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

  // Processar dados para story points por assignee
  const processStoryPointsByAssignee = (): AssigneeStoryPoints[] => {
    if (!data || data.length === 0) return [];

    const assigneeData = data.reduce((acc: Record<string, AssigneeStoryPoints>, item: JiraIssue) => {
      const assignee = item.assignee || 'Não Atribuído';
      const storyPoints = item.storyPoints || 0;
      const isCompleted = item.status === 'Done' || item.status === 'Closed' || item.resolved;
      
      if (!acc[assignee]) {
        acc[assignee] = {
          assignee,
          totalStoryPoints: 0,
          completedStoryPoints: 0,
          totalTickets: 0,
          completedTickets: 0,
          completionRate: 0,
          avgStoryPointsPerTicket: 0
        };
      }
      
      acc[assignee].totalStoryPoints += storyPoints;
      acc[assignee].totalTickets += 1;
      
      if (isCompleted) {
        acc[assignee].completedStoryPoints += storyPoints;
        acc[assignee].completedTickets += 1;
      }
      
      return acc;
    }, {});

    const processedData = Object.values(assigneeData)
      .map((item: AssigneeStoryPoints) => ({
        ...item,
        completionRate: item.totalTickets > 0 ? Math.round((item.completedTickets / item.totalTickets) * 100) : 0,
        avgStoryPointsPerTicket: item.totalTickets > 0 ? Math.round((item.totalStoryPoints / item.totalTickets) * 10) / 10 : 0
      }))
      .filter(item => item.assignee !== 'Não Atribuído'); // Excluir não atribuídos

    // Aplicar ordenação baseada na seleção
    switch (sortBy) {
      case 'completed':
        return processedData.sort((a, b) => b.completedStoryPoints - a.completedStoryPoints);
      case 'total':
        return processedData.sort((a, b) => b.totalStoryPoints - a.totalStoryPoints);
      case 'rate':
        return processedData.sort((a, b) => b.completionRate - a.completionRate);
      case 'avg':
        return processedData.sort((a, b) => b.avgStoryPointsPerTicket - a.avgStoryPointsPerTicket);
      default:
        return processedData.sort((a, b) => b.completedStoryPoints - a.completedStoryPoints);
    }
  };

  const storyPointsData = processStoryPointsByAssignee();

  // Dados para o gráfico de pizza (apenas story points completados)
  const pieData = storyPointsData
    .filter(item => item.completedStoryPoints > 0)
    .map(item => ({
      assignee: item.assignee,
      storyPoints: item.completedStoryPoints
    }));

  return (
    <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          Comparativo de Story Points por Pessoa
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data && data.length > 0 && storyPointsData.length > 0 ? (
          <div className="space-y-6">
            {/* Controles de Visualização */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 items-start sm:items-center bg-gray-50 p-3 sm:p-4 rounded-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                <label className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">Ordenar por:</label>
                <Select value={sortBy} onValueChange={(value: 'completed' | 'total' | 'rate' | 'avg') => setSortBy(value)}>
                  <SelectTrigger className="w-full sm:w-48 h-8 sm:h-10 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">SP Entregues</SelectItem>
                    <SelectItem value="total">SP Total</SelectItem>
                    <SelectItem value="rate">Taxa de Entrega (%)</SelectItem>
                    <SelectItem value="avg">Média por Ticket</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                <label className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">Exibir:</label>
                <Select value={showCount.toString()} onValueChange={(value) => setShowCount(parseInt(value))}>
                  <SelectTrigger className="w-full sm:w-24 h-8 sm:h-10 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">Top 5</SelectItem>
                    <SelectItem value="10">Top 10</SelectItem>
                    <SelectItem value="15">Top 15</SelectItem>
                    <SelectItem value="999">Todos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Gráfico Comparativo - Side by Side */}
            <div>
              <h4 className="text-xs sm:text-sm font-medium mb-3 flex items-center gap-2">
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm">
                  Comparativo de Story Points ({sortBy === 'completed' ? 'SP Entregues' : sortBy === 'total' ? 'SP Total' : sortBy === 'rate' ? 'Taxa de Entrega' : 'Média por Ticket'})
                </span>
              </h4>
              <ResponsiveContainer width="100%" height={300} className="sm:h-[400px]">
                <BarChart data={storyPointsData.slice(0, showCount)} margin={{ bottom: 60, left: 10, right: 10, top: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="assignee"
                    tick={{ fontSize: 9 }}
                    className="sm:text-xs"
                    stroke="#64748b"
                    height={60}
                    angle={-45}
                  />
                  <YAxis 
                    tick={{ fontSize: 9 }}
                    className="sm:text-xs"
                    stroke="#64748b"
                    label={{ value: 'Story Points', angle: -90, position: 'insideLeft', style: { fontSize: '10px' } }}
                  />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'completedStoryPoints') return [`${value} SP`, 'Entregues'];
                      if (name === 'totalStoryPoints') return [`${value} SP`, 'Total'];
                      if (name === 'completionRate') return [`${value}%`, 'Taxa Entrega'];
                      if (name === 'avgStoryPointsPerTicket') return [`${value} SP`, 'Média/Ticket'];
                      return [value, name];
                    }}
                    labelFormatter={(label) => `${label}`}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      fontSize: '12px'
                    }}
                  />
                  <Bar 
                    dataKey="completedStoryPoints" 
                    radius={[2, 2, 0, 0]}
                    name="Entregues"
                  >
                    {storyPointsData.slice(0, showCount).map((entry, index) => (
                      <Cell key={`cell-completed-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                  <Bar 
                    dataKey="totalStoryPoints" 
                    radius={[2, 2, 0, 0]}
                    name="Total"
                    opacity={0.3}
                  >
                    {storyPointsData.slice(0, showCount).map((entry, index) => (
                      <Cell key={`cell-total-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico de pizza e resumo */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico de pizza */}
              <div>
                <h4 className="text-sm font-medium mb-3">Distribuição de Story Points Entregues</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      dataKey="storyPoints"
                      label={({ assignee, storyPoints, percent }) => 
                        `${assignee}: ${storyPoints} SP (${(percent * 100).toFixed(1)}%)`
                      }
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`${value} SP`, 'Story Points']}
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

              {/* Resumo detalhado */}
              <div>
                <h4 className="text-sm font-medium mb-3">Resumo por Pessoa</h4>
                <div className="space-y-3 max-h-250 overflow-y-auto">
                  {storyPointsData.slice(0, 8).map((item, index) => (
                    <div key={item.assignee} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm font-medium truncate max-w-24">{item.assignee}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-600">
                          {item.completedStoryPoints} SP entregues
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.completedTickets}/{item.totalTickets} tickets ({item.completionRate}%)
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.avgStoryPointsPerTicket} SP/ticket média
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Estatísticas gerais */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium mb-2 text-blue-800">📊 Estatísticas Gerais</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-blue-600 font-medium">
                    {storyPointsData.reduce((sum, item) => sum + item.completedStoryPoints, 0)}
                  </div>
                  <div className="text-blue-800">SP Entregues</div>
                </div>
                <div>
                  <div className="text-blue-600 font-medium">
                    {storyPointsData.reduce((sum, item) => sum + item.totalStoryPoints, 0)}
                  </div>
                  <div className="text-blue-800">SP Total</div>
                </div>
                <div>
                  <div className="text-blue-600 font-medium">
                    {storyPointsData.length}
                  </div>
                  <div className="text-blue-800">Pessoas</div>
                </div>
                <div>
                  <div className="text-blue-600 font-medium">
                    {Math.round((storyPointsData.reduce((sum, item) => sum + item.completedStoryPoints, 0) / 
                               storyPointsData.reduce((sum, item) => sum + item.totalStoryPoints, 0)) * 100) || 0}%
                  </div>
                  <div className="text-blue-800">Taxa Entrega</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-96 flex items-center justify-center text-muted-foreground">
            Nenhum dado de story points disponível para comparação
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StoryPointsComparison;
