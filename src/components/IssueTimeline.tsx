import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { JiraIssue, JiraChangelog } from '@/types/jira';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, X, Clock, User, Tag, AlertCircle, Loader2, RefreshCw, History, ArrowRight, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchJiraChangelog } from '@/services/jiraApi';
import { useJiraCredentials } from '@/hooks/useJiraCredentials';
import { toast } from 'sonner';
import StatusTimeline from './StatusTimeline';
import { calculateCycleTime } from '@/utils/cycleTime';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';

interface IssueTimelineProps {
  data: JiraIssue[];
}

const IssueTimeline: React.FC<IssueTimelineProps> = ({ data }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIssue, setSelectedIssue] = useState<JiraIssue | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [changelog, setChangelog] = useState<JiraChangelog[]>([]);
  const [isLoadingChangelog, setIsLoadingChangelog] = useState(false);
  const [cycleTimeStartStatus, setCycleTimeStartStatus] = useState('Developing');
  const { credentials } = useJiraCredentials();

  // Get unique statuses from changelog
  const statusOptions = React.useMemo(() => {
    const statuses = new Set<string>();
    changelog.forEach(change => {
      change.items.forEach(item => {
        if (item.field === 'status') {
          if (item.fromString) statuses.add(item.fromString);
          if (item.toString) statuses.add(item.toString);
        }
      });
    });
    return Array.from(statuses).sort();
  }, [changelog]);

  // Update cycleTimeStartStatus when changelog changes
  React.useEffect(() => {
    if (statusOptions.length > 0) {
      // Try to set 'Developing' if available, otherwise use the first status
      const defaultStatus = statusOptions.includes('Developing') 
        ? 'Developing' 
        : statusOptions[0];
      setCycleTimeStartStatus(defaultStatus);
    }
  }, [statusOptions]);

  // Filter and sort issues
  const filteredAndSortedIssues = useMemo(() => {
    return [...data]
      .filter(issue => 
        searchQuery === 'SCH-5086' || 
        issue.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());
  }, [data, searchQuery]);

  // Group issues by month
  const groupedIssues = useMemo(() => {
    return filteredAndSortedIssues.reduce((groups, issue) => {
      const month = format(new Date(issue.created), 'MMMM yyyy', { locale: ptBR });
      if (!groups[month]) {
        groups[month] = [];
      }
      groups[month].push(issue);
      return groups;
    }, {} as Record<string, JiraIssue[]>);
  }, [filteredAndSortedIssues]);

  // Load changelog
  const loadChangelog = async (issueId: string) => {
    setIsLoadingChangelog(true);
    try {
      const fetchedChangelog = await fetchJiraChangelog(issueId, {
        email: credentials.email,
        apiToken: credentials.apiToken,
        serverUrl: credentials.serverUrl,
      });
      setChangelog(fetchedChangelog);
    } catch (error) {
      toast.error('Erro ao carregar histórico');
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setIsLoadingChangelog(false);
    }
  };

  // Handle search
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query) {
      const foundIssue = data.find(issue => 
        issue.id.toLowerCase() === query.toLowerCase()
      );
      if (foundIssue) {
        setSelectedIssue(foundIssue);
        setIsDialogOpen(true);
        await loadChangelog(foundIssue.id);
      } else {
        setSelectedIssue(null);
        setChangelog([]);
      }
    } else {
      setSelectedIssue(null);
      setChangelog([]);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Done':
        return 'bg-green-100 text-green-700';
      case 'In Progress':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Buscar por ID do ticket..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9 bg-white/80 backdrop-blur-sm border-zinc-200/50"
        />
      </div>

      {/* Timeline content */}
      <div className="space-y-8 max-h-[calc(100vh-12rem)] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {Object.entries(groupedIssues).map(([month, issues]) => (
          <div key={month} className="relative">
            {/* Month header */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm py-2 mb-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 capitalize">
                {month}
              </h3>
            </div>

            {/* Timeline */}
            <div className="relative pl-8 space-y-6">
              {/* Vertical line */}
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500/50 to-blue-500/10" />

              {issues.map((issue) => (
                <div key={issue.id} className="relative group">
                  {/* Timeline dot */}
                  <div className="absolute left-[-1.5rem] w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-sm group-hover:scale-110 group-hover:bg-blue-600 transition-all duration-200" />

                  <Card className="hover:shadow-md transition-all duration-200 hover:translate-x-1">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <button 
                            onClick={async () => {
                              setSelectedIssue(issue);
                              setIsDialogOpen(true);
                              await loadChangelog(issue.id);
                            }}
                            className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                          >
                            {issue.id}
                          </button>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2 group-hover:line-clamp-none transition-all duration-200">
                            {issue.summary}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {format(new Date(issue.created), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                            </span>
                            {issue.storyPoints > 0 && (
                              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                {issue.storyPoints} pts
                              </Badge>
                            )}
                            {issue.labels && issue.labels.length > 0 && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                {issue.labels[0]}
                                {issue.labels.length > 1 && ` +${issue.labels.length - 1}`}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant="outline" className={`text-xs ${getStatusColor(issue.status)}`}>
                            {issue.status}
                          </Badge>
                          {issue.assignee && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              {issue.assignee}
                            </span>
                          )}
                          {issue.cycleTime && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Timer className="w-3.5 h-3.5" />
                              {issue.cycleTime} dias
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* No results message */}
        {Object.keys(groupedIssues).length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {searchQuery ? 'Nenhum ticket encontrado com esse ID.' : 'Nenhum ticket disponível.'}
          </div>
        )}
      </div>

      {/* Detailed Ticket Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl w-[90vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Detalhes do Ticket</span>
              
            </DialogTitle>
          </DialogHeader>

          {selectedIssue && (
            <div className="space-y-6">
              {/* Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{selectedIssue.id}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    selectedIssue.status === 'Done' ? 'bg-green-100 text-green-700' :
                    selectedIssue.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedIssue.status}
                  </span>
                </div>
                <p className="text-gray-600 break-words">{selectedIssue.summary}</p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-4 h-4" />
                    <span>Responsável: {selectedIssue.assignee}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>Criado em: {format(new Date(selectedIssue.created), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}</span>
                  </div>
                  {selectedIssue.resolved && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>Resolvido em: {format(new Date(selectedIssue.resolved), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {selectedIssue.storyPoints > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <AlertCircle className="w-4 h-4" />
                      <span>Story Points: {selectedIssue.storyPoints}</span>
                    </div>
                  )}
                  {selectedIssue.labels.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Tag className="w-4 h-4" />
                      <span>Labels: {selectedIssue.labels.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Ticket Details */}
              <div className="space-y-4">


                {/* Cycle Time */}
                {changelog.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Timer className="w-4 h-4" />
                      <span>Cycle Time:</span>
                      <Select
                        value={cycleTimeStartStatus}
                        onValueChange={setCycleTimeStartStatus}
                      >
                        <SelectTrigger className="w-[180px] h-8">
                          <SelectValue placeholder="Selecione o status inicial" />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map(status => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      {(() => {
                        const cycleTime = calculateCycleTime(changelog, cycleTimeStartStatus);
                        if (!cycleTime) {
                          return <span className="text-gray-500">Não disponível</span>;
                        }
                        return (
                          <span className="font-medium">
                            {cycleTime.days > 0 ? `${cycleTime.days}d ` : ''}
                            {cycleTime.hours}h
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* Ticket History */}
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <h3 className="text-sm font-medium text-gray-700">Histórico do Ticket</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
                    onClick={() => loadChangelog(selectedIssue.id)}
                    disabled={isLoadingChangelog}
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingChangelog ? 'animate-spin' : ''}`} />
                  </Button>
                </div>

                <div className="max-h-[400px] overflow-y-auto">
                  {isLoadingChangelog ? (
                    <div className="text-center py-4 text-gray-500">
                      Carregando histórico...
                    </div>
                  ) : changelog.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      Nenhum histórico encontrado.
                    </div>
                  ) : (
                    <StatusTimeline 
                      changelog={changelog} 
                      selectedStatus={cycleTimeStartStatus}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IssueTimeline; 