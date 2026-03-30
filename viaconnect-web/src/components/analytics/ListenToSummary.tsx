"use client";

import { useState, useEffect } from "react";
import { Volume2, Pause } from "lucide-react";

interface ListenToSummaryProps {
  summaryText: string;
}

export function ListenToSummary({ summaryText }: ListenToSummaryProps) {
  const [playing, setPlaying] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined" && !window.speechSynthesis) {
      setSupported(false);
    }
  }, []);

  const handlePlay = () => {
    if (!supported) return;

    if (playing) {
      window.speechSynthesis.cancel();
      setPlaying(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(summaryText);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.lang = "en-US";

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) => v.name.includes("Samantha") || v.name.includes("Google US English") || v.name.includes("Microsoft Zira")
    );
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => setPlaying(false);

    window.speechSynthesis.speak(utterance);
    setPlaying(true);
  };

  useEffect(() => {
    return () => { window.speechSynthesis?.cancel(); };
  }, []);

  if (!supported) return null;

  return (
    <button
      onClick={handlePlay}
      className="min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/40 text-xs font-medium hover:bg-white/8 hover:text-white/60 transition-all"
    >
      {playing ? (
        <>
          <Pause className="w-3.5 h-3.5 text-teal-400" strokeWidth={1.5} />
          <span className="text-teal-400">Pause</span>
        </>
      ) : (
        <>
          <Volume2 className="w-3.5 h-3.5" strokeWidth={1.5} />
          Listen to Your Summary
        </>
      )}
    </button>
  );
}
