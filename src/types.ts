export interface Repository {
  id: string;
  name: string;
  owner: string;
  description: string;
  language: string;
  processed_at: string;
  stats: RepoStats;
  publisher?: string;
}

export interface RepoStats {
  commits_count: number;
  issues_count: number;
  prs_count: number;
  ci_runs_count: number;
}

export interface FileChange {
  path: string;
  additions: number;
  deletions: number;
}

export interface Commit {
  hash: string;
  author_name: string;
  author_email: string;
  message: string;
  files_changed: FileChange[];
  committed_at: string;
}

export interface Issue {
  github_id: number;
  type: "issue" | "pull_request";
  title: string;
  body: string;
  state: string;
  labels: string[];
  created_at: string;
  closed_at: string | null;
}

export interface CiRun {
  run_id: number;
  workflow_name: string;
  status: string;
  conclusion: string;
  branch: string;
  created_at: string;
  logs: string;
}

export interface ImportGraph {
  source_file: string;
  target_file: string;
  import_type: "relative" | "bare" | "absolute";
}

export interface ContextUsed {
  commits: string[];
  issues: number[];
  ci_runs: number[];
  files: string[];
}

export interface LiveRepoData {
  repo: Repository;
  commits: Commit[];
  issues: Issue[];
}

export interface Answer {
  synthesis: string;
  evidence: {
    git: Commit[];
    issues: Issue[];
    ci: CiRun[];
  };
  impact: ImpactNode[];
  context_used: ContextUsed;
  /** When the answer was built from live GitHub API data, this carries the converted data so the app can populate Timeline/Snapshots/Reports */
  liveData?: LiveRepoData;
}

export interface ImpactNode {
  file: string;
  severity: "none" | "low" | "medium" | "high";
  children: ImpactNode[];
}

export interface ConversationEntry {
  id: string;
  question: string;
  answer: Answer | null;
  loading: boolean;
  error: string | null;
}