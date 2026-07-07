import { useState, useCallback, useRef, type ReactNode } from "react";
import Sidebar from "./components/Sidebar";
import Timeline from "./components/Timeline";
import SnapshotView from "./components/SnapshotView";
import SettingsPanel from "./components/SettingsPanel";
import DataUpload from "./components/DataUpload";
import {
  ProcessingState,
  ErrorState,
} from "./components/StateComponents";
import { getRepository, registerCustomData, getRepositories, removeRepository, getRepoCommits, getRepoIssues, getRepoCiRuns } from "./engine/query-engine";
import { generateAnswer } from "./services/ai-service";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import type { Repository, ConversationEntry, Commit, Issue, CiRun } from "./types";
import type { NavView } from "./components/Sidebar";
import {
  History,
  GitCommit,
  User,
  ArrowLeft,
  FileCode,
  Camera,
  MessageSquare,
  FileText,
  Upload,
  Monitor,
  Moon,
  ChevronDown,
  ChevronRight,
  GitBranch,
  CircleDot,
  Activity,
} from "lucide-react";

/* ── Simple markdown renderer ────────────────────────── */

function renderMarkdown(text: string): ReactNode {
  const lines = text.split("\n");
  const elements: ReactNode[] = [];
  let inList = false;
  let listItems: ReactNode[] = [];
  let listIndex = 0;

  function flushList() {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="space-y-1 my-2">
          {listItems}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Bold: **text**
    const processInline = (s: string): ReactNode => {
      const parts: ReactNode[] = [];
      let remaining = s;
      let key = 0;
      while (remaining.length > 0) {
        // Bold **...**
        const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
        if (boldMatch) {
          parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
          remaining = remaining.slice(boldMatch[0].length);
          continue;
        }
        // Inline code `...`
        const codeMatch = remaining.match(/^`(.+?)`/);
        if (codeMatch) {
          parts.push(
            <code key={key++} className="bg-[var(--color-gray-100)] px-1 py-0.5 rounded text-xs font-mono text-[var(--color-blue)]">
              {codeMatch[1]}
            </code>
          );
          remaining = remaining.slice(codeMatch[0].length);
          continue;
        }
        // Italic _..._
        const italicMatch = remaining.match(/^_(.+?)_/);
        if (italicMatch) {
          parts.push(<em key={key++}>{italicMatch[1]}</em>);
          remaining = remaining.slice(italicMatch[0].length);
          continue;
        }
        parts.push(remaining[0]);
        remaining = remaining.slice(1);
      }
      return parts.length === 1 ? parts[0] : <>{parts}</>;
    };

    if (line.trim() === "") {
      flushList();
      continue;
    }

    // List items
    const listMatch = line.match(/^(\s*)[-*]\s+(.+)/);
    if (listMatch) {
      inList = true;
      listItems.push(
        <li key={`li-${listIndex++}`} className="text-sm leading-relaxed">
          {processInline(listMatch[2])}
        </li>
      );
      continue;
    }

    flushList();

    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="text-sm leading-relaxed mb-1 last:mb-0">
        {processInline(line)}
      </p>
    );
  }
  flushList();

  return <>{elements}</>;
}

/* ── Snapshot list item preview ─────────────────────── */

function SnapshotList({
  commits,
  onSelectCommit,
}: {
  commits: Commit[];
  onSelectCommit: (commit: Commit) => void;
}) {
  const sorted = [...commits].sort(
    (a, b) => new Date(b.committed_at).getTime() - new Date(a.committed_at).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-14 h-14 bg-[var(--color-blue-light)] border border-[var(--color-blue-border)] rounded-xl flex items-center justify-center mx-auto mb-4">
          <Camera size={24} className="text-[var(--color-blue)]" />
        </div>
        <h3 className="text-sm font-bold text-[var(--color-black)] uppercase tracking-wider mb-2">
          No snapshots
        </h3>
        <p className="text-xs text-[var(--color-gray-500)] font-mono">
          No commits available to display.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in" role="list" aria-label="Commit snapshots">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold text-[var(--color-black)] uppercase tracking-wider">
          All Snapshots
        </h3>
        <span className="text-[10px] text-[var(--color-gray-400)] font-mono bg-[var(--color-gray-100)] px-2 py-0.5 rounded">
          {sorted.length} commits
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sorted.map((commit) => {
          const date = new Date(commit.committed_at);
          const additions = commit.files_changed.reduce((s, f) => s + f.additions, 0);
          const deletions = commit.files_changed.reduce((s, f) => s + f.deletions, 0);
          return (
            <button
              key={commit.hash}
              onClick={() => onSelectCommit(commit)}
              className="text-left bg-[var(--color-surface)] border border-[var(--color-blue-border)] rounded-lg p-4 hover:border-[var(--color-blue)] hover:shadow-sm transition-all duration-150 cursor-pointer active:scale-[0.98] group"
              role="listitem"
              aria-label={`Snapshot ${commit.hash.slice(0, 7)}`}
            >
              <div className="flex items-start justify-between mb-2">
                <code className="text-xs font-mono text-[var(--color-blue)] bg-[var(--color-blue-light)] px-1.5 py-0.5 rounded">
                  {commit.hash.slice(0, 7)}
                </code>
                <span className="text-[10px] text-[var(--color-gray-400)] font-mono">
                  {date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <p className="text-xs text-[var(--color-gray-700)] font-medium leading-relaxed line-clamp-2 mb-2">
                {commit.message}
              </p>
              <div className="flex items-center gap-3 text-[10px] font-mono">
                <span className="flex items-center gap-1 text-[var(--color-gray-500)]">
                  <User size={10} />
                  {commit.author_name}
                </span>
                <span className="text-green-600">+{additions}</span>
                <span className="text-red-500">-{deletions}</span>
                <span className="text-[var(--color-gray-400)]">
                  {commit.files_changed.length} file
                  {commit.files_changed.length !== 1 ? "s" : ""}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Inline ReportView ──────────────────────────────── */

function InlineReport({
  repo,
  commits,
  issues,
  ciRuns,
}: {
  repo: Repository;
  commits: Commit[];
  issues: Issue[];
  ciRuns: CiRun[];
}) {
  const totalAdditions = commits.reduce(
    (s, c) => s + c.files_changed.reduce((a, f) => a + f.additions, 0),
    0
  );
  const totalDeletions = commits.reduce(
    (s, c) => s + c.files_changed.reduce((a, f) => a + f.deletions, 0),
    0
  );
  const authors = [...new Set(commits.map((c) => c.author_name))];
  const openIssues = issues.filter((i) => i.state === "open");
  const closedIssues = issues.filter(
    (i) => i.state === "closed" || i.state === "merged"
  );
  const successfulRuns = ciRuns.filter((r) => r.conclusion === "success");
  const failedRuns = ciRuns.filter((r) => r.conclusion === "failure");

  const minDate =
    commits.length > 0
      ? new Date(commits[0].committed_at).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "N/A";
  const maxDate =
    commits.length > 0
      ? new Date(commits[commits.length - 1].committed_at).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "N/A";

  return (
    <div className="animate-fade-in max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 rounded-lg gradient-header flex items-center justify-center">
          <FileText size={18} className="text-white" />
        </div>
        <div>
          <h2 className="text-base font-bold text-[var(--color-black)]">Project Report</h2>
          <p className="text-[10px] text-[var(--color-gray-400)] font-mono">
            {repo.owner}/{repo.name} &middot; {minDate} &mdash; {maxDate}
          </p>
        </div>
      </div>

      {/* Executive Summary */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-blue-border)] rounded-lg p-4 shadow-sm">
        <h3 className="text-xs font-bold text-[var(--color-black)] uppercase tracking-wider mb-2">
          Executive Summary
        </h3>
        <p className="text-sm text-[var(--color-gray-700)] leading-relaxed">
          This report covers the history of <strong>{repo.name}</strong> from{" "}
          {minDate} to {maxDate}. During this period, there were{" "}
          <strong className="text-[var(--color-blue)]">{commits.length} commits</strong> by{" "}
          <strong className="text-[var(--color-blue)]">{authors.length} contributors</strong>,{" "}
          <strong className="text-[var(--color-blue)]">{issues.length} issues/PRs</strong>{" "}
          processed, and{" "}
          <strong className="text-[var(--color-blue)]">{ciRuns.length} CI runs</strong>{" "}
          executed.
        </p>
      </section>

      {/* Key Changes */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-blue-border)] rounded-lg p-4 shadow-sm">
        <h3 className="text-xs font-bold text-[var(--color-black)] uppercase tracking-wider mb-3 flex items-center gap-2">
          <GitCommit size={14} className="text-[var(--color-blue)]" />
          Key Changes & Milestones
        </h3>
        <div className="space-y-1.5">
          {commits
            .slice(-5)
            .reverse()
            .map((commit) => (
              <div
                key={commit.hash}
                className="flex items-start gap-3 text-xs text-[var(--color-gray-700)] py-1.5 border-b border-[var(--color-gray-100)] last:border-0"
              >
                <code className="text-[var(--color-blue)] font-mono shrink-0">
                  {commit.hash.slice(0, 7)}
                </code>
                <span className="text-[var(--color-gray-300)] shrink-0">|</span>
                <span className="font-medium shrink-0">{commit.author_name}</span>
                <span className="text-[var(--color-gray-300)] shrink-0">|</span>
                <span className="flex-1">{commit.message}</span>
              </div>
            ))}
        </div>
      </section>

      {/* Author Contributions */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-blue-border)] rounded-lg p-4 shadow-sm">
        <h3 className="text-xs font-bold text-[var(--color-black)] uppercase tracking-wider mb-3 flex items-center gap-2">
          <User size={14} className="text-[var(--color-blue)]" />
          Author Contributions
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {authors.map((author) => {
            const authorCommits = commits.filter((c) => c.author_name === author);
            return (
              <div key={author} className="bg-[var(--color-gray-50)] rounded-lg p-3 border border-[var(--color-blue-border)]">
                <p className="text-sm font-medium text-[var(--color-black)]">{author}</p>
                <p className="text-xs text-[var(--color-gray-500)] font-mono mt-0.5">
                  {authorCommits.length} commit{authorCommits.length !== 1 ? "s" : ""}
                </p>
                <p className="text-[10px] text-[var(--color-gray-400)] mt-0.5">
                  +{authorCommits.reduce((s, c) => s + c.files_changed.reduce((a, f) => a + f.additions, 0), 0)}
                  /-{authorCommits.reduce((s, c) => s + c.files_changed.reduce((a, f) => a + f.deletions, 0), 0)} lines
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Issue Resolution */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-blue-border)] rounded-lg p-4 shadow-sm">
        <h3 className="text-xs font-bold text-[var(--color-black)] uppercase tracking-wider mb-3 flex items-center gap-2">
          <History size={14} className="text-[var(--color-blue)]" />
          Issue Resolution
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[var(--color-gray-50)] rounded-lg p-3 border border-[var(--color-blue-border)] text-center">
            <p className="text-2xl font-bold text-[var(--color-black)]">{issues.length}</p>
            <p className="text-[10px] text-[var(--color-gray-500)] font-mono">Total</p>
          </div>
          <div className="bg-[var(--color-gray-50)] rounded-lg p-3 border border-[var(--color-blue-border)] text-center">
            <p className="text-2xl font-bold text-green-600">{closedIssues.length}</p>
            <p className="text-[10px] text-[var(--color-gray-500)] font-mono">Closed/Merged</p>
          </div>
          <div className="bg-[var(--color-gray-50)] rounded-lg p-3 border border-[var(--color-blue-border)] text-center">
            <p className="text-2xl font-bold text-[var(--color-blue)]">{openIssues.length}</p>
            <p className="text-[10px] text-[var(--color-gray-500)] font-mono">Open</p>
          </div>
        </div>
      </section>

      {/* CI Health */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-blue-border)] rounded-lg p-4 shadow-sm">
        <h3 className="text-xs font-bold text-[var(--color-black)] uppercase tracking-wider mb-3 flex items-center gap-2">
          <FileCode size={14} className="text-[var(--color-blue)]" />
          CI Health
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[var(--color-gray-50)] rounded-lg p-3 border border-[var(--color-blue-border)] text-center">
            <p className="text-2xl font-bold text-[var(--color-black)]">{ciRuns.length}</p>
            <p className="text-[10px] text-[var(--color-gray-500)] font-mono">Total Runs</p>
          </div>
          <div className="bg-[var(--color-gray-50)] rounded-lg p-3 border border-[var(--color-blue-border)] text-center">
            <p className="text-2xl font-bold text-green-600">{successfulRuns.length}</p>
            <p className="text-[10px] text-[var(--color-gray-500)] font-mono">Passed</p>
          </div>
          <div className="bg-[var(--color-gray-50)] rounded-lg p-3 border border-[var(--color-blue-border)] text-center">
            <p className="text-2xl font-bold text-red-500">{failedRuns.length}</p>
            <p className="text-[10px] text-[var(--color-gray-500)] font-mono">Failed</p>
          </div>
        </div>
      </section>

      {/* Code Statistics */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-blue-border)] rounded-lg p-4 shadow-sm">
        <h3 className="text-xs font-bold text-[var(--color-black)] uppercase tracking-wider mb-3 flex items-center gap-2">
          <FileCode size={14} className="text-[var(--color-blue)]" />
          Code Statistics
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[var(--color-gray-50)] rounded-lg p-3 border border-[var(--color-blue-border)]">
            <p className="text-[10px] text-[var(--color-gray-400)] font-mono">Total Lines Added</p>
            <p className="text-lg font-bold text-green-600">+{totalAdditions.toLocaleString()}</p>
          </div>
          <div className="bg-[var(--color-gray-50)] rounded-lg p-3 border border-[var(--color-blue-border)]">
            <p className="text-[10px] text-[var(--color-gray-400)] font-mono">Total Lines Removed</p>
            <p className="text-lg font-bold text-red-500">-{totalDeletions.toLocaleString()}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ── ChatGPT-style Questions View ───────────────────── */

function QuestionsView({
  conversation,
  onAsk,
  onRetry,
  onImportClick,
  hasData,
  repoLabel,
}: {
  conversation: ConversationEntry[];
  onAsk: (q: string) => void;
  onRetry: (q: string) => void;
  onImportClick: () => void;
  hasData: boolean;
  repoLabel: string;
}) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const [evidenceOpen, setEvidenceOpen] = useState<Record<string, boolean>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    onAsk(trimmed);
    setInput("");
  };

  // Auto-scroll to bottom on new messages
  const prevLen = conversation.length;
  const prevRef = useRef(prevLen);
  if (prevLen !== prevRef.current) {
    prevRef.current = prevLen;
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  const toggleEvidence = (id: string) => {
    setEvidenceOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Messages or empty state area */}
      <div className="flex-1 overflow-y-auto space-y-6 pb-4">
        {conversation.length === 0 ? (
          !hasData ? (
            /* Blank minimal empty state — no hghluwigi */
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-12 h-12 bg-[var(--color-blue-light)] border border-[var(--color-blue-border)] rounded-xl flex items-center justify-center mb-4">
                <MessageSquare size={22} className="text-[var(--color-blue)]" />
              </div>
              <p className="text-xs text-[var(--color-gray-400)] font-mono text-center max-w-sm mb-4">
                Import a repository above, or just ask about any public GitHub repo.
              </p>
              <button
                onClick={onImportClick}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-blue)] text-white rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer active:scale-[0.97] hover:bg-[var(--color-blue-dark)]"
              >
                <Upload size={14} />
                <span>Import Repository Data</span>
              </button>
            </div>
          ) : (
            /* Has data — show uploaded repo info */
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-12 h-12 bg-[var(--color-blue-light)] border border-[var(--color-blue-border)] rounded-xl flex items-center justify-center mb-4">
                <Upload size={22} className="text-[var(--color-blue)]" />
              </div>
              <p className="text-sm font-medium text-[var(--color-black)] mb-1">
                {repoLabel}
              </p>
              <p className="text-xs text-[var(--color-gray-400)] font-mono text-center max-w-sm">
                Repository data loaded. Ask me anything about its history.
              </p>
            </div>
          )
        ) : (
          conversation.map((entry) => (
            <div key={entry.id} className="space-y-3 px-1">
              {/* User message — right-aligned like ChatGPT */}
              <div className="flex justify-end">
                <div className="bg-[var(--color-chat-user)] text-[var(--color-chat-user-text)] rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%] md:max-w-[70%]">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {entry.question}
                  </p>
                </div>
              </div>

              {/* AI response — left-aligned like ChatGPT */}
              {entry.loading && (
                <div className="flex justify-start">
                  <div className="bg-[var(--color-chat-ai)] border border-[var(--color-chat-ai-border)] rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%] md:max-w-[70%]">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 rounded-full bg-[var(--color-blue)] pulse-dot" />
                      <div className="w-2 h-2 rounded-full bg-[var(--color-blue)] pulse-dot" style={{ animationDelay: "0.3s" }} />
                      <div className="w-2 h-2 rounded-full bg-[var(--color-blue)] pulse-dot" style={{ animationDelay: "0.6s" }} />
                    </div>
                  </div>
                </div>
              )}

              {entry.error && !entry.loading && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] md:max-w-[70%]">
                    <ErrorState
                      message={entry.error}
                      onRetry={() => onRetry(entry.question)}
                    />
                  </div>
                </div>
              )}

              {entry.answer && !entry.loading && !entry.error && (
                <div className="flex justify-start">
                  <div className="bg-[var(--color-chat-ai)] border border-[var(--color-chat-ai-border)] rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%] md:max-w-[70%]">
                    {/* Synthesis */}
                    <div className="text-sm text-[var(--color-chat-ai-text)] leading-relaxed">
                      {renderMarkdown(entry.answer.synthesis)}
                    </div>

                    {/* Evidence toggle */}
                    {hasEvidence(entry.answer) && (
                      <div className="mt-3 pt-2 border-t border-[var(--color-blue-border)]">
                        <button
                          onClick={() => toggleEvidence(entry.id)}
                          className="flex items-center gap-1.5 text-xs text-[var(--color-blue)] hover:opacity-80 transition-opacity duration-150 cursor-pointer"
                        >
                          {evidenceOpen[entry.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          <span>Evidence & sources</span>
                          <span className="text-[10px] text-[var(--color-gray-400)] ml-1">
                            ({evidenceCount(entry.answer)})
                          </span>
                        </button>

                        {evidenceOpen[entry.id] && (
                          <div className="mt-2 space-y-2">
                            {entry.answer.evidence.git.length > 0 && (
                              <div>
                                <p className="text-[10px] text-[var(--color-gray-400)] font-mono uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <GitCommit size={10} /> Commits ({entry.answer.evidence.git.length})
                                </p>
                                <div className="space-y-1">
                                  {entry.answer.evidence.git.slice(0, 3).map((c) => (
                                    <div key={c.hash} className="text-[11px] text-[var(--color-gray-600)] font-mono">
                                      <span className="text-[var(--color-blue)]">{c.hash.slice(0, 7)}</span> — {c.message}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {entry.answer.evidence.issues.length > 0 && (
                              <div>
                                <p className="text-[10px] text-[var(--color-gray-400)] font-mono uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <CircleDot size={10} /> Issues ({entry.answer.evidence.issues.length})
                                </p>
                                <div className="space-y-1">
                                  {entry.answer.evidence.issues.slice(0, 3).map((i) => (
                                    <div key={i.github_id} className="text-[11px] text-[var(--color-gray-600)] font-mono">
                                      <span className="text-[var(--color-blue)]">#{i.github_id}</span> — {i.title}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {entry.answer.evidence.ci.length > 0 && (
                              <div>
                                <p className="text-[10px] text-[var(--color-gray-400)] font-mono uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <Activity size={10} /> CI Runs ({entry.answer.evidence.ci.length})
                                </p>
                                <div className="space-y-1">
                                  {entry.answer.evidence.ci.slice(0, 2).map((r) => (
                                    <div key={r.run_id} className="text-[11px] text-[var(--color-gray-600)] font-mono">
                                      <span className="text-[var(--color-blue)]">#{r.run_id}</span> — {r.workflow_name} ({r.conclusion})
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area — fixed at bottom */}
      <div className="sticky bottom-0 bg-[var(--color-white)] pt-3 pb-1 border-t border-[var(--color-border)]">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the codebase history..."
            className="w-full pl-5 pr-14 py-3.5 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-xl text-sm text-[var(--color-input-text)] placeholder:text-[var(--color-input-placeholder)] outline-none focus:border-[var(--color-blue)] focus:shadow-[0_0_0_3px_rgba(26,94,188,0.12)] transition-all duration-150"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-3.5 py-2 bg-[var(--color-blue)] text-white rounded-lg text-sm font-semibold transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] hover:bg-[var(--color-blue-dark)]"
            aria-label="Send question"
          >
            <MessageSquare size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}

function hasEvidence(answer: { evidence: { git: unknown[]; issues: unknown[]; ci: unknown[] } }): boolean {
  return answer.evidence.git.length > 0 || answer.evidence.issues.length > 0 || answer.evidence.ci.length > 0;
}

function evidenceCount(answer: { evidence: { git: unknown[]; issues: unknown[]; ci: unknown[] } }): number {
  return answer.evidence.git.length + answer.evidence.issues.length + answer.evidence.ci.length;
}

/* ── Footer ──────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="bg-[var(--color-footer)] border-t border-[var(--color-footer-border)] py-4 px-8">
      <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-[var(--color-gray-400)] font-mono">
          <History size={12} />
          <span>Code Time Capsule</span>
          <span className="text-[var(--color-gray-300)]">·</span>
          <span>Git history intelligence</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-[var(--color-gray-400)] font-mono">
          <a
            href="#"
            className="hover:text-[var(--color-blue)] transition-colors duration-150 cursor-pointer"
            onClick={(e) => { e.preventDefault(); window.open("https://github.com", "_blank"); }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
          <span>Made in Natively AI and Google Gemma by Samantha Lui A. Santos</span>
          <span className="text-[var(--color-gray-300)]">·</span>
          <span>v1.0</span>
        </div>
      </div>
    </footer>
  );
}

/* ── App Content ────────────────────────────────────── */

function AppContent() {
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [ciRuns, setCiRuns] = useState<CiRun[]>([]);
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [activeView, setActiveView] = useState<NavView>("questions");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [hasImported, setHasImported] = useState(false);
  const { dark, toggle } = useTheme();

  const handleAsk = useCallback(
    async (question: string) => {
      const entry: ConversationEntry = {
        id: crypto.randomUUID(),
        question,
        answer: null,
        loading: true,
        error: null,
      };
      setConversation((prev) => [...prev, entry]);

      try {
        // Pass null repo if none selected — the AI service is smart enough
        // to detect owner/repo patterns in the question and fetch live data
        const answer = await generateAnswer(
          selectedRepo?.id ?? null,
          selectedRepo ? `${selectedRepo.owner}/${selectedRepo.name}` : null,
          question,
          new AbortController().signal
        );

        // If the answer includes live GitHub data, populate Timeline/Snapshots/Reports
        if (answer.liveData) {
          registerCustomData({ ...answer.liveData, ci_runs: [] });
          setSelectedRepo(answer.liveData.repo);
          setCommits(answer.liveData.commits);
          setIssues(answer.liveData.issues);
          setHasImported(true);
        }

        setConversation((prev) =>
          prev.map((e) => (e.id === entry.id ? { ...e, answer, loading: false } : e))
        );
      } catch (err) {
        setConversation((prev) =>
          prev.map((e) =>
            e.id === entry.id
              ? { ...e, loading: false, error: err instanceof Error ? err.message : "An unexpected error occurred" }
              : e
          )
        );
      }
    },
    [selectedRepo]
  );

  const handleRetry = useCallback(
    (question: string) => handleAsk(question),
    [handleAsk]
  );

  const handleEventClick = useCallback((commit: Commit) => {
    setSelectedCommit(commit);
    setActiveView("snapshots");
  }, []);

  const handleDataParsed = useCallback(
    (result: { repo: Repository; commits?: Commit[]; issues?: Issue[]; ci_runs?: CiRun[]; import_graph?: [] }) => {
      registerCustomData({
        repo: result.repo,
        commits: result.commits,
        issues: result.issues,
        ci_runs: result.ci_runs,
      });
      // Re-set state from the newly imported data
      setSelectedRepo(result.repo);
      setCommits(result.commits ?? []);
      setIssues(result.issues ?? []);
      setCiRuns(result.ci_runs ?? []);
      setActiveView("timeline");
      setConversation([]);
      setUploadOpen(false);
      setHasImported(true);

      // Auto-populated — all views (Timeline, Snapshots, Reports) now have data
    },
    [handleAsk]
  );

  const handleBackToSnapshots = useCallback(() => {
    setSelectedCommit(null);
  }, []);

  const handleNavigate = useCallback((view: NavView) => {
    setActiveView(view);
    if (view !== "snapshots") setSelectedCommit(null);
  }, []);

  const handleDeleteRepo = useCallback((id: string) => {
    removeRepository(id);
    // If the deleted repo was selected, clear selection
    if (selectedRepo?.id === id) {
      setSelectedRepo(null);
      setCommits([]);
      setIssues([]);
      setCiRuns([]);
      setHasImported(false);
    }
  }, [selectedRepo]);

  const handleSelectRepo = useCallback((repo: Repository) => {
    setSelectedRepo(repo);
    setActiveView("timeline");
    // Load the associated data from the engine
    setCommits(getRepoCommits(repo.id));
    setIssues(getRepoIssues(repo.id));
    setCiRuns(getRepoCiRuns(repo.id));
    setHasImported(true);
  }, []);

  const repoStats = selectedRepo ? getRepository(selectedRepo.id) : null;

  const sidebarWidth = sidebarCollapsed ? "ml-[64px]" : "ml-[240px]";

  function renderMainContent() {
    switch (activeView) {
      case "timeline":
        return <Timeline commits={commits} onEventClick={handleEventClick} loading={false} />;

      case "snapshots":
        if (selectedCommit) {
          return (
            <div className="animate-fade-in">
              <button
                onClick={handleBackToSnapshots}
                className="flex items-center gap-1.5 text-xs text-[var(--color-gray-500)] hover:text-[var(--color-blue)] transition-colors duration-150 mb-3 cursor-pointer"
              >
                <ArrowLeft size={14} />
                Back to all snapshots
              </button>
              <SnapshotView commit={selectedCommit} issues={issues} ciRuns={ciRuns} onClose={handleBackToSnapshots} />
            </div>
          );
        }
        return <SnapshotList commits={commits} onSelectCommit={handleEventClick} />;

      case "reports":
        return selectedRepo ? (
          <InlineReport repo={selectedRepo} commits={commits} issues={issues} ciRuns={ciRuns} />
        ) : (
          <div className="text-center py-16">
            <p className="text-sm text-[var(--color-gray-400)] font-mono">Import a repository to view reports.</p>
          </div>
        );

      case "questions":
        return (
          <QuestionsView
            conversation={conversation}
            onAsk={handleAsk}
            onRetry={handleRetry}
            onImportClick={() => setUploadOpen(true)}
            hasData={hasImported}
            repoLabel={selectedRepo ? `${selectedRepo.owner}/${selectedRepo.name}` : ""}
          />
        );

      default:
        return <Timeline commits={commits} onEventClick={handleEventClick} loading={false} />;
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-white)] flex flex-col">
      <Sidebar
        activeView={activeView}
        onNavigate={handleNavigate}
        repoName={selectedRepo ? `${selectedRepo.owner}/${selectedRepo.name}` : undefined}
        branch="main"
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onSettingsClick={() => setSettingsOpen(!settingsOpen)}
      />

      <div className={`${sidebarWidth} min-h-screen flex flex-col transition-all duration-200 ease-out`}>
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-[var(--color-surface)]/90 backdrop-blur-md border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between px-4 md:px-8 h-12">
            <div className="flex items-center gap-3">
              {selectedRepo ? (
                <>
                  <span className="text-sm font-semibold text-[var(--color-black)]">
                    {selectedRepo.owner}/{selectedRepo.name}
                  </span>
                  <span className="text-[10px] text-[var(--color-gray-400)] font-mono bg-[var(--color-gray-100)] px-1.5 py-0.5 rounded">
                    main
                  </span>
                  {repoStats && (
                    <span className="text-[10px] text-[var(--color-gray-400)] font-mono hidden sm:inline">
                      {repoStats.commits_count} commits
                    </span>
                  )}
                </>
              ) : (
                <span className="text-sm text-[var(--color-gray-400)] font-mono">No repository loaded</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Theme toggle */}
              <button
                onClick={toggle}
                className="p-2 text-[var(--color-gray-400)] hover:text-[var(--color-blue)] transition-colors duration-150 cursor-pointer rounded-lg hover:bg-[var(--color-blue-light)]"
                aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              >
                {dark ? <Monitor size={16} /> : <Moon size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Main body */}
        <main className="flex-1 px-4 md:px-8 py-5 max-w-[1200px] mx-auto w-full flex flex-col">
          {renderMainContent()}
        </main>

        {/* Footer */}
        <Footer />
      </div>

      {/* DataUpload modal trigger — controlled from QuestionsView */}
      <DataUpload
        onDataParsed={handleDataParsed}
        variant="landing"
        externalOpen={uploadOpen}
        onExternalClose={() => setUploadOpen(false)}
      />

      {/* Settings panel */}
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        repositories={getRepositories()}
        selectedRepo={selectedRepo}
        onSelectRepo={handleSelectRepo}
        onDeleteRepo={handleDeleteRepo}
        onAddRepo={() => { setUploadOpen(true); setSettingsOpen(false); }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}