import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";
import { Send } from "lucide-react";
import QuickSuggestions from "./QuickSuggestions";

interface QuestionInputProps {
  onAsk: (question: string) => void;
  loading: boolean;
  repoName: string;
}

export default function QuestionInput({
  onAsk,
  loading,
  repoName,
}: QuestionInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    onAsk(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestion = (question: string) => {
    onAsk(question);
  };

  return (
    <div className="w-full animate-fade-in">
      <form onSubmit={handleSubmit} className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about any moment in your codebase history..."
          disabled={loading}
          className="w-full pl-5 pr-14 py-3.5 bg-white border border-blue-border rounded-xl text-sm text-black placeholder:text-gray-400 outline-none focus:border-blue focus:shadow-[0_0_0_3px_rgba(26,94,188,0.12)] transition-all duration-150 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!value.trim() || loading}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3.5 py-2 bg-blue text-white rounded-lg text-sm font-semibold transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] hover:bg-blue-dark"
          aria-label="Send question"
        >
          <Send size={16} />
        </button>
      </form>

      {/* Quick suggestions */}
      <div className="mt-3">
        <QuickSuggestions onSelect={handleSuggestion} />
      </div>
    </div>
  );
}