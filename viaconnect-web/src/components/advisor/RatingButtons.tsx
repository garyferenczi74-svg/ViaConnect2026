"use client";

/**
 * RatingButtons (Prompt #60b — advisor sub-component)
 *
 * Thumbs-up/down on the most recent assistant message. Posts to a future
 * /api/advisor/rate endpoint (Prompt #61). For now we just track local state
 * and show feedback without persisting — Prompt #61 wires the persistence.
 */

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface RatingButtonsProps {
  conversationId?: string | null;
}

export default function RatingButtons({ conversationId }: RatingButtonsProps) {
  const [rating, setRating] = useState<"up" | "down" | null>(null);

  const submit = async (value: "up" | "down") => {
    setRating(value);
    if (!conversationId) return;
    // POST endpoint lands in Prompt #61. For now: best-effort fire-and-forget.
    try {
      await fetch("/api/advisor/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, rating: value === "up" ? 5 : 1 }),
      });
    } catch { /* ignore */ }
  };

  return (
    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/[0.08]">
      <button
        onClick={() => submit("up")}
        disabled={rating !== null}
        className={`p-1 rounded transition-colors ${rating === "up" ? "text-[#2DA5A0]" : "text-white/30 hover:text-white/60 hover:bg-white/10"} disabled:cursor-default`}
        aria-label="Helpful"
      >
        <ThumbsUp className="w-3.5 h-3.5" strokeWidth={1.5} />
      </button>
      <button
        onClick={() => submit("down")}
        disabled={rating !== null}
        className={`p-1 rounded transition-colors ${rating === "down" ? "text-[#B75E18]" : "text-white/30 hover:text-white/60 hover:bg-white/10"} disabled:cursor-default`}
        aria-label="Not helpful"
      >
        <ThumbsDown className="w-3.5 h-3.5" strokeWidth={1.5} />
      </button>
    </div>
  );
}
