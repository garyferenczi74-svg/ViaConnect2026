'use client';

// ScanTimeOfDayRecommendation.tsx  (Prompt #169b, spec section 11.1)
//
// A subtle, dismissible recommendation surfaced before / around capture, AFTER
// the user has at least one prior scan: "For the most reliable trend, try to scan
// around the same time of day. Your last scan was at TIME."
//
// RECOMMENDATION ONLY, never a restriction: it never blocks capture. It is hidden
// entirely before the first scan (no "last scan time" to anchor on yet). The
// time-of-day is derived from the most recent scan's created_at (timestamptz)
// the scan-creation instant, because body_photo_sessions.session_date is DATE-only
// and carries no time. See src/lib/body-tracker/time-of-day-trend.ts.
//
// Styling mirrors the body-tracker info callouts (soft teal accent to read as
// guidance, not an error). Lucide strokeWidth 1.5. Copy uses commas/colons only.

import { useEffect, useState } from 'react';
import { Clock3, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  minutesOfDayFromInstant,
  buildSameTimeRecommendation,
} from '@/lib/body-tracker/time-of-day-trend';

interface ScanTimeOfDayRecommendationProps {
  // Bump to re-read after a new scan completes.
  refreshKey?: number;
  className?: string;
}

export function ScanTimeOfDayRecommendation({
  refreshKey = 0,
  className = '',
}: ScanTimeOfDayRecommendationProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { if (mounted) setMessage(null); return; }
        // Most recent scan's creation instant (the time-of-day source).
        const { data } = await supabase
          .from('body_photo_sessions')
          .select('created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!mounted) return;
        const createdAt = (data as { created_at?: string } | null)?.created_at ?? null;
        const lastMinute = minutesOfDayFromInstant(createdAt);
        setMessage(buildSameTimeRecommendation(lastMinute));
      } catch {
        if (mounted) setMessage(null);
      }
    })();
    return () => { mounted = false; };
  }, [refreshKey]);

  if (dismissed || !message) return null;

  return (
    <div
      data-testid="scan-time-of-day-recommendation"
      className={`flex items-start gap-3 rounded-2xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 p-4 ${className}`}
    >
      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-[#2DA5A0]/20">
        <Clock3 className="h-4.5 w-4.5 text-[#2DA5A0]" strokeWidth={1.5} />
      </div>
      <p className="flex-1 min-w-0 text-xs leading-relaxed text-white/70">{message}</p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        className="flex-none rounded-lg p-1.5 text-white/40 hover:bg-white/[0.06] hover:text-white/70 min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        <X className="h-4 w-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}
