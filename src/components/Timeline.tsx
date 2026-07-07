import { useMemo } from "react";
import { GitCommit, User, Calendar } from "lucide-react";
import type { Commit } from "../types";

interface TimelineProps {
  commits: Commit[];
  onEventClick: (commit: Commit) => void;
  loading?: boolean;
}

interface MonthGroup {
  label: string;
  key: string;
  commits: Commit[];
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatMonth(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function Timeline({ commits, onEventClick, loading }: TimelineProps) {
  const groups: MonthGroup[] = useMemo(() => {
    const sorted = [...commits].sort(
      (a, b) => new Date(b.committed_at).getTime() - new Date(a.committed_at).getTime()
    );

    const map = new Map<string, Commit[]>();
    for (const c of sorted) {
      const d = new Date(c.committed_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = formatMonth(d);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }

    return Array.from(map.entries()).map(([key, commits]) => ({
      key,
      label: formatMonth(new Date(commits[0].committed_at)),
      commits,
    }));
  }, [commits]);

  if (loading) {
    return (
      <div className="animate-fade-in space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="w-0.5 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 skeleton w-32" />
              <div className="h-16 skeleton w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="animate-fade-in text-center py-12">
        <div className="w-12 h-12 bg-blue-light rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar size={24} className="text-blue" />
        </div>
        <h3 className="text-sm font-bold text-black uppercase tracking-wider mb-2">
          No events to display
        </h3>
        <p className="text-xs text-gray-500 font-mono max-w-md mx-auto">
          The timeline is empty. Data from the selected repository will appear here once available.
        </p>
      </div>
    );
  }

  const totalCommits = commits.length;
  const firstDate = commits.length > 0
    ? formatDate(new Date(commits[commits.length - 1].committed_at))
    : "";
  const lastDate = commits.length > 0
    ? formatDate(new Date(commits[0].committed_at))
    : "";

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-bold text-black">Timeline</h2>
          <p className="text-xs text-gray-400 font-mono">
            {totalCommits} commits &middot; {firstDate} &mdash; {lastDate}
          </p>
        </div>
      </div>

      {/* Vertical timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-blue/20 rounded-full" />

        {groups.map((group) => (
          <div key={group.key} className="mb-6 last:mb-0">
            {/* Month header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-[24px] h-[24px] rounded-full bg-blue flex items-center justify-center shrink-0 relative z-10 ring-2 ring-white">
                <Calendar size={12} className="text-white" />
              </div>
              <h3 className="text-sm font-bold text-black uppercase tracking-wider">
                {group.label}
              </h3>
              <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                {group.commits.length} commit{group.commits.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Commits */}
            <div className="space-y-2 ml-[36px]">
              {group.commits.map((commit) => {
                const date = new Date(commit.committed_at);
                const additions = commit.files_changed.reduce((s, f) => s + f.additions, 0);
                const deletions = commit.files_changed.reduce((s, f) => s + f.deletions, 0);
                return (
                  <button
                    key={commit.hash}
                    onClick={() => onEventClick(commit)}
                    className="w-full text-left bg-white border border-blue-border rounded-lg p-3.5 hover:border-blue hover:shadow-sm transition-all duration-150 cursor-pointer active:scale-[0.99] group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <code className="text-[10px] font-mono text-blue bg-blue-light px-1.5 py-0.5 rounded shrink-0">
                            {commit.hash.slice(0, 7)}
                          </code>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {date.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 font-medium leading-relaxed line-clamp-2">
                          {commit.message}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] font-mono">
                          <span className="flex items-center gap-1 text-gray-500">
                            <User size={10} />
                            {commit.author_name}
                          </span>
                          <span className="text-green-600">+{additions}</span>
                          <span className="text-red-500">-{deletions}</span>
                          <span className="text-gray-400">
                            {commit.files_changed.length} file
                            {commit.files_changed.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                      <GitCommit size={16} className="text-gray-300 group-hover:text-blue transition-colors duration-150 shrink-0 mt-0.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}