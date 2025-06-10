import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, TrendingUp, Target, Activity, CheckCircle2, AlertCircle, Tag, HelpCircle } from 'lucide-react';
import { JiraIssue } from '@/types/jira';
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

interface MetricsCardsProps {
  data: JiraIssue[];
}

const MetricsCards: React.FC<MetricsCardsProps> = ({ data }) => {
  const metrics = useMemo(() => {
    if (data.length === 0) {
      return {
        totalIssues: 0,
        completedIssues: 0,
        avgCycleTime: 0,
        avgLeadTime: 0,
        throughput: 0,
        completionRate: 0
      };
    }

    const completedIssues = data.filter(item => item.resolved);
    const cycleTimes = completedIssues.map(item => item.cycleTime).filter(Boolean);
    const leadTimes = completedIssues.map(item => item.leadTime).filter(Boolean);
    
    const avgCycleTime = cycleTimes.length > 0 
      ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length 
      : 0;
      
    const avgLeadTime = leadTimes.length > 0 
      ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length 
      : 0;

    // Calcular throughput (issues completados nos últimos 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentCompletions = completedIssues.filter(item => 
      item.resolved && new Date(item.resolved) >= thirtyDaysAgo
    );

    return {
      totalIssues: data.length,
      completedIssues: completedIssues.length,
      avgCycleTime: avgCycleTime,
      avgLeadTime: avgLeadTime,
      throughput: recentCompletions.length,
      completionRate: data.length > 0 ? (completedIssues.length / data.length) * 100 : 0
    };
  }, [data]);

  const metricsConfig = [
    {
      title: 'Total de Issues',
      value: metrics.totalIssues,
      icon: Activity,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'from-blue-50 to-blue-100',
      textColor: 'text-blue-700',
      format: (value: number) => value.toString(),
      description: 'Número total de issues no período selecionado, incluindo todas as issues independente do status.'
    },
    {
      title: 'Issues Completados',
      value: metrics.completedIssues,
      icon: CheckCircle2,
      color: 'from-green-500 to-green-600',
      bgColor: 'from-green-50 to-green-100',
      textColor: 'text-green-700',
      format: (value: number) => value.toString(),
      description: 'Número de issues que foram concluídas (status Done/Closed) no período selecionado.'
    },
    {
      title: 'Cycle Time Médio',
      value: metrics.avgCycleTime,
      icon: Clock,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'from-orange-50 to-orange-100',
      textColor: 'text-orange-700',
      format: (value: number) => `${value.toFixed(1)} dias`,
      description: 'Tempo médio que uma issue leva desde o início do desenvolvimento até sua conclusão. Um Cycle Time menor indica um fluxo de trabalho mais eficiente.'
    },
    {
      title: 'Lead Time Médio',
      value: metrics.avgLeadTime,
      icon: TrendingUp,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'from-purple-50 to-purple-100',
      textColor: 'text-purple-700',
      format: (value: number) => `${value.toFixed(1)} dias`,
      description: 'Tempo médio total desde a criação da issue até sua conclusão, incluindo o tempo em backlog. Um Lead Time menor indica maior agilidade no processo completo.'
    },
    {
      title: 'Throughput (30d)',
      value: metrics.throughput,
      icon: Target,
      color: 'from-indigo-500 to-indigo-600',
      bgColor: 'from-indigo-50 to-indigo-100',
      textColor: 'text-indigo-700',
      format: (value: number) => `${value} issues`,
      description: 'Quantidade de issues concluídas nos últimos 30 dias. Indica a capacidade de entrega da equipe em um período recente.'
    },
    {
      title: 'Taxa de Conclusão',
      value: metrics.completionRate,
      icon: AlertCircle,
      color: 'from-teal-500 to-teal-600',
      bgColor: 'from-teal-50 to-teal-100',
      textColor: 'text-teal-700',
      format: (value: number) => `${value.toFixed(1)}%`,
      description: 'Porcentagem de issues concluídas em relação ao total de issues. Uma taxa maior indica melhor eficiência na conclusão das tarefas.'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Cards de métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
        {metricsConfig.map((metric, index) => {
          const Icon = metric.icon;
          
          return (
            <Card key={index} className="relative">
              <div className={`p-6 bg-gradient-to-br ${metric.bgColor}`}>
                <div className="absolute top-2 right-2">
                  <HoverCard>
                    <HoverCardTrigger>
                      <HelpCircle className="w-4 h-4 text-gray-400" />
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <div className="space-y-2">
                        <p className="text-sm">{metric.description}</p>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </div>
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${metric.textColor}`} />
                  <span className="text-sm font-medium text-gray-600">{metric.title}</span>
                </div>
                <div className={`text-2xl font-bold mt-2 ${metric.textColor}`}>
                  {metric.format(metric.value)}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default MetricsCards;
