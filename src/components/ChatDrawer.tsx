import { useState, useRef, useEffect, type FormEvent } from "react";
import { X, Send, MessageSquare, GitCommit, CircleDot, Activity } from "lucide-react";
import type { ConversationEntry, Answer } from "../types";
import ProcessingState from "./ProcessingInline";
import ErrorState from "./ErrorInline";
import { generateAnswer } from "../services/ai-service";

interface ChatDrawerProps {
  repoId: string;
  repoName: string;
  open: boolean;
  onClose: () => void;
}

function hasEvidence(answer: Answer): boolean {
  return (
    answer.evidence.git.length > 0 ||
    answer.evidence.issues.length > 0 ||
    answer.evidence.ci.length > 0
  );
}

export default function ChatDrawer({ repoId, repoName, open, onClose }: ChatDrawerProps) {
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const entry: ConversationEntry = {
      id: crypto.randomUUID(),
      question: trimmed,
      answer: null,
      loading: true,
      error: null,
    };

    setConversation((prev) => [...prev, entry]);
    setInput("");
    setLoading(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const answer = await generateAnswer(repoId, repoName, trimmed, controller.signal);
      setConversation((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, answer, loading: false } : e))
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setConversation((prev) =>
        prev.map((e) =>
          e.id === entry.id
            ? { ...e, loading: false, error: err instanceof Error ? err.message : "An unexpected error occurred" }
            : e
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (question: string) => {
    const entry: ConversationEntry = {
      id: crypto.randomUUID(),
      question,
      answer: null,
      loading: true,
      error: null,
    };
    setConversation((prev) => [...prev, entry]);
    setLoading(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const answer = await generateAnswer(repoId, repoName, question, controller.signal);
      setConversation((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, answer, loading: false } : e))
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setConversation((prev) =>
        prev.map((e) =>
          e.id === entry.id
            ? { ...e, loading: false, error: err instanceof Error ? err.message : "An unexpected error occurred" }
            : e
        )
      );
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 animate-fade-in-overlay"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed bottom-0 right-0 w-full max-w-md z-50 animate-slide-in-up">
        <div className="bg-white border border-blue-border rounded-t-2xl shadow-xl flex flex-col max-h-[60vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-light flex items-center justify-center">
                <MessageSquare size={16} className="text-blue" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-black">Ask AI</h3>
                <p className="text-[10px] text-gray-400 font-mono">{repoName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-150 cursor-pointer"
              aria-label="Close chat"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3 min-h-0">
            {conversation.length === 0 && (
              <div className="text-center py-8">
                <p className="text-xs text-gray-400 font-mono">
                  Ask anything about the repository's history &mdash; commits, issues, contributors, and more.
                </p>
              </div>
            )}
            {conversation.map((entry) => (
              <div key={entry.id} className="space-y-2">
                <div className="flex justify-end">
                  <div className="bg-blue-light border border-blue-border rounded-lg px-3.5 py-2 max-w-xs">
                    <p className="text-sm text-blue font-medium">{entry.question}</p>
                  </div>
                </div>
                {entry.loading && <ProcessingState />}
                {entry.error && !entry.loading && (
                  <ErrorState message={entry.error} onRetry={() => handleRetry(entry.question)} />
                )}
                {entry.answer && !entry.loading && !entry.error && (
                  <div className="space-y-2.5">
                    {/* Synthesis */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5">
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {entry.answer.synthesis}
                      </p>
                    </div>
                    {/* Evidence badges */}
                    {hasEvidence(entry.answer) && (
                      <div className="flex flex-wrap gap-1.5 px-1">
                        {entry.answer.evidence.git.length > 0 && (
                          <span className="text-[10px] bg-blue-light text-blue font-mono px-2 py-0.5 rounded-full border border-blue-border flex items-center gap-1">
                            <GitCommit size={10} /> {entry.answer.evidence.git.length} commit{entry.answer.evidence.git.length !== 1 ? "s" : ""}
                          </span>
                        )}
                        {entry.answer.evidence.issues.length > 0 && (
                          <span className="text-[10px] bg-amber-50 text-amber-700 font-mono px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                            <CircleDot size={10} /> {entry.answer.evidence.issues.length} issue{entry.answer.evidence.issues.length !== 1 ? "s" : ""}
                          </span>
                        )}
                        {entry.answer.evidence.ci.length > 0 && (
                          <span className="text-[10px] bg-green-50 text-green-700 font-mono px-2 py-0.5 rounded-full border border-green-200 flex items-center gap-1">
                            <Activity size={10} /> {entry.answer.evidence.ci.length} CI run{entry.answer.evidence.ci.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-5 py-3 border-t border-gray-100">
            <form onSubmit={handleSubmit} className="relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about the codebase..."
                disabled={loading}
                className="w-full pl-4 pr-12 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-black placeholder:text-gray-400 outline-none focus:border-blue focus:shadow-[0_0_0_3px_rgba(26,94,188,0.12)] transition-all duration-150 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-blue text-white rounded-lg text-sm font-semibold transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] hover:bg-blue-dark"
                aria-label="Send"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}