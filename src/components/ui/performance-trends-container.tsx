import React from 'react';
import { Card } from '@/components/ui/card';

interface PerformanceTrendsContainerProps {
  children: React.ReactNode;
}

export function PerformanceTrendsContainer({ children }: PerformanceTrendsContainerProps) {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {children}
      </div>
    </div>
  );
}
