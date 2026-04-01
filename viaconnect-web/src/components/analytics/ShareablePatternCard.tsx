"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

interface Pattern {
  name: string;
}

interface ShareablePatternCardProps {
  patterns: Pattern[];
  burdenScore: number;
}

export function ShareablePatternCard({ patterns, burdenScore }: ShareablePatternCardProps) {
  const [shared, setShared] = useState(false);

  const handleShare = async () => {
    const shareText = `My top patterns: ${patterns.map((p) => p.name).join(", ")} \, Bio Optimization: ${burdenScore}/100`;
    const shareData = {
      title: "My ViaConnect\u2122 Ultrathink Patterns",
      text: shareText,
      url: "https://www.viaconnectapp.com",
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareText} ${shareData.url}`);
      }
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      // User cancelled share
    }
  };

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/8 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/25">Share your journey</p>
        <button
          onClick={handleShare}
          className="min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/30 text-[10px] font-medium hover:bg-white/8 transition-all"
        >
          {shared ? (
            <>
              <Check className="w-3 h-3 text-teal-400" strokeWidth={2} />
              <span className="text-teal-400">Shared</span>
            </>
          ) : (
            <>
              <Share2 className="w-3 h-3" strokeWidth={1.5} />
              Share My Patterns
            </>
          )}
        </button>
      </div>
    </div>
  );
}
