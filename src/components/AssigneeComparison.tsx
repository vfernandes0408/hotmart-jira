import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { JiraIssue } from '../types/jira';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Users, BarChart3, Clock, Trophy } from 'lucide-react';

interface AssigneeComparisonProps {
  data: JiraIssue[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'];

const AssigneeComparison: React.FC<AssigneeComparisonProps> = ({ data }) => {
  const assigneeMetrics = useMemo(() => {
    const metrics = data.reduce((acc, issue) => {
      const assignee = issue.assignee || 'Não Atribuído';
      
      if (!acc[assignee]) {
        acc[assignee] = {
          name: assignee,
          totalTickets: 0,
          totalStoryPoints: 0,
          cycleTimeSum: 0,
          cycleTimeCount: 0,
          statusBreakdown: {
            'Done': 0,
            'In Progress': 0,
            'To Do': 0,
            'Other': 0
          }
        };
      }
      
      acc[assignee].totalTickets += 1;
      
      // Ensure we're handling story points correctly
      const storyPoints = typeof issue.storyPoints === 'number' ? issue.storyPoints : 0;
      console.log(`Story points for ${issue.id}:`, issue.storyPoints, typeof issue.storyPoints, '-> parsed:', storyPoints);
      acc[assignee].totalStoryPoints += storyPoints;
      
      if (issue.cycleTime && issue.cycleTime > 0) {
        acc[assignee].cycleTimeSum += issue.cycleTime;
        acc[assignee].cycleTimeCount += 1;
      }
      
      // Status breakdown
      if (['Done', 'In Progress', 'To Do'].includes(issue.status)) {
        acc[assignee].statusBreakdown[issue.status as keyof typeof acc[typeof assignee]['statusBreakdown']] += 1;
      } else {
        acc[assignee].statusBreakdown.Other += 1;
      }
      
      return acc;
    }, {} as Record<string, {
      name: string;
      totalTickets: number;
      totalStoryPoints: number;
      cycleTimeSum: number;
      cycleTimeCount: number;
      statusBreakdown: {
        'Done': number;
        'In Progress': number;
        'To Do': number;
        'Other': number;
      };
    }>);
    
    // Log total story points before filtering
    console.log('Total story points before filtering:', 
      Object.values(metrics).reduce((sum, metric) => sum + metric.totalStoryPoints, 0)
    );

    const processedMetrics = Object.values(metrics)
      .filter(metric => metric.name !== 'Não Atribuído') // Remove unassigned tickets from the comparison
      .map((metric) => ({
        ...metric,
        avgCycleTime: metric.cycleTimeCount > 0 ? Math.round(metric.cycleTimeSum / metric.cycleTimeCount) : 0,
        avgStoryPoints: metric.totalTickets > 0 ? Math.round((metric.totalStoryPoints / metric.totalTickets) * 10) / 10 : 0,
        completionRate: metric.totalTickets > 0 ? Math.round((metric.statusBreakdown.Done / metric.totalTickets) * 100) : 0
      }));

    // Log total story points after filtering
    console.log('Total story points after filtering:', 
      processedMetrics.reduce((sum, metric) => sum + metric.totalStoryPoints, 0)
    );

    return processedMetrics.sort((a, b) => b.totalTickets - a.totalTickets);
  }, [data]);

  const totalStats = useMemo(() => {
    // Log individual story points for debugging
    assigneeMetrics.forEach(metric => {
      console.log(`Story points for ${metric.name}:`, metric.totalStoryPoints);
    });

    const stats = assigneeMetrics.reduce((acc, metric) => ({
      totalAssignees: acc.totalAssignees + 1,
      totalTickets: acc.totalTickets + metric.totalTickets,
      totalStoryPoints: acc.totalStoryPoints + metric.totalStoryPoints,
      totalCycleTime: acc.totalCycleTime + (metric.avgCycleTime * metric.cycleTimeCount),
      totalCycleTimeCount: acc.totalCycleTimeCount + metric.cycleTimeCount
    }), {
      totalAssignees: 0,
      totalTickets: 0,
      totalStoryPoints: 0,
      totalCycleTime: 0,
      totalCycleTimeCount: 0
    });

    // Log final total stats
    console.log('Final total stats:', stats);

    return stats;
  }, [assigneeMetrics]);

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{
      payload: {
        name: string;
        totalTickets: number;
        totalStoryPoints: number;
        avgCycleTime: number;
        completionRate: number;
      };
    }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{label}</p>
          <p className="text-blue-600">
            <span className="font-medium">Tickets:</span> {data.totalTickets}
          </p>
          <p className="text-green-600">
            <span className="font-medium">Story Points:</span> {data.totalStoryPoints}
          </p>
          <p className="text-purple-600">
            <span className="font-medium">Ciclo Médio:</span> {data.avgCycleTime} dias
          </p>
          <p className="text-orange-600">
            <span className="font-medium">Taxa de Conclusão:</span> {data.completionRate}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Total Responsáveis</p>
                <p className="text-xl font-bold">{totalStats.totalAssignees}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Total Tickets</p>
                <p className="text-xl font-bold">{totalStats.totalTickets}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-600">Total Story Points</p>
                <p className="text-xl font-bold">{totalStats.totalStoryPoints}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Ciclo Médio Geral</p>
                <p className="text-xl font-bold">
                  {totalStats.totalCycleTimeCount > 0 
                    ? Math.round(totalStats.totalCycleTime / totalStats.totalCycleTimeCount) 
                    : 0} dias
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tickets por Responsável */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Tickets por Responsável</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={assigneeMetrics} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="totalTickets" radius={[4, 4, 0, 0]}>
                  {assigneeMetrics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Story Points por Responsável */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Story Points por Responsável</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={assigneeMetrics} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="totalStoryPoints" radius={[4, 4, 0, 0]}>
                  {assigneeMetrics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tempo de Ciclo Médio */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Tempo de Ciclo Médio (dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={assigneeMetrics} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avgCycleTime" radius={[4, 4, 0, 0]}>
                  {assigneeMetrics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Taxa de Conclusão */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Taxa de Conclusão (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={assigneeMetrics} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="completionRate" radius={[4, 4, 0, 0]}>
                  {assigneeMetrics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Comparativo Detalhado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-semibold">Responsável</th>
                  <th className="text-right p-2 font-semibold">Tickets</th>
                  <th className="text-right p-2 font-semibold">Story Points</th>
                  <th className="text-right p-2 font-semibold">SP/Ticket</th>
                  <th className="text-right p-2 font-semibold">Ciclo Médio</th>
                  <th className="text-right p-2 font-semibold">Conclusão</th>
                  <th className="text-right p-2 font-semibold">Done</th>
                  <th className="text-right p-2 font-semibold">In Progress</th>
                  <th className="text-right p-2 font-semibold">To Do</th>
                </tr>
              </thead>
              <tbody>
                {assigneeMetrics.map((metric, index) => (
                  <tr key={metric.name} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{metric.name}</td>
                    <td className="p-2 text-right">{metric.totalTickets}</td>
                    <td className="p-2 text-right">{metric.totalStoryPoints}</td>
                    <td className="p-2 text-right">{metric.avgStoryPoints}</td>
                    <td className="p-2 text-right">{metric.avgCycleTime} dias</td>
                    <td className="p-2 text-right">{metric.completionRate}%</td>
                    <td className="p-2 text-right">{metric.statusBreakdown.Done}</td>
                    <td className="p-2 text-right">{metric.statusBreakdown['In Progress']}</td>
                    <td className="p-2 text-right">{metric.statusBreakdown['To Do']}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AssigneeComparison; 