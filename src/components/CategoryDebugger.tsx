import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Bug } from 'lucide-react';
import { JiraIssue } from '@/types/jira';

interface CategoryDebuggerProps {
  data: JiraIssue[];
}

const CategoryDebugger: React.FC<CategoryDebuggerProps> = ({ data }) => {
  const [showDebugger, setShowDebugger] = useState(false);
  
  const categoryAnalysis = useMemo(() => {
    const categoryMap = new Map<string, number>();
    const samples = new Map<string, string[]>();
    
    data.forEach(item => {
      const category = item.issueType || 'Sem Tipo';
      const count = categoryMap.get(category) || 0;
      categoryMap.set(category, count + 1);
      
      // Armazenar amostras de IDs para cada categoria
      const currentSamples = samples.get(category) || [];
      if (currentSamples.length < 3) {
        currentSamples.push(item.id);
        samples.set(category, currentSamples);
      }
    });
    
    return Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({
        category,
        count,
        percentage: ((count / data.length) * 100).toFixed(1),
        samples: samples.get(category) || []
      }));
  }, [data]);

  if (!showDebugger) {
    return (
      <div className="mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDebugger(true)}
          className="flex items-center gap-2"
        >
          <Bug className="w-4 h-4" />
          Debug Categorias
        </Button>
      </div>
    );
  }

  return (
    <Card className="mb-6 border-orange-200 bg-orange-50/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Bug className="w-5 h-5" />
            Debug de Categorias ({data.length} issues)
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDebugger(false)}
            className="flex items-center gap-2"
          >
            <EyeOff className="w-4 h-4" />
            Ocultar
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-orange-700 bg-orange-100 p-3 rounded-lg">
            <strong>Como as categorias são determinadas:</strong>
            <p className="mt-2">Atualmente usando <strong>Issue Type</strong> como categoria (Story, Bug, Task, etc.)</p>
          </div>

          <div className="grid gap-3">
            <h4 className="font-semibold text-orange-800">Distribuição de Categorias:</h4>
            {categoryAnalysis.map(({ category, count, percentage, samples }) => (
              <div key={category} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">{category}</Badge>
                    <span className="text-sm font-medium">{count} issues ({percentage}%)</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Exemplos: {samples.join(', ')}
                    {samples.length === 3 && count > 3 && '...'}
                  </div>
                </div>
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full" 
                    style={{ width: `${Math.min(100, parseFloat(percentage))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {categoryAnalysis.length === 0 && (
            <div className="text-center text-gray-500 py-4">
              Nenhum dado disponível para análise
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryDebugger; 