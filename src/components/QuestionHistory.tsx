import { useState } from "react";
import { ChevronDown, ChevronRight, MessageSquare, Clock } from "lucide-react";
import type { ConversationEntry } from "../types";

interface QuestionHistoryProps {
  entries: ConversationEntry[];
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "...";
}

export default function QuestionHistory({ entries }: QuestionHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (entries.length === 0) {
    return (
      <div className="animate-fade-in">
        <div className="text-center py-8">
          <div className="w-10 h-10 bg-blue-light rounded-full flex items-center justify-center mx-auto mb-3">
            <MessageSquare size={20} className="text-blue" />
          </div>
          <h3 className="text-sm font-bold text-black uppercase tracking-wider mb-2">
            No Questions Yet
          </h3>
          <p className="text-xs text-gray-500">
            Ask your first question about your codebase history
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare size={16} className="text-blue" />
        <h3 className="text-xs font-bold text-black uppercase tracking-wider">
          Question History
        </h3>
        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">
          {entries.length}
        </span>
      </div>

      {entries.map((entry) => {
        const isExpanded = expandedId === entry.id;
        const answerPreview = entry.answer?.synthesis
          ? truncate(entry.answer.synthesis.replace(/\*\*/g, "").replace(/`/g, ""), 100)
          : entry.loading
            ? "Searching..."
            : entry.error
              ? "Error loading answer"
              : "No answer yet";

        return (
          <div
            key={entry.id}
            className="bg-white border border-blue-border rounded-lg overflow-hidden transition-all duration-150"
          >
            <button
              onClick={() => setExpandedId(isExpanded ? null : entry.id)}
              className="w-full flex items-start justify-between px-3 py-2.5 text-left transition-colors duration-150 hover:bg-gray-50 cursor-pointer"
            >
              <div className="flex items-start gap-2 min-w-0">
                <MessageSquare size={14} className="text-blue shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs text-blue font-medium truncate">
                    {entry.question}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock size={10} className="text-gray-400" />
                    <span className="text-[10px] text-gray-400 font-mono">
                      {new Date().toLocaleDateString()}
                    </span>
                  </div>
                  {!isExpanded && (
                    <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">
                      {answerPreview}
                    </p>
                  )}
                </div>
              </div>
              <span className="text-gray-400 shrink-0 mt-1">
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            </button>

            {isExpanded && entry.answer && (
              <div className="px-3 pb-3 pt-1 border-t border-gray-100">
                <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap font-mono bg-gray-50 p-3 rounded-md">
                  {entry.answer.synthesis}
                </div>
              </div>
            )}

            {isExpanded && entry.error && (
              <div className="px-3 pb-3 pt-1 border-t border-gray-100">
                <div className="text-xs text-red-600 bg-red-50 p-3 rounded-md font-mono">
                  {entry.error}
                </div>
              </div>
            )}

            {isExpanded && entry.loading && (
              <div className="px-3 pb-3 pt-1 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue pulse-dot" />
                  <span className="text-xs text-gray-500 font-mono">Searching...</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}