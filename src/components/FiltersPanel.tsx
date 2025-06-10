import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Filter, Tag, ChevronDown, ChevronUp, Ticket, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { JiraIssue, Filters } from '@/types/jira';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapse';

interface FiltersPanelProps {
  data: JiraIssue[];
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  projectKey?: string;
  onRefresh?: () => void;
  showFilters: boolean;
  onToggleFilters: () => void;
}

const FiltersPanel: React.FC<FiltersPanelProps> = ({ data, filters, onFiltersChange, projectKey, onRefresh, showFilters, onToggleFilters }) => {
  const [issueTypeOpen, setIssueTypeOpen] = useState(true);
  const [labelsOpen, setLabelsOpen] = useState(true);
  const [statusOpen, setStatusOpen] = useState(true);
  const [assigneeOpen, setAssigneeOpen] = useState(true);

  // Extrair valores únicos dos dados
  const uniqueIssueTypes = [...new Set(data.map(item => item.issueType))];
  const uniqueStatuses = [...new Set(data.map(item => item.status))];
  const uniqueAssignees = [...new Set(data.map(item => item.assignee))];
  const uniqueLabels = [...new Set(data.flatMap(item => (item.labels || []).filter(label => projectKey ? label.startsWith(projectKey) : true)))].sort((a, b) => b.localeCompare(a));

  // Contadores de filtros ativos
  const activeIssueTypes = Array.isArray(filters.issueType) 
    ? filters.issueType.length 
    : filters.issueType ? 1 : 0;

  const activeLabels = Array.isArray(filters.labels)
    ? filters.labels.length
    : filters.labels ? 1 : 0;

  const activeStatus = filters.status ? 1 : 0;

  const activeAssignees = Array.isArray(filters.assignee)
    ? filters.assignee.length
    : filters.assignee ? 1 : 0;

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = {
      ...filters,
      [key]: value === 'all' ? '' : value
    };
    onFiltersChange(newFilters);
  };

  const handleIssueTypeChange = (type: string, checked: boolean) => {
    const currentTypes = Array.isArray(filters.issueType) 
      ? filters.issueType 
      : filters.issueType ? [filters.issueType] : [];
    let newTypes: string[];
    if (checked) {
      newTypes = [...currentTypes, type];
    } else {
      newTypes = currentTypes.filter(t => t !== type);
    }
    const newFilters = {
      ...filters,
      issueType: newTypes.length === 0 ? '' : newTypes
    };
    onFiltersChange(newFilters);
  };

  const handleAssigneeChange = (assignee: string, checked: boolean) => {
    const currentAssignees = Array.isArray(filters.assignee) 
      ? filters.assignee 
      : filters.assignee ? [filters.assignee] : [];
    let newAssignees: string[];
    if (checked) {
      newAssignees = [...currentAssignees, assignee];
    } else {
      newAssignees = currentAssignees.filter(a => a !== assignee);
    }
    const newFilters = {
      ...filters,
      assignee: newAssignees.length === 0 ? '' : newAssignees
    };
    onFiltersChange(newFilters);
  };

  const handleDateRangeChange = (key: string, value: string) => {
    const newFilters = {
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [key]: value
      }
    };
    onFiltersChange(newFilters);
  };

  const handleLabelChange = (label: string, checked: boolean) => {
    const currentLabels = Array.isArray(filters.labels)
      ? filters.labels
      : filters.labels ? [filters.labels] : [];
    let newLabels: string[];
    if (checked) {
      newLabels = [...currentLabels, label];
    } else {
      newLabels = currentLabels.filter(l => l !== label);
    }
    const newFilters = {
      ...filters,
      labels: newLabels.length === 0 ? '' : newLabels
    };
    onFiltersChange(newFilters);
  };

  const handleStatusChange = (status: string, checked: boolean) => {
    const currentStatuses = Array.isArray(filters.status)
      ? filters.status
      : filters.status ? [filters.status] : [];
    let newStatuses: string[];
    if (checked) {
      newStatuses = [...currentStatuses, status];
    } else {
      newStatuses = currentStatuses.filter(s => s !== status);
    }
    const newFilters = {
      ...filters,
      status: newStatuses.length === 0 ? '' : newStatuses
    };
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    onFiltersChange({
      issueType: '',
      status: '',
      assignee: '',
      labels: '',
      dateRange: { start: '', end: '' }
    });
  };

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'issueType' || key === 'assignee') {
      return Array.isArray(value) ? value.length > 0 : !!value;
    }
    return value && (typeof value === 'string' ? value : Object.values(value).some(v => v));
  }).length;

  return (
    <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm h-full flex flex-col">
      {/* Topo fixo */}

      {/* Conteúdo scrollável dos filtros */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <CardContent className="px-4 py-2 space-y-6 divide-y divide-zinc-100">
          {/* Tipo de Issue */}
          <Collapsible open={issueTypeOpen} onOpenChange={setIssueTypeOpen}>
            <div className="pt-2">
              <CollapsibleTrigger className="flex items-center justify-between w-full text-left group">
                <div className="flex items-center justify-between flex-1">
                  <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide flex items-center gap-2">
                    <Ticket className="w-4 h-4" />
                    Tipo de Issue
                  </Label>
                  <div className="flex items-center gap-2">
                    {activeIssueTypes > 0 && (
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                        {activeIssueTypes} selecionado{activeIssueTypes > 1 ? 's' : ''}
                      </Badge>
                    )}
                    {issueTypeOpen ? (
                      <ChevronUp className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 mt-2">
                <div className="max-h-[200px] overflow-y-auto pr-2">
                  {uniqueIssueTypes.map(type => {
                    const currentTypes = Array.isArray(filters.issueType) 
                      ? filters.issueType 
                      : filters.issueType ? [filters.issueType] : [];
                    const isChecked = currentTypes.includes(type);
                    return (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`issue-type-${type}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => handleIssueTypeChange(type, !!checked)}
                          className="h-4 w-4"
                        />
                        <Label 
                          htmlFor={`issue-type-${type}`} 
                          className="text-xs cursor-pointer flex-1"
                        >
                          {type}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
          {/* Labels */}
          <Collapsible open={labelsOpen} onOpenChange={setLabelsOpen}>
            <div className="pt-2">
              <CollapsibleTrigger className="flex items-center justify-between w-full text-left group">
                <div className="flex items-center justify-between flex-1">
                  <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Labels
                  </Label>
                  <div className="flex items-center gap-2">
                    {activeLabels > 0 && (
                      <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                        {activeLabels} selecionada{activeLabels > 1 ? 's' : ''}
                      </Badge>
                    )}
                    {labelsOpen ? (
                      <ChevronUp className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 mt-2">
                <div className="max-h-[200px] overflow-y-auto pr-2">
                  {uniqueLabels.map(label => {
                    const currentLabels = Array.isArray(filters.labels)
                      ? filters.labels
                      : filters.labels ? [filters.labels] : [];
                    const isChecked = currentLabels.includes(label);
                    return (
                      <div key={label} className="flex items-center space-x-2">
                        <Checkbox
                          id={`label-${label}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => handleLabelChange(label, !!checked)}
                          className="h-4 w-4"
                        />
                        <Label
                          htmlFor={`label-${label}`}
                          className="text-xs cursor-pointer flex-1"
                        >
                          {label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
          {/* Status */}
          <Collapsible open={statusOpen} onOpenChange={setStatusOpen}>
            <div className="pt-2">
              <CollapsibleTrigger className="flex items-center justify-between w-full text-left group">
                <div className="flex items-center justify-between flex-1">
                  <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Status
                  </Label>
                  <div className="flex items-center gap-2">
                    {activeStatus > 0 && (
                      <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200">
                        {filters.status}
                      </Badge>
                    )}
                    {statusOpen ? (
                      <ChevronUp className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 mt-2">
                <div className="max-h-[200px] overflow-y-auto pr-2">
                  {uniqueStatuses.map(status => {
                    const currentStatuses = Array.isArray(filters.status)
                      ? filters.status
                      : filters.status ? [filters.status] : [];
                    const isChecked = currentStatuses.includes(status);
                    return (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status-${status}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => handleStatusChange(status, !!checked)}
                          className="h-4 w-4"
                        />
                        <Label
                          htmlFor={`status-${status}`}
                          className="text-xs cursor-pointer flex-1"
                        >
                          {status}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
          {/* Responsável */}
          <Collapsible open={assigneeOpen} onOpenChange={setAssigneeOpen}>
            <div className="pt-2">
              <CollapsibleTrigger className="flex items-center justify-between w-full text-left group">
                <div className="flex items-center justify-between flex-1">
                  <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Responsável
                  </Label>
                  <div className="flex items-center gap-2">
                    {activeAssignees > 0 && (
                      <Badge variant="secondary" className="bg-cyan-50 text-cyan-700 border-cyan-200">
                        {activeAssignees} selecionado{activeAssignees > 1 ? 's' : ''}
                      </Badge>
                    )}
                    {assigneeOpen ? (
                      <ChevronUp className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 mt-2">
                <div className="max-h-[200px] overflow-y-auto pr-2">
                  {uniqueAssignees.map(assignee => {
                    const currentAssignees = Array.isArray(filters.assignee) 
                      ? filters.assignee 
                      : filters.assignee ? [filters.assignee] : [];
                    const isChecked = currentAssignees.includes(assignee);
                    return (
                      <div key={assignee} className="flex items-center space-x-2">
                        <Checkbox
                          id={`assignee-${assignee}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => handleAssigneeChange(assignee, !!checked)}
                          className="h-4 w-4"
                        />
                        <Label 
                          htmlFor={`assignee-${assignee}`} 
                          className="text-xs cursor-pointer flex-1"
                        >
                          {assignee}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </CardContent>
      </div>
      {/* Rodapé com resumo */}
      <div className="px-4 py-3 border-t bg-gray-50 rounded-b-lg">
        <p className="text-xs text-gray-600">
          <span className="font-medium">{data.length}</span> issues no total
        </p>
        <p className="text-xs text-gray-400 mt-1 hidden lg:block">
          Dados atualizados em tempo real
        </p>
      </div>
    </Card>
  );
};

export default FiltersPanel;
