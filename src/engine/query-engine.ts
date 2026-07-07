import type {
  Repository,
  Commit,
  Issue,
  CiRun,
  ImportGraph,
  ImpactNode,
  ContextUsed,
} from "../types";
import { sampleRepositories } from "../data/repositories";

/* ── localStorage helpers ───────────────────────────── */

const STORAGE_KEY_PREFIX = "codetimecapsule_data_";
const STORAGE_REPOS_KEY = "codetimecapsule_repositories";

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(data));
  } catch (e) {
    console.warn("Failed to save to localStorage:", e);
  }
}

function loadFromStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    if (raw) return JSON.parse(raw) as T;
  } catch (e) {
    console.warn("Failed to load from localStorage:", e);
  }
  return null;
}

/* ── Data registries (mutable — supports uploads) ──── */

const commitMap: Record<string, Commit[]> = {};

const issueMap: Record<string, Issue[]> = {};

const ciRunMap: Record<string, CiRun[]> = {};

const importGraphMap: Record<string, ImportGraph[]> = {};

/** Custom repos created from uploaded data */
export const customRepositories: Repository[] = [];

/* ── Persistence init — load saved custom repos ─────── */

function initPersistence(): void {
  const saved = loadFromStorage<Repository[]>(STORAGE_REPOS_KEY);
  if (saved && Array.isArray(saved)) {
    for (const repo of saved) {
      // Only add if not already present
      const exists = sampleRepositories.find((r) => r.id === repo.id);
      if (!exists) {
        sampleRepositories.push(repo);
        customRepositories.push(repo);

        // Load associated data
        const commits = loadFromStorage<Commit[]>(`commits_${repo.id}`);
        const issues = loadFromStorage<Issue[]>(`issues_${repo.id}`);
        const ci_runs = loadFromStorage<CiRun[]>(`ci_runs_${repo.id}`);
        const import_graph = loadFromStorage<ImportGraph[]>(`import_graph_${repo.id}`);

        if (commits) commitMap[repo.id] = commits;
        if (issues) issueMap[repo.id] = issues;
        if (ci_runs) ciRunMap[repo.id] = ci_runs;
        if (import_graph) importGraphMap[repo.id] = import_graph;
      }
    }
  }
}

// Run on module load
initPersistence();

/* ── Register uploaded data ──────────────────────────── */

export interface RegisterDataPayload {
  repo: Repository;
  commits?: Commit[];
  issues?: Issue[];
  ci_runs?: CiRun[];
  import_graph?: ImportGraph[];
}

export function registerCustomData(payload: RegisterDataPayload): void {
  const { repo, commits, issues, ci_runs, import_graph } = payload;

  // Add repo
  const existing = customRepositories.find((r) => r.id === repo.id);
  if (!existing) {
    customRepositories.push(repo);
    sampleRepositories.push(repo);
  }

  // Register data
  if (commits) {
    commitMap[repo.id] = [...(commitMap[repo.id] ?? []), ...commits];
    saveToStorage(`commits_${repo.id}`, commitMap[repo.id]);
  }
  if (issues) {
    issueMap[repo.id] = [...(issueMap[repo.id] ?? []), ...issues];
    saveToStorage(`issues_${repo.id}`, issueMap[repo.id]);
  }
  if (ci_runs) {
    ciRunMap[repo.id] = [...(ciRunMap[repo.id] ?? []), ...ci_runs];
    saveToStorage(`ci_runs_${repo.id}`, ciRunMap[repo.id]);
  }
  if (import_graph) {
    importGraphMap[repo.id] = [
      ...(importGraphMap[repo.id] ?? []),
      ...import_graph,
    ];
    saveToStorage(`import_graph_${repo.id}`, importGraphMap[repo.id]);
  }

  // Save repo list
  saveToStorage(STORAGE_REPOS_KEY, customRepositories);
}

/* ── Repository helpers ─────────────────────────────── */

export function removeRepository(id: string): void {
  const idx = customRepositories.findIndex((r) => r.id === id);
  if (idx !== -1) {
    customRepositories.splice(idx, 1);
  }
  const sampleIdx = sampleRepositories.findIndex((r) => r.id === id);
  if (sampleIdx !== -1) {
    sampleRepositories.splice(sampleIdx, 1);
  }

  // Clear associated data from maps
  delete commitMap[id];
  delete issueMap[id];
  delete ciRunMap[id];
  delete importGraphMap[id];

  // Clean up localStorage
  try {
    localStorage.removeItem(STORAGE_KEY_PREFIX + `commits_${id}`);
    localStorage.removeItem(STORAGE_KEY_PREFIX + `issues_${id}`);
    localStorage.removeItem(STORAGE_KEY_PREFIX + `ci_runs_${id}`);
    localStorage.removeItem(STORAGE_KEY_PREFIX + `import_graph_${id}`);
    localStorage.setItem(STORAGE_KEY_PREFIX + STORAGE_REPOS_KEY, JSON.stringify(customRepositories));
  } catch (e) {
    console.warn("Failed to clean up localStorage:", e);
  }
}

export function getRepositories(): Repository[] {
  return sampleRepositories;
}

export function getRepository(id: string): Repository | undefined {

  return sampleRepositories.find((r) => r.id === id);
}

/** Retrieve stored commits for a repo by ID */
export function getRepoCommits(repoId: string): Commit[] {
  return commitMap[repoId] ?? [];
}

/** Retrieve stored issues for a repo by ID */
export function getRepoIssues(repoId: string): Issue[] {
  return issueMap[repoId] ?? [];
}

/** Retrieve stored CI runs for a repo by ID */
export function getRepoCiRuns(repoId: string): CiRun[] {
  return ciRunMap[repoId] ?? [];
}

/* ── Simple tokenizer & keyword extraction ──────────── */

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_\-./\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

function extractFilePaths(text: string): string[] {
  const paths: string[] = [];
  // Match paths like src/index.js, src/plugin/foo.js
  const regex = /(?:src\/[\w./-]+\.\w+)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    paths.push(match[0]);
  }
  return paths;
}

function extractFunctionNames(text: string): string[] {
  const funcs: string[] = [];
  // Match quoted function/method names
  const regex = /`([a-zA-Z_]\w*)`/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    funcs.push(match[1]);
  }
  return funcs;
}

/* ── Git Historian ──────────────────────────────────── */

function searchCommits(
  repoId: string,
  keywords: string[],
  filePaths: string[],
  limit = 5
): Commit[] {
  const commits = commitMap[repoId] ?? [];
  const scored: { commit: Commit; score: number }[] = [];

  for (const commit of commits) {
    let score = 0;
    const message = commit.message.toLowerCase();

    // Match keywords in commit message
    for (const kw of keywords) {
      if (message.includes(kw)) score += 2;
    }

    // Match file paths
    for (const fp of filePaths) {
      if (commit.files_changed.some((f) => f.path.includes(fp))) {
        score += 5;
      }
    }

    // Author match
    for (const kw of keywords) {
      if (commit.author_name.toLowerCase().includes(kw)) score += 3;
    }

    if (score > 0) scored.push({ commit, score });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.commit);
}

/* ── Issue Detective ────────────────────────────────── */

function searchIssues(
  repoId: string,
  keywords: string[],
  filePaths: string[],
  limit = 5
): Issue[] {
  const issues = issueMap[repoId] ?? [];
  const scored: { issue: Issue; score: number }[] = [];

  for (const issue of issues) {
    let score = 0;
    const title = issue.title.toLowerCase();
    const body = (issue.body ?? "").toLowerCase();

    for (const kw of keywords) {
      if (title.includes(kw)) score += 4;
      else if (body.includes(kw)) score += 2;
    }

    for (const fp of filePaths) {
      if (title.includes(fp) || body.includes(fp)) score += 3;
    }

    if (score > 0) scored.push({ issue, score });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.issue);
}

/* ── CI Watcher ─────────────────────────────────────── */

function searchCiRuns(
  repoId: string,
  keywords: string[],
  limit = 3
): CiRun[] {
  const runs = ciRunMap[repoId] ?? [];
  const scored: { run: CiRun; score: number }[] = [];

  for (const run of runs) {
    let score = 0;
    const combined = (
      run.workflow_name +
      " " +
      run.logs +
      " " +
      run.branch
    ).toLowerCase();

    for (const kw of keywords) {
      if (combined.includes(kw)) score += 1;
    }

    // Recent runs get a small boost
    const age = Date.now() - new Date(run.created_at).getTime();
    const daysAgo = age / (1000 * 60 * 60 * 24);
    score += Math.max(0, 5 - daysAgo) * 0.5;

    if (score > 0) scored.push({ run, score });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.run);
}

/* ── Graph Navigator ────────────────────────────────── */

function findImpact(
  repoId: string,
  targetFile: string
): ImpactNode[] {
  const edges = importGraphMap[repoId] ?? [];

  function buildTree(
    file: string,
    visited: Set<string>
  ): ImpactNode {
    const normalizedTarget = file.replace(/^\.\//, "");
    visited.add(normalizedTarget);

    const directDependents = edges.filter(
      (e) => e.target_file === normalizedTarget
    );

    const children: ImpactNode[] = [];
    for (const dep of directDependents) {
      if (!visited.has(dep.source_file)) {
        children.push(buildTree(dep.source_file, visited));
      }
    }

    // Determine severity based on depth and number of dependents
    let severity: ImpactNode["severity"] = "none";
    if (children.length > 5) severity = "high";
    else if (children.length > 2) severity = "medium";
    else if (children.length > 0) severity = "low";

    return {
      file: normalizedTarget,
      severity,
      children,
    };
  }

  const tree = buildTree(targetFile, new Set());
  // The root node itself isn't an impact — return its children
  return tree.children;
}

/* ── Main query orchestrator ────────────────────────── */

export interface QueryResult {
  commits: Commit[];
  issues: Issue[];
  ci_runs: CiRun[];
  impact: ImpactNode[];
  context_used: ContextUsed;
}

export function queryRepo(repoId: string, question: string): QueryResult {
  const keywords = tokenize(question);
  const filePaths = extractFilePaths(question);
  const funcNames = extractFunctionNames(question);
  const allKeywords = [...keywords, ...funcNames];

  const commits = searchCommits(repoId, allKeywords, filePaths);
  const issues = searchIssues(repoId, allKeywords, filePaths);
  const ci_runs = searchCiRuns(repoId, allKeywords);

  // Impact analysis — only if a file path is mentioned
  let impact: ImpactNode[] = [];
  if (filePaths.length > 0) {
    impact = findImpact(repoId, filePaths[0]);
  }

  // Broad / overview question fallback — if keyword search returned nothing
  // but data exists in the repo, return recent data so the AI can answer
  if (commits.length === 0 && issues.length === 0 && ci_runs.length === 0) {
    const allCommits = commitMap[repoId] ?? [];
    const allIssues = issueMap[repoId] ?? [];
    const allCiRuns = ciRunMap[repoId] ?? [];

    // Only fall back if there IS data that the keyword search missed
    if (allCommits.length > 0 || allIssues.length > 0 || allCiRuns.length > 0) {
      return {
        commits: allCommits.slice(-8).reverse(),  // last 8, most recent first
        issues: allIssues.slice(-5).reverse(),
        ci_runs: allCiRuns.slice(-5).reverse(),
        impact,
        context_used: {
          commits: [],
          issues: [],
          ci_runs: [],
          files: filePaths,
        },
      };
    }
  }

  return {
    commits,
    issues,
    ci_runs,
    impact,
    context_used: {
      commits: commits.map((c) => c.hash),
      issues: issues.map((i) => i.github_id),
      ci_runs: ci_runs.map((c) => c.run_id),
      files: filePaths,
    },
  };
}

/* ── Build context prompt for Fireworks AI ──────────── */

export function buildContextPrompt(result: QueryResult): string {
  const sections: string[] = [];

  if (result.commits.length > 0) {
    sections.push(
      "## Git History (relevant commits):\n" +
        result.commits
          .map(
            (c) =>
              `- [${c.hash.slice(0, 7)}] ${c.message} (by ${c.author_name}, ${new Date(c.committed_at).toLocaleDateString()})`
          )
          .join("\n")
    );
  }

  if (result.issues.length > 0) {
    sections.push(
      "## Related Issues & PRs:\n" +
        result.issues
          .map(
            (i) =>
              `- [#${i.github_id}] ${i.title} (${i.state}, type: ${i.type})`
          )
          .join("\n")
    );
  }

  if (result.ci_runs.length > 0) {
    sections.push(
      "## Recent CI Runs:\n" +
        result.ci_runs
          .map(
            (c) =>
              `- [${c.workflow_name}] status=${c.status}, conclusion=${c.conclusion}`
          )
          .join("\n")
    );
  }

  if (result.impact.length > 0) {
    sections.push(
      "## Impact Analysis (files affected by change):\n" +
        flattenImpactTree(result.impact, 0)
          .map((f) => `- ${f}`)
          .join("\n")
    );
  }

  return sections.join("\n\n");
}

function flattenImpactTree(nodes: ImpactNode[], depth: number): string[] {
  const lines: string[] = [];
  for (const node of nodes) {
    lines.push(`${"  ".repeat(depth)}${node.file} (${node.severity} impact)`);
    lines.push(...flattenImpactTree(node.children, depth + 1));
  }
  return lines;
}