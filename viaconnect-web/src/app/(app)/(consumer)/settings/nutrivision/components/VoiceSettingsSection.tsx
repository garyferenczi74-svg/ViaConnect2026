/**
 * Voice editing settings section per Prompt 170j §11.7 (Gate 2 answered
 * inline section).
 *
 * Four toggles: enable voice, Quick Apply Mode (with confirmation dialog
 * defaulting focus to "Keep it off" per Hannah's accessibility-as-safety
 * pattern), audio chimes, push-to-talk default. Persists to localStorage
 * for now; Supabase wire-up lands in Phase 1c-3.
 */

'use client';

import { Mic } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface VoicePreferences {
  voice_editing_enabled: boolean;
  quick_apply_mode: boolean;
  voice_feedback_chimes: boolean;
  push_to_talk_default: boolean;
}

const DEFAULT_PREFS: VoicePreferences = {
  voice_editing_enabled: true,
  quick_apply_mode: false,
  voice_feedback_chimes: false,
  push_to_talk_default: false,
};

const STORAGE_KEY = 'viaconnect_voice_prefs';

export function VoiceSettingsSection() {
  const [prefs, setPrefs] = useState<VoicePreferences>(DEFAULT_PREFS);
  const [quickApplyDialogOpen, setQuickApplyDialogOpen] = useState(false);
  const keepOffRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<VoicePreferences>;
        setPrefs((p) => ({ ...p, ...parsed }));
      }
    } catch {
      // ignore corrupted storage
    }
  }, []);

  useEffect(() => {
    if (quickApplyDialogOpen) {
      keepOffRef.current?.focus();
    }
  }, [quickApplyDialogOpen]);

  const persistPref = useCallback(
    (key: keyof VoicePreferences, value: boolean) => {
      setPrefs((prev) => {
        const next = { ...prev, [key]: value };
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          }
        } catch {
          // ignore quota errors
        }
        return next;
      });
    },
    []
  );

  const handleQuickApplyToggle = (value: boolean): void => {
    if (value) {
      setQuickApplyDialogOpen(true);
    } else {
      persistPref('quick_apply_mode', false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/55 p-5 backdrop-blur-md">
      <header className="mb-4 flex items-center gap-2">
        <Mic size={18} strokeWidth={1.5} className="text-[#2DA5A0]" aria-hidden="true" />
        <h2 className="text-base font-semibold text-white">Voice editing</h2>
      </header>

      <div className="space-y-4">
        <VoiceToggle
          label="Voice editing on result review"
          on={prefs.voice_editing_enabled}
          onChange={(v) => persistPref('voice_editing_enabled', v)}
        />
        <VoiceToggle
          label="Quick Apply Mode for high-confidence edits"
          helper="Skip the preview when I am very confident. You can always undo."
          on={prefs.quick_apply_mode}
          onChange={handleQuickApplyToggle}
        />
        <VoiceToggle
          label="Audio feedback (chimes)"
          helper="Play a soft chime when voice capture starts and ends."
          on={prefs.voice_feedback_chimes}
          onChange={(v) => persistPref('voice_feedback_chimes', v)}
        />
        <VoiceToggle
          label="Push-to-talk by default"
          helper="Hold the voice button instead of tapping to start."
          on={prefs.push_to_talk_default}
          onChange={(v) => persistPref('push_to_talk_default', v)}
        />
      </div>

      <p className="mt-4 text-xs text-white/55">
        Your voice is processed on your device when possible and never retained.
      </p>

      {quickApplyDialogOpen && (
        <QuickApplyConfirmDialog
          keepOffRef={keepOffRef}
          onTurnOn={() => {
            persistPref('quick_apply_mode', true);
            setQuickApplyDialogOpen(false);
          }}
          onKeepOff={() => setQuickApplyDialogOpen(false)}
        />
      )}
    </section>
  );
}

interface VoiceToggleProps {
  label: string;
  helper?: string;
  on: boolean;
  onChange: (v: boolean) => void;
}

function VoiceToggle({ label, helper, on, onChange }: VoiceToggleProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">{label}</p>
        {helper && <p className="mt-0.5 text-xs text-white/60">{helper}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/40 ${
          on ? 'bg-[#2DA5A0]' : 'bg-white/15'
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
            on ? 'left-6' : 'left-1'
          }`}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}

interface QuickApplyConfirmDialogProps {
  keepOffRef: React.RefObject<HTMLButtonElement>;
  onTurnOn: () => void;
  onKeepOff: () => void;
}

function QuickApplyConfirmDialog({
  keepOffRef,
  onTurnOn,
  onKeepOff,
}: QuickApplyConfirmDialogProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qa-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A2744]/85 backdrop-blur-md px-4"
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#1E3054] p-6 shadow-2xl">
        <h3 id="qa-title" className="text-lg font-semibold text-white">
          Turn on Quick Apply Mode?
        </h3>
        <p className="mt-2 text-sm text-white/70">
          Your edits will apply without the preview step when I am highly confident. You will still have 10 seconds to undo any change.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            ref={keepOffRef}
            onClick={onKeepOff}
            className="h-12 rounded-full bg-[#2DA5A0] text-base font-semibold text-[#1E3054] transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2DA5A0]/40"
          >
            Keep it off
          </button>
          <button
            type="button"
            onClick={onTurnOn}
            className="h-12 rounded-full bg-white/10 text-base font-medium text-white/80 transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            Turn it on
          </button>
        </div>
      </div>
    </div>
  );
}
