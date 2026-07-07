import { useState } from "react";
import { Monitor, Moon, Search } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import type { Repository } from "../types";

interface HeaderProps {
  repositories: Repository[];
  selectedRepo: Repository | null;
  onSelectRepo: (repo: Repository) => void;
  onSearchToggle: () => void;
  extraControls?: React.ReactNode;
}

export default function Header({
  repositories,
  selectedRepo,
  onSelectRepo,
  onSearchToggle,
  extraControls,
}: HeaderProps) {
  const { dark, toggle } = useTheme();
  const [repoOpen, setRepoOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between px-4 md:px-6 h-14">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/15 rounded-sm flex items-center justify-center text-primary">
            <Search size={16} />
          </div>
          <span className="text-fg font-heading font-bold text-sm md:text-base tracking-tight">
            Git Sleuth
          </span>
        </div>

        {/* Center: search trigger (mobile) / repo selector */}
        <div className="flex items-center gap-3">
          {/* Repo dropdown */}
          <div className="relative">
            <button
              onClick={() => setRepoOpen(!repoOpen)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs md:text-sm border border-border rounded-sm bg-surface hover:bg-muted transition-colors duration-150 cursor-pointer text-fg"
            >
              <span className="hidden md:inline">
                {selectedRepo ? selectedRepo.name : "Select repo..."}
              </span>
              <span className="md:hidden">
                {selectedRepo ? selectedRepo.name : "Repo"}
              </span>
              <svg
                className={`w-3 h-3 transition-transform duration-150 ${repoOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {repoOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setRepoOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-56 bg-surface border border-border rounded-sm shadow-lg z-20 animate-pixel-fade-in">
                  {repositories.map((repo) => (
                    <button
                      key={repo.id}
                      onClick={() => {
                        onSelectRepo(repo);
                        setRepoOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs md:text-sm transition-colors duration-150 cursor-pointer border-b border-border last:border-0 ${
                        selectedRepo?.id === repo.id
                          ? "bg-primary/10 text-primary"
                          : "text-fg hover:bg-muted"
                      }`}
                    >
                      <div className="font-medium">
                        {repo.owner}/{repo.name}
                      </div>
                      <div className="text-fg/60 mt-0.5">
                        {repo.stats.commits_count.toLocaleString()} commits
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Search button (mobile) */}
          <button
            onClick={onSearchToggle}
            className="md:hidden p-2 text-fg hover:text-primary transition-colors duration-150 cursor-pointer"
            aria-label="Search"
          >
            <Search size={18} />
          </button>

          {/* Extra controls (e.g. data upload) */}
          {extraControls}

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="p-2 text-fg hover:text-primary transition-colors duration-150 cursor-pointer"
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? <Monitor size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
}