"use client";

import { SkipForward } from "lucide-react";

interface SkipButtonProps {
  onSkip: () => void;
}

export function SkipButton({ onSkip }: SkipButtonProps) {
  return (
    <button
      onClick={onSkip}
      className="text-[10px] text-white/20 hover:text-white/35 transition-colors flex items-center gap-1 min-h-[36px]"
    >
      <SkipForward className="w-3 h-3" strokeWidth={1.5} />
      Skip for now \, your report will still be 95% accurate
    </button>
  );
}
