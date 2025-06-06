import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Calendar,
  BarChart3,
  Filter,
  Settings,
  Clock,
  TrendingUp,
  Target,
  Activity,
} from "lucide-react";
import JiraConnector from "./JiraConnector";
import CycleTimeScatterplot from "./CycleTimeScatterplot";
import MetricsCards from "./MetricsCards";
import FiltersPanel from "./FiltersPanel";
import TrendChart from "./TrendChart";
import PerformanceChart from "./PerformanceChart";
import CategoryDebugger from "./CategoryDebugger";
import LabelComparison from "./LabelComparison";
import { JiraIssue, Filters } from "@/types/jira";

// Componente para mostrar status da API OpenAI
const OpenAIStatus = () => {
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const checkApiKey = async () => {
      const { getOpenAIApiKey } = await import("../utils/openai");
      setHasApiKey(!!getOpenAIApiKey());
    };
    checkApiKey();
  }, []);

  return (
    <div
      className={`px-3 py-1 rounded-full text-sm font-medium ${
        hasApiKey
          ? "bg-green-100 text-green-700 border border-green-200"
          : "bg-red-100 text-red-700 border border-red-200"
      }`}
    >
      {hasApiKey
        ? "🤖 OpenAI API configurada"
        : "❌ OpenAI API não configurada"}
    </div>
  );
};

const Dashboard = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [jiraData, setJiraData] = useState<JiraIssue[]>([]);
  const [filteredData, setFilteredData] = useState<JiraIssue[]>([]);
  const [filters, setFilters] = useState<Filters>({
    project: "",
    issueType: "",
    status: "",
    assignee: "",
    labels: "",
    dateRange: { start: "", end: "" },
  });

  // Clean up any potential external data interference
  useEffect(() => {
    // Clear any global variables that might interfere
    if (typeof window !== "undefined") {
      // Remove any non-application related data from window object
      const protectedKeys = [
        "React",
        "ReactDOM",
        "__vite_plugin_react_preamble_installed__",
      ];
      Object.keys(window).forEach((key) => {
        if (!protectedKeys.includes(key) && key.includes("pullrequest")) {
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
    const cleanData = data.filter((item) => {
      // Verificar se é um objeto válido do Jira
      if (!item || typeof item !== "object") return false;
      if (!item.id || typeof item.id !== "string") return false;

      // Verificar se não contém dados de pull request ou externos
      const itemStr = JSON.stringify(item);
      if (itemStr.includes("pullrequest") || itemStr.includes("dataType"))
        return false;

      return true;
    });

    setIsConnected(true);
    setJiraData(cleanData);
    setFilteredData(cleanData);
  };

  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters);

    // Apply all filters to data
    let filtered = jiraData;

    if (newFilters.project) {
      filtered = filtered.filter(
        (item: JiraIssue) => item.project === newFilters.project
      );
    }

    if (newFilters.issueType) {
      filtered = filtered.filter(
        (item: JiraIssue) => item.issueType === newFilters.issueType
      );
    }

    if (newFilters.status) {
      filtered = filtered.filter(
        (item: JiraIssue) => item.status === newFilters.status
      );
    }

    if (newFilters.assignee) {
      filtered = filtered.filter(
        (item: JiraIssue) => item.assignee === newFilters.assignee
      );
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
        const startDate = newFilters.dateRange.start
          ? new Date(newFilters.dateRange.start)
          : null;
        const endDate = newFilters.dateRange.end
          ? new Date(newFilters.dateRange.end)
          : null;

        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;

        return true;
      });
    }

    setFilteredData(filtered);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-zinc-50 via-neutral-50 to-stone-100 flex flex-col overflow-hidden">
      {/* Header - Optimized for MacBook Air 13" */}
      <header className="flex-shrink-0 border-b border-zinc-200/50 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold bg-gradient-to-r from-zinc-800 to-zinc-600 bg-clip-text text-transparent">
                Jira Analytics
              </h1>
              <div className="flex items-center gap-2">
                <div
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    isConnected
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      : "bg-amber-100 text-amber-700 border border-amber-200"
                  }`}
                >
                  {isConnected ? "🟢 Conectado" : "🟡 Desconectado"}
                </div>
                <OpenAIStatus />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Optimized for 900px height */}
      <main className="flex-1 overflow-hidden">
        <div className="mx-auto px-3 py-2 h-full">
          {!isConnected ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-full max-w-lg">
                <JiraConnector onConnect={handleJiraConnect} />
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col gap-2">
              {/* Debug de Categorias - Compact */}
              <div className="flex-shrink-0">
                <CategoryDebugger data={jiraData} />
              </div>

              {/* Metrics Cards - Compact height */}
              <div className="flex-shrink-0">
                <MetricsCards data={filteredData} />
              </div>

              {/* Main Dashboard Content - Optimized grid for 13" */}
              <div className="flex-1 grid grid-cols-4 gap-3 min-h-0">
                {/* Filters Panel - Compact sidebar */}
                <div className="col-span-1 flex flex-col">
                  <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-zinc-200/50 shadow-sm h-full overflow-hidden">
                    <div className="p-3 border-b border-zinc-200/50">
                      <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-1.5">
                        <Filter className="w-3.5 h-3.5" />
                        Filtros
                      </h3>
                    </div>
                    <div className="flex-1 overflow-auto p-3">
                      <FiltersPanel
                        data={jiraData}
                        filters={filters}
                        onFiltersChange={handleFiltersChange}
                      />
                    </div>
                  </div>
                </div>

                {/* Charts Area - Optimized for remaining space */}
                <div className="col-span-3 flex flex-col min-h-0">
                  <Tabs defaultValue="scatterplot" className="flex flex-col h-full">
                    <TabsList className="flex-shrink-0 grid w-full grid-cols-4 mb-2 bg-gradient-to-r from-zinc-100 to-zinc-50 backdrop-blur-sm h-10 p-1 rounded-xl border border-zinc-200/50">
                      <TabsTrigger
                        value="scatterplot"
                        className="flex items-center gap-1 text-xs px-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <BarChart3 className="w-3 h-3" />
                        Cycle Time
                      </TabsTrigger>
                      <TabsTrigger
                        value="trends"
                        className="flex items-center gap-1 text-xs px-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <TrendingUp className="w-3 h-3" />
                        Tendências
                      </TabsTrigger>
                      <TabsTrigger
                        value="performance"
                        className="flex items-center gap-1 text-xs px-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 hover:bg-purple-50 hover:text-purple-700"
                      >
                        <Target className="w-3 h-3" />
                        Performance
                      </TabsTrigger>
                      <TabsTrigger
                        value="comparison"
                        className="flex items-center gap-1 text-xs px-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 hover:bg-orange-50 hover:text-orange-700"
                      >
                        <Activity className="w-3 h-3" />
                        IA
                      </TabsTrigger>
                    </TabsList>

                    <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-lg border border-zinc-200/50 shadow-sm overflow-hidden">
                      <TabsContent value="scatterplot" className="h-full m-0 p-3">
                        <CycleTimeScatterplot data={filteredData} />
                      </TabsContent>

                      <TabsContent value="trends" className="h-full m-0 p-3">
                        <TrendChart data={filteredData} />
                      </TabsContent>

                      <TabsContent value="performance" className="h-full m-0 p-3">
                        <PerformanceChart data={filteredData} />
                      </TabsContent>

                      <TabsContent value="comparison" className="h-full m-0 p-3">
                        <LabelComparison data={filteredData} />
                      </TabsContent>
                    </div>
                  </Tabs>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
