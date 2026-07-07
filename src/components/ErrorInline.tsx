import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorInlineProps {
  message: string;
  onRetry: () => void;
}

export default function ErrorInline({ message, onRetry }: ErrorInlineProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
      <div className="flex items-start gap-2">
        <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-red-700 font-mono">{message}</p>
          <button
            onClick={onRetry}
            className="mt-1.5 flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium transition-colors duration-150 cursor-pointer"
          >
            <RefreshCw size={12} />
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}