import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { JiraIssue, JiraComment } from '@/types/jira';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, X, MessageSquare, Clock, User, Tag, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchJiraComments } from '@/services/jiraApi';
import { useJiraCredentials } from '@/hooks/useJiraCredentials';
import { toast } from 'sonner';

interface IssueTimelineProps {
  data: JiraIssue[];
}

const IssueTimeline: React.FC<IssueTimelineProps> = ({ data }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIssue, setSelectedIssue] = useState<JiraIssue | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [comments, setComments] = useState<JiraComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const { credentials } = useJiraCredentials();

  // Filter and sort issues
  const filteredAndSortedIssues = useMemo(() => {
    return [...data]
      .filter(issue => 
        searchQuery === '' || 
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
        await loadComments(foundIssue.id);
      } else {
        setSelectedIssue(null);
        setComments([]);
      }
    } else {
      setSelectedIssue(null);
      setComments([]);
    }
  };

  // Load comments
  const loadComments = async (issueId: string) => {
    setIsLoadingComments(true);
    try {
      const fetchedComments = await fetchJiraComments(issueId, {
        email: credentials.email,
        apiToken: credentials.apiToken,
        serverUrl: credentials.serverUrl,
      });
      setComments(fetchedComments);
    } catch (error) {
      toast.error('Erro ao carregar comentários');
      console.error('Erro ao carregar comentários:', error);
    } finally {
      setIsLoadingComments(false);
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
      <div className="space-y-8">
        {Object.entries(groupedIssues).map(([month, issues]) => (
          <div key={month} className="relative">
            {/* Month header */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm py-2 mb-4">
              <h3 className="text-lg font-semibold text-gray-800 capitalize">
                {month}
              </h3>
            </div>

            {/* Timeline */}
            <div className="relative pl-8 space-y-4">
              {/* Vertical line */}
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200" />

              {issues.map((issue) => (
                <div key={issue.id} className="relative">
                  {/* Timeline dot */}
                  <div className="absolute left-[-1.5rem] w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />

                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {issue.id}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {issue.summary}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-500">
                              {format(new Date(issue.created), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                            </span>
                            {issue.storyPoints > 0 && (
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                                {issue.storyPoints} pts
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            issue.status === 'Done' ? 'bg-green-100 text-green-700' :
                            issue.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {issue.status}
                          </span>
                          <span className="text-xs text-gray-500">
                            {issue.assignee}
                          </span>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Detalhes do Ticket</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDialogOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
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
                <p className="text-gray-600">{selectedIssue.summary}</p>
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

              {/* Status History */}
              {selectedIssue.statusHistory && selectedIssue.statusHistory.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Histórico de Status
                  </h4>
                  <div className="space-y-2">
                    {selectedIssue.statusHistory.map((history, index) => (
                      <div key={index} className="text-sm text-gray-600 pl-6 border-l-2 border-gray-200">
                        <div className="font-medium">{history.status}</div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(history.date), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })} por {history.author}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Comentários
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadComments(selectedIssue.id)}
                    disabled={isLoadingComments}
                  >
                    {isLoadingComments ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Carregando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Atualizar
                      </>
                    )}
                  </Button>
                </div>

                {isLoadingComments ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : comments.length > 0 ? (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="font-medium text-sm">{comment.author.displayName}</span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {format(new Date(comment.created), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 whitespace-pre-wrap">
                          {comment.body}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    Nenhum comentário encontrado.
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IssueTimeline; 