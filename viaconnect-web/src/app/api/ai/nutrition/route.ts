import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GORDAN_SYSTEM_PROMPT, GORDAN_TASK_PROMPTS } from '@/lib/agents/gordan/systemPrompt';
import type { GordanTask } from '@/lib/agents/gordan/taskRegistry';
import { emitJefferyMessage } from '@/lib/jeffery/message-bus';
import { scanAiOutput } from '@/lib/compliance/adapters/ai_output';
import { withAbortTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { getCircuitBreaker, isCircuitBreakerError } from '@/lib/utils/circuit-breaker';

const claudeBreaker = getCircuitBreaker('claude-api');
const visionBreaker = getCircuitBreaker('claude-vision');

interface GordanRequest {
  task: GordanTask;
  payload: Record<string, any>;
}

async function callClaude(system: string, userContent: any[], maxTokens = 2048, isVision = false) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const breaker = isVision ? visionBreaker : claudeBreaker;
  const timeoutMs = isVision ? 25000 : 15000;
  const scope = isVision ? 'api.ai.nutrition.claude-vision' : 'api.ai.nutrition.claude';

  const res = await breaker.execute(() =>
    withAbortTimeout(
      (signal) => fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: maxTokens,
          system,
          messages: [{ role: 'user', content: userContent }],
        }),
        signal,
      }),
      timeoutMs,
      scope,
    )
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data.content?.find((c: any) => c.type === 'text')?.text ?? '';
  const tokensUsed = (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0);
  return { text, tokensUsed };
}

function parseJSON(text: string) {
  const cleaned = text.replace(/```json|```/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON found in response');
  return JSON.parse(match[0]);
}

async function buildConsumerContext(supabase: any, userId: string) {
  const [profileRes, suppsRes, mealsRes] = await Promise.all([
    supabase.from('profiles').select('full_name, assessment_completed, caq_completed_at').eq('id', userId).single(),
    supabase.from('user_current_supplements').select('product_name, dosage_form, frequency, category').eq('user_id', userId).eq('is_current', true),
    supabase.from('meal_logs').select('meal_type, quality_rating, calories, protein_g, carbs_g, fat_g, meal_date')
      .eq('user_id', userId).gte('meal_date', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0])
      .order('meal_date', { ascending: false }).limit(30),
  ]);

  return {
    profile: profileRes.data,
    supplements: (suppsRes.data ?? []).map((s: any) => ({ name: s.product_name ?? '', ...s })),
    recentMeals: mealsRes.data ?? [],
  };
}

async function logActivity(
  supabase: any, userId: string, task: string, tokensUsed: number,
  latencyMs: number, success: boolean, errorMessage?: string,
) {
  try {
    await supabase.from('agent_activity_log').insert({
      user_id: userId, agent_id: 'gordan', task,
      tokens_used: tokensUsed, latency_ms: latencyMs,
      success, error_message: errorMessage ?? null,
    });
  } catch { /* logging is best effort */ }
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: GordanRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { task, payload } = body;
  const taskPrompt = GORDAN_TASK_PROMPTS[task];
  if (!taskPrompt) {
    return NextResponse.json({ error: `Unknown task: ${task}` }, { status: 400 });
  }

  try {
    const ctx = await buildConsumerContext(supabase, user.id);
    const systemPrompt = GORDAN_SYSTEM_PROMPT + '\n\n' + taskPrompt;

    let userContent: any[];

    if (task === 'meal_vision_analysis') {
      const images = (payload.images ?? []).map((img: any) => ({
        type: 'image' as const,
        source: { type: 'base64' as const, media_type: img.mediaType || 'image/jpeg', data: img.base64 },
      }));

      const suppList = ctx.supplements.map((s: any) => s.name).filter(Boolean).join(', ');
      userContent = [
        ...images,
        { type: 'text', text: `Analyze this ${payload.mealType ?? 'meal'}.\nActive supplements: ${suppList || 'None'}\nRespond in JSON only.` },
      ];
    } else if (task === 'nutrition_insight') {
      const suppList = ctx.supplements.map((s: any) => s.name).filter(Boolean).join(', ');
      const todayMeals = ctx.recentMeals.filter((m: any) => m.meal_date === new Date().toISOString().split('T')[0]);
      userContent = [{
        type: 'text',
        text: `Active supplements: ${suppList || 'None'}\nToday's meals: ${JSON.stringify(todayMeals)}\nCurrent meal analysis: ${JSON.stringify(payload.mealAnalysis)}\nGenerate personalized insight. Respond in JSON only.`,
      }];
    } else if (task === 'daily_nutrition_summary') {
      const todayMeals = ctx.recentMeals.filter((m: any) => m.meal_date === (payload.date ?? new Date().toISOString().split('T')[0]));
      userContent = [{
        type: 'text',
        text: `Today's meals: ${JSON.stringify(todayMeals)}\nActive supplements: ${ctx.supplements.map((s: any) => s.name).join(', ')}\nGenerate daily summary. Respond in JSON only.`,
      }];
    } else if (task === 'weekly_pattern_analysis') {
      userContent = [{
        type: 'text',
        text: `7 day meal history: ${JSON.stringify(ctx.recentMeals)}\nActive supplements: ${ctx.supplements.map((s: any) => s.name).join(', ')}\nGenerate weekly analysis. Respond in JSON only.`,
      }];
    } else {
      userContent = [{
        type: 'text',
        text: `${JSON.stringify(payload)}\nActive supplements: ${ctx.supplements.map((s: any) => s.name).join(', ')}\nRespond in JSON only.`,
      }];
    }

    const { text, tokensUsed } = await callClaude(systemPrompt, userContent,
      task === 'meal_vision_analysis' ? 4096 : 1024,
      task === 'meal_vision_analysis');

    const result = parseJSON(text);
    const latency = Date.now() - start;

    await logActivity(supabase, user.id, task, tokensUsed, latency, true);

    // Marshall post-flight scan. Findings persist + audit + escalate.
    // Fire-and-forget; keeps Gordan responsive.
    void scanAiOutput({
      agent: 'gordan',
      userId: user.id,
      userRole: 'consumer',
      text,
    }).catch(() => { /* best-effort */ });

    // Surface Gordan activity in Jeffery's Live Feed. Fire-and-forget; don't
    // block the user response on observability.
    void emitJefferyMessage({
      category: 'advisor_insight',
      severity: 'advisory',
      title: `Gordan: ${task.replace(/_/g, ' ')}`,
      summary: `Gordan completed ${task} for user ${user.id.slice(0, 8)} in ${latency}ms (${tokensUsed} tokens).`,
      detail: { task, userId: user.id, tokensUsed, latencyMs: latency, payloadKeys: Object.keys(payload ?? {}) },
      sourceAgent: 'gordan',
    }).catch(() => { /* emit is best effort */ });

    return NextResponse.json(result);
  } catch (err: any) {
    const latency = Date.now() - start;
    await logActivity(supabase, user.id, task, 0, latency, false, err.message);
    if (isCircuitBreakerError(err)) {
      safeLog.warn('api.ai.nutrition', 'claude circuit open', { task, userId: user.id, error: err });
      return NextResponse.json({ error: 'AI service temporarily unavailable.' }, { status: 503 });
    }
    if (isTimeoutError(err)) {
      safeLog.warn('api.ai.nutrition', 'claude timeout', { task, userId: user.id, error: err });
      return NextResponse.json({ error: 'AI took too long. Please try again.' }, { status: 504 });
    }
    safeLog.error('api.ai.nutrition', 'task failed', { task, userId: user.id, error: err });

    void emitJefferyMessage({
      category: 'error_escalation',
      severity: 'critical',
      title: `Gordan failed: ${task}`,
      summary: (err.message ?? 'Unknown error').slice(0, 240),
      detail: { task, userId: user.id, latencyMs: latency, error: err.message },
      sourceAgent: 'gordan',
    }).catch(() => { /* emit is best effort */ });

    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
