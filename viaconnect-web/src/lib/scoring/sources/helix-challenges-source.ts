// Helix Challenges source for the Bio Optimization Score compute bundle.
//
// Primary table: helix_challenge_participants (9 cols; both user_id and
// challenge_id are NULLABLE per the live schema). Defensive query
// includes "user_id IS NOT NULL" filter to avoid returning rows that
// somehow lack ownership.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface HelixChallengesSource {
  last_engaged_at: string | null;
  recent_events_7d: number;
  recent_events_30d: number;
  source_specific?: {
    active_count: number;
    completed_count: number;
    tokens_earned_30d: number;
  };
}

interface ParticipantRow {
  joined_at?: string | null;
  completion_date?: string | null;
  status?: string | null;
  tokens_awarded?: number | string | null;
}

function withinDays(iso: string | null | undefined, days: number): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= days * 86400000;
}

export async function getHelixChallengesSource(
  userId: string,
  supabase: SupabaseClient,
): Promise<HelixChallengesSource> {
  const empty: HelixChallengesSource = {
    last_engaged_at: null,
    recent_events_7d: 0,
    recent_events_30d: 0,
    source_specific: {
      active_count: 0,
      completed_count: 0,
      tokens_earned_30d: 0,
    },
  };

  try {
    const { data, error } = await supabase
      .from('helix_challenge_participants')
      .select('joined_at, completion_date, status, tokens_awarded')
      .eq('user_id', userId)
      .not('user_id', 'is', null);

    if (error || !data) {
      return empty;
    }

    const rows = data as ParticipantRow[];
    if (rows.length === 0) {
      return empty;
    }

    const joinedTimes = rows
      .map((r) => r.joined_at)
      .filter((t): t is string => typeof t === 'string')
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    const last_engaged_at = joinedTimes[0] ?? null;

    const recent_events_7d = rows.filter(
      (r) => withinDays(r.joined_at ?? null, 7) || withinDays(r.completion_date ?? null, 7),
    ).length;
    const recent_events_30d = rows.filter(
      (r) => withinDays(r.joined_at ?? null, 30) || withinDays(r.completion_date ?? null, 30),
    ).length;

    const active_count = rows.filter((r) => r.status === 'active').length;
    const completed_count = rows.filter((r) => r.status === 'completed').length;
    const tokens_earned_30d = rows
      .filter((r) => withinDays(r.completion_date ?? null, 30))
      .reduce((sum, r) => sum + (Number(r.tokens_awarded) || 0), 0);

    return {
      last_engaged_at,
      recent_events_7d,
      recent_events_30d,
      source_specific: {
        active_count,
        completed_count,
        tokens_earned_30d,
      },
    };
  } catch {
    return empty;
  }
}
