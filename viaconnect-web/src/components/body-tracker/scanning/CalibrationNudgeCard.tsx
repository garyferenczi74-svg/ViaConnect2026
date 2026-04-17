'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { CALIBRATION_NUDGES } from '@/lib/arnold/scanning/calibrationManager';
import type { NudgeTriggerKey } from '@/lib/arnold/scanning/calibrationManager';

interface CalibrationNudgeCardProps {
  trigger: NudgeTriggerKey;
}

interface NudgeState {
  dismissed: boolean;
}

export function CalibrationNudgeCard({ trigger }: CalibrationNudgeCardProps) {
  const [state, setState] = useState<NudgeState>({ dismissed: false });
  const [userId, setUserId] = useState<string | null>(null);
  const def = CALIBRATION_NUDGES.find((n) => n.trigger === trigger);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted || !user) return;
      setUserId(user.id);
      const { data } = await supabase
        .from('scan_calibration_nudges')
        .select('dismissed_at, shown_count')
        .eq('user_id', user.id)
        .eq('trigger_key', trigger)
        .maybeSingle();
      if (!mounted) return;
      const row = data as { dismissed_at: string | null; shown_count: number } | null;
      if (row?.dismissed_at) {
        setState({ dismissed: true });
      } else {
        await supabase
          .from('scan_calibration_nudges')
          .upsert({
            user_id: user.id,
            trigger_key: trigger,
            last_shown_at: new Date().toISOString(),
            shown_count: (row?.shown_count ?? 0) + 1,
          } as never, { onConflict: 'user_id,trigger_key' });
      }
    })();
    return () => { mounted = false; };
  }, [trigger]);

  async function handleDismiss() {
    if (!userId) return;
    setState({ dismissed: true });
    const supabase = createClient();
    await supabase
      .from('scan_calibration_nudges')
      .update({ dismissed_at: new Date().toISOString() } as never)
      .eq('user_id', userId)
      .eq('trigger_key', trigger);
  }

  async function handleActed() {
    if (!userId) return;
    const supabase = createClient();
    await supabase
      .from('scan_calibration_nudges')
      .update({ acted_at: new Date().toISOString() } as never)
      .eq('user_id', userId)
      .eq('trigger_key', trigger);
  }

  if (!def || state.dismissed) return null;

  const priorityAccent =
    def.priority === 'high'   ? '#E8803A' :
    def.priority === 'medium' ? '#2DA5A0' :
    '#9CA3AF';

  const body = (
    <div className="flex items-start gap-3 flex-1">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg"
           style={{ backgroundColor: `${priorityAccent}22` }}>
        <Sparkles className="h-4 w-4" strokeWidth={1.5} style={{ color: priorityAccent }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/75 leading-relaxed">{def.message}</p>
      </div>
    </div>
  );

  const Container = def.ctaRoute ? Link : 'div';
  const containerProps = def.ctaRoute ? { href: def.ctaRoute, onClick: handleActed } : {};

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 flex items-start gap-2">
      {/* @ts-expect-error: polymorphic link */}
      <Container {...containerProps} className="flex-1 flex items-start gap-3">
        {body}
        {def.ctaRoute && (
          <span className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold flex-none min-h-[32px]"
                style={{ borderColor: `${priorityAccent}66`, color: priorityAccent, backgroundColor: `${priorityAccent}14` }}>
            {def.cta}
            <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
          </span>
        )}
      </Container>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="flex items-center justify-center rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.06] min-h-[32px] min-w-[32px]"
      >
        <X className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
    </div>
  );
}
