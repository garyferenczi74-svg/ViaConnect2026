"use client";

import { useState } from "react";
import { Mic } from "lucide-react";
import toast from "react-hot-toast";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}

export function VoiceInput({ onTranscript }: VoiceInputProps) {
  const [listening, setListening] = useState(false);

  const handleVoice = () => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      toast.error("Voice input not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript);
      setListening(false);
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognition.start();
    setListening(true);
  };

  return (
    <button
      onClick={handleVoice}
      type="button"
      className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-all ${
        listening
          ? "bg-red-400/15 border border-red-400/30 text-red-400 animate-pulse"
          : "bg-white/5 border border-white/10 text-white/25 hover:text-white/40"
      }`}
      title="Speak your description"
    >
      <Mic className="w-4 h-4" strokeWidth={1.5} />
    </button>
  );
}
