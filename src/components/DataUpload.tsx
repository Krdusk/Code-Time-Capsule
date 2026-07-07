import { useCallback, useRef, useState } from "react";
import { Upload, FileText, AlertTriangle, CheckCircle, X, Database, Globe, BookOpen, Loader2 } from "lucide-react";
import { parseFile, type DataCategory } from "../services/data-parser";
import type { Repository, Commit, Issue, CiRun, ImportGraph } from "../types";

interface DataUploadProps {
  onDataParsed: (result: {
    repo: Repository;
    commits?: Commit[];
    issues?: Issue[];
    ci_runs?: CiRun[];
    import_graph?: ImportGraph[];
  }) => void;
  /** "header" = small button (top-right), "landing" = big centered CTA */
  variant?: "header" | "landing";
  /** External control of modal open state (from App) */
  externalOpen?: boolean;
  onExternalClose?: () => void;
}

interface ParsedFileEntry {
  id: string;
  file: File;
  category: DataCategory;
  count: number;
  status: "parsing" | "done" | "error";
  error?: string;
  commits?: Commit[];
  issues?: Issue[];
  ci_runs?: CiRun[];
  import_graph?: ImportGraph[];
}

const CATEGORY_LABELS: Record<DataCategory, string> = {
  commits: "Commits",
  issues: "Issues",
  ci_runs: "CI Runs",
  import_graph: "Import Graph",
};

/**
 * Parse a GitHub URL like https://github.com/owner/repo or github.com/owner/repo
 */
/* ── GitHub API interfaces ──────────────────────────── */

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string };
  };
  files?: { filename: string; additions: number; deletions: number }[];
}

interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  labels: { name: string }[];
  created_at: string;
  pull_request?: unknown;
}

interface GitHubRepoInfo {
  full_name: string;
  description: string;
  language: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
}

async function fetchGitHubData(
  owner: string,
  repo: string
): Promise<{ info: GitHubRepoInfo | null; commits: GitHubCommit[]; issues: GitHubIssue[] }> {
  const headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" };

  async function fetchJson<T>(url: string): Promise<T | null> {
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }

  const [info, commits, issues] = await Promise.all([
    fetchJson<GitHubRepoInfo>(`https://api.github.com/repos/${owner}/${repo}`),
    fetchJson<GitHubCommit[]>(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`),
    fetchJson<GitHubIssue[]>(`https://api.github.com/repos/${owner}/${repo}/issues?per_page=10&state=all`),
  ]);

  return {
    info,
    commits: commits || [],
    issues: issues || [],
  };
}

function buildLiveRepoData(
  ghData: { info: GitHubRepoInfo | null; commits: GitHubCommit[]; issues: GitHubIssue[] },
  owner: string,
  repo: string
): { repo: Repository; commits: Commit[]; issues: Issue[] } {
  const repoName = ghData.info?.full_name ?? `${owner}/${repo}`;
  const [ownerName] = repoName.split("/");

  const appRepo: Repository = {
    id: `gh-${owner}-${repo}`,
    name: repo,
    owner: ownerName,
    description: ghData.info?.description ?? "",
    language: ghData.info?.language ?? "N/A",
    processed_at: new Date().toISOString(),
    stats: {
      commits_count: ghData.commits.length,
      issues_count: ghData.issues.length,
      prs_count: ghData.issues.filter((i) => i.pull_request).length,
      ci_runs_count: 0,
    },
  };

  const appCommits: Commit[] = ghData.commits.map((c) => ({
    hash: c.sha,
    author_name: c.commit.author.name,
    author_email: "",
    message: c.commit.message.split("\n")[0],
    files_changed: (c.files ?? []).map((f) => ({
      path: f.filename,
      additions: f.additions,
      deletions: f.deletions,
    })),
    committed_at: c.commit.author.date,
  }));

  const appIssues: Issue[] = ghData.issues.map((i) => ({
    github_id: i.number,
    type: i.pull_request ? "pull_request" : "issue",
    title: i.title,
    body: "",
    state: i.state,
    labels: i.labels.map((l) => l.name),
    created_at: i.created_at,
    closed_at: null,
  }));

  return { repo: appRepo, commits: appCommits, issues: appIssues };
}

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const clean = url.trim().replace(/\/$/, "").replace(/^https?:\/\//, "").replace(/^www\./, "");
  const match = clean.match(/^github\.com\/([^/]+)\/([^/#?]+)/);
  if (match) {
    return { owner: match[1], repo: match[2] };
  }
  return null;
}

export default function DataUpload({ onDataParsed, variant = "landing", externalOpen, onExternalClose }: DataUploadProps) {
  const [isOpen, setIsOpen] = useState(false);

  const open = externalOpen !== undefined ? externalOpen : isOpen;
  const closeModal = useCallback(() => {
    if (onExternalClose) onExternalClose();
    setIsOpen(false);
  }, [onExternalClose]);

  const [isDragOver, setIsDragOver] = useState(false);
  const [entries, setEntries] = useState<ParsedFileEntry[]>([]);
  const [repoName, setRepoName] = useState("");
  const [repoOwner, setRepoOwner] = useState("");
  const [publisher, setPublisher] = useState("");
  const [importing, setImporting] = useState(false);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState("");
  const [liveRepoInfo, setLiveRepoInfo] = useState<{ name: string; owner: string; description?: string; language?: string } | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleGitHubUrl = useCallback(() => {
    const parsed = parseGitHubUrl(urlInput);
    if (parsed) {
      setRepoOwner(parsed.owner);
      setRepoName(parsed.repo);
      setUrlError("");
    } else {
      setUrlError("Could not parse GitHub URL. Try: https://github.com/owner/repo");
    }
  }, [urlInput]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const newEntries: ParsedFileEntry[] = fileArray.map((f) => ({
        id: crypto.randomUUID(),
        file: f,
        category: "commits" as DataCategory,
        count: 0,
        status: "parsing" as const,
      }));

      setEntries((prev) => [...prev, ...newEntries]);

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const entryId = newEntries[i].id;

        try {
          const result = await parseFile(file);
          const items = result.data.items;
          const category = result.data.category;

          setEntries((prev) =>
            prev.map((e) =>
              e.id === entryId
                ? {
                    ...e,
                    category,
                    count: result.data.count,
                    status: "done",
                    ...(category === "commits"
                      ? { commits: items as Commit[] }
                      : category === "issues"
                        ? { issues: items as Issue[] }
                        : category === "ci_runs"
                          ? { ci_runs: items as CiRun[] }
                          : { import_graph: items as ImportGraph[] }),
                  }
                : e
            )
          );
        } catch (err) {
          setEntries((prev) =>
            prev.map((e) =>
              e.id === entryId
                ? {
                    ...e,
                    status: "error" as const,
                    error:
                      err instanceof Error
                        ? err.message
                        : "Failed to parse file",
                  }
                : e
            )
          );
        }
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleFilePick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
      }
    },
    [processFiles]
  );

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const resetAll = useCallback(() => {
    setEntries([]);
    setRepoName("");
    setRepoOwner("");
    setPublisher("");
    setUrlInput("");
    setUrlError("");
    setLiveRepoInfo(null);
  }, []);

  const handleLoadLive = useCallback(async () => {
    const owner = repoOwner.trim();
    const repo = repoName.trim();
    const publisherName = publisher.trim();
    if (!owner || !repo) return;

    setLiveLoading(true);
    setLiveError("");

    try {
      const ghData = await fetchGitHubData(owner, repo);
      if (!ghData.info && ghData.commits.length === 0 && ghData.issues.length === 0) {
        setLiveError("Could not find this repository on GitHub. Check the owner/repo spelling.");
        setLiveLoading(false);
        return;
      }

      const { repo: appRepo, commits, issues } = buildLiveRepoData(ghData, owner, repo);

      // Attach the publisher if provided
      if (publisherName) appRepo.publisher = publisherName;

      // Directly import and close the modal — no extra step needed
      onDataParsed({ repo: appRepo, commits, issues });
      closeModal();
      resetAll();
    } catch {
      setLiveError("Failed to fetch from GitHub. Try again later.");
    }

    setLiveLoading(false);
  }, [repoOwner, repoName, publisher, onDataParsed, closeModal, resetAll]);

  const handleImport = useCallback(async () => {
    const doneEntries = entries.filter((e) => e.status === "done");
    if (!repoName.trim() || !repoOwner.trim()) return;

    setImporting(true);

    const repoId = `custom-${Date.now()}`;
    const repo: Repository = {
      id: repoId,
      name: liveRepoInfo?.name ?? repoName.trim(),
      owner: liveRepoInfo?.owner ?? repoOwner.trim(),
      description: liveRepoInfo?.description ?? `Imported from ${doneEntries.length} file(s)`,
      language: liveRepoInfo?.language ?? "unknown",
      processed_at: new Date().toISOString(),
      publisher: publisher.trim() || undefined,
      stats: { commits_count: 0, issues_count: 0, prs_count: 0, ci_runs_count: 0 },
    };

    const commits: Commit[] = [];
    const issues: Issue[] = [];
    const ci_runs: CiRun[] = [];
    const import_graph: ImportGraph[] = [];

    for (const entry of doneEntries) {
      if (entry.commits) {
        commits.push(...entry.commits);
        repo.stats.commits_count += entry.commits.length;
      }
      if (entry.issues) {
        issues.push(...entry.issues);
        repo.stats.issues_count += entry.issues.length;
      }
      if (entry.ci_runs) {
        ci_runs.push(...entry.ci_runs);
        repo.stats.ci_runs_count += entry.ci_runs.length;
      }
      if (entry.import_graph) {
        import_graph.push(...entry.import_graph);
      }
    }

    try {
      onDataParsed({ repo, commits, issues, ci_runs, import_graph });
    } catch (err) {
      console.error("Import failed:", err);
    }

    setImporting(false);
    closeModal();
    setEntries([]);
    setRepoName("");
    setRepoOwner("");
  }, [entries, repoName, repoOwner, publisher, onDataParsed, closeModal]);

  const allDone = entries.length === 0 || entries.every((e) => e.status === "done");
  const canImport = repoName.trim() && repoOwner.trim() && allDone;

  return (
    <>
      {/* Trigger button - variant affects size/position. Only when NOT externally controlled */}
      {externalOpen === undefined && variant === "landing" ? (
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-3 px-6 py-3 bg-[var(--color-blue)] text-white rounded-lg text-sm font-semibold transition-all duration-150 cursor-pointer active:scale-[0.97] hover:bg-[var(--color-blue-dark)]"
            aria-label="Upload repository data"
          >
            <Upload size={18} />
            <span>Import Data</span>
          </button>
          <p className="text-xs text-[var(--color-gray-400)] font-mono">
            Upload JSON / CSV files or paste a GitHub URL to start investigating
          </p>
        </div>
      ) : externalOpen === undefined && variant === "header" ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--color-gray-500)] bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg hover:bg-[var(--color-gray-50)] hover:text-[var(--color-blue)] transition-colors duration-150 cursor-pointer font-medium"
          aria-label="Upload repository data"
        >
          <Upload size={14} />
          <span className="hidden md:inline">Import Data</span>
        </button>
      ) : null}

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeModal}
          />

          <div className="relative w-full max-w-lg bg-[var(--color-surface)] border border-[var(--color-blue-border)] rounded-xl shadow-xl animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <Database size={16} className="text-[var(--color-blue)]" />
                <span className="text-sm font-bold text-[var(--color-black)]">
                  Import Repository Data
                </span>
              </div>
              <button
                onClick={closeModal}
                className="p-1 text-[var(--color-gray-400)] hover:text-[var(--color-gray-600)] transition-colors duration-150 cursor-pointer"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* GitHub URL quick-import */}
              <div>
                <label className="block text-xs text-[var(--color-gray-500)] font-mono mb-1 flex items-center gap-1.5">
                  <Globe size={12} />
                  GitHub URL <span className="text-[var(--color-gray-400)]">(paste & auto-fill)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => { setUrlInput(e.target.value); setUrlError(""); }}
                    onKeyDown={(e) => { if (e.key === "Enter") handleGitHubUrl(); }}
                    placeholder="https://github.com/owner/repo"
                    className="flex-1 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--color-input-text)] placeholder:text-[var(--color-input-placeholder)] focus:outline-none focus:border-[var(--color-blue)] focus:shadow-[0_0_0_3px_rgba(26,94,188,0.12)] transition-all duration-150"
                  />
                  <button
                    onClick={handleGitHubUrl}
                    className="px-3 py-2 bg-[var(--color-blue)] text-white text-xs font-semibold rounded-lg hover:bg-[var(--color-blue-dark)] transition-all duration-150 cursor-pointer active:scale-[0.97]"
                    aria-label="Detect repo from URL"
                  >
                    Detect
                  </button>
                </div>
                {urlError && (
                  <p className="text-[10px] text-red-500 font-mono mt-1">{urlError}</p>
                )}
              </div>

              {/* Repo name fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--color-gray-500)] font-mono mb-1">
                    Owner
                  </label>
                  <input
                    type="text"
                    value={repoOwner}
                    onChange={(e) => setRepoOwner(e.target.value)}
                    placeholder="e.g. facebook"
                    className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--color-input-text)] placeholder:text-[var(--color-input-placeholder)] focus:outline-none focus:border-[var(--color-blue)] focus:shadow-[0_0_0_3px_rgba(26,94,188,0.12)] transition-all duration-150"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-gray-500)] font-mono mb-1">
                    Repository
                  </label>
                  <input
                    type="text"
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                    placeholder="e.g. react"
                    className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--color-input-text)] placeholder:text-[var(--color-input-placeholder)] focus:outline-none focus:border-[var(--color-blue)] focus:shadow-[0_0_0_3px_rgba(26,94,188,0.12)] transition-all duration-150"
                  />
                </div>
              </div>

              {/* ── Load Live from GitHub ── */}
              {repoOwner.trim() && repoName.trim() && (
                <div>
                  <button
                    onClick={handleLoadLive}
                    disabled={liveLoading}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer ${
                      liveLoading
                        ? "bg-[var(--color-gray-100)] text-[var(--color-gray-400)] cursor-not-allowed"
                        : "bg-green-600 text-white hover:bg-green-700 active:scale-[0.97]"
                    }`}
                    aria-label="Load live data from GitHub"
                  >
                    {liveLoading ? (
                      <><Loader2 size={14} className="animate-spin" /> Fetching from GitHub...</>
                    ) : (
                      <><Globe size={14} /> Import from GitHub</>
                    )}
                  </button>
                  {liveError && (
                    <p className="text-[10px] text-red-500 font-mono mt-1">{liveError}</p>
                  )}
                </div>
              )}

              {/* Publisher field */}
              <div>
                <label className="block text-xs text-[var(--color-gray-500)] font-mono mb-1">
                  Published by <span className="text-[var(--color-gray-400)]">(optional)</span>
                </label>
                <input
                  type="text"
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                  placeholder="Your name or alias"
                  className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--color-input-text)] placeholder:text-[var(--color-input-placeholder)] focus:outline-none focus:border-[var(--color-blue)] focus:shadow-[0_0_0_3px_rgba(26,94,188,0.12)] transition-all duration-150"
                />
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[var(--color-border)]" />
                <span className="text-[10px] text-[var(--color-gray-400)] font-mono">OR upload files</span>
                <div className="flex-1 h-px bg-[var(--color-border)]" />
              </div>

              {/* Drop zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-150 cursor-pointer ${
                  isDragOver
                    ? "border-[var(--color-blue)] bg-[var(--color-blue-light)]"
                    : "border-[var(--color-input-border)] hover:border-[var(--color-blue)]/50"
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".json,.csv"
                  multiple
                  onChange={handleFilePick}
                  className="hidden"
                />
                <Upload
                  size={28}
                  className={`mx-auto mb-2 ${
                    isDragOver ? "text-[var(--color-blue)]" : "text-[var(--color-gray-300)]"
                  }`}
                />
                <p className="text-xs text-[var(--color-gray-500)] font-mono">
                  {isDragOver
                    ? "Drop files here"
                    : "Drag & drop JSON or CSV files here, or click to browse"}
                </p>
                <p className="text-[10px] text-[var(--color-gray-400)] font-mono mt-1">
                  Supports commits, issues, CI runs, and import graphs
                </p>
                <p className="text-[10px] text-[var(--color-amber)] font-mono mt-2 flex items-center gap-1">
                  <span>💡</span>
                  <span>To see Timeline, Snapshots & Reports, use the <strong>Import from GitHub</strong> button above.</span>
                </p>
              </div>

              {/* Upload entries */}
              {entries.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--color-gray-400)] font-mono">
                      {entries.length} file(s) uploaded
                    </span>
                    <button
                      onClick={resetAll}
                      className="text-[10px] text-red-500 hover:text-red-600 transition-colors duration-150 cursor-pointer font-mono"
                    >
                      Clear all
                    </button>
                  </div>

                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between bg-[var(--color-gray-50)] border border-[var(--color-input-border)] rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={14} className="text-[var(--color-gray-400)] shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-mono text-[var(--color-gray-700)] truncate">
                            {entry.file.name}
                          </p>
                          <p className="text-[10px] text-[var(--color-gray-400)] font-mono">
                            {CATEGORY_LABELS[entry.category]}
                            {entry.count > 0 && ` · ${entry.count} items`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {entry.status === "parsing" && (
                          <span className="text-[10px] text-[var(--color-blue)] animate-pulse font-mono">
                            Parsing...
                          </span>
                        )}
                        {entry.status === "done" && (
                          <CheckCircle size={14} className="text-green-600" />
                        )}
                        {entry.status === "error" && (
                          <span title={entry.error}>
                            <AlertTriangle size={14} className="text-red-500" />
                          </span>
                        )}
                        <button
                          onClick={() => removeEntry(entry.id)}
                          className="p-0.5 text-[var(--color-gray-300)] hover:text-red-500 transition-colors duration-150 cursor-pointer"
                          aria-label="Remove"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tip when no files */}
              {entries.length === 0 && (
                <div className="bg-[var(--color-blue-light)] border border-[var(--color-blue-border)] rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <BookOpen size={14} className="text-[var(--color-blue)] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-[var(--color-gray-700)]">
                        Ready to explore
                      </p>
                      <p className="text-[10px] text-[var(--color-gray-500)] font-mono mt-0.5 leading-relaxed">
                        Paste a GitHub URL above, type owner/repo, then click <strong>Import from GitHub</strong> — it'll auto-populate <strong>Timeline</strong>, <strong>Snapshots</strong>, and <strong>Reports</strong> instantly. No question needed.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[var(--color-border)]">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-xs font-medium text-[var(--color-gray-500)] hover:text-[var(--color-gray-700)] transition-colors duration-150 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!canImport || importing}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer ${
                  canImport && !importing
                    ? "bg-[var(--color-blue)] text-white hover:bg-[var(--color-blue-dark)] active:scale-[0.97]"
                    : "bg-[var(--color-gray-100)] text-[var(--color-gray-400)] cursor-not-allowed"
                }`}
              >
                {importing ? "Importing..." : "Import & Ask Questions"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}