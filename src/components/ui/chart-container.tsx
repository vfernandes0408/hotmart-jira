import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ChartContainerProps {
  title: string;
  icon: React.ReactNode;
  iconColor?: string;
  metrics?: {
    label: string;
    value: string;
    icon?: React.ReactNode;
    bgColor?: string;
    textColor?: string;
  }[];
  badgeText?: string;
  children: React.ReactNode;
}

export function ChartContainer({
  title,
  icon,
  iconColor = "text-blue-600",
  metrics,
  badgeText,
  children
}: ChartContainerProps) {
  return (
    <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm h-full flex flex-col">
      <CardHeader className="flex-shrink-0 border-b">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className={iconColor}>{icon}</div>
            <CardTitle>{title}</CardTitle>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {metrics?.map((metric, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 ${metric.bgColor || 'bg-blue-50'} ${metric.textColor || 'text-blue-700'} px-3 py-1.5 rounded-md`}
              >
                {metric.icon}
                <span className="text-sm font-medium">{metric.label}: {metric.value}</span>
              </div>
            ))}
            
            {badgeText && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {badgeText}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto min-h-0 p-6">
        {children}
      </CardContent>
    </Card>
  );
}
