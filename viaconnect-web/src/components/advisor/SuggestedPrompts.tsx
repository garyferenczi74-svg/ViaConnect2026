"use client";

/**
 * SuggestedPrompts (Prompt #60b — advisor sub-component)
 *
 * Empty-state prompt chips shown above the input when the conversation is fresh.
 * Mobile: wraps to 2 columns. Desktop: free-flow flex wrap.
 */

interface SuggestedPromptsProps {
  prompts: string[];
  onPick: (prompt: string) => void;
  accentColor: string;
}

export default function SuggestedPrompts({ prompts, onPick, accentColor }: SuggestedPromptsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
      {prompts.map((p, i) => (
        <button
          key={i}
          onClick={() => onPick(p)}
          className="px-3 py-2 rounded-lg text-xs md:text-sm text-white/70 hover:text-white border border-white/[0.08] hover:border-white/20 bg-white/5 hover:bg-white/10 transition-all"
          style={{ borderColor: `${accentColor}33` }}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
