import React, { useState, useMemo } from "react";
import { JiraIssue } from "@/types/jira";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Calendar, User, Tag, BarChart3 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface TicketListProps {
  data: JiraIssue[];
}

const TicketList: React.FC<TicketListProps> = ({ data }) => {
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Obter lista única de status
  const allStatuses = useMemo(() => {
    const statuses = Array.from(new Set(data.map(ticket => ticket.status)));
    return statuses.sort();
  }, [data]);

  // Filtrar tickets baseado nos status selecionados e termo de busca
  const filteredTickets = useMemo(() => {
    let filtered = data;

    // Filtrar por status se algum estiver selecionado
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(ticket => selectedStatuses.includes(ticket.status));
    }

    // Filtrar por termo de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(ticket => 
        ticket.summary.toLowerCase().includes(term) ||
        ticket.id.toLowerCase().includes(term) ||
        ticket.assignee.toLowerCase().includes(term) ||
        ticket.labels.some(label => label.toLowerCase().includes(term))
      );
    }

    return filtered;
  }, [data, selectedStatuses, searchTerm]);

  // Manipular seleção de status
  const handleStatusToggle = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  // Função para formatar data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Função para obter cor do status
  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'Done': 'bg-green-100 text-green-800',
      'Closed': 'bg-gray-100 text-gray-800',
      'In Progress': 'bg-blue-100 text-blue-800',
      'To Do': 'bg-yellow-100 text-yellow-800',
      'Review': 'bg-purple-100 text-purple-800',
      'Testing': 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  // Função para obter cor do tipo de issue
  const getIssueTypeColor = (issueType: string) => {
    const colors: { [key: string]: string } = {
      'Story': 'bg-emerald-100 text-emerald-800',
      'Bug': 'bg-red-100 text-red-800',
      'Task': 'bg-blue-100 text-blue-800',
      'Epic': 'bg-purple-100 text-purple-800',
    };
    return colors[issueType] || 'bg-slate-100 text-slate-800';
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 space-y-4 mb-4">
        {/* Barra de busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar por ticket, resumo, responsável ou labels..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9"
          />
        </div>

        {/* Filtros de Status */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-zinc-200/50 p-3">
          <h3 className="text-sm font-semibold text-zinc-800 mb-3 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            Filtrar por Status
          </h3>
          <div className="flex flex-wrap gap-2">
            {allStatuses.map(status => (
              <div key={status} className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${status}`}
                  checked={selectedStatuses.includes(status)}
                  onCheckedChange={() => handleStatusToggle(status)}
                />
                <label 
                  htmlFor={`status-${status}`}
                  className="text-xs cursor-pointer"
                >
                  <Badge className={getStatusColor(status)}>
                    {status}
                  </Badge>
                </label>
              </div>
            ))}
          </div>
          {selectedStatuses.length > 0 && (
            <div className="mt-2 text-xs text-gray-600">
              {selectedStatuses.length} status selecionado{selectedStatuses.length > 1 ? 's' : ''} • {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''} encontrado{filteredTickets.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Lista de Tickets */}
      <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-lg border border-zinc-200/50 overflow-hidden">
        <div className="p-3 border-b border-zinc-200/50">
          <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" />
            Tickets ({filteredTickets.length})
          </h3>
        </div>
        
        <ScrollArea className="h-full">
          <div className="p-3 space-y-2">
            {filteredTickets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum ticket encontrado</p>
                <p className="text-xs mt-1">Ajuste os filtros para ver mais resultados</p>
              </div>
            ) : (
              filteredTickets.map(ticket => (
                <div 
                  key={ticket.id}
                  className="bg-white rounded-lg border border-zinc-200/50 p-3 hover:shadow-sm transition-shadow"
                >
                  {/* Header do ticket */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-blue-600 font-medium">
                        {ticket.id}
                      </span>
                      <Badge className={getIssueTypeColor(ticket.issueType)}>
                        {ticket.issueType}
                      </Badge>
                      <Badge className={getStatusColor(ticket.status)}>
                        {ticket.status}
                      </Badge>
                    </div>
                    {ticket.storyPoints > 0 && (
                      <div className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-medium">
                        {ticket.storyPoints} pts
                      </div>
                    )}
                  </div>

                  {/* Título */}
                  <h4 className="text-sm font-medium text-zinc-800 mb-2 line-clamp-2">
                    {ticket.summary}
                  </h4>

                  {/* Informações */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {ticket.assignee || 'Não atribuído'}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(ticket.created)}
                    </div>
                  </div>

                  {/* Métricas */}
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <div className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                      Cycle: {ticket.cycleTime}d
                    </div>
                    <div className="bg-purple-50 text-purple-700 px-2 py-1 rounded">
                      Lead: {ticket.leadTime}d
                    </div>
                  </div>

                  {/* Labels */}
                  {ticket.labels && ticket.labels.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {ticket.labels.slice(0, 3).map(label => (
                        <span 
                          key={label}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded"
                        >
                          {label}
                        </span>
                      ))}
                      {ticket.labels.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{ticket.labels.length - 3} mais
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default TicketList; 