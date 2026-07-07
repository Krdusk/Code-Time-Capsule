import { X, Download, FileText, GitCommit, Bug, Activity, Users, BarChart3 } from "lucide-react";
import type { Repository, Commit, Issue, CiRun } from "../types";

interface ReportViewProps {
  repo: Repository;
  commits: Commit[];
  issues: Issue[];
  ciRuns: CiRun[];
  onClose: () => void;
}

export default function ReportView({ repo, commits, issues, ciRuns, onClose }: ReportViewProps) {
  const totalAdditions = commits.reduce((s, c) => s + c.files_changed.reduce((a, f) => a + f.additions, 0), 0);
  const totalDeletions = commits.reduce((s, c) => s + c.files_changed.reduce((a, f) => a + f.deletions, 0), 0);
  const authors = [...new Set(commits.map((c) => c.author_name))];
  const openIssues = issues.filter((i) => i.state === "open");
  const closedIssues = issues.filter((i) => i.state === "closed" || i.state === "merged");
  const successfulRuns = ciRuns.filter((r) => r.conclusion === "success");
  const failedRuns = ciRuns.filter((r) => r.conclusion === "failure");

  const minDate = commits.length > 0
    ? new Date(commits[0].committed_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "N/A";
  const maxDate = commits.length > 0
    ? new Date(commits[commits.length - 1].committed_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "N/A";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in-overlay">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Report panel */}
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-white rounded-xl shadow-xl overflow-hidden animate-slide-in-right">
        {/* Header */}
        <div className="gradient-header px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText size={20} className="text-white" />
            <div>
              <h2 className="text-white font-bold text-lg">Report</h2>
              <p className="text-white/70 text-xs font-mono">
                {repo.owner}/{repo.name} · {minDate} — {maxDate}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white text-xs rounded-md transition-colors duration-150 cursor-pointer">
              <Download size={14} />
              Export
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-white/60 hover:text-white transition-colors duration-150 cursor-pointer"
              aria-label="Close report"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-72px)]">
          {/* Executive Summary */}
          <section className="mb-6">
            <h3 className="text-xs font-bold text-black uppercase tracking-wider mb-3">
              Executive Summary
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              This report covers the history of <strong>{repo.name}</strong> from{" "}
              {minDate} to {maxDate}. During this period, there were{" "}
              <strong className="text-blue">{commits.length} commits</strong> by{" "}
              <strong className="text-blue">{authors.length} contributors</strong>,{" "}
              <strong className="text-blue">{issues.length} issues/PRs</strong> processed, and{" "}
              <strong className="text-blue">{ciRuns.length} CI runs</strong> executed.
            </p>
          </section>

          {/* Key Changes & Milestones */}
          <section className="mb-6">
            <h3 className="text-xs font-bold text-black uppercase tracking-wider mb-3 flex items-center gap-2">
              <GitCommit size={14} className="text-blue" />
              Key Changes & Milestones
            </h3>
            <div className="space-y-2">
              {commits.slice(-5).reverse().map((commit) => (
                <div key={commit.hash} className="flex items-start gap-3 text-xs text-gray-700">
                  <code className="text-blue font-mono shrink-0">{commit.hash.slice(0, 7)}</code>
                  <span className="text-gray-400 shrink-0">|</span>
                  <span className="font-medium">{commit.author_name}</span>
                  <span className="text-gray-400 shrink-0">|</span>
                  <span className="flex-1">{commit.message}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Author Contributions */}
          <section className="mb-6">
            <h3 className="text-xs font-bold text-black uppercase tracking-wider mb-3 flex items-center gap-2">
              <Users size={14} className="text-blue" />
              Author Contributions
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {authors.map((author) => {
                const authorCommits = commits.filter((c) => c.author_name === author);
                return (
                  <div key={author} className="bg-gray-50 rounded-lg p-3 border border-blue-border">
                    <p className="text-sm font-medium text-black">{author}</p>
                    <p className="text-xs text-gray-500 font-mono mt-1">
                      {authorCommits.length} commits
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      +{authorCommits.reduce((s, c) => s + c.files_changed.reduce((a, f) => a + f.additions, 0), 0)} / -{authorCommits.reduce((s, c) => s + c.files_changed.reduce((a, f) => a + f.deletions, 0), 0)} lines
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Issue Resolution Timeline */}
          <section className="mb-6">
            <h3 className="text-xs font-bold text-black uppercase tracking-wider mb-3 flex items-center gap-2">
              <Bug size={14} className="text-blue" />
              Issue Resolution
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 border border-blue-border text-center">
                <p className="text-2xl font-bold text-black">{issues.length}</p>
                <p className="text-[10px] text-gray-500 font-mono">Total</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-blue-border text-center">
                <p className="text-2xl font-bold text-green-600">{closedIssues.length}</p>
                <p className="text-[10px] text-gray-500 font-mono">Closed/Merged</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-blue-border text-center">
                <p className="text-2xl font-bold text-blue">{openIssues.length}</p>
                <p className="text-[10px] text-gray-500 font-mono">Open</p>
              </div>
            </div>
          </section>

          {/* CI Health */}
          <section className="mb-6">
            <h3 className="text-xs font-bold text-black uppercase tracking-wider mb-3 flex items-center gap-2">
              <Activity size={14} className="text-blue" />
              CI Health
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 border border-blue-border text-center">
                <p className="text-2xl font-bold text-black">{ciRuns.length}</p>
                <p className="text-[10px] text-gray-500 font-mono">Total Runs</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-blue-border text-center">
                <p className="text-2xl font-bold text-green-600">{successfulRuns.length}</p>
                <p className="text-[10px] text-gray-500 font-mono">Passed</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-blue-border text-center">
                <p className="text-2xl font-bold text-red-500">{failedRuns.length}</p>
                <p className="text-[10px] text-gray-500 font-mono">Failed</p>
              </div>
            </div>
          </section>

          {/* Stats bar */}
          <section className="mb-6">
            <h3 className="text-xs font-bold text-black uppercase tracking-wider mb-3 flex items-center gap-2">
              <BarChart3 size={14} className="text-blue" />
              Code Statistics
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 border border-blue-border">
                <p className="text-[10px] text-gray-400 font-mono">Total Lines Added</p>
                <p className="text-lg font-bold text-green-600">+{totalAdditions.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-blue-border">
                <p className="text-[10px] text-gray-400 font-mono">Total Lines Removed</p>
                <p className="text-lg font-bold text-red-500">-{totalDeletions.toLocaleString()}</p>
              </div>
            </div>
          </section>

          {/* Recommendations */}
          {openIssues.length > 0 && (
            <section>
              <h3 className="text-xs font-bold text-black uppercase tracking-wider mb-3">
                Recommendations & Insights
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 border border-blue-border">
                <p className="text-sm text-gray-700 leading-relaxed">
                  There are currently <strong className="text-blue">{openIssues.length} open issue(s)</strong> that may need attention.
                  The repository has seen consistent activity with <strong>{authors.length} contributors</strong>.
                  CI has a{" "}
                  {ciRuns.length > 0
                    ? `${Math.round((successfulRuns.length / ciRuns.length) * 100)}% success rate`
                    : "no data available"}
                  .
                </p>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}