/**
 * Arnold Recommender Engine (Prompt #85, Section 8)
 *
 * Generates up to 3 daily recommendations per user by:
 *   1. Building user context (entries, milestones, body score, connections, past recs)
 *   2. Running deterministic rules (stalled milestone, streak, recovery, connection)
 *   3. Optionally enriching with Anthropic Claude for natural language polish
 *   4. Storing results in arnold_recommendations
 *
 * Server-side only. Uses raw fetch for the Anthropic API (no SDK).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { validateRecommendationText } from '@/lib/agents/jeffery/guardrails';
import { arnoldNotifyHannah, arnoldEscalateToJeffery } from '@/lib/agents/message-bus';

const ANTHROPIC_MODEL = 'claude-sonnet-4-6';
const MAX_RECS_PER_DAY = 3;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Recommendation {
  title: string;
  body: string;
  category: 'milestone' | 'pattern' | 'cohort' | 'supplement' | 'streak' | 'recovery' | 'genetics';
  priority: 1 | 2 | 3;
  suggestedAction: string;
  supportingData: Record<string, unknown>;
  relatedMilestoneId?: string;
}

interface UserContext {
  userId: string;
  latestEntries: Record<string, unknown>[];
  milestones: Record<string, unknown>[];
  bodyScore: Record<string, unknown> | null;
  connectedSources: Record<string, unknown>[];
  pastRecommendations: Record<string, unknown>[];
  consecutiveLogDays: number;
  highStrainDays: number;
}

// ---------------------------------------------------------------------------
// Supabase service client builder
// ---------------------------------------------------------------------------

function buildServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// ---------------------------------------------------------------------------
// Context builder
// ---------------------------------------------------------------------------

async function buildUserContext(userId: string, db: SupabaseClient): Promise<UserContext> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [entriesRes, milestonesRes, scoreRes, connectionsRes, recsRes, metabolicRes] = await Promise.all([
    (db as any)
      .from('body_tracker_entries')
      .select('id, entry_date, source, is_active, is_outlier, created_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gte('entry_date', thirtyDaysAgo.toISOString().slice(0, 10))
      .order('entry_date', { ascending: false })
      .limit(60),

    (db as any)
      .from('body_tracker_milestones')
      .select('id, title, milestone_type, target_value, current_value, start_date, target_date, is_active, updated_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(10),

    (db as any)
      .from('body_tracker_scores')
      .select('body_score, tier, confidence_pct, score_date, composition_grade, weight_grade, muscle_grade, cardiovascular_grade, metabolic_grade')
      .eq('user_id', userId)
      .order('score_date', { ascending: false })
      .limit(1)
      .maybeSingle(),

    (db as any)
      .from('body_tracker_connections')
      .select('source_type, source_id, source_name, is_active, last_sync_at')
      .eq('user_id', userId)
      .eq('is_active', true),

    (db as any)
      .from('arnold_recommendations')
      .select('id, title, category, priority, generated_at, outcome')
      .eq('user_id', userId)
      .gte('generated_at', sevenDaysAgo.toISOString())
      .order('generated_at', { ascending: false })
      .limit(20),

    (db as any)
      .from('body_tracker_metabolic')
      .select('strain, created_at')
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(7),
  ]);

  // Calculate consecutive logging days
  const entries = (entriesRes.data ?? []) as Array<{ entry_date: string }>;
  const consecutiveLogDays = countConsecutiveDays(entries.map((e) => e.entry_date));

  // Calculate high strain days in last 7 days
  const metabolicData = (metabolicRes.data ?? []) as Array<{ strain: number | null }>;
  const highStrainDays = metabolicData.filter((m) => m.strain != null && m.strain >= 70).length;

  return {
    userId,
    latestEntries: (entriesRes.data ?? []) as Record<string, unknown>[],
    milestones: (milestonesRes.data ?? []) as Record<string, unknown>[],
    bodyScore: (scoreRes.data ?? null) as Record<string, unknown> | null,
    connectedSources: (connectionsRes.data ?? []) as Record<string, unknown>[],
    pastRecommendations: (recsRes.data ?? []) as Record<string, unknown>[],
    consecutiveLogDays,
    highStrainDays,
  };
}

function countConsecutiveDays(dates: string[]): number {
  if (dates.length === 0) return 0;
  const unique = [...new Set(dates)].sort().reverse();
  const today = new Date().toISOString().slice(0, 10);

  // Start from today or the most recent date
  let count = 0;
  let checkDate = new Date(today);

  for (let i = 0; i < 60; i++) {
    const dateStr = checkDate.toISOString().slice(0, 10);
    if (unique.includes(dateStr)) {
      count++;
    } else if (count > 0) {
      break;
    }
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return count;
}

// ---------------------------------------------------------------------------
// Deterministic rule engine
// ---------------------------------------------------------------------------

function runRules(ctx: UserContext): Recommendation[] {
  const recs: Recommendation[] = [];
  const recentCategories = new Set(
    (ctx.pastRecommendations as Array<{ category: string }>).map((r) => r.category),
  );

  // Rule 1: Stalled milestone (no progress 5+ days)
  for (const milestone of ctx.milestones as Array<Record<string, unknown>>) {
    if (!milestone.is_active) continue;
    const updatedAt = milestone.updated_at ? new Date(milestone.updated_at as string) : null;
    if (!updatedAt) continue;
    const daysSinceUpdate = Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceUpdate >= 5) {
      recs.push({
        title: `Your "${milestone.title}" milestone needs attention`,
        body: `It has been ${daysSinceUpdate} days since your last progress update on "${milestone.title}". Even small steps count. Consider logging a measurement today to keep momentum going.`,
        category: 'milestone',
        priority: 2,
        suggestedAction: 'Log a new body tracker entry to update milestone progress',
        supportingData: {
          milestoneId: milestone.id,
          daysSinceUpdate,
          currentValue: milestone.current_value,
          targetValue: milestone.target_value,
        },
        relatedMilestoneId: milestone.id as string,
      });
    }
  }

  // Rule 2: Logging streak encouragement (7+ consecutive days)
  if (ctx.consecutiveLogDays >= 7 && !recentCategories.has('streak')) {
    recs.push({
      title: `${ctx.consecutiveLogDays} day logging streak`,
      body: `You have logged body tracker data for ${ctx.consecutiveLogDays} consecutive days. Consistency is the foundation of lasting results. Keep it up.`,
      category: 'streak',
      priority: 3,
      suggestedAction: 'Continue your daily logging routine',
      supportingData: {
        consecutiveDays: ctx.consecutiveLogDays,
      },
    });
  }

  // Rule 3: Recovery alert (high strain 3+ days)
  if (ctx.highStrainDays >= 3 && !recentCategories.has('recovery')) {
    recs.push({
      title: 'Recovery recommended',
      body: `Your strain levels have been elevated for ${ctx.highStrainDays} of the past 7 days. Consider prioritizing recovery: lighter activity, quality sleep, and adequate hydration can help your body adapt and grow stronger.`,
      category: 'recovery',
      priority: 1,
      suggestedAction: 'Schedule a recovery day with lighter activity and extra sleep',
      supportingData: {
        highStrainDays: ctx.highStrainDays,
        period: '7 days',
      },
    });
  }

  // Rule 4: Connection suggestion (no wearable connected)
  const hasWearable = (ctx.connectedSources as Array<{ source_type: string }>).some(
    (s) => s.source_type === 'wearable',
  );
  if (!hasWearable && !recentCategories.has('pattern')) {
    recs.push({
      title: 'Connect a wearable for richer insights',
      body: 'Connecting a wearable device like Apple Watch, Whoop, or Oura Ring unlocks automatic tracking of heart rate, strain, HRV, and sleep quality. This data helps Arnold provide more accurate and personalized recommendations.',
      category: 'pattern',
      priority: 3,
      suggestedAction: 'Visit the Connections tab to link a wearable device',
      supportingData: {
        connectedPlugins: (ctx.connectedSources as Array<{ source_id: string }>).map((s) => s.source_id),
      },
    });
  }

  return recs;
}

// ---------------------------------------------------------------------------
// AI enrichment layer (optional, graceful degradation)
// ---------------------------------------------------------------------------

async function enrichWithAI(
  recs: Recommendation[],
  ctx: UserContext,
): Promise<Recommendation[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || recs.length === 0) return recs;

  const systemPrompt = [
    'You are Arnold, the Body Tracker coaching sub-agent for ViaConnect, a personalized wellness platform by FarmCeutica Wellness.',
    'Your role is to refine recommendation copy so it feels warm, actionable, and personal.',
    '',
    'Rules:',
    '- Never use dashes in copy. Use commas, colons, or semicolons instead.',
    '- Never use emojis.',
    '- Keep each recommendation body under 120 words.',
    '- Maintain the original category, priority, and suggested action.',
    '- Speak directly to the user in second person ("you", "your").',
    '- Be encouraging without being patronizing.',
    '- Reference specific numbers from the supporting data when relevant.',
    '- NEVER recommend semaglutide, Ozempic, Wegovy, or any GLP-1 agonist.',
    '- NEVER recommend oral retatrutide; retatrutide is injectable only and never stacked.',
    '- Only mention supplements from the FarmCeutica Wellness product line.',
    '- Bioavailability of FarmCeutica liposomal formulations: always 10 to 27 times.',
    '- Return valid JSON: an array of objects with keys: title, body, suggestedAction.',
  ].join('\n');

  const userMessage = JSON.stringify({
    recommendations: recs.map((r) => ({
      title: r.title,
      body: r.body,
      category: r.category,
      suggestedAction: r.suggestedAction,
      supportingData: r.supportingData,
    })),
    context: {
      bodyScore: ctx.bodyScore,
      consecutiveLogDays: ctx.consecutiveLogDays,
      highStrainDays: ctx.highStrainDays,
      activeMilestones: ctx.milestones.length,
      connectedSources: (ctx.connectedSources as Array<{ source_name: string }>).map((s) => s.source_name),
    },
  });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.warn(`[arnold-recommender] Anthropic HTTP ${response.status}; using rule-based copy`);
      return recs;
    }

    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = (data.content ?? [])
      .filter((c) => c.type === 'text')
      .map((c) => c.text ?? '')
      .join('');

    // Extract JSON from the response (may be wrapped in markdown code fences)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return recs;

    const enriched = JSON.parse(jsonMatch[0]) as Array<{
      title: string;
      body: string;
      suggestedAction: string;
    }>;

    return recs.map((rec, i) => {
      const ai = enriched[i];
      if (!ai) return rec;
      return {
        ...rec,
        title: ai.title || rec.title,
        body: ai.body || rec.body,
        suggestedAction: ai.suggestedAction || rec.suggestedAction,
      };
    });
  } catch (err) {
    console.warn(`[arnold-recommender] AI enrichment failed: ${(err as Error).message}; using rule-based copy`);
    return recs;
  }
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

async function storeRecommendations(
  recs: Recommendation[],
  userId: string,
  db: SupabaseClient,
): Promise<void> {
  if (recs.length === 0) return;

  const rows = recs.map((rec) => ({
    user_id: userId,
    title: rec.title,
    body: rec.body,
    category: rec.category,
    priority: rec.priority,
    suggested_action: rec.suggestedAction,
    supporting_data: rec.supportingData,
    related_milestone_id: rec.relatedMilestoneId ?? null,
    ai_generated: true,
    ai_model: ANTHROPIC_MODEL,
    ai_prompt_version: 'p85_v1',
  }));

  const { error } = await (db as any).from('arnold_recommendations').insert(rows);
  if (error) {
    console.warn(`[arnold-recommender] Failed to store recommendations: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Generate daily recommendations for a user.
 * Returns up to MAX_RECS_PER_DAY recommendations, sorted by priority (1 = highest).
 */
export async function generateDailyRecommendations(
  userId: string,
): Promise<Recommendation[]> {
  const db = buildServiceClient();

  // Check how many recs were already generated today
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { count } = await (db as any)
    .from('arnold_recommendations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('generated_at', todayStart.toISOString());

  const existingCount = typeof count === 'number' ? count : 0;
  if (existingCount >= MAX_RECS_PER_DAY) {
    return [];
  }

  const remaining = MAX_RECS_PER_DAY - existingCount;

  // Build context and run rules
  const context = await buildUserContext(userId, db);
  let recommendations = runRules(context);

  // Sort by priority (1 = highest) and cap
  recommendations.sort((a, b) => a.priority - b.priority);
  recommendations = recommendations.slice(0, remaining);

  if (recommendations.length === 0) return [];

  // Enrich with AI (graceful fallback)
  recommendations = await enrichWithAI(recommendations, context);

  // Guardrail enforcement: route every recommendation through Jeffery's
  // canonical validator (Semaglutide / Retatrutide / blocked brands /
  // bioavailability range). Any violation drops the rec and escalates to
  // Jeffery for audit.
  const blocked: Array<{ title: string; codes: string[] }> = [];
  recommendations = recommendations.filter((r) => {
    const text = `${r.title} ${r.body} ${r.suggestedAction ?? ''}`;
    const result = validateRecommendationText(text);
    if (!result.ok) {
      blocked.push({ title: r.title, codes: result.violations.map((v) => v.code) });
      console.warn(
        `[arnold-recommender] Guardrail blocked "${r.title}": ${result.violations.map((v) => v.code).join(', ')}`,
      );
      return false;
    }
    return true;
  });

  if (blocked.length > 0) {
    void arnoldEscalateToJeffery('guardrail_block', { blocked }, userId);
  }

  // Store
  await storeRecommendations(recommendations, userId, db);

  // Notify Hannah so the chat agent can surface today's recs in conversation.
  if (recommendations.length > 0) {
    void arnoldNotifyHannah(
      'recommendations_generated',
      {
        count: recommendations.length,
        categories: recommendations.map((r) => r.category),
        topPriority: recommendations[0]?.priority ?? null,
      },
      userId,
    );
  }

  return recommendations;
}
