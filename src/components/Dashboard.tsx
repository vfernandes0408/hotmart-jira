
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

const Dashboard = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [jiraData, setJiraData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [filters, setFilters] = useState({
    project: '',
    issueType: '',
    status: '',
    assignee: '',
    dateRange: { start: '', end: '' }
  });

  const handleJiraConnect = (data: any) => {
    setIsConnected(true);
    setJiraData(data);
    setFilteredData(data);
  };

  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters);
    // Apply filters to data
    let filtered = jiraData;
    
    if (newFilters.project) {
      filtered = filtered.filter((item: any) => item.project === newFilters.project);
    }
    
    if (newFilters.issueType) {
      filtered = filtered.filter((item: any) => item.issueType === newFilters.issueType);
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
                  <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="scatterplot" className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Cycle Time Scatterplot
                    </TabsTrigger>
                    <TabsTrigger value="trends" className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Tendências
                    </TabsTrigger>
                    <TabsTrigger value="performance" className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Performance
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="scatterplot" className="space-y-4">
                    <CycleTimeScatterplot data={filteredData} />
                  </TabsContent>
                  
                  <TabsContent value="trends" className="space-y-4">
                    <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-blue-600" />
                          Análise de Tendências
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-96 flex items-center justify-center text-muted-foreground">
                          Em desenvolvimento - Gráficos de tendência serão implementados aqui
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="performance" className="space-y-4">
                    <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Target className="w-5 h-5 text-green-600" />
                          Métricas de Performance
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-96 flex items-center justify-center text-muted-foreground">
                          Em desenvolvimento - Métricas de performance serão implementadas aqui
                        </div>
                      </CardContent>
                    </Card>
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
