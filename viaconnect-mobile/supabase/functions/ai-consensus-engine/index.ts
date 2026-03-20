import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { ok, err } from '../_shared/response.ts';
import { getSupabaseAdmin, getUserId } from '../_shared/supabase-admin.ts';
import { writeAudit } from '../_shared/audit.ts';
import { z } from '../_shared/validate.ts';

// ── Rate limiter (in-memory, per edge function instance) ─────────────────
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(userId) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  if (timestamps.length >= RATE_LIMIT_MAX) return false;
  timestamps.push(now);
  rateLimitMap.set(userId, timestamps);
  return true;
}

// ── System prompts for each AI provider ──────────────────────────────────
const CLAUDE_SYSTEM = `You are a clinical genomics reasoning assistant for FarmCeutica Wellness (ViaConnect GeneX360).
Analyze genetic variants, nutrient interactions, and clinical evidence to provide personalized supplement and wellness recommendations.
Always cite relevant pathways (methylation, detox, inflammation, neurotransmitter, hormone, immune, cardiovascular, mitochondrial, gut, bone, skin, sleep).
Bioavailability improvement range is 10–27x (not 5–27x). Never recommend semaglutide. Only retatrutide + tirzepatide for peptide protocols.
Be thorough, evidence-based, and conservative in risk assessment.`;

const GROK_SYSTEM = `You are a real-time health research assistant for FarmCeutica Wellness.
Search and synthesize the latest clinical research, PubMed studies, and emerging evidence relevant to the query.
Focus on recent studies (last 3 years), meta-analyses, and clinical trials.
Provide citations and confidence levels for each finding.`;

const GPT4O_SYSTEM = `You are a structured data extraction assistant for FarmCeutica Wellness.
Extract and organize clinical data into structured formats: risk scores, pathway analyses, supplement dosing, interaction flags.
Output structured JSON when possible. Be precise and systematic.`;

const InputSchema = z.object({
  prompt: z.string().min(1).max(4000),
  context: z.record(z.unknown()).optional(),
  patientId: z.string().uuid().optional(),
});

interface AIResponse {
  provider: string;
  content: string;
  model: string;
  tokensUsed: number;
  latencyMs: number;
  error?: string;
}

async function callClaude(prompt: string, context: string): Promise<AIResponse> {
  const start = Date.now();
  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: CLAUDE_SYSTEM,
        messages: [
          { role: 'user', content: `${context}\n\n${prompt}` },
        ],
      }),
    });

    const data = await res.json();
    return {
      provider: 'claude',
      content: data.content?.[0]?.text ?? '',
      model: data.model ?? 'claude-sonnet-4-20250514',
      tokensUsed: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
      latencyMs: Date.now() - start,
    };
  } catch (e) {
    return {
      provider: 'claude',
      content: '',
      model: 'claude-sonnet-4-20250514',
      tokensUsed: 0,
      latencyMs: Date.now() - start,
      error: e instanceof Error ? e.message : 'Claude API error',
    };
  }
}

async function callGrok(prompt: string, context: string): Promise<AIResponse> {
  const start = Date.now();
  try {
    const apiKey = Deno.env.get('XAI_API_KEY');
    if (!apiKey) throw new Error('XAI_API_KEY not configured');

    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-3',
        messages: [
          { role: 'system', content: GROK_SYSTEM },
          { role: 'user', content: `${context}\n\n${prompt}` },
        ],
        max_tokens: 2048,
      }),
    });

    const data = await res.json();
    return {
      provider: 'grok',
      content: data.choices?.[0]?.message?.content ?? '',
      model: data.model ?? 'grok-3',
      tokensUsed: data.usage?.total_tokens ?? 0,
      latencyMs: Date.now() - start,
    };
  } catch (e) {
    return {
      provider: 'grok',
      content: '',
      model: 'grok-3',
      tokensUsed: 0,
      latencyMs: Date.now() - start,
      error: e instanceof Error ? e.message : 'Grok API error',
    };
  }
}

async function callGPT4o(prompt: string, context: string): Promise<AIResponse> {
  const start = Date.now();
  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: GPT4O_SYSTEM },
          { role: 'user', content: `${context}\n\n${prompt}` },
        ],
        max_tokens: 2048,
      }),
    });

    const data = await res.json();
    return {
      provider: 'gpt4o',
      content: data.choices?.[0]?.message?.content ?? '',
      model: data.model ?? 'gpt-4o',
      tokensUsed: data.usage?.total_tokens ?? 0,
      latencyMs: Date.now() - start,
    };
  } catch (e) {
    return {
      provider: 'gpt4o',
      content: '',
      model: 'gpt-4o',
      tokensUsed: 0,
      latencyMs: Date.now() - start,
      error: e instanceof Error ? e.message : 'GPT-4o API error',
    };
  }
}

function computeConsensus(responses: AIResponse[]): {
  confidence: 'high' | 'moderate' | 'low';
  rationale: string;
} {
  const valid = responses.filter((r) => !r.error && r.content.length > 0);

  if (valid.length === 0) {
    return {
      confidence: 'low',
      rationale: 'No AI providers returned valid responses. Practitioner review required.',
    };
  }

  if (valid.length === 3) {
    // Simple heuristic: check if responses share key terms
    const extractKeyTerms = (text: string) =>
      text.toLowerCase().match(/\b(recommend|risk|safe|caution|avoid|beneficial|moderate|high|low)\b/g) ?? [];

    const terms = valid.map((r) => new Set(extractKeyTerms(r.content)));
    const overlap01 = [...terms[0]].filter((t) => terms[1].has(t)).length;
    const overlap02 = [...terms[0]].filter((t) => terms[2].has(t)).length;
    const overlap12 = [...terms[1]].filter((t) => terms[2].has(t)).length;

    const avgOverlap = (overlap01 + overlap02 + overlap12) / 3;

    if (avgOverlap >= 3) {
      return {
        confidence: 'high',
        rationale: `All 3 AI providers (Claude, Grok, GPT-4o) produced concordant analyses with ${avgOverlap.toFixed(0)} shared key terms.`,
      };
    }
    return {
      confidence: 'moderate',
      rationale: `3/3 providers responded but with limited agreement (${avgOverlap.toFixed(0)} shared terms). Review individual responses.`,
    };
  }

  if (valid.length === 2) {
    const failed = responses.find((r) => !!r.error);
    return {
      confidence: 'moderate',
      rationale: `2/3 providers responded (${failed?.provider} failed: ${failed?.error}). Flagged for review.`,
    };
  }

  return {
    confidence: 'low',
    rationale: `Only 1/3 providers responded. Practitioner review required before acting on recommendations.`,
  };
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const userId = await getUserId(req);
    if (!userId) return err('Unauthorized', 'AUTH_REQUIRED', 401);

    if (!checkRateLimit(userId)) {
      return err(
        'Rate limit exceeded. Maximum 10 requests per minute.',
        'RATE_LIMIT',
        429,
      );
    }

    const body = await req.json();
    const parsed = InputSchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.issues[0].message, 'VALIDATION_ERROR');
    }
    const { prompt, context, patientId } = parsed.data;
    const admin = getSupabaseAdmin();

    // Build context string
    let contextStr = '';
    if (patientId) {
      const { data: profile } = await admin
        .from('genetic_profiles')
        .select('*')
        .eq('user_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const { data: assessment } = await admin
        .from('clinical_assessments')
        .select('*')
        .eq('user_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (profile) {
        contextStr += `Genetic Profile: MTHFR=${profile.mthfr_status}, COMT=${profile.comt_status}, CYP2D6=${profile.cyp2d6_status}. `;
      }
      if (assessment) {
        contextStr += `Assessment: Goals=${assessment.primary_goals?.join(', ')}, Conditions=${assessment.current_conditions?.join(', ')}, Medications=${assessment.current_medications}. `;
      }
    }
    if (context) {
      contextStr += `Additional context: ${JSON.stringify(context)}`;
    }

    // Query all 3 AI providers in parallel
    const [claude, grok, gpt4o] = await Promise.all([
      callClaude(prompt, contextStr),
      callGrok(prompt, contextStr),
      callGPT4o(prompt, contextStr),
    ]);

    const responses = [claude, grok, gpt4o];
    const consensus = computeConsensus(responses);

    // Store insight
    await admin.from('ai_insights').insert({
      user_id: patientId ?? userId,
      insight_text: responses.find((r) => !r.error)?.content ?? 'No valid response',
      insight_type: 'consensus',
      relevance_score: consensus.confidence === 'high' ? 0.9 : consensus.confidence === 'moderate' ? 0.7 : 0.4,
    });

    await writeAudit({
      userId,
      action: 'ai_consensus_query',
      tableName: 'ai_insights',
      recordId: patientId ?? userId,
      newData: {
        prompt: prompt.slice(0, 200),
        confidence: consensus.confidence,
        providers: responses.map((r) => ({
          provider: r.provider,
          hasError: !!r.error,
          latencyMs: r.latencyMs,
          tokensUsed: r.tokensUsed,
        })),
      },
    });

    return ok({
      consensus: responses.find((r) => !r.error)?.content ?? null,
      confidence: consensus.confidence,
      rationale: consensus.rationale,
      individual_responses: responses.map((r) => ({
        provider: r.provider,
        model: r.model,
        content: r.content || null,
        error: r.error || null,
        latencyMs: r.latencyMs,
        tokensUsed: r.tokensUsed,
      })),
      totalLatencyMs: Math.max(...responses.map((r) => r.latencyMs)),
    });
  } catch (e) {
    return err(
      e instanceof Error ? e.message : 'Internal server error',
      'INTERNAL_ERROR',
      500,
    );
  }
});
