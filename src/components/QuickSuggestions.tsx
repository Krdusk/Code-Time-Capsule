interface QuickSuggestionsProps {
  onSelect: (question: string) => void;
}

const suggestions = [
  "What was the team working on in March?",
  "Show me the state of the authentication system before the refactor.",
  "How did our test coverage change over time?",
];

export default function QuickSuggestions({ onSelect }: QuickSuggestionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((suggestion, i) => (
        <button
          key={i}
          onClick={() => onSelect(suggestion)}
          className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5 hover:text-blue hover:border-blue hover:bg-blue-light transition-all duration-150 cursor-pointer font-mono"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}