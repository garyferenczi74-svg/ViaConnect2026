"use client";

/**
 * RatingButtons (Prompt #60b / 219F)
 * Thumbs up/down on the most recent assistant message. Persists via /api/advisor/rate.
 */

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface RatingButtonsProps {
  conversationId?: string | null;
}

export default function RatingButtons({ conversationId }: RatingButtonsProps) {
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const submit = async (value: "up" | "down") => {
    if (rating !== null || status === "saving") return;
    setRating(value);
    if (!conversationId) {
      // Local-only feedback when id not yet available
      setStatus("saved");
      return;
    }
    setStatus("saving");
    try {
      const res = await fetch("/api/advisor/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          conversationId,
          rating: value === "up" ? 5 : 1,
        }),
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/[0.08]">
      <button
        type="button"
        onClick={() => void submit("up")}
        disabled={rating !== null}
        className={`p-1 rounded transition-colors ${
          rating === "up" ? "text-[#2DA5A0]" : "text-white/30 hover:text-white/60 hover:bg-white/10"
        } disabled:cursor-default`}
        aria-label="Helpful"
      >
        <ThumbsUp className="w-3.5 h-3.5" strokeWidth={1.5} />
      </button>
      <button
        type="button"
        onClick={() => void submit("down")}
        disabled={rating !== null}
        className={`p-1 rounded transition-colors ${
          rating === "down" ? "text-[#B75E18]" : "text-white/30 hover:text-white/60 hover:bg-white/10"
        } disabled:cursor-default`}
        aria-label="Not helpful"
      >
        <ThumbsDown className="w-3.5 h-3.5" strokeWidth={1.5} />
      </button>
      {status === "saved" && (
        <span className="text-[10px] text-white/30 ml-1">Thanks for the feedback</span>
      )}
      {status === "error" && (
        <span className="text-[10px] text-white/30 ml-1">Could not save feedback</span>
      )}
    </div>
  );
}
