import React, { useMemo } from 'react';
import { JiraIssue } from '../types/jira';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { User, TrendingUp } from 'lucide-react';

interface StoryPointsByAssigneeProps {
  data: JiraIssue[];
}

interface AssigneeData {
  assignee: string;
  totalStoryPoints: number;
  ticketCount: number;
  avgStoryPoints: number;
}

const StoryPointsByAssignee: React.FC<StoryPointsByAssigneeProps> = ({ data }) => {
  // Processar dados por responsável
  const assigneeData = useMemo(() => {
    const assigneeMap = new Map<string, { totalStoryPoints: number; ticketCount: number; }>();

    data.forEach(ticket => {
      const assignee = ticket.assignee || 'Não atribuído';
      const storyPoints = ticket.storyPoints || 0;

      if (!assigneeMap.has(assignee)) {
        assigneeMap.set(assignee, { totalStoryPoints: 0, ticketCount: 0 });
      }

      const current = assigneeMap.get(assignee)!;
      current.totalStoryPoints += storyPoints;
      current.ticketCount += 1;
    });

    return Array.from(assigneeMap.entries())
      .map(([assignee, stats]): AssigneeData => ({
        assignee,
        totalStoryPoints: stats.totalStoryPoints,
        ticketCount: stats.ticketCount,
        avgStoryPoints: stats.ticketCount > 0 ? stats.totalStoryPoints / stats.ticketCount : 0
      }))
      .sort((a, b) => b.totalStoryPoints - a.totalStoryPoints);
  }, [data]);

  // Estatísticas gerais
  const totalStoryPoints = assigneeData.reduce((sum, item) => sum + item.totalStoryPoints, 0);
  const totalTickets = assigneeData.reduce((sum, item) => sum + item.ticketCount, 0);

  // Custom tooltip
  const CustomTooltip = (props: { active?: boolean; payload?: Array<{ payload: AssigneeData }>; label?: string; }) => {
    const { active, payload, label } = props;
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-blue-600">
            <span className="font-medium">Total Story Points:</span> {data.totalStoryPoints}
          </p>
          <p className="text-green-600">
            <span className="font-medium">Tickets:</span> {data.ticketCount}
          </p>
          <p className="text-purple-600">
            <span className="font-medium">Média por ticket:</span> {data.avgStoryPoints.toFixed(1)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header com estatísticas gerais */}
      <div className="flex-shrink-0 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <User className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Story Points por Responsável</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Total Story Points</span>
            </div>
            <p className="text-xl font-bold text-blue-900">{totalStoryPoints}</p>
          </div>
          
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-3 rounded-lg border border-green-200">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Responsáveis</span>
            </div>
            <p className="text-xl font-bold text-green-900">{assigneeData.length}</p>
          </div>
          
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-3 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">Média Geral</span>
            </div>
            <p className="text-xl font-bold text-purple-900">
              {totalTickets > 0 ? (totalStoryPoints / totalTickets).toFixed(1) : '0'}
            </p>
          </div>
        </div>
      </div>

      {/* Gráfico de barras */}
      <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-lg border border-zinc-200/50 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={assigneeData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 60,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="assignee" 
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
              fontSize={12}
              stroke="#666"
            />
            <YAxis 
              fontSize={12}
              stroke="#666"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              dataKey="totalStoryPoints" 
              name="Total Story Points"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabela de detalhes */}
      <div className="flex-shrink-0 mt-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-zinc-200/50 p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Detalhes por Responsável</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Responsável</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700">Story Points</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700">Tickets</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700">Média</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700">% do Total</th>
                </tr>
              </thead>
              <tbody>
                {assigneeData.map((item, index) => (
                  <tr key={item.assignee} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="py-2 px-3 font-medium">{item.assignee}</td>
                    <td className="text-right py-2 px-3 font-bold text-blue-600">
                      {item.totalStoryPoints}
                    </td>
                    <td className="text-right py-2 px-3">{item.ticketCount}</td>
                    <td className="text-right py-2 px-3">{item.avgStoryPoints.toFixed(1)}</td>
                    <td className="text-right py-2 px-3">
                      {totalStoryPoints > 0 ? ((item.totalStoryPoints / totalStoryPoints) * 100).toFixed(1) : '0'}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryPointsByAssignee;
