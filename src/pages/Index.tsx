import Dashboard from '@/components/Dashboard';
import { JiraIssue } from '@/types/jira';

const initialData: JiraIssue[] = [];

interface IndexProps {
  iaKeys: { [key: string]: string };
  onIaClick: (ia: string) => void;
  onGithubClick: () => void;
}

const Index = ({ iaKeys, onIaClick, onGithubClick }: IndexProps) => {
  return (
    <Dashboard 
      initialData={initialData} 
      iaKeys={iaKeys} 
      onIaClick={onIaClick}
      onGithubClick={onGithubClick}
    />
  );
};

export default Index;
