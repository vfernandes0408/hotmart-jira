import Dashboard from '@/components/Dashboard';
import { JiraIssue } from '@/types/jira';

const initialData: JiraIssue[] = [];

const Index = () => {
  return <Dashboard initialData={initialData} />;
};

export default Index;
