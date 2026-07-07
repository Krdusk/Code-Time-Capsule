export default function ProcessingState() {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-400 font-mono py-2">
      <div className="flex gap-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-blue animate-pulse" />
        <span className="w-1.5 h-1.5 rounded-full bg-blue animate-pulse" style={{ animationDelay: "0.2s" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-blue animate-pulse" style={{ animationDelay: "0.4s" }} />
      </div>
      Thinking...
    </div>
  );
}