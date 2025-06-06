
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
}

const FiltersPanel: React.FC<FiltersPanelProps> = ({ data, filters, onFiltersChange }) => {
  // Extrair valores únicos dos dados
  const uniqueProjects = [...new Set(data.map(item => item.project))];
  const uniqueIssueTypes = [...new Set(data.map(item => item.issueType))];
  const uniqueStatuses = [...new Set(data.map(item => item.status))];
  const uniqueAssignees = [...new Set(data.map(item => item.assignee))];

  
  // Extrair labels únicos dos dados
  const uniqueLabels = [...new Set(data.flatMap(item => item.labels || []))];

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

  const clearFilters = () => {
    onFiltersChange({
      project: '',
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
    <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm sticky top-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-600" />
            Filtros
          </CardTitle>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              {activeFiltersCount} ativo{activeFiltersCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Projeto */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Projeto</Label>
          <Select value={filters.project || 'all'} onValueChange={(value) => handleFilterChange('project', value)}>
            <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-blue-500">
              <SelectValue placeholder="Selecionar projeto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os projetos</SelectItem>
              {uniqueProjects.map(project => (
                <SelectItem key={project} value={project}>{project}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tipo de Issue */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Tipo de Issue</Label>
          <div className="space-y-2 max-h-40 overflow-y-auto">
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
                  />
                  <Label 
                    htmlFor={`issue-type-${type}`} 
                    className="text-sm cursor-pointer flex-1"
                  >
                    {type}
                  </Label>
                </div>
              );
            })}
          </div>
        </div>



        {/* Labels */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Labels
          </Label>
          <Select value={filters.labels || 'all'} onValueChange={(value) => handleFilterChange('labels', value)}>
            <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-blue-500">
              <SelectValue placeholder="Selecionar label" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as labels</SelectItem>
              {uniqueLabels.map(label => (
                <SelectItem key={label} value={label}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Status</Label>
          <Select value={filters.status || 'all'} onValueChange={(value) => handleFilterChange('status', value)}>
            <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-blue-500">
              <SelectValue placeholder="Selecionar status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {uniqueStatuses.map(status => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Assignee */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Responsável</Label>
          <div className="space-y-2 max-h-40 overflow-y-auto">
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
                  />
                  <Label 
                    htmlFor={`assignee-${assignee}`} 
                    className="text-sm cursor-pointer flex-1"
                  >
                    {assignee}
                  </Label>
                </div>
              );
            })}
          </div>
        </div>

        {/* Período */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Período
          </Label>
          <div className="space-y-2">
            <Input
              type="date"
              placeholder="Data inicial"
              value={filters.dateRange?.start || ''}
              onChange={(e) => handleDateRangeChange('start', e.target.value)}
              className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
            />
            <Input
              type="date"
              placeholder="Data final"
              value={filters.dateRange?.end || ''}
              onChange={(e) => handleDateRangeChange('end', e.target.value)}
              className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Botão para limpar filtros */}
        {activeFiltersCount > 0 && (
          <Button 
            variant="outline" 
            onClick={clearFilters}
            className="w-full mt-4 hover:bg-gray-50 transition-all duration-200"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Limpar Filtros
          </Button>
        )}

        {/* Resumo dos dados filtrados */}
        <div className="mt-6 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <span className="font-medium">{data.length}</span> issues no total
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Dados atualizados em tempo real
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default FiltersPanel;
