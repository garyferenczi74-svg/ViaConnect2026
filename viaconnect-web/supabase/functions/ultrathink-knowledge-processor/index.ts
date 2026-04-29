// =============================================================================
// ultrathink-knowledge-processor (Prompt #60 — Layer 5 brain)
// =============================================================================
// Pulls a batch of unprocessed ultrathink_research_feed rows and turns each
// into one or more structured ultrathink_knowledge_base entries.
//
// Two extraction modes:
//   1. Claude Sonnet (preferred) — if ANTHROPIC_API_KEY is set, sends the
//      title+abstract to claude-sonnet-4-20250514 with a tight JSON schema
//      prompt and parses the response.
//   2. Heuristic fallback — when Claude is unavailable, uses regex/keyword
//      patterns to extract a single low-confidence "subject mentions object"
//      fact per article. Better than nothing; flagged with evidence_level
//      'speculative' so the rule-evolver knows to deprioritize it.
//
// Cost: each Claude Sonnet call ≈ $0.005–$0.015 depending on abstract length.
// The orchestrator caps total daily spend at $50.
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { withAbortTimeout, isTimeoutError } from '../_shared/with-timeout.ts';
import { safeLog } from '../_shared/safe-log.ts';
import { getCircuitBreaker, isCircuitBreakerError } from '../_shared/circuit-breaker.ts';

const claudeBreaker = getCircuitBreaker('claude-api');

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

interface FeedRow {
  id: string;
  source: string;
  external_id: string;
  title: string;
  abstract: string | null;
  url: string | null;
  published_at: string | null;
}

interface KnowledgeFact {
  subject: string;
  predicate: string;
  object: string;
  domain: string;
  evidence_level: 'strong' | 'moderate' | 'emerging' | 'speculative';
  effect_size?: number | null;
}

function admin(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
function json(d: unknown, s = 200) {
  return new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } });
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function evidenceToScore(level: string): number {
  switch (level) {
    case 'strong':      return 0.85;
    case 'moderate':    return 0.65;
    case 'emerging':    return 0.45;
    case 'speculative': return 0.25;
    default:            return 0.4;
  }
}

// ---------- Claude Sonnet extraction ----------------------------------------

async function extractWithClaude(article: FeedRow): Promise<{ facts: KnowledgeFact[]; cost: number }> {
  if (!ANTHROPIC_KEY) return { facts: [], cost: 0 };

  const prompt = `You are extracting structured clinical knowledge from a research article. Return ONLY a JSON array of facts. Each fact must have:
  - subject (string, e.g. "Magnesium glycinate")
  - predicate (string, one of: improves, worsens, contraindicated_with, interacts_with, dosed_at, contains, equivalent_to)
  - object (string, e.g. "sleep latency")
  - domain (string, one of: supplement, peptide, interaction, condition, genetic, biomarker, rda, adverse_event, other)
  - evidence_level (string, one of: strong, moderate, emerging, speculative — based on study type implied by the title)

Title: ${article.title}
Source: ${article.source}
Abstract: ${article.abstract ?? '(none)'}

Return up to 5 facts. If no extractable facts, return [].`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!r.ok) {
      console.warn(`[claude] HTTP ${r.status} for ${article.external_id}`);
      return { facts: [], cost: 0 };
    }
    const j = await r.json() as {
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = (j.content ?? []).filter(c => c.type === 'text').map(c => c.text ?? '').join('');
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return { facts: [], cost: estimateCost(j.usage) };
    const arr = JSON.parse(match[0]) as KnowledgeFact[];
    const valid = arr.filter(f => f.subject && f.predicate && f.object && f.domain && f.evidence_level);
    return { facts: valid, cost: estimateCost(j.usage) };
  } catch (e) {
    if (isCircuitBreakerError(e)) safeLog.warn('ultrathink.knowledge-processor', 'claude circuit open', { externalId: article.external_id, error: e });
    else if (isTimeoutError(e)) safeLog.warn('ultrathink.knowledge-processor', 'claude timeout', { externalId: article.external_id, error: e });
    else safeLog.warn('ultrathink.knowledge-processor', 'claude extract failed', { externalId: article.external_id, error: e });
    return { facts: [], cost: 0 };
  }
}

function estimateCost(u: { input_tokens?: number; output_tokens?: number } | undefined): number {
  // Sonnet pricing (approx): $3 / 1M input, $15 / 1M output
  const inT = u?.input_tokens ?? 0;
  const outT = u?.output_tokens ?? 0;
  return (inT * 0.000003) + (outT * 0.000015);
}

// ---------- Heuristic fallback (no Claude) ----------------------------------

const SUPPLEMENT_KEYWORDS = ['vitamin','magnesium','omega','probiotic','curcumin','ashwagandha','melatonin','glutathione','coq10','berberine','quercetin','resveratrol','niacin','b12','folate','iron','zinc','selenium','chromium','collagen','creatine','glycine','taurine','theanine','5-htp','sam-e','nac','milk thistle','ginseng','rhodiola','ginkgo','st john','st. john'];

function extractHeuristic(article: FeedRow): KnowledgeFact[] {
  const text = `${article.title} ${article.abstract ?? ''}`.toLowerCase();
  const found = SUPPLEMENT_KEYWORDS.filter(k => text.includes(k));
  if (found.length === 0) return [];

  // One generic "mentioned in research" fact per detected supplement
  return found.slice(0, 3).map(kw => ({
    subject: kw,
    predicate: 'mentioned_in_research',
    object: article.source,
    domain: 'supplement',
    evidence_level: 'speculative' as const,
  }));
}

// ---------- main entry ------------------------------------------------------

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);

  const db = admin();
  const runId = crypto.randomUUID();
  const t0 = Date.now();

  let body: { batch_size?: number } = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const batchSize = Math.min(body.batch_size ?? 20, 100);

  let processed = 0, factsAdded = 0, totalCost = 0, errors = 0;

  try {
    // Cost cap check
    const { data: spendRow } = await db.rpc('ultrathink_today_spend');
    const todaySpend = (spendRow as unknown as number) ?? 0;
    if (todaySpend >= 50) {
      await db.rpc('ultrathink_record_sync', {
        p_run_id: runId, p_source: 'knowledge_processor', p_action: 'cost_cap_skip',
        p_in: 0, p_added: 0, p_skipped: 0, p_error: 0,
        p_cost: 0, p_duration: Date.now() - t0,
        p_status: 'ok', p_err_msg: null,
        p_metadata: { today_spend: todaySpend, cap: 50 },
      });
      return json({ ok: true, run_id: runId, skipped: 'daily cost cap reached' });
    }

    // Pull a batch of pending articles, oldest first
    const { data: feed, error: feedErr } = await db
      .from('ultrathink_research_feed')
      .select('id, source, external_id, title, abstract, url, published_at')
      .eq('status', 'pending')
      .order('fetched_at', { ascending: true })
      .limit(batchSize);
    if (feedErr) throw new Error(`feed fetch: ${feedErr.message}`);
    if (!feed || feed.length === 0) {
      await db.rpc('ultrathink_record_sync', {
        p_run_id: runId, p_source: 'knowledge_processor', p_action: 'no_pending',
        p_in: 0, p_added: 0, p_skipped: 0, p_error: 0,
        p_cost: 0, p_duration: Date.now() - t0,
        p_status: 'ok', p_err_msg: null, p_metadata: {},
      });
      return json({ ok: true, run_id: runId, processed: 0 });
    }

    for (const article of feed as FeedRow[]) {
      // Mark processing
      await db.from('ultrathink_research_feed').update({ status: 'processing' }).eq('id', article.id);

      // Try Claude first, fall back to heuristic
      let facts: KnowledgeFact[] = [];
      let cost = 0;
      if (ANTHROPIC_KEY && todaySpend + totalCost < 49.5) {
        const r = await extractWithClaude(article);
        facts = r.facts;
        cost = r.cost;
      }
      if (facts.length === 0) {
        facts = extractHeuristic(article);
      }

      const newKnowledgeIds: string[] = [];
      for (const fact of facts) {
        const factHash = await sha256Hex(`${fact.subject.toLowerCase()}|${fact.predicate}|${fact.object.toLowerCase()}`);

        // Check if fact already exists
        const { data: existing } = await db
          .from('ultrathink_knowledge_base')
          .select('id, source_count, citations')
          .eq('fact_hash', factHash)
          .maybeSingle();

        const citation = {
          source: article.source,
          external_id: article.external_id,
          url: article.url,
          title: article.title,
          year: article.published_at ? Number(article.published_at.slice(0, 4)) : null,
        };

        if (existing) {
          // Merge: bump source_count, append citation if new
          const cites = (existing.citations as unknown[]) ?? [];
          const alreadyCited = cites.some((c) =>
            (c as Record<string, unknown>).external_id === article.external_id
            && (c as Record<string, unknown>).source === article.source
          );
          if (!alreadyCited) {
            await db.from('ultrathink_knowledge_base')
              .update({
                source_count: (existing.source_count ?? 1) + 1,
                citations: [...cites, citation],
                last_validated: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id);
          }
          newKnowledgeIds.push(existing.id);
        } else {
          const { data: inserted, error: insErr } = await db
            .from('ultrathink_knowledge_base')
            .insert({
              fact_hash: factHash,
              subject: fact.subject,
              predicate: fact.predicate,
              object: fact.object,
              domain: fact.domain,
              evidence_level: fact.evidence_level,
              evidence_score: evidenceToScore(fact.evidence_level),
              effect_size: fact.effect_size ?? null,
              citations: [citation],
              source_count: 1,
            })
            .select('id')
            .single();
          if (insErr) {
            errors++;
            console.warn(`insert fact failed: ${insErr.message}`);
          } else if (inserted) {
            newKnowledgeIds.push(inserted.id);
            factsAdded++;
          }
        }
      }

      // Mark article as processed
      await db.from('ultrathink_research_feed').update({
        status: 'processed',
        processed_at: new Date().toISOString(),
        knowledge_ids: newKnowledgeIds,
      }).eq('id', article.id);

      processed++;
      totalCost += cost;
    }

    await db.rpc('ultrathink_record_sync', {
      p_run_id: runId, p_source: 'knowledge_processor', p_action: 'process_batch',
      p_in: feed.length, p_added: factsAdded, p_skipped: 0, p_error: errors,
      p_cost: totalCost, p_duration: Date.now() - t0,
      p_status: errors > 0 ? 'partial' : 'ok',
      p_err_msg: null,
      p_metadata: { batch_size: feed.length, claude_used: !!ANTHROPIC_KEY },
    });

    return json({ ok: true, run_id: runId, processed, facts_added: factsAdded, cost_usd: totalCost });
  } catch (e) {
    const msg = (e as Error).message;
    if (isTimeoutError(e)) safeLog.warn('ultrathink.knowledge-processor', 'cycle timeout', { runId, error: e });
    else safeLog.error('ultrathink.knowledge-processor', 'cycle failed', { runId, error: e });
    await db.rpc('ultrathink_record_sync', {
      p_run_id: runId, p_source: 'knowledge_processor', p_action: 'fatal',
      p_in: 0, p_added: factsAdded, p_skipped: 0, p_error: 1,
      p_cost: totalCost, p_duration: Date.now() - t0,
      p_status: 'error', p_err_msg: msg, p_metadata: {},
    });
    return json({ ok: false, run_id: runId, error: msg }, 500);
  }
});
