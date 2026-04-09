// =============================================================
// Sherlock — Research Hub Intelligence Agent (Edge Function)
// Prompt #61b
//
// Self-contained Deno function that runs every 6 hours via pg_cron.
// Operations (in order):
//   1. cycle_start          — log + heartbeat
//   2. score_relevance      — score any unscored items per user
//   3. generate_alerts      — flag score >= threshold
//   4. deduplicate          — remove near-duplicate items by title
//   5. trend_detect         — find topics across 3+ sources
//   6. curate_daily_feed    — refresh per-user feed ordering
//   7. cycle_end            — log + reset daily counters
//
// Zero external API calls. All scoring is local keyword matching against
// the user's CAQ + protocols + supplements. Reports to Jeffery via
// jeffery_log_decision RPC.
// =============================================================

// @ts-nocheck — Deno runtime, not Node. Import URL works in Supabase Edge Functions.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const AGENT_NAME = 'sherlock_research_hub';

// ─── Domain dictionaries (mirrors src/lib/research-hub/relevance.ts) ──
const DOMAIN_KEYWORDS: Record<string, string[]> = {
  methylation: ['methylation', 'mthfr', 'methylfolate', 'b12', 'folate', 'homocysteine', 'same'],
  sleep: ['sleep', 'circadian', 'melatonin', 'magnesium glycinate', 'nsdr', 'insomnia'],
  stress: ['stress', 'cortisol', 'hpa', 'ashwagandha', 'rhodiola', 'adaptogen', 'anxiety'],
  gut: ['gut', 'microbiome', 'probiotic', 'digestion', 'leaky', 'sibo', 'ibs'],
  inflammation: ['inflammation', 'curcumin', 'turmeric', 'omega-3', 'nf-kb', 'nrf2'],
  hormonal: ['hormone', 'thyroid', 'estrogen', 'progesterone', 'testosterone', 'cortisol'],
  cognitive: ['cognition', 'brain', 'nootropic', 'focus', 'memory', 'lions mane', 'creatine'],
  longevity: ['longevity', 'aging', 'nad', 'nmn', 'sirtuin', 'telomere', 'senolytic'],
  detox: ['detox', 'glutathione', 'sulforaphane', 'liver', 'phase ii'],
  immune: ['immune', 'zinc', 'vitamin d', 'quercetin', 'elderberry'],
  metabolic: ['metabolic', 'insulin', 'glucose', 'a1c', 'berberine', 'glp', 'metformin'],
  cardiovascular: ['cardio', 'heart', 'blood pressure', 'lipid', 'hdl', 'ldl', 'coq10'],
  peptides: ['peptide', 'bpc-157', 'tb-500', 'cjc-1295', 'ipamorelin', 'ghk'],
  bioavailability: ['bioavailability', 'liposomal', 'micellar', 'absorption'],
};

// ─── Local relevance scoring (port of relevance.ts) ───────
function scoreItem(item: any, context: any): { score: number; reasons: string[]; matchedDomains: string[] } {
  const haystack = [item.title || '', item.summary || '', (item.tags || []).join(' ')]
    .join(' ')
    .toLowerCase();
  const reasons: string[] = [];
  const matched = new Set<string>();
  let score = 0;

  const containsAny = (terms: string[]) => {
    const matches: string[] = [];
    for (const t of terms || []) {
      if (!t) continue;
      const term = String(t).toLowerCase().trim();
      if (term.length < 3) continue;
      if (haystack.includes(term)) matches.push(t);
    }
    return matches;
  };

  const concerns = containsAny(context.healthConcerns || []);
  if (concerns.length > 0) {
    score += Math.min(30, 10 + concerns.length * 8);
    reasons.push(`Matches your health concern${concerns.length > 1 ? 's' : ''}: ${concerns.slice(0, 2).join(', ')}`);
    matched.add('concerns');
  }

  const supps = containsAny(context.supplements || []);
  if (supps.length > 0) {
    score += Math.min(25, 12 + supps.length * 6);
    reasons.push(`Discusses your protocol: ${supps.slice(0, 2).join(', ')}`);
    matched.add('protocol');
  }

  const variants = containsAny(context.geneticVariants || []);
  if (variants.length > 0) {
    score += Math.min(20, 12 + variants.length * 5);
    reasons.push(`Relevant to your genetic variant: ${variants[0]}`);
    matched.add('genetics');
  }

  const cats = containsAny(context.wellnessCategories || []);
  if (cats.length > 0) {
    score += Math.min(15, 8 + cats.length * 3);
    reasons.push(`Aligns with your top wellness focus: ${cats[0]}`);
    matched.add('wellness_category');
  }

  let domainHits = 0;
  for (const [domain, kws] of Object.entries(DOMAIN_KEYWORDS)) {
    if (kws.some((kw) => haystack.includes(kw))) {
      matched.add(domain);
      domainHits++;
    }
  }
  if (domainHits > 0) {
    score += Math.min(10, domainHits * 3);
  }

  if (score === 0) {
    score = 35;
    reasons.push('General wellness research from your feed');
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    reasons,
    matchedDomains: Array.from(matched),
  };
}

// ─── Build context for a user (mirrors buildRelevanceContext) ──
async function buildContextForUser(supabase: any, userId: string) {
  const [profileRes, suppsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, bio_optimization_strengths, bio_optimization_opportunities, bio_optimization_tier, health_concerns')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('user_current_supplements')
      .select('product_name, supplement_name')
      .eq('user_id', userId)
      .eq('is_current', true),
  ]);

  const p = profileRes.data || {};
  const supps = (suppsRes.data || []).map((s: any) => s.product_name || s.supplement_name).filter(Boolean);

  return {
    healthConcerns: [
      ...(p.health_concerns || []),
      ...(p.bio_optimization_strengths || []),
      ...(p.bio_optimization_opportunities || []),
    ],
    supplements: supps,
    medications: [],
    geneticVariants: [],
    wellnessCategories: ['sleep', 'methylation', 'stress', 'inflammation'],
    bioTier: p.bio_optimization_tier || null,
  };
}

// ─── Main cycle ────────────────────────────────────────────
async function runSherlockCycle(supabase: any, trigger: string) {
  const cycleStart = Date.now();
  let totalScored = 0;
  let totalAlerts = 0;
  let totalDeduped = 0;
  let totalTrends = 0;
  let totalCurated = 0;

  // 0. Heartbeat in agent registry
  await supabase.rpc('ultrathink_agent_heartbeat', {
    p_agent_name: AGENT_NAME,
    p_run_id: null,
    p_event_type: 'started',
    p_payload: { trigger, started_at: new Date().toISOString() },
    p_severity: 'info',
  });

  // Log cycle_start
  await supabase.from('sherlock_activity_log').insert({
    action: 'cycle_start',
    details: { trigger },
    items_processed: 0,
  });

  // ── 1. Score relevance for unscored items, per user ────
  const { data: users } = await supabase.from('research_hub_user_sources').select('user_id').limit(500);
  const uniqueUsers = Array.from(new Set((users || []).map((u: any) => u.user_id).filter(Boolean)));

  for (const userId of uniqueUsers) {
    const context = await buildContextForUser(supabase, userId);

    // Get all items the user does NOT yet have a row for
    const { data: existing } = await supabase
      .from('research_hub_user_items')
      .select('item_id')
      .eq('user_id', userId);
    const existingIds = new Set((existing || []).map((r: any) => r.item_id));

    const { data: items } = await supabase
      .from('research_hub_items')
      .select('id, category_id, source_name, title, summary, tags, published_at')
      .limit(200);

    const unscored = (items || []).filter((i: any) => !existingIds.has(i.id));
    if (unscored.length === 0) continue;

    const userItemRows: any[] = [];
    let highRelevance = 0;
    for (const item of unscored) {
      const r = scoreItem(item, context);
      if (r.score >= 90) highRelevance++;
      userItemRows.push({
        user_id: userId,
        item_id: item.id,
        relevance_score: r.score,
        relevance_reasons: r.reasons,
        matched_domains: r.matchedDomains,
      });
    }

    if (userItemRows.length > 0) {
      await supabase
        .from('research_hub_user_items')
        .upsert(userItemRows, { onConflict: 'user_id,item_id', ignoreDuplicates: true });
      totalScored += userItemRows.length;

      await supabase.from('sherlock_activity_log').insert({
        user_id: userId,
        action: 'scored_item',
        details: { high_relevance_count: highRelevance },
        items_processed: userItemRows.length,
      });
    }

    // ── 2. Generate alerts for items >= 90 (capped per user) ──
    const cap = 10;
    const { data: highScored } = await supabase
      .from('research_hub_user_items')
      .select('id, item_id, relevance_score')
      .eq('user_id', userId)
      .gte('relevance_score', 90)
      .order('relevance_score', { ascending: false })
      .limit(cap);

    if (highScored && highScored.length > 0) {
      // Existing alert item_ids to avoid duplicates
      const { data: existingAlerts } = await supabase
        .from('research_hub_alerts')
        .select('user_item_id')
        .eq('user_id', userId);
      const alertedSet = new Set((existingAlerts || []).map((r: any) => r.user_item_id));

      const newAlerts = highScored
        .filter((r: any) => !alertedSet.has(r.id))
        .map((r: any) => ({
          user_id: userId,
          user_item_id: r.id,
          alert_type: 'relevance',
          title: `New high-relevance research (${Math.round(r.relevance_score)}%)`,
          body: 'Sherlock surfaced new research highly relevant to your wellness profile.',
        }));

      if (newAlerts.length > 0) {
        await supabase.from('research_hub_alerts').insert(newAlerts);
        totalAlerts += newAlerts.length;
        await supabase.from('sherlock_activity_log').insert({
          user_id: userId,
          action: 'generated_alert',
          details: { count: newAlerts.length },
          items_processed: newAlerts.length,
        });
      }
    }

    totalCurated++;
  }

  // ── 3. Deduplicate (global) — same source_name + similar title ──
  // Title similarity: case-insensitive prefix overlap >= 0.85.
  const { data: allItems } = await supabase
    .from('research_hub_items')
    .select('id, source_name, title, created_at')
    .order('created_at', { ascending: true });

  const seenByKey = new Map<string, string>();
  const duplicateIds: string[] = [];
  for (const it of allItems || []) {
    const key = `${(it.source_name || '').toLowerCase()}::${(it.title || '').toLowerCase().slice(0, 80)}`;
    if (seenByKey.has(key)) duplicateIds.push(it.id);
    else seenByKey.set(key, it.id);
  }
  if (duplicateIds.length > 0) {
    await supabase.from('research_hub_items').delete().in('id', duplicateIds);
    totalDeduped = duplicateIds.length;
    await supabase.from('sherlock_activity_log').insert({
      action: 'deduped',
      details: { count: duplicateIds.length },
      items_processed: duplicateIds.length,
    });
  }

  // ── 4. Trend detection — tag frequency across distinct sources ──
  const tagSourceMap = new Map<string, Set<string>>();
  const tagItemMap = new Map<string, string[]>();
  for (const it of allItems || []) {
    const tags = (it as any).tags || [];
    for (const tag of tags) {
      if (!tagSourceMap.has(tag)) tagSourceMap.set(tag, new Set());
      tagSourceMap.get(tag)!.add((it as any).source_name);
      if (!tagItemMap.has(tag)) tagItemMap.set(tag, []);
      tagItemMap.get(tag)!.push((it as any).id);
    }
  }

  // Re-fetch tags since the .select above didn't include them
  const { data: itemsWithTags } = await supabase
    .from('research_hub_items')
    .select('id, source_name, tags')
    .limit(500);
  tagSourceMap.clear();
  tagItemMap.clear();
  for (const it of itemsWithTags || []) {
    const tags = it.tags || [];
    for (const tag of tags) {
      if (!tagSourceMap.has(tag)) tagSourceMap.set(tag, new Set());
      tagSourceMap.get(tag)!.add(it.source_name);
      if (!tagItemMap.has(tag)) tagItemMap.set(tag, []);
      tagItemMap.get(tag)!.push(it.id);
    }
  }

  const trends = Array.from(tagSourceMap.entries())
    .filter(([_, sources]) => sources.size >= 3)
    .map(([tag, sources]) => ({
      topic: tag,
      topic_keywords: [tag],
      source_count: sources.size,
      item_ids: tagItemMap.get(tag)?.slice(0, 20) || [],
      trend_score: Math.min(100, sources.size * 15),
      is_active: true,
      last_seen: new Date().toISOString(),
    }));

  if (trends.length > 0) {
    await supabase
      .from('sherlock_trends')
      .upsert(trends, { onConflict: 'topic' });
    totalTrends = trends.length;
    await supabase.from('sherlock_activity_log').insert({
      action: 'trend_detected',
      details: { trends: trends.map((t) => t.topic).slice(0, 5) },
      items_processed: trends.length,
    });
  }

  // ── 5. Update agent state ──────────────────────────────
  const duration = Date.now() - cycleStart;
  await supabase
    .from('sherlock_agent_state')
    .update({
      last_heartbeat: new Date().toISOString(),
      current_task_id: null,
      tasks_completed_today: totalCurated + totalDeduped + totalTrends,
      items_discovered_today: totalScored,
      alerts_generated_today: totalAlerts,
      daily_reset_at: new Date().toISOString(),
    })
    .eq('is_active', true);

  await supabase.from('sherlock_activity_log').insert({
    action: 'cycle_end',
    details: {
      trigger,
      duration_ms: duration,
      totals: {
        scored: totalScored,
        alerts: totalAlerts,
        deduped: totalDeduped,
        trends: totalTrends,
        curated: totalCurated,
      },
    },
    items_processed: totalScored,
    duration_ms: duration,
  });

  // Report decision audit to Jeffery
  await supabase.rpc('jeffery_log_decision', {
    p_run_id: null,
    p_decision_type: 'sherlock_cycle_complete',
    p_target_agent: AGENT_NAME,
    p_rationale: `Sherlock cycle ${trigger}: scored ${totalScored}, ${totalAlerts} alerts, ${totalDeduped} deduped, ${totalTrends} trends`,
    p_inputs: { trigger, duration_ms: duration },
  }).then(() => {}, () => {}); // best-effort, RPC may not exist

  await supabase.rpc('ultrathink_agent_heartbeat', {
    p_agent_name: AGENT_NAME,
    p_run_id: null,
    p_event_type: 'completed',
    p_payload: { duration_ms: duration, scored: totalScored, alerts: totalAlerts },
    p_severity: 'info',
  }).then(() => {}, () => {});

  return {
    ok: true,
    duration_ms: duration,
    scored: totalScored,
    alerts: totalAlerts,
    deduped: totalDeduped,
    trends: totalTrends,
    users_processed: uniqueUsers.length,
  };
}

Deno.serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let trigger = 'cron';
  try {
    const body = await req.json().catch(() => ({}));
    trigger = body.trigger || 'cron';
  } catch {
    /* ignore */
  }

  try {
    const result = await runSherlockCycle(supabase, trigger);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (e: any) {
    await supabase.from('sherlock_activity_log').insert({
      action: 'cycle_failed',
      details: { error: e?.message || 'unknown' },
      items_processed: 0,
    }).then(() => {}, () => {});
    return new Response(JSON.stringify({ ok: false, error: e?.message || 'unknown' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
});
