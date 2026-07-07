import { useState } from "react";
import { X, GitBranch, Monitor, Moon, Plus, Trash2, AlertTriangle } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import type { Repository } from "../types";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  repositories: Repository[];
  selectedRepo: Repository | null;
  onSelectRepo: (repo: Repository) => void;
  onDeleteRepo: (id: string) => void;
  onAddRepo: () => void;
}

export default function SettingsPanel({
  open,
  onClose,
  repositories,
  selectedRepo,
  onSelectRepo,
  onDeleteRepo,
  onAddRepo,
}: SettingsPanelProps) {
  const { dark, toggle } = useTheme();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  if (!open) return null;

  const handleDelete = (id: string) => {
    onDeleteRepo(id);
    setConfirmDelete(null);
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end animate-fade-in-overlay">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-sm bg-[var(--color-surface)] shadow-2xl h-full overflow-y-auto animate-slide-in-right settings-scroll">
        {/* Header with theme-aware gradient */}
        <div className="gradient-header px-5 py-4 flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-white/60 hover:text-white transition-colors duration-150 cursor-pointer rounded-md hover:bg-white/10"
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Repository Management */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-[var(--color-black)] uppercase tracking-wider flex items-center gap-2">
                <GitBranch size={14} className="text-[var(--color-blue)]" />
                Repository Management
              </h3>
              <button
                onClick={onAddRepo}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-[var(--color-blue)] text-white rounded-lg hover:bg-[var(--color-blue-dark)] transition-all duration-150 cursor-pointer active:scale-[0.97]"
                aria-label="Add repository"
              >
                <Plus size={12} />
                Add
              </button>
            </div>

            {repositories.length === 0 ? (
              <div className="text-center py-10 text-[var(--color-gray-400)]">
                <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-[var(--color-blue-light)] border border-[var(--color-blue-border)] flex items-center justify-center">
                  <GitBranch size={18} className="text-[var(--color-blue)]" />
                </div>
                <p className="text-xs font-mono">No repositories imported yet.</p>
                <button
                  onClick={onAddRepo}
                  className="mt-2 text-xs text-[var(--color-blue)] hover:underline cursor-pointer font-semibold"
                >
                  Import your first repo
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {repositories.map((repo) => (
                  <div key={repo.id} className="relative">
                    <div
                      className={`flex items-center gap-2 rounded-lg border transition-all duration-150 ${
                        selectedRepo?.id === repo.id
                          ? "bg-[var(--color-sidebar-active)] border-[var(--color-blue)] shadow-sm"
                          : "bg-[var(--color-surface)] border-[var(--color-blue-border)] hover:bg-[var(--color-gray-100)]"
                      }`}
                    >
                      <button
                        onClick={() => {
                          onSelectRepo(repo);
                          onClose();
                        }}
                        className={`flex-1 text-left px-3 py-2.5 cursor-pointer rounded-l-lg ${
                          selectedRepo?.id === repo.id
                            ? "text-[var(--color-blue)]"
                            : "text-[var(--color-gray-700)]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold">{repo.owner}/{repo.name}</p>
                            <p className="text-[10px] text-[var(--color-gray-400)] font-mono mt-0.5">
                              {repo.stats.commits_count} commits · {repo.stats.issues_count} issues
                              {repo.publisher && ` · by ${repo.publisher}`}
                            </p>
                          </div>
                          {selectedRepo?.id === repo.id && (
                            <div className="w-2 h-2 rounded-full bg-[var(--color-blue)]" />
                          )}
                        </div>
                      </button>
                      <button
                        onClick={() => setConfirmDelete(repo.id)}
                        className="p-2 mr-1 text-[var(--color-gray-400)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors duration-150 cursor-pointer"
                        aria-label={`Delete ${repo.name}`}
                        title="Delete repository"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Delete confirmation overlay */}
                    {confirmDelete === repo.id && (
                      <div className="absolute inset-0 z-10 bg-[var(--color-surface)]/95 backdrop-blur-sm rounded-lg border border-red-400 dark:border-red-500/50 flex items-center justify-center p-4 animate-fade-in">
                        <div className="text-center">
                          <AlertTriangle size={20} className="text-red-500 mx-auto mb-2" />
                          <p className="text-xs font-semibold text-[var(--color-black)] mb-1">
                            Delete this repository?
                          </p>
                          <p className="text-[10px] text-[var(--color-gray-400)] font-mono mb-3">
                            {repo.owner}/{repo.name}
                          </p>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="px-3 py-1.5 text-[10px] font-semibold text-[var(--color-gray-600)] bg-[var(--color-gray-100)] rounded-md hover:bg-[var(--color-gray-200)] transition-colors duration-150 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDelete(repo.id)}
                              className="px-3 py-1.5 text-[10px] font-semibold text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors duration-150 cursor-pointer active:scale-[0.97]"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Appearance */}
          <section>
            <h3 className="text-xs font-bold text-[var(--color-black)] uppercase tracking-wider mb-3 flex items-center gap-2">
              <Monitor size={14} className="text-[var(--color-blue)]" />
              Appearance
            </h3>
            <div className="bg-[var(--color-gray-50)] rounded-lg p-3 border border-[var(--color-blue-border)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-gray-700)] font-medium">Theme</p>
                  <p className="text-[10px] text-[var(--color-gray-400)] font-mono">
                    {dark ? "Dark mode" : "Light mode"}
                  </p>
                </div>
                <button
                  onClick={toggle}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-surface)] rounded-md border border-[var(--color-blue-border)] transition-all duration-150 cursor-pointer hover:bg-[var(--color-gray-100)] active:scale-[0.97]"
                >
                  {dark ? (
                    <Monitor size={14} className="text-[var(--color-blue)]" />
                  ) : (
                    <Moon size={14} className="text-[var(--color-blue)]" />
                  )}
                  <span className="text-xs text-[var(--color-gray-600)]">
                    {dark ? "Light" : "Dark"}
                  </span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Settings-scoped scrollbar */}
      <style>{`
        .settings-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .settings-scroll::-webkit-scrollbar-thumb {
          background: var(--color-gray-300);
          border-radius: 2px;
        }
        .settings-scroll::-webkit-scrollbar-thumb:hover {
          background: var(--color-gray-400);
        }
      `}</style>
    </div>
  );
}