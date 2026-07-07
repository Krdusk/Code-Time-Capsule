import { AlertCircle, RefreshCw, MessageSquare } from "lucide-react";

/* ── Loading skeleton ───────────────────────────────── */

export function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Synthesis skeleton */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-blue-border)] rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 skeleton rounded" />
          <div className="w-24 h-3 skeleton rounded" />
        </div>
        <div className="space-y-2">
          <div className="w-full h-3 skeleton rounded" />
          <div className="w-3/4 h-3 skeleton rounded" />
          <div className="w-5/6 h-3 skeleton rounded" />
          <div className="w-2/3 h-3 skeleton rounded" />
        </div>
      </div>

      {/* Evidence skeletons */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-[var(--color-surface)] border border-[var(--color-blue-border)] rounded-lg p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-4 h-4 skeleton rounded" />
            <div className="w-20 h-3 skeleton rounded" />
            <div className="w-6 h-3 skeleton rounded" />
          </div>
          <div className="space-y-2 pl-2">
            <div className="w-11/12 h-2 skeleton rounded" />
            <div className="w-8/12 h-2 skeleton rounded" />
            <div className="w-4/12 h-2 skeleton rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Processing state ───────────────────────────────── */

export function ProcessingState({ message }: { message?: string }) {
  return (
    <div className="flex items-center gap-3 animate-fade-in">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-[var(--color-blue)] pulse-dot"
          />
        ))}
      </div>
      <p className="text-xs text-[var(--color-gray-500)] font-mono">
        {message || "Searching the repository..."}
      </p>
    </div>
  );
}

/* ── Error state ────────────────────────────────────── */

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 animate-fade-in">
      <div className="w-12 h-12 bg-red-50 border border-red-200 rounded-xl flex items-center justify-center mb-3">
        <AlertCircle size={20} className="text-red-500" />
      </div>
      <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 max-w-md mb-3">
        <p className="text-xs text-red-700 font-mono leading-relaxed">
          {message || "An unexpected error occurred while processing your request."}
        </p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-blue-border)] rounded-lg text-xs text-[var(--color-gray-700)] hover:bg-[var(--color-gray-50)] transition-colors duration-150 cursor-pointer active:scale-[0.97]"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      )}
    </div>
  );
}