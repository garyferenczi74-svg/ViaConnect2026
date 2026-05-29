'use client';

// Prompt #170 Phase 1l: 1-tap opt-in to the corpus accuracy research program.
//
// Shows when user_nutrivision_settings.corpus_opt_in is false (the default)
// AND the user has not dismissed the banner during the session. Tap to
// upsert the flag via the supabase client; tap Not now to dismiss for the
// session only (no DB write).
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Sparkles, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface CorpusOptInBannerProps {
  userId: string;
  // Caller can pass true to skip the banner (when the user already opted in).
  alreadyOptedIn: boolean;
  // Caller passes a session-only dismissal state.
  dismissed: boolean;
  onDismiss: () => void;
  onOptIn: () => void;
}

export function CorpusOptInBanner({
  userId,
  alreadyOptedIn,
  dismissed,
  onDismiss,
  onOptIn,
}: CorpusOptInBannerProps) {
  const [submitting, setSubmitting] = useState(false);

  if (alreadyOptedIn || dismissed) return null;

  const handleOptIn = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('user_nutrivision_settings')
        .upsert(
          { user_id: userId, corpus_opt_in: true },
          { onConflict: 'user_id' },
        );
      if (error) {
        toast.error('Could not opt in. Try again later.');
        setSubmitting(false);
        return;
      }
      toast.success('Thanks. You are contributing to accuracy research.');
      onOptIn();
    } catch {
      toast.error('Could not opt in. Try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="region"
      aria-label="Contribute to NutriVision accuracy research"
      className="flex items-start gap-3 rounded-2xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 p-3"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2DA5A0]/20 text-[#2DA5A0]">
        <Sparkles className="h-4 w-4" strokeWidth={1.5} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-white">
          Contribute to ViaConnect accuracy research
        </p>
        <p className="mt-0.5 text-[11px] text-white/70">
          Share your saved meals to help improve recognition for everyone. You can opt out anytime.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleOptIn}
            disabled={submitting}
            className="rounded-full bg-[#2DA5A0] px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-[#2DA5A0]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Opt in'}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full border border-white/[0.08] bg-white/5 px-2.5 py-1 text-[11px] text-white/75 transition-colors hover:bg-white/10"
          >
            Not now
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss banner"
        className="text-white/55 transition-colors hover:text-white"
      >
        <X className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
    </div>
  );
}
