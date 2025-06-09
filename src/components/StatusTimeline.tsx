import React, { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User, ArrowRight } from 'lucide-react';
import { JiraChangelog } from '@/types/jira';

interface StatusTimelineProps {
  changelog: JiraChangelog[];
  selectedStatus?: string;
}

const StatusTimeline: React.FC<StatusTimelineProps> = ({ changelog, selectedStatus }) => {
  const selectedStatusRef = useRef<HTMLDivElement>(null);

  // Scroll to selected status when it changes
  useEffect(() => {
    if (selectedStatus && selectedStatusRef.current) {
      selectedStatusRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [selectedStatus]);

  // Filter and sort status changes
  const statusChanges = React.useMemo(() => {
    return changelog
      .filter(change => change.items.some(item => item.field === 'status'))
      .map(change => ({
        ...change,
        statusChange: change.items.find(item => item.field === 'status')!,
      }))
      .sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());
  }, [changelog]);

  if (statusChanges.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        Nenhuma mudança de status encontrada.
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

      <div className="space-y-6">
        {statusChanges.map((change, index) => {
          const isSelected = selectedStatus === change.statusChange.toString;
          return (
            <div 
              key={change.id} 
              className="relative pl-8"
              ref={isSelected ? selectedStatusRef : null}
            >
              {/* Timeline dot */}
              <div className={`absolute left-0 w-3 h-3 rounded-full border-2 border-white ${
                isSelected ? 'bg-blue-600' : 'bg-blue-500'
              }`} />

              {/* Status change */}
              <div className={`flex items-center gap-2 p-2 rounded-lg ${
                isSelected ? 'bg-blue-50 border border-blue-200' : ''
              }`}>
                <div className={`px-2 py-1 rounded-full text-xs ${
                  change.statusChange.fromString === 'Done' ? 'bg-green-100 text-green-700' :
                  change.statusChange.fromString === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {change.statusChange.fromString}
                </div>
                <ArrowRight className={`w-4 h-4 ${isSelected ? 'text-blue-500' : 'text-gray-400'}`} />
                <div className={`px-2 py-1 rounded-full text-xs ${
                  change.statusChange.toString === 'Done' ? 'bg-green-100 text-green-700' :
                  change.statusChange.toString === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {change.statusChange.toString}
                </div>
              </div>

              {/* Change details */}
              <div className={`mt-2 text-xs ${isSelected ? 'text-blue-600' : 'text-gray-500'}`}>
                <div className="flex items-center gap-2">
                  <User className={`w-3 h-3 ${isSelected ? 'text-blue-500' : ''}`} />
                  <span>{change.author.displayName}</span>
                </div>
                <div className="mt-1">
                  {format(new Date(change.created), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StatusTimeline; 