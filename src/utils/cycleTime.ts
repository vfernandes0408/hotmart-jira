import { JiraChangelog } from '@/types/jira';

export const calculateCycleTime = (
  changelog: JiraChangelog[],
  startStatus: string = 'Developing'
): { days: number; hours: number } | null => {
  // Sort changelog by date
  const sortedChanges = [...changelog].sort((a, b) => 
    new Date(a.created).getTime() - new Date(b.created).getTime()
  );

  // Find when the ticket entered the start status
  const startChange = sortedChanges.find(change => 
    change.items.some(item => 
      item.field === 'status' && 
      item.toString === startStatus
    )
  );

  // Find when the ticket entered "Done" status
  const doneChange = sortedChanges.find(change => 
    change.items.some(item => 
      item.field === 'status' && 
      item.toString === 'Done'
    )
  );

  if (!startChange || !doneChange) {
    return null;
  }

  const startDate = new Date(startChange.created);
  const endDate = new Date(doneChange.created);

  // Calculate time difference in milliseconds
  const diffTime = endDate.getTime() - startDate.getTime();
  
  // Convert to days and hours
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  return { days, hours };
};
