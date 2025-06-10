import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar, Filter, RotateCcw, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { JiraIssue, Filters } from '@/types/jira';

interface FiltersPanelProps {
  data: JiraIssue[];
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  projectKey?: string;
  onRefresh?: () => void;
}

const FiltersPanel: React.FC<FiltersPanelProps> = ({ data, filters, onFiltersChange, projectKey, onRefresh }) => {
  // Extrair valores únicos dos dados
  const uniqueIssueTypes = [...new Set(data.map(item => item.issueType))];
  const uniqueStatuses = [...new Set(data.map(item => item.status))];
  const uniqueAssignees = [...new Set(data.map(item => item.assignee))];
  const uniqueLabels = [...new Set(data.flatMap(item => (item.labels || []).filter(label => projectKey ? label.startsWith(projectKey) : true)))];

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
          <div className="pt-2 space-y-2">
            <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Tipo de Issue</Label>
            <div className="space-y-1 max-h-[200px] overflow-y-auto pr-2">
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
          </div>
          {/* Labels */}
          <div className="pt-2 space-y-2">
            <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Labels
            </Label>
            <div className="space-y-1 max-h-[200px] overflow-y-auto pr-2">
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
          </div>
          {/* Status */}
          <div className="pt-2 space-y-2">
            <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</Label>
            <Select value={filters.status || 'all'} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger className="h-8 text-xs transition-all duration-200 focus:ring-2 focus:ring-blue-500">
                <SelectValue placeholder="Selecionar status" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto">
                <SelectItem value="all">Todos os status</SelectItem>
                {uniqueStatuses.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Responsável */}
          <div className="pt-2 space-y-2">
            <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Responsável</Label>
            <div className="space-y-1 max-h-[200px] overflow-y-auto pr-2">
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
          </div>
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
