import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, GitCommit, Bug, Activity, FileText } from "lucide-react";
import type { Answer, ImpactNode, Commit, Issue, CiRun } from "../types";

interface AnswerDisplayProps {
  answer: Answer;
}

export default function AnswerDisplay({ answer }: AnswerDisplayProps) {
  return (
    <div className="animate-fade-in space-y-4">
      {/* Synthesis */}
      <SynthesisSection text={answer.synthesis} />

      {/* Impact */}
      {answer.impact.length > 0 && (
        <ImpactSection nodes={answer.impact} />
      )}

      {/* Evidence: Git */}
      {answer.evidence.git.length > 0 && (
        <EvidenceSection
          icon={<GitCommit size={16} />}
          title="Git History"
          count={answer.evidence.git.length}
        >
          {answer.evidence.git.map((commit) => (
            <CommitCard key={commit.hash} commit={commit} />
          ))}
        </EvidenceSection>
      )}

      {/* Evidence: Issues */}
      {answer.evidence.issues.length > 0 && (
        <EvidenceSection
          icon={<Bug size={16} />}
          title="Related Issues & PRs"
          count={answer.evidence.issues.length}
        >
          {answer.evidence.issues.map((issue) => (
            <IssueCard key={issue.github_id} issue={issue} />
          ))}
        </EvidenceSection>
      )}

      {/* Evidence: CI */}
      {answer.evidence.ci.length > 0 && (
        <EvidenceSection
          icon={<Activity size={16} />}
          title="CI Context"
          count={answer.evidence.ci.length}
        >
          {answer.evidence.ci.map((run) => (
            <CiRunCard key={run.run_id} run={run} />
          ))}
        </EvidenceSection>
      )}
    </div>
  );
}

/* ── Strip markdown artifacts from synthesis text ──── */

function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^---+\s*$/gm, "")
    .replace(/^___+\s*$/gm, "")
    .replace(/^[*_-]{3,}\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ── Sub-components ─────────────────────────────────── */

function SynthesisSection({ text }: { text: string }) {
  const clean = cleanMarkdown(text);

  return (
    <div className="bg-white border border-blue-border rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <FileText size={16} className="text-blue" />
        <h3 className="text-xs font-bold text-black uppercase tracking-wider">
          Synthesis
        </h3>
      </div>
      <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
        {clean}
      </div>
    </div>
  );
}

function ImpactSection({ nodes }: { nodes: ImpactNode[] }) {
  return (
    <div className="bg-white border border-blue-border rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-3 h-3 bg-red-500 rounded-sm" />
        <h3 className="text-xs font-bold text-black uppercase tracking-wider">
          Impact Analysis
        </h3>
      </div>
      <ImpactTree nodes={nodes} depth={0} />
    </div>
  );
}

function ImpactTree({ nodes, depth }: { nodes: ImpactNode[]; depth: number }) {
  return (
    <ul className="space-y-1">
      {nodes.map((node, i) => (
        <li key={`${node.file}-${i}`}>
          <div
            className="flex items-center gap-2 text-xs font-mono"
            style={{ paddingLeft: depth * 16 }}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                node.severity === "high"
                  ? "bg-red-500"
                  : node.severity === "medium"
                    ? "bg-blue"
                    : node.severity === "low"
                      ? "bg-green-600"
                      : "bg-gray-300"
              }`}
            />
            <span className="text-gray-700">{node.file}</span>
            <span
              className={`text-[10px] uppercase ${
                node.severity === "high"
                  ? "text-red-500"
                  : node.severity === "medium"
                    ? "text-blue"
                    : "text-gray-400"
              }`}
            >
              {node.severity}
            </span>
          </div>
          {node.children.length > 0 && (
            <ImpactTree nodes={node.children} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  );
}

function EvidenceSection({
  icon,
  title,
  count,
  children,
}: {
  icon: ReactNode;
  title: string;
  count: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-white border border-blue-border rounded-lg overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors duration-150 hover:bg-gray-50 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="text-blue">{icon}</span>
          <span className="text-xs font-bold text-black uppercase tracking-wider">
            {title}
          </span>
          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">
            {count}
          </span>
        </div>
        {open ? (
          <ChevronDown size={16} className="text-gray-400" />
        ) : (
          <ChevronRight size={16} className="text-gray-400" />
        )}
      </button>
      {open && <div className="px-4 pb-3 space-y-2">{children}</div>}
    </div>
  );
}

function CommitCard({ commit }: { commit: Commit }) {
  return (
    <div className="border-l-2 border-blue/30 pl-3 py-1.5">
      <div className="flex items-center gap-2 text-xs">
        <code className="text-blue font-mono">{commit.hash.slice(0, 7)}</code>
        <span className="text-gray-300">|</span>
        <span className="text-gray-500">{commit.author_name}</span>
        <span className="text-gray-300">|</span>
        <span className="text-gray-400 text-[10px]">
          {new Date(commit.committed_at).toLocaleDateString()}
        </span>
      </div>
      <p className="text-xs text-gray-700 mt-1">{commit.message}</p>
      <div className="flex flex-wrap gap-1 mt-1">
        {commit.files_changed.slice(0, 3).map((f, i) => (
          <span
            key={i}
            className="text-[10px] text-gray-400 bg-gray-100 px-1 py-0.5 rounded font-mono"
          >
            {f.path} (+{f.additions}/-{f.deletions})
          </span>
        ))}
        {commit.files_changed.length > 3 && (
          <span className="text-[10px] text-gray-400">
            +{commit.files_changed.length - 3} more
          </span>
        )}
      </div>
    </div>
  );
}

function IssueCard({ issue }: { issue: Issue }) {
  const color =
    issue.state === "merged" || issue.state === "closed"
      ? "text-green-600"
      : "text-gray-700";

  return (
    <div className="border-l-2 border-blue/30 pl-3 py-1.5">
      <div className="flex items-center gap-2 text-xs">
        <span className={color}>
          #{issue.github_id} {issue.type === "pull_request" ? "PR" : "Issue"}
        </span>
        <span className="text-gray-300">|</span>
        <span
          className={`text-[10px] uppercase px-1 py-0.5 rounded font-mono ${
            issue.state === "merged"
              ? "bg-purple-100 text-purple-700"
              : issue.state === "closed"
                ? "bg-gray-100 text-gray-500"
                : "bg-blue-light text-blue"
          }`}
        >
          {issue.state}
        </span>
      </div>
      <p className="text-xs text-gray-700 mt-1">{issue.title}</p>
      {issue.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {issue.labels.map((label, i) => (
            <span
              key={i}
              className="text-[10px] text-gray-400 bg-gray-100 px-1 py-0.5 rounded font-mono"
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function CiRunCard({ run }: { run: CiRun }) {
  const statusColor =
    run.conclusion === "success"
      ? "text-green-600"
      : run.conclusion === "failure"
        ? "text-red-500"
        : "text-gray-400";

  return (
    <div className="border-l-2 border-blue/30 pl-3 py-1.5">
      <div className="flex items-center gap-2 text-xs">
        <span className={statusColor}>
          ● #{run.run_id}
        </span>
        <span className="text-gray-300">|</span>
        <span className="text-gray-500">{run.workflow_name}</span>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5 font-mono">
        <span>
          {run.conclusion === "success"
            ? "Passed"
            : run.conclusion === "failure"
              ? "Failed"
              : run.status}
        </span>
        <span>|</span>
        <span>{run.branch}</span>
      </div>
      {run.logs && (
        <pre className="mt-1 text-[10px] text-gray-500 bg-gray-50 p-1.5 rounded overflow-x-auto max-h-16 leading-tight">
          {run.logs.split("\n").slice(0, 3).join("\n")}
        </pre>
      )}
    </div>
  );
}