
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, TrendingUp, Target, Activity, CheckCircle2, AlertCircle, Tag } from 'lucide-react';
import { JiraIssue } from '@/types/jira';

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
      format: (value: number) => value.toString()
    },
    {
      title: 'Issues Completados',
      value: metrics.completedIssues,
      icon: CheckCircle2,
      color: 'from-green-500 to-green-600',
      bgColor: 'from-green-50 to-green-100',
      textColor: 'text-green-700',
      format: (value: number) => value.toString()
    },
    {
      title: 'Cycle Time Médio',
      value: metrics.avgCycleTime,
      icon: Clock,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'from-orange-50 to-orange-100',
      textColor: 'text-orange-700',
      format: (value: number) => `${value.toFixed(1)} dias`
    },
    {
      title: 'Lead Time Médio',
      value: metrics.avgLeadTime,
      icon: TrendingUp,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'from-purple-50 to-purple-100',
      textColor: 'text-purple-700',
      format: (value: number) => `${value.toFixed(1)} dias`
    },
    {
      title: 'Throughput (30d)',
      value: metrics.throughput,
      icon: Target,
      color: 'from-indigo-500 to-indigo-600',
      bgColor: 'from-indigo-50 to-indigo-100',
      textColor: 'text-indigo-700',
      format: (value: number) => `${value} issues`
    },
    {
      title: 'Taxa de Conclusão',
      value: metrics.completionRate,
      icon: AlertCircle,
      color: 'from-teal-500 to-teal-600',
      bgColor: 'from-teal-50 to-teal-100',
      textColor: 'text-teal-700',
      format: (value: number) => `${value.toFixed(1)}%`
    }
  ];

  return (
    <div className="space-y-4">
      {/* Cards de métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
        {metricsConfig.map((metric, index) => {
          const Icon = metric.icon;
          
          return (
            <Card key={index} className="border-0 shadow-lg bg-white/70 backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  <div className={`p-2 sm:p-3 rounded-xl bg-gradient-to-br ${metric.bgColor}`}>
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 ${metric.textColor}`} />
                  </div>
                  <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gradient-to-r ${metric.color}`} />
                </div>
                
                <div className="space-y-1">
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">
                    {metric.format(metric.value)}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium line-clamp-2">
                    {metric.title}
                  </p>
                </div>
                
    
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default MetricsCards;
