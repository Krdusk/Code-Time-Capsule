import { type ReactNode } from "react";
import {
  History,
  MessageSquare,
  Camera,
  FileText,
  Settings,
  GitBranch,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export type NavView = "timeline" | "questions" | "snapshots" | "reports";

interface SidebarProps {
  activeView: NavView;
  onNavigate: (view: NavView) => void;
  repoName?: string;
  branch?: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSettingsClick: () => void;
}

interface NavItem {
  id: NavView;
  label: string;
  icon: ReactNode;
}

const navItems: NavItem[] = [
  { id: "timeline", label: "Timeline", icon: <History size={20} /> },
  { id: "questions", label: "Questions", icon: <MessageSquare size={20} /> },
  { id: "snapshots", label: "Snapshots", icon: <Camera size={20} /> },
  { id: "reports", label: "Reports", icon: <FileText size={20} /> },
];

export default function Sidebar({
  activeView,
  onNavigate,
  repoName = "my-app",
  branch = "main",
  collapsed,
  onToggleCollapse,
  onSettingsClick,
}: SidebarProps) {
  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-[var(--color-sidebar)] flex flex-col z-50 sidebar overflow-y-auto border-r border-[var(--color-border)] transition-all duration-200 ease-out ${
        collapsed ? "w-[64px]" : "w-[240px]"
      }`}
    >
      {/* Logo + collapse toggle */}
      <div className={`flex items-center ${collapsed ? "justify-center px-2" : "px-5"} pt-5 pb-4`}>
        {!collapsed && (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg gradient-header flex items-center justify-center shrink-0">
              <History size={16} className="text-white" />
            </div>
            <h1 className="text-[var(--color-black)] font-bold text-sm tracking-tight truncate">
              Code Time Capsule
            </h1>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg gradient-header flex items-center justify-center">
            <History size={16} className="text-white" />
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className={`p-1 rounded-md text-[var(--color-gray-400)] hover:text-[var(--color-blue)] hover:bg-[var(--color-sidebar-hover)] transition-colors duration-150 cursor-pointer shrink-0 ${
            collapsed ? "mt-0" : "ml-1"
          }`}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 ${collapsed ? "px-2" : "px-3"} space-y-0.5`}>
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer ${
                collapsed ? "justify-center px-0 py-2.5" : "px-4 py-2.5"
              } ${
                isActive
                  ? "bg-[var(--color-sidebar-active)] text-[var(--color-blue)]"
                  : "text-[var(--color-gray-500)] hover:text-[var(--color-black)] hover:bg-[var(--color-sidebar-hover)]"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <span className={isActive ? "text-[var(--color-blue)]" : "text-[var(--color-gray-400)] shrink-0"}>
                {item.icon}
              </span>
              {!collapsed && item.label}
            </button>
          );
        })}

        {/* Settings (separated) */}
        <div className={collapsed ? "pt-3 flex justify-center" : "pt-4"}>
          {!collapsed && (
            <div className="px-4 pb-2">
              <div className="h-px bg-[var(--color-gray-200)]" />
            </div>
          )}
          <button
            onClick={onSettingsClick}
            className={`w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer ${
              collapsed ? "justify-center px-0 py-2.5" : "px-4 py-2.5"
            } text-[var(--color-gray-500)] hover:text-[var(--color-black)] hover:bg-[var(--color-sidebar-hover)]`}
            title={collapsed ? "Settings" : undefined}
          >
            <Settings size={20} className="text-[var(--color-gray-400)] shrink-0" />
            {!collapsed && "Settings"}
          </button>
        </div>
      </nav>

      {/* Bottom info — only when expanded */}
      {!collapsed && (
        <div className="px-4 pb-5 space-y-2">
          <div className="px-4">
            <div className="h-px bg-[var(--color-gray-200)]" />
          </div>

          {/* Repository info — only shown when a repo is loaded */}
          {repoName && (
            <div className="flex items-center gap-2 px-4 py-1.5">
              <GitBranch size={14} className="text-[var(--color-blue)] shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-[var(--color-gray-500)] font-mono truncate">
                  {repoName}
                </p>
                <p className="text-[10px] text-[var(--color-gray-400)] font-mono">{branch}</p>
              </div>
            </div>
          )}

          {/* Free & open */}
          <div className="px-4 pt-1">
            <p className="text-[10px] text-[var(--color-gray-400)] font-mono">
              Free · No account needed
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}