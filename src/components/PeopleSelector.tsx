import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { JiraIssue } from '@/types/jira';
import { Users, Search, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PeopleSelectorProps {
  data: JiraIssue[];
  selectedPeople: string[];
  onPeopleChange: (people: string[]) => void;
}

const PeopleSelector: React.FC<PeopleSelectorProps> = ({ 
  data, 
  selectedPeople, 
  onPeopleChange 
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Extract unique assignees from data
  const uniqueAssignees = useMemo(() => {
    const assignees = new Set<string>();
    data.forEach(issue => {
      if (issue.assignee) {
        assignees.add(issue.assignee);
      }
    });
    return Array.from(assignees).sort();
  }, [data]);

  // Filter assignees based on search query
  const filteredAssignees = useMemo(() => {
    if (!searchQuery) return uniqueAssignees;
    return uniqueAssignees.filter(assignee => 
      assignee.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [uniqueAssignees, searchQuery]);

  // Handle checkbox change
  const handleAssigneeToggle = (assignee: string) => {
    if (selectedPeople.includes(assignee)) {
      onPeopleChange(selectedPeople.filter(p => p !== assignee));
    } else {
      onPeopleChange([...selectedPeople, assignee]);
    }
  };

  // Select all assignees
  const handleSelectAll = () => {
    onPeopleChange([...uniqueAssignees]);
  };

  // Clear all selections
  const handleClearAll = () => {
    onPeopleChange([]);
  };

  return (
    <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Seleção de Pessoas
          </CardTitle>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {uniqueAssignees.length} pessoas
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar pessoas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSelectAll}
            className="whitespace-nowrap"
          >
            <Check className="w-4 h-4 mr-1" />
            Todos
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleClearAll}
            className="whitespace-nowrap"
          >
            <X className="w-4 h-4 mr-1" />
            Limpar
          </Button>
        </div>

        <div className="border rounded-lg p-2 bg-white/80">
          <div className="text-sm font-medium mb-2 text-gray-700">
            {selectedPeople.length} de {uniqueAssignees.length} selecionados
          </div>
          
          <div className="max-h-[calc(100vh-20rem)] overflow-y-auto pr-2">
            {filteredAssignees.length > 0 ? (
              filteredAssignees.map((assignee) => (
                <div key={assignee} className="flex items-center space-x-2 py-1 border-b border-gray-100 last:border-0">
                  <Checkbox
                    id={`assignee-${assignee}`}
                    checked={selectedPeople.includes(assignee)}
                    onCheckedChange={() => handleAssigneeToggle(assignee)}
                  />
                  <Label
                    htmlFor={`assignee-${assignee}`}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {assignee}
                  </Label>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                Nenhuma pessoa encontrada
              </div>
            )}
          </div>
        </div>

        {selectedPeople.length > 0 && (
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
            <div className="text-sm font-medium mb-2 text-blue-700">Pessoas selecionadas:</div>
            <div className="flex flex-wrap gap-2">
              {selectedPeople.map(person => (
                <Badge 
                  key={person} 
                  variant="secondary"
                  className="bg-blue-100 text-blue-700 border-blue-200 flex items-center gap-1"
                >
                  {person}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => handleAssigneeToggle(person)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PeopleSelector;