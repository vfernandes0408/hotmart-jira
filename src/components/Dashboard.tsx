import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Calendar, BarChart3, Filter, Settings, Clock, TrendingUp, Target, Activity } from 'lucide-react';
import JiraConnector from './JiraConnector';
import CycleTimeScatterplot from './CycleTimeScatterplot';
import MetricsCards from './MetricsCards';
import FiltersPanel from './FiltersPanel';
import TrendChart from './TrendChart';
import PerformanceChart from './PerformanceChart';
import CategoryDebugger from './CategoryDebugger';
import LabelComparison from './LabelComparison';
import { JiraIssue, Filters } from '@/types/jira';

const Dashboard = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [jiraData, setJiraData] = useState<JiraIssue[]>([]);
  const [filteredData, setFilteredData] = useState<JiraIssue[]>([]);
  const [filters, setFilters] = useState<Filters>({
    project: '',
    issueType: '',
    status: '',
    assignee: '',
    labels: '',
    dateRange: { start: '', end: '' }
  });

  // Clean up any potential external data interference
  useEffect(() => {
    // Clear any global variables that might interfere
    if (typeof window !== 'undefined') {
      // Remove any non-application related data from window object
      const protectedKeys = ['React', 'ReactDOM', '__vite_plugin_react_preamble_installed__'];
      Object.keys(window).forEach(key => {
        if (!protectedKeys.includes(key) && key.includes('pullrequest')) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (window as any)[key];
          } catch (e) {
            // Ignore errors when trying to delete protected properties
          }
        }
      });
    }
  }, []);

  const handleJiraConnect = (data: JiraIssue[]) => {
    // Limpar e validar dados antes de usar
    const cleanData = data.filter(item => {
      // Verificar se é um objeto válido do Jira
      if (!item || typeof item !== 'object') return false;
      if (!item.id || typeof item.id !== 'string') return false;
      
      // Verificar se não contém dados de pull request ou externos
      const itemStr = JSON.stringify(item);
      if (itemStr.includes('pullrequest') || itemStr.includes('dataType')) return false;
      
      return true;
    });
    
    console.log(`Dados limpos: ${cleanData.length} de ${data.length} issues válidos`);
    
    setIsConnected(true);
    setJiraData(cleanData);
    setFilteredData(cleanData);
  };

  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters);
    
    // Apply all filters to data
    let filtered = jiraData;
    
    if (newFilters.project) {
      filtered = filtered.filter((item: JiraIssue) => item.project === newFilters.project);
    }
    
    if (newFilters.issueType) {
      filtered = filtered.filter((item: JiraIssue) => item.issueType === newFilters.issueType);
    }
    
    if (newFilters.status) {
      filtered = filtered.filter((item: JiraIssue) => item.status === newFilters.status);
    }
    
    if (newFilters.assignee) {
      filtered = filtered.filter((item: JiraIssue) => item.assignee === newFilters.assignee);
    }
    
    if (newFilters.labels) {
      filtered = filtered.filter((item: JiraIssue) => {
        if (!item.labels || !Array.isArray(item.labels)) return false;
        return item.labels.includes(newFilters.labels);
      });
    }
    
    // Apply date range filter
    if (newFilters.dateRange?.start || newFilters.dateRange?.end) {
      filtered = filtered.filter((item: JiraIssue) => {
        if (!item.created) return false;
        
        const itemDate = new Date(item.created);
        const startDate = newFilters.dateRange.start ? new Date(newFilters.dateRange.start) : null;
        const endDate = newFilters.dateRange.end ? new Date(newFilters.dateRange.end) : null;
        
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
        
        return true;
      });
    }
    
    setFilteredData(filtered);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Jira Analytics Dashboard
              </h1>
              <p className="text-muted-foreground mt-2">
                Análise avançada de cycle time e métricas de performance
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                isConnected 
                  ? 'bg-green-100 text-green-700 border border-green-200' 
                  : 'bg-orange-100 text-orange-700 border border-orange-200'
              }`}>
                {isConnected ? '🟢 Conectado ao Jira' : '🟡 Aguardando conexão'}
              </div>
            </div>
          </div>
        </div>

        {!isConnected ? (
          <JiraConnector onConnect={handleJiraConnect} />
        ) : (
          <div className="space-y-6">
            {/* Debug de Categorias */}
            <CategoryDebugger data={jiraData} />
            
            {/* Metrics Cards */}
            <MetricsCards data={filteredData} />
            
            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Filters Panel */}
              <div className="lg:col-span-1">
                <FiltersPanel 
                  data={jiraData} 
                  filters={filters} 
                  onFiltersChange={handleFiltersChange} 
                />
              </div>
              
              {/* Charts Area */}
              <div className="lg:col-span-3">
                <Tabs defaultValue="scatterplot" className="w-full">
                  <TabsList className="grid w-full grid-cols-4 mb-6">
                    <TabsTrigger value="scatterplot" className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Cycle Time
                    </TabsTrigger>
                    <TabsTrigger value="trends" className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Tendências
                    </TabsTrigger>
                    <TabsTrigger value="performance" className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Performance
                    </TabsTrigger>
                    <TabsTrigger value="comparison" className="flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Comparação IA
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="scatterplot" className="space-y-4">
                    <CycleTimeScatterplot data={filteredData} />
                  </TabsContent>
                  
                  <TabsContent value="trends" className="space-y-4">
                    <TrendChart data={filteredData} />
                  </TabsContent>
                  
                  <TabsContent value="performance" className="space-y-4">
                    <PerformanceChart data={filteredData} />
                  </TabsContent>
                  
                  <TabsContent value="comparison" className="space-y-4">
                    <LabelComparison data={filteredData} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
