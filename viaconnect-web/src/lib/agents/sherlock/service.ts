'use client';

// Sherlock — client-side service layer for UI components.
// Provides read-only access to Sherlock's state, activity, and trends so
// the Research Hub UI can display Sherlock's status without going through
// any server-side agent logic.

import { createClient } from '@/lib/supabase/client';
import type {
  SherlockActivity,
  SherlockAgentState,
  SherlockDailySummary,
  SherlockTrend,
} from './types';

type SBClient = ReturnType<typeof createClient>;
const sb = (): SBClient => createClient();

// ─── Agent state ───────────────────────────────────────────
export async function getAgentState(): Promise<SherlockAgentState | null> {
  const { data } = await (sb() as any)
    .from('sherlock_agent_state')
    .select('*')
    .order('last_heartbeat', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as SherlockAgentState) || null;
}

// ─── Daily summary ─────────────────────────────────────────
/**
 * Builds a SherlockDailySummary from agent state + activity log.
 * Used by SherlockActivityFeed to show "Sherlock found N insights today".
 */
export async function getDailySummary(userId: string | null): Promise<SherlockDailySummary> {
  const supabase = sb();
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();

  const [stateResult, activityResult, trendsResult] = await Promise.all([
    (supabase as any)
      .from('sherlock_agent_state')
      .select('is_active, last_heartbeat, current_task_id, items_discovered_today, alerts_generated_today')
      .order('last_heartbeat', { ascending: false })
      .limit(1)
      .maybeSingle(),
    (supabase as any)
      .from('sherlock_activity_log')
      .select('action, items_processed, details')
      .gte('created_at', sinceIso)
      .or(userId ? `user_id.eq.${userId},user_id.is.null` : 'user_id.is.null')
      .order('created_at', { ascending: false })
      .limit(200),
    (supabase as any)
      .from('sherlock_trends')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
  ]);

  const state = stateResult.data as
    | {
        is_active: boolean;
        last_heartbeat: string;
        current_task_id: string | null;
        items_discovered_today: number;
        alerts_generated_today: number;
      }
    | null;

  const activity = (activityResult.data as any[]) || [];

  let highly_relevant = 0;
  let items_discovered = state?.items_discovered_today ?? 0;
  let alerts_generated = state?.alerts_generated_today ?? 0;

  // Derive from activity log if state hasn't tracked yet (cron not run)
  if (items_discovered === 0 && activity.length > 0) {
    items_discovered = activity
      .filter((a) => a.action === 'fetched_content' || a.action === 'curated_feed')
      .reduce((sum, a) => sum + (a.items_processed || 0), 0);
    alerts_generated = activity
      .filter((a) => a.action === 'generated_alert')
      .reduce((sum, a) => sum + (a.items_processed || 0), 0);
  }

  highly_relevant = activity
    .filter((a) => a.action === 'scored_item')
    .reduce((sum, a) => {
      const details = a.details as { high_relevance_count?: number } | null;
      return sum + (details?.high_relevance_count || 0);
    }, 0);

  return {
    items_discovered,
    alerts_generated,
    trends_detected: typeof trendsResult.count === 'number' ? trendsResult.count : 0,
    highly_relevant,
    last_run_at: state?.last_heartbeat || null,
    is_active: state?.is_active ?? true,
    is_running: !!state?.current_task_id,
  };
}

// ─── Recent activity ───────────────────────────────────────
export async function getRecentActivity(
  userId: string | null,
  limit = 8,
): Promise<SherlockActivity[]> {
  let q = (sb() as any)
    .from('sherlock_activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (userId) q = q.or(`user_id.eq.${userId},user_id.is.null`);
  const { data } = await q;
  return (data as SherlockActivity[]) || [];
}

// ─── Trends ────────────────────────────────────────────────
export async function getActiveTrends(limit = 5): Promise<SherlockTrend[]> {
  const { data } = await (sb() as any)
    .from('sherlock_trends')
    .select('*')
    .eq('is_active', true)
    .order('trend_score', { ascending: false })
    .limit(limit);
  return (data as SherlockTrend[]) || [];
}

// ─── Manual trigger (for "refresh" button in UI) ───────────
export async function triggerSherlockRun(): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch('/api/sherlock/run', { method: 'POST' });
    const json = await res.json();
    return { ok: res.ok, message: json.message || (res.ok ? 'Sherlock is running' : 'Failed to trigger') };
  } catch (e: any) {
    return { ok: false, message: e?.message || 'Network error' };
  }
}
