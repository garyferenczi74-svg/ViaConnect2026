/**
 * Voice editing settings section per Prompt 170j §11.7 (Gate 2 inline).
 *
 * Four toggles: enable voice, Quick Apply Mode (with confirmation dialog
 * defaulting focus to "Keep it off" per Hannah's accessibility-as-safety
 * pattern), audio chimes, push-to-talk default.
 *
 * Phase 1c-3: persists via /api/nutrition/voice/preferences (replaces the
 * Phase 1c-2 localStorage stub). Optimistic UI: toggle updates immediately,
 * server upsert happens in the background. On error the prior state is
 * restored.
 */

'use client';

import { Mic } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface VoicePreferences {
  voice_editing_enabled: boolean;
  voice_quick_apply_mode: boolean;
  voice_feedback_chimes: boolean;
  voice_push_to_talk_default: boolean;
}

const DEFAULT_PREFS: VoicePreferences = {
  voice_editing_enabled: true,
  voice_quick_apply_mode: false,
  voice_feedback_chimes: false,
  voice_push_to_talk_default: false,
};

export function VoiceSettingsSection() {
  const [prefs, setPrefs] = useState<VoicePreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [quickApplyDialogOpen, setQuickApplyDialogOpen] = useState(false);
  const keepOffRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await fetch('/api/nutrition/voice/preferences');
        if (resp.ok) {
          const data = (await resp.json()) as Partial<VoicePreferences>;
          if (!cancelled) {
            setPrefs((p) => ({ ...p, ...data }));
          }
        }
      } catch {
        // network or auth failure; defaults stay
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (quickApplyDialogOpen) {
      keepOffRef.current?.focus();
    }
  }, [quickApplyDialogOpen]);

  const persistPref = useCallback(
    async (key: keyof VoicePreferences, value: boolean): Promise<void> => {
      const previous = prefs;
      setPrefs((p) => ({ ...p, [key]: value }));
      try {
        const resp = await fetch('/api/nutrition/voice/preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [key]: value }),
        });
        if (!resp.ok) {
          setPrefs(previous);
        }
      } catch {
        setPrefs(previous);
      }
    },
    [prefs]
  );

  const handleQuickApplyToggle = (value: boolean): void => {
    if (value) {
      setQuickApplyDialogOpen(true);
    } else {
      void persistPref('voice_quick_apply_mode', false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/55 p-5 backdrop-blur-md">
      <header className="mb-4 flex items-center gap-2">
        <Mic size={18} strokeWidth={1.5} className="text-[#2DA5A0]" aria-hidden="true" />
        <h2 className="text-base font-semibold text-white">Voice editing</h2>
      </header>

      <div className="space-y-4" aria-busy={loading}>
        <VoiceToggle
          label="Voice editing on result review"
          on={prefs.voice_editing_enabled}
          disabled={loading}
          onChange={(v) => void persistPref('voice_editing_enabled', v)}
        />
        <VoiceToggle
          label="Quick Apply Mode for high-confidence edits"
          helper="Skip the preview when I am very confident. You can always undo."
          on={prefs.voice_quick_apply_mode}
          disabled={loading}
          onChange={handleQuickApplyToggle}
        />
        <VoiceToggle
          label="Audio feedback (chimes)"
          helper="Play a soft chime when voice capture starts and ends."
          on={prefs.voice_feedback_chimes}
          disabled={loading}
          onChange={(v) => void persistPref('voice_feedback_chimes', v)}
        />
        <VoiceToggle
          label="Push-to-talk by default"
          helper="Hold the voice button instead of tapping to start."
          on={prefs.voice_push_to_talk_default}
          disabled={loading}
          onChange={(v) => void persistPref('voice_push_to_talk_default', v)}
        />
      </div>

      <p className="mt-4 text-xs text-white/55">
        Your voice is processed on your device when possible and never retained.
      </p>

      {quickApplyDialogOpen && (
        <QuickApplyConfirmDialog
          keepOffRef={keepOffRef}
          onTurnOn={() => {
            void persistPref('voice_quick_apply_mode', true);
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
  disabled?: boolean;
  onChange: (v: boolean) => void;
}

function VoiceToggle({ label, helper, on, disabled, onChange }: VoiceToggleProps) {
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
        disabled={disabled}
        onClick={() => onChange(!on)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/40 disabled:opacity-50 ${
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
