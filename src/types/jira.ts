export interface JiraStatusHistory {
  status: string;
  date: string;
  from: string;
  author: string;
}

export interface JiraComment {
  id: string;
  author: {
    displayName: string;
    emailAddress: string;
  };
  body: string;
  created: string;
  updated: string;
}

export interface JiraIssue {
  id: string;
  summary: string;
  issueType: string;
  status: string;
  labels: string[];
  cycleTime: number;
  leadTime: number;
  storyPoints: number;
  created: string;
  resolved: string | null;
  assignee: string;
  project: string;
  statusHistory: JiraStatusHistory[];
  comments: JiraComment[];
}

export interface Filters {
  project: string;
  issueType: string | string[];
  status: string;
  assignee: string | string[];
  labels: string | string[];
  dateRange: {
    start: string;
    end: string;
  };
}

export interface JiraApiIssue {
  key: string;
  fields: {
    summary?: string;
    issuetype?: { name: string };
    status?: { name: string };
    assignee?: { displayName: string };
    created: string;
    resolutiondate?: string;
    labels?: string[];
    components?: { name: string }[];
    project?: { key: string };
    customfield_10016?: number;
    customfield_10004?: number;
    customfield_10002?: number;
    customfield_10020?: number;
    customfield_10011?: number;
    customfield_10028?: number;
    customfield_10024?: number;
    storypoints?: number;
    story_points?: number;
    comment?: {
      comments: Array<{
        id: string;
        author: { displayName: string; emailAddress: string };
        body: string;
        created: string;
        updated: string;
      }>;
    };
  };
  changelog?: {
    histories: Array<{
      id: string;
      author: { displayName: string; emailAddress: string };
      created: string;
      items: Array<{
        field: string;
        fieldtype: string;
        from: string | null;
        fromString: string | null;
        to: string | null;
        toString: string | null;
      }>;
    }>;
  };
}

export interface JiraChangelog {
  id: string;
  author: {
    displayName: string;
    emailAddress: string;
  };
  created: string;
  items: {
    field: string;
    fieldtype: string;
    from: string | null;
    fromString: string | null;
    to: string | null;
    toString: string | null;
  }[];
} 