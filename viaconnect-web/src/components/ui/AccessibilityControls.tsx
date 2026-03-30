"use client";

import { useState, useEffect } from "react";
import { Contrast, Type } from "lucide-react";

export function AccessibilityControls() {
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("high-contrast", highContrast);
  }, [highContrast]);

  useEffect(() => {
    document.documentElement.classList.toggle("large-text", largeText);
  }, [largeText]);

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => setHighContrast(!highContrast)}
        className={`min-h-[44px] px-3 py-2 rounded-lg text-[10px] font-medium transition-all ${
          highContrast
            ? "bg-white text-black border border-white"
            : "bg-white/5 border border-white/10 text-white/30 hover:text-white/50"
        }`}
      >
        <Contrast className="w-3.5 h-3.5 inline mr-1" strokeWidth={1.5} />
        High Contrast
      </button>
      <button
        onClick={() => setLargeText(!largeText)}
        className={`min-h-[44px] px-3 py-2 rounded-lg text-[10px] font-medium transition-all ${
          largeText
            ? "bg-teal-400/15 border border-teal-400/30 text-teal-400"
            : "bg-white/5 border border-white/10 text-white/30 hover:text-white/50"
        }`}
      >
        <Type className="w-3.5 h-3.5 inline mr-1" strokeWidth={1.5} />
        Larger Text
      </button>
    </div>
  );
}
