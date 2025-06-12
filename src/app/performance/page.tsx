import React from 'react';
import { PerformanceTrendsContainer } from '@/components/ui/performance-trends-container';
import CycleTimeScatterplot from '@/components/CycleTimeScatterplot';
// ... outros imports necessários ...

export default function PerformancePage() {
  const defaultFilters = {
    dateRange: {
      start: '2024-01-01',
      end: '2024-12-31'
    }
  };

  return (
    <PerformanceTrendsContainer>
      <CycleTimeScatterplot data={[]} filters={defaultFilters} />
      {/* Outros gráficos serão adicionados aqui */}
    </PerformanceTrendsContainer>
  );
}
