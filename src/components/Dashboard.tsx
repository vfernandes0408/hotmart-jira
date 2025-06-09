import React, { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  BarChart3,
  Filter,
  TrendingUp,
  Target,
  Activity,
  LogOut,
  Brain,
  Save,
  List,
  ChevronLeft,
  ChevronRight,
  Users,
  RefreshCw,
  Clock,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import JiraConnector from "./JiraConnector";
import CycleTimeScatterplot from "./CycleTimeScatterplot";
import MetricsCards from "./MetricsCards";
import FiltersPanel from "./FiltersPanel";
import TrendChart from "./TrendChart";
import PerformanceChart from "./PerformanceChart";

import LabelComparison from "./LabelComparison";
import TicketList from "./TicketList";
import AssigneeComparison from "./AssigneeComparison";
import { JiraIssue, Filters } from "@/types/jira";

const SESSION_KEY = "jira_dashboard_session";
const SESSION_DURATION = 10 * 60 * 1000; // 10 minutos em millisegundos

interface SessionData {
  jiraData: JiraIssue[];
  projectKey: string;
  timestamp: number;
}

const Dashboard = () => {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [jiraData, setJiraData] = useState<JiraIssue[]>([]);
  const [filteredData, setFilteredData] = useState<JiraIssue[]>([]);
  const [projectKey, setProjectKey] = useState<string>("");
  const [sessionTimer, setSessionTimer] = useState<NodeJS.Timeout | null>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    project: "",
    issueType: "",
    status: "",
    assignee: "",
    labels: "",
    dateRange: { start: "", end: "" },
  });

  // Estado para IA
  const [iaModalOpen, setIaModalOpen] = useState(false);
  const [selectedIa, setSelectedIa] = useState<"openai" | "gemini" | "hotmartjedai" | null>(null);
  const [iaKeys, setIaKeys] = useState<{ [key: string]: string }>(() => {
    try {
      return JSON.parse(localStorage.getItem("iaKeys") || "{}");
    } catch {
      return {};
    }
  });
  const [apiKey, setApiKey] = useState("");

  // Funções para gerenciar sessão
  const saveSession = useCallback((data: JiraIssue[], projectKey: string) => {
    const sessionData: SessionData = {
      jiraData: data,
      projectKey,
      timestamp: Date.now(),
    };
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    } catch (error) {
      console.error("Erro ao salvar sessão:", error);
    }
  }, []);

  const clearSession = useCallback(() => {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (error) {
      console.error("Erro ao limpar sessão:", error);
    }

    if (sessionTimer) {
      clearTimeout(sessionTimer);
      setSessionTimer(null);
    }
  }, [sessionTimer]);

  const loadSession = useCallback((): SessionData | null => {
    try {
      const sessionStr = localStorage.getItem(SESSION_KEY);
      if (!sessionStr) return null;

      const sessionData: SessionData = JSON.parse(sessionStr);
      const isValidSession =
        Date.now() - sessionData.timestamp < SESSION_DURATION;

      if (!isValidSession) {
        clearSession();
        return null;
      }

      return sessionData;
    } catch (error) {
      console.error("Erro ao carregar sessão:", error);
      clearSession();
      return null;
    }
  }, [clearSession]);

  const startSessionTimer = useCallback(() => {
    if (sessionTimer) {
      clearTimeout(sessionTimer);
    }

    const timer = setTimeout(() => {
      handleLogout();
      console.log("Sessão expirada após 10 minutos");
    }, SESSION_DURATION);

    setSessionTimer(timer);
  }, [sessionTimer]);

  // Verificar sessão existente na inicialização
  useEffect(() => {
    const existingSession = loadSession();
    if (existingSession) {
      setJiraData(existingSession.jiraData);
      setFilteredData(existingSession.jiraData);
      setProjectKey(existingSession.projectKey);
      setIsConnected(true);
      startSessionTimer();
      console.log("Sessão restaurada automaticamente");
    }

    // Clean up any potential external data interference
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

    // Cleanup na desmontagem do componente
    return () => {
      if (sessionTimer) {
        clearTimeout(sessionTimer);
      }
    };
  }, [loadSession, startSessionTimer, sessionTimer]);

  // Keyboard shortcut for sidebar toggle
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + B para toggle da sidebar
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        setIsSidebarVisible(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const formatLastUpdate = (date: Date | null) => {
    if (!date) return "";
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Formatar o horário
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;
    
    // Se for menos de 1 minuto
    if (diff < 60000) {
      return `Atualizado agora (${timeStr})`;
    }
    
    // Se for menos de 1 hora
    if (diff < 3600000) {
      const mins = Math.floor(diff / 60000);
      return `Atualizado há ${mins} min (${timeStr})`;
    }
    
    // Se for menos de 24 horas
    if (diff < 86400000) {
      const hrs = Math.floor(diff / 3600000);
      return `Atualizado há ${hrs}h (${timeStr})`;
    }
    
    // Se for mais de 24 horas
    const days = Math.floor(diff / 86400000);
    return `Atualizado há ${days}d (${timeStr})`;
  };

  const handleJiraConnect = (
    data: JiraIssue[],
    connectedProjectKey?: string
  ) => {
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

    // Capturar o project key dos dados ou usar o fornecido
    const detectedProjectKey =
      connectedProjectKey ||
      (cleanData.length > 0 && cleanData[0].project) ||
      (cleanData.length > 0 && cleanData[0].id
        ? cleanData[0].id.split("-")[0]
        : "");

    setIsConnected(true);
    setJiraData(cleanData);
    setFilteredData(cleanData);
    setProjectKey(detectedProjectKey);
    setLastUpdate(new Date());
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
      const issueTypes = Array.isArray(newFilters.issueType)
        ? newFilters.issueType
        : [newFilters.issueType];
      filtered = filtered.filter((item: JiraIssue) =>
        issueTypes.includes(item.issueType)
      );
    }

    if (newFilters.status) {
      filtered = filtered.filter(
        (item: JiraIssue) => item.status === newFilters.status
      );
    }

    if (newFilters.assignee) {
      const assignees = Array.isArray(newFilters.assignee)
        ? newFilters.assignee
        : [newFilters.assignee];
      filtered = filtered.filter((item: JiraIssue) =>
        assignees.includes(item.assignee)
      );
    }

    if (newFilters.labels) {
      const labels = Array.isArray(newFilters.labels)
        ? newFilters.labels
        : [newFilters.labels];
      filtered = filtered.filter((item: JiraIssue) => {
        if (!item.labels || !Array.isArray(item.labels)) return false;
        return labels.some(label => item.labels.includes(label));
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

  const handleLogout = () => {
    setIsConnected(false);
    setJiraData([]);
    setFilteredData([]);
    setProjectKey("");
    setFilters({
      project: "",
      issueType: "",
      status: "",
      assignee: "",
      labels: "",
      dateRange: { start: "", end: "" },
    });
  };

  const handleRefreshData = useCallback(async () => {
    try {
      await queryClient.invalidateQueries();
      setLastUpdate(new Date());
      toast.success("Dados atualizados com sucesso!");
    } catch (error) {
      toast.error("Erro ao atualizar os dados");
      console.error("Erro ao atualizar dados:", error);
    }
  }, [queryClient]);

  return (
    <div className="h-screen bg-gradient-to-br from-zinc-50 via-neutral-50 to-stone-100 flex flex-col overflow-hidden">
      {/* Header - Responsive */}
      <header className="flex-shrink-0 border-b border-zinc-200/50 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto px-3 lg:px-6 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                width="128"
                height="37.682"
                viewBox="0 0 128 37.682"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-24 sm:w-32"
              >
                <path
                  d="M33.005 30.23V11.959c0 -0.106 0.084 -0.191 0.187 -0.191h3.708c0.103 0 0.187 0.086 0.187 0.191v6.902c0.659 -1.172 1.952 -2.239 4.03 -2.239 3.321 0 4.563 2.16 4.563 5.154v8.451c0 0.106 -0.083 0.191 -0.187 0.191h-3.683a0.188 0.188 0 0 1 -0.187 -0.191V22.844c0 -1.823 -0.558 -2.889 -2.104 -2.889 -1.546 0 -2.458 1.093 -2.458 3.071v7.203c0 0.106 -0.083 0.191 -0.186 0.191h-3.683a0.188 0.188 0 0 1 -0.187 -0.191z"
                  fill="#053d4e"
                ></path>
                <path
                  d="M46.975 23.808v-0.26c0 -4.061 2.738 -6.925 6.87 -6.925s6.869 2.863 6.869 6.925v0.26c0 4.088 -2.712 6.951 -6.869 6.951s-6.87 -2.863 -6.87 -6.95m9.632 0v-0.26c0 -2.446 -0.836 -3.748 -2.763 -3.748 -1.926 0 -2.762 1.302 -2.762 3.748v0.26c0 2.473 0.861 3.774 2.763 3.774s2.763 -1.302 2.763 -3.774"
                  fill="#053d4e"
                ></path>
                <path
                  d="M63.688 26.36V19.955h-2.257a0.126 0.126 0 0 1 -0.124 -0.128v-2.736a0.126 0.126 0 0 1 0.124 -0.128h2.257v-5.064a0.126 0.126 0 0 1 0.124 -0.128h3.806a0.126 0.126 0 0 1 0.124 0.128v5.064h2.907a0.126 0.126 0 0 1 0.124 0.128v2.736a0.126 0.126 0 0 1 -0.124 0.128h-2.907v6.118c0 1.068 0.507 1.51 1.775 1.51 0.533 0 0.786 -0.099 1.146 -0.212l0.162 0.123v2.829a0.128 0.128 0 0 1 -0.091 0.125c-0.66 0.192 -1.382 0.311 -2.205 0.311 -3.32 0 -4.841 -1.51 -4.841 -4.4"
                  fill="#053d4e"
                ></path>
                <path
                  d="M72.561 30.292V17.09c0 -0.071 0.056 -0.128 0.125 -0.128h3.805a0.126 0.126 0 0 1 0.124 0.128v1.928c0.609 -1.198 1.825 -2.394 3.854 -2.394s3.295 0.807 3.954 2.5c0.912 -1.562 2.332 -2.5 4.233 -2.5 3.219 0 4.487 2.135 4.487 5.258v8.411a0.126 0.126 0 0 1 -0.125 0.128h-3.805a0.126 0.126 0 0 1 -0.124 -0.128V22.663c0 -1.849 -0.685 -2.733 -1.952 -2.733 -1.419 0 -2.256 1.041 -2.256 3.254v7.109a0.126 0.126 0 0 1 -0.124 0.127h-3.806a0.126 0.126 0 0 1 -0.124 -0.128v-7.602c0 -1.823 -0.608 -2.76 -1.901 -2.76 -1.394 0 -2.306 0.989 -2.306 3.229v7.135a0.126 0.126 0 0 1 -0.124 0.128h-3.805a0.126 0.126 0 0 1 -0.124 -0.128z"
                  fill="#053d4e"
                ></path>
                <path
                  d="M94.555 26.671c0 -2.316 1.444 -3.696 3.954 -4.009l4.563 -0.625v-0.859c0 -0.989 -0.633 -1.587 -1.952 -1.587s-2.024 0.508 -2.166 1.455a0.126 0.126 0 0 1 -0.125 0.107h-3.605a0.129 0.129 0 0 1 -0.127 -0.139c0.221 -2.778 2.584 -4.39 6.1 -4.39s5.83 1.77 5.83 4.582v9.086a0.126 0.126 0 0 1 -0.125 0.128h-3.559a0.126 0.126 0 0 1 -0.124 -0.12l-0.12 -1.884c-0.785 1.458 -2.256 2.342 -4.233 2.342 -2.535 0 -4.309 -1.717 -4.309 -4.087zm8.516 -1.144v-0.963l-3.092 0.417c-1.013 0.13 -1.495 0.625 -1.495 1.432 0 0.885 0.634 1.406 1.8 1.406 1.52 0 2.788 -0.911 2.788 -2.291z"
                  fill="#053d4e"
                ></path>
                <path
                  d="M120.598 19.955h-2.257a0.126 0.126 0 0 1 -0.125 -0.128v-2.736c0 -0.071 0.056 -0.128 0.125 -0.128h2.257v-5.064a0.126 0.126 0 0 1 0.124 -0.128h3.806a0.126 0.126 0 0 1 0.124 0.128v5.064h3.17a0.126 0.126 0 0 1 0.124 0.128v2.736a0.126 0.126 0 0 1 -0.124 0.128h-3.17v6.118c0 1.068 0.507 1.51 1.775 1.51 0.54 0 0.999 -0.103 1.416 -0.216a0.126 0.126 0 0 1 0.157 0.124v2.832a0.128 0.128 0 0 1 -0.091 0.125c-0.681 0.192 -1.645 0.312 -2.47 0.312 -3.32 0 -4.841 -1.51 -4.841 -4.399z"
                  fill="#053d4e"
                ></path>
                <path
                  d="M116.581 16.968c-2.189 -0.2 -3.302 0.562 -3.893 2.131v-2.009a0.126 0.126 0 0 0 -0.124 -0.128h-3.607a0.126 0.126 0 0 0 -0.125 0.128v13.202c0 0.071 0.056 0.128 0.125 0.128h3.607a0.126 0.126 0 0 0 0.124 -0.128V24.147c0 -4.027 1.596 -4.351 3.874 -4.209a0.126 0.126 0 0 0 0.133 -0.127v-2.714a0.132 0.132 0 0 0 -0.114 -0.129z"
                  fill="#053d4e"
                ></path>
                <path
                  d="M25.775 17.751a19.858 19.858 0 0 0 -2.148 -4.964h0.002s-0.927 -1.538 -1.316 -2.003H22.31c-0.096 -0.121 -0.289 0.013 -0.215 0.151 0.109 0.229 0.208 0.511 0.139 0.786 -0.114 0.336 -0.489 0.569 -0.834 0.45a0.748 0.748 0 0 1 -0.254 -0.17c-0.353 -0.365 -0.537 -0.969 -0.766 -1.736 -0.206 -0.683 -0.461 -1.531 -0.921 -2.449 -0.748 -1.492 -1.633 -2.182 -1.669 -2.211a0.126 0.126 0 0 0 -0.154 -0.001 0.138 0.138 0 0 0 -0.048 0.15c0.004 0.012 0.376 1.242 -0.342 2.173 -0.286 0.371 -0.721 0.595 -1.228 0.627 -0.51 0.033 -1.015 -0.136 -1.318 -0.44 -0.751 -0.755 -0.839 -2.093 -0.825 -2.823 0.047 -2.434 0.782 -4.139 1.165 -4.7a0.138 0.138 0 0 0 -0.005 -0.161 0.128 0.128 0 0 0 -0.152 -0.038C11.909 1.681 9.754 3.888 8.653 6.765c-0.619 1.711 -0.889 2.491 -1.108 2.982 -0.202 0.449 -0.389 0.656 -0.58 0.77 -0.105 0.064 -0.233 0.1 -0.365 0.105 -0.194 -0.02 -1.154 -0.196 -0.318 -1.802 0.069 -0.135 -0.114 -0.269 -0.216 -0.16l-0.658 0.727q-0.044 0.048 -0.088 0.096l-0.109 0.121q-0.028 0.032 -0.051 0.062C3.08 12.043 1.627 15.085 0.79 17.895 0.04 20.595 -0.007 22.752 0 23.572l0.001 0.182c0 3.634 1.382 7.05 3.891 9.62s5.847 3.985 9.395 3.985 6.886 -1.415 9.395 -3.985c2.51 -2.57 3.891 -5.987 3.891 -9.62 0 -2.315 -0.298 -4.201 -0.803 -6.003zM13.289 30.798c-3.798 0 -6.879 -3.152 -6.879 -7.043s3.08 -7.044 6.879 -7.044 6.879 3.154 6.879 7.044 -3.08 7.043 -6.879 7.043"
                  fill="#FF4000"
                ></path>
              </svg>
              {/* Botões de IA ao lado do logo */}
              <div className="flex items-center gap-2 ml-4">
                <Button 
                  size="sm" 
                  variant={iaKeys["openai"] ? "default" : "outline"}
                  className={iaKeys["openai"] ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                  onClick={() => { setSelectedIa("openai"); setApiKey(iaKeys["openai"] || ""); setIaModalOpen(true); }}
                >
                  {iaKeys["openai"] ? "🟢 OpenAI" : "OpenAI"}
                </Button>
                <Button 
                  size="sm" 
                  variant={iaKeys["gemini"] ? "default" : "outline"}
                  className={iaKeys["gemini"] ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                  onClick={() => { setSelectedIa("gemini"); setApiKey(iaKeys["gemini"] || ""); setIaModalOpen(true); }}
                >
                  {iaKeys["gemini"] ? "🟢 Gemini" : "Gemini"}
                </Button>
                <Button 
                  size="sm" 
                  variant={iaKeys["hotmartjedai"] ? "default" : "outline"}
                  className={iaKeys["hotmartjedai"] ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                  onClick={() => { setSelectedIa("hotmartjedai"); setApiKey(iaKeys["hotmartjedai"] || ""); setIaModalOpen(true); }}
                >
                  {iaKeys["hotmartjedai"] ? "🟢 HotmartJedai" : "HotmartJedai"}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  isConnected
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    : "bg-amber-100 text-amber-700 border border-amber-200"
                }`}
              >
                <span className="hidden sm:inline">{isConnected ? "🟢 Conectado" : "🟡 Desconectado"}</span>
                <span className="sm:hidden">{isConnected ? "🟢" : "🟡"}</span>
              </div>

              {isConnected && (
                <>
                  {lastUpdate && (
                    <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
                      <Clock className="w-3 h-3" />
                      {formatLastUpdate(lastUpdate)}
                    </div>
                  )}
                  <Button
                    onClick={handleRefreshData}
                    variant="outline"
                    size="sm"
                    className="px-2.5 py-1 h-auto rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:text-blue-800 transition-all"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">Atualizar</span>
                  </Button>
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    size="sm"
                    className="px-2.5 py-1 h-auto rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 hover:text-red-800 transition-all"
                  >
                    <LogOut className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">Sair</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Responsive */}
      <main className="flex-1 overflow-hidden">
        <div className="mx-auto px-3 lg:px-6 py-2 h-full">
          {!isConnected ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-full max-w-4xl">
                <JiraConnector onConnect={handleJiraConnect} />
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col gap-2 lg:gap-4">
              {/* Metrics Cards - Responsive */}
              <div className="flex-shrink-0">
                <MetricsCards data={filteredData} />
              </div>

              {/* Main Dashboard Content - Responsive flex layout */}
              <div className="flex-1 flex gap-3 min-h-0 overflow-hidden">
                {/* Filters Panel - Collapsible sidebar */}
                <div className={`flex flex-col transition-all duration-300 ${isSidebarVisible ? 'w-full md:w-80' : 'w-0'}`}>
                  <div className={`bg-white/80 backdrop-blur-sm rounded-lg border border-zinc-200/50 shadow-sm h-full overflow-hidden transition-all duration-300 ${isSidebarVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <div className="p-3 border-b border-zinc-200/50">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-1.5">
                          <Filter className="w-3.5 h-3.5" />
                          Filtros
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsSidebarVisible(false)}
                          className="h-6 w-6 p-0 hover:bg-zinc-100"
                          title="Ocultar filtros (Ctrl/Cmd + B)"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="h-[calc(100%-3rem)] overflow-hidden">
                      <FiltersPanel
                        data={jiraData}
                        filters={filters}
                        onFiltersChange={handleFiltersChange}
                      />
                    </div>
                  </div>
                </div>

                {/* Toggle Button when sidebar is hidden */}
                {!isSidebarVisible && (
                  <div className="flex-shrink-0 mr-3">
                    <div className="relative">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsSidebarVisible(true)}
                        className="h-10 w-10 p-0 bg-white/80 backdrop-blur-sm border-zinc-200/50 hover:bg-white shadow-sm"
                        title="Mostrar filtros (Ctrl/Cmd + B)"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      {/* Indicador de filtros ativos */}
                      {(filters.project || 
                        (Array.isArray(filters.issueType) ? filters.issueType.length > 0 : filters.issueType) ||
                        filters.status || 
                        (Array.isArray(filters.assignee) ? filters.assignee.length > 0 : filters.assignee) ||
                        filters.labels || 
                        filters.dateRange.start || 
                        filters.dateRange.end) && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                  </div>
                )}

                {/* Charts Area - Optimized for remaining space */}
                <div className={`flex-1 flex-col min-h-0 ${isSidebarVisible ? 'hidden md:flex' : 'flex'}`}>
                  <Tabs
                    defaultValue="scatterplot"
                    className="flex flex-col h-full"
                  >
                    <TabsList className="flex-shrink-0 grid w-full grid-cols-6 mb-2 bg-gradient-to-r from-zinc-100 to-zinc-50 backdrop-blur-sm h-10 p-1 rounded-xl border border-zinc-200/50">
                      <TabsTrigger
                        value="scatterplot"
                        className="flex items-center gap-1 text-xs px-1 sm:px-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <BarChart3 className="w-3 h-3" />
                        <span className="hidden sm:inline">Cycle Time</span>
                        <span className="sm:hidden">Cycle</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="trends"
                        className="flex items-center gap-1 text-xs px-1 sm:px-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <TrendingUp className="w-3 h-3" />
                        <span className="hidden sm:inline">Tendências</span>
                        <span className="sm:hidden">Trend</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="performance"
                        className="flex items-center gap-1 text-xs px-1 sm:px-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 hover:bg-purple-50 hover:text-purple-700"
                      >
                        <Target className="w-3 h-3" />
                        <span className="hidden sm:inline">Performance</span>
                        <span className="sm:hidden">Perf</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="comparison"
                        className="hidden sm:flex items-center gap-1 text-xs px-1 sm:px-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 hover:bg-orange-50 hover:text-orange-700"
                      >
                        <Activity className="w-3 h-3" />
                        IA
                      </TabsTrigger>
                      <TabsTrigger
                        value="assignee-comparison"
                        className="hidden sm:flex items-center gap-1 text-xs px-1 sm:px-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 hover:bg-cyan-50 hover:text-cyan-700"
                      >
                        <Users className="w-3 h-3" />
                        Responsáveis
                      </TabsTrigger>
                      <TabsTrigger
                        value="tickets"
                        className="hidden sm:flex items-center gap-1 text-xs px-1 sm:px-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-500 data-[state=active]:to-slate-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 hover:bg-slate-50 hover:text-slate-700"
                      >
                        <List className="w-3 h-3" />
                        Tickets
                      </TabsTrigger>
                    </TabsList>

                    <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-lg border border-zinc-200/50 shadow-sm overflow-hidden">
                      <TabsContent
                        value="scatterplot"
                        className="h-full m-0 p-3 overflow-auto"
                      >
                        <CycleTimeScatterplot data={filteredData} />
                      </TabsContent>

                      <TabsContent value="trends" className="h-full m-0 p-3 overflow-auto">
                        <TrendChart data={filteredData} />
                      </TabsContent>

                      <TabsContent
                        value="performance"
                        className="h-full m-0 p-3 overflow-auto"
                      >
                        <PerformanceChart data={filteredData} />
                      </TabsContent>

                      <TabsContent
                        value="comparison"
                        className="h-full m-0 p-3 overflow-auto"
                      >
                        <LabelComparison
                          data={filteredData}
                          iaKeys={iaKeys}
                        />
                      </TabsContent>

                      <TabsContent
                        value="assignee-comparison"
                        className="h-full m-0 p-3 overflow-auto"
                      >
                        <AssigneeComparison data={filteredData} />
                      </TabsContent>

                      <TabsContent
                        value="tickets"
                        className="h-full m-0 p-3 overflow-auto"
                      >
                        <TicketList data={filteredData} projectKey={projectKey} />
                      </TabsContent>
                    </div>
                  </Tabs>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal de configuração de IA */}
      <Dialog open={iaModalOpen} onOpenChange={setIaModalOpen}>
        <DialogContent>
                      <DialogHeader>
              <DialogTitle>
                {selectedIa === "openai" && "Configurar OpenAI API Key"}
                {selectedIa === "gemini" && "Configurar Gemini API Key"}
                {selectedIa === "hotmartjedai" && "Configurar Hotmart JedAi Key"}
              </DialogTitle>
            </DialogHeader>
          <div className="space-y-4">
            <Label className="text-sm font-medium">API Key</Label>
            <Input
              type="password"
              placeholder="Digite a chave"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <Button
              onClick={() => {
                if (selectedIa) {
                  const newKeys = { ...iaKeys, [selectedIa]: apiKey };
                  setIaKeys(newKeys);
                  localStorage.setItem("iaKeys", JSON.stringify(newKeys));
                  setIaModalOpen(false);
                }
              }}
              disabled={!apiKey.trim()}
            >
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
