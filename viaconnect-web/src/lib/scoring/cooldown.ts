// Bio Optimization Score cooldown helper.
//
// Reads the most recent computed_at from bio_optimization_history and
// reports whether the 30-minute compute cooldown applies. The
// bypass-trigger logic (caq / labs / genetics / explicit bypass flag)
// lives in the Phase C compute module; this helper reports raw
// timestamp truth only.

import type { SupabaseClient } from '@supabase/supabase-js';

const COOLDOWN_MINUTES = 30;

export interface CooldownStatus {
  in_cooldown: boolean;
  last_compute_at: string | null;
  minutes_remaining: number;
}

export async function isInCooldown(
  userId: string,
  supabase: SupabaseClient,
): Promise<CooldownStatus> {
  const empty: CooldownStatus = {
    in_cooldown: false,
    last_compute_at: null,
    minutes_remaining: 0,
  };

  try {
    // Phase F-patch (Fix 2): order by (date DESC, compute_seq DESC) to ride
    // the unique index bos_history_user_date_seq_key (user_id, date,
    // compute_seq) added by §6 of 20260512020236_bos_compute_v2.sql. The
    // index prefix is user_id; the two-key ordered traversal yields the
    // most-recent row's computed_at without a sort step.
    const { data, error } = await supabase
      .from('bio_optimization_history')
      .select('date, compute_seq, computed_at')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('compute_seq', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return empty;
    }

    const row = (data ?? null) as { computed_at?: string | null; last?: string | null } | null;
    const lastIso = row?.computed_at ?? row?.last ?? null;
    if (!lastIso) {
      return empty;
    }

    const lastMs = new Date(lastIso).getTime();
    if (Number.isNaN(lastMs)) {
      return empty;
    }

    const diffMinutes = (Date.now() - lastMs) / 60000;
    if (diffMinutes >= COOLDOWN_MINUTES) {
      return {
        in_cooldown: false,
        last_compute_at: lastIso,
        minutes_remaining: 0,
      };
    }

    return {
      in_cooldown: true,
      last_compute_at: lastIso,
      minutes_remaining: Math.max(0, Math.ceil(COOLDOWN_MINUTES - diffMinutes)),
    };
  } catch {
    return empty;
  }
}
