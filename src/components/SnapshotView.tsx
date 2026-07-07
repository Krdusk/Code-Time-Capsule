import { useState } from "react";
import { X, Folder, FileCode, GitCommit, User, Calendar, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import type { Commit, Issue, CiRun } from "../types";

interface SnapshotViewProps {
  commit: Commit;
  issues: Issue[];
  ciRuns: CiRun[];
  onClose: () => void;
}

interface FileTreeNode {
  name: string;
  type: "file" | "folder";
  children?: FileTreeNode[];
  content?: string;
}

// Mock file structure based on a commit's files_changed
function buildFileTree(files: { path: string; additions: number; deletions: number }[]): FileTreeNode[] {
  const root: FileTreeNode = { name: "root", type: "folder", children: [] };

  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      if (isLast) {
        current.children?.push({
          name: part,
          type: "file",
          content: `// ${file.path}\n// +${file.additions} / -${file.deletions} lines\n\nexport function ${part.replace(/\.\w+$/, "").replace(/[^a-zA-Z0-9]/g, "_")}() {\n  // Implementation from snapshot\n  // Commit: ${files.length > 0 ? "snapshot" : "current"}\n  return null;\n}\n`,
        });
      } else {
        let folder = current.children?.find((c) => c.name === part && c.type === "folder");
        if (!folder) {
          folder = { name: part, type: "folder", children: [] };
          current.children?.push(folder);
        }
        current = folder;
      }
    }
  }

  return root.children || [];
}

function FileTree({ nodes, depth = 0, selectedFile, onSelect }: {
  nodes: FileTreeNode[];
  depth?: number;
  selectedFile: string | null;
  onSelect: (path: string, content: string) => void;
}) {
  return (
    <div>
      {nodes.map((node) => {
        const fullPath = node.name;
        if (node.type === "folder") {
          return (
            <div key={node.name}>
              <div
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 font-medium cursor-default"
                style={{ paddingLeft: `${12 + depth * 16}px` }}
              >
                <Folder size={14} className="text-blue" />
                <span>{node.name}</span>
              </div>
              {node.children && (
                <FileTree
                  nodes={node.children}
                  depth={depth + 1}
                  selectedFile={selectedFile}
                  onSelect={onSelect}
                />
              )}
            </div>
          );
        }
        return (
          <button
            key={node.name}
            onClick={() => onSelect(fullPath, node.content || "")}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs font-mono transition-colors duration-150 cursor-pointer ${
              selectedFile === fullPath
                ? "bg-blue-light text-blue"
                : "text-gray-600 hover:bg-gray-100"
            }`}
            style={{ paddingLeft: `${12 + depth * 16}px` }}
          >
            <FileCode size={14} className={selectedFile === fullPath ? "text-blue" : "text-gray-400"} />
            <span className="truncate">{node.name}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function SnapshotView({ commit, issues, ciRuns, onClose }: SnapshotViewProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");

  const fileTree = buildFileTree(commit.files_changed);
  const openIssues = issues.filter((i) => i.state === "open");
  const passingCi = ciRuns.filter((r) => r.conclusion === "success");
  const failingCi = ciRuns.filter((r) => r.conclusion === "failure");

  const handleFileSelect = (name: string, content: string) => {
    setSelectedFile(name);
    setFileContent(content);
  };

  const date = new Date(commit.committed_at);

  return (
    <div className="animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-black uppercase tracking-wider">
          Snapshot
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-150 cursor-pointer"
          aria-label="Close snapshot"
        >
          <X size={16} />
        </button>
      </div>

      {/* Metadata context panel */}
      <div className="bg-white border border-blue-border rounded-lg p-4 mb-4 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-blue" />
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Date</p>
              <p className="text-xs text-black font-mono">
                {date.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <GitCommit size={14} className="text-blue" />
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Commit</p>
              <p className="text-xs text-blue font-mono">{commit.hash.slice(0, 7)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <User size={14} className="text-blue" />
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Author</p>
              <p className="text-xs text-black font-mono">{commit.author_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {failingCi.length > 0 ? (
              <XCircle size={14} className="text-red-500" />
            ) : passingCi.length > 0 ? (
              <CheckCircle size={14} className="text-green-600" />
            ) : (
              <AlertCircle size={14} className="text-gray-400" />
            )}
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">CI Status</p>
              <p className="text-xs text-black font-mono">
                {failingCi.length > 0
                  ? "Failing"
                  : passingCi.length > 0
                    ? "Passing"
                    : "No runs"}
              </p>
            </div>
          </div>
        </div>

        {/* Commit message */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Message</p>
          <p className="text-xs text-gray-700 font-mono">{commit.message}</p>
        </div>

        {/* Stats */}
        <div className="mt-2 flex items-center gap-4">
          <span className="text-[10px] text-gray-400 font-mono">
            {commit.files_changed.length} file(s) changed
          </span>
          <span className="text-[10px] text-green-600 font-mono">
            +{commit.files_changed.reduce((s, f) => s + f.additions, 0)}
          </span>
          <span className="text-[10px] text-red-500 font-mono">
            -{commit.files_changed.reduce((s, f) => s + f.deletions, 0)}
          </span>
          <span className="text-[10px] text-gray-400 font-mono">
            {openIssues.length} open issue(s)
          </span>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-4">
        {/* File explorer */}
        <div className="w-[35%] bg-white border border-blue-border rounded-lg overflow-hidden shadow-sm">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
            <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">Files</p>
          </div>
          <div className="max-h-[400px] overflow-y-auto py-1">
            <FileTree
              nodes={fileTree}
              selectedFile={selectedFile}
              onSelect={handleFileSelect}
            />
            {fileTree.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6 font-mono">
                No files to display
              </p>
            )}
          </div>
        </div>

        {/* Code view */}
        <div className="flex-1 bg-white border border-blue-border rounded-lg overflow-hidden shadow-sm">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">
              {selectedFile || "Select a file"}
            </p>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {fileContent ? (
              <pre className="code-block p-4 overflow-x-auto">
                <code>{fileContent}</code>
              </pre>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <FileCode size={24} className="mb-2" />
                <p className="text-xs font-mono">Select a file to view its contents</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}