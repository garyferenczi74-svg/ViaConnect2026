/**
 * Jeffery Directive Processor (Prompt #60c — Section 6)
 *
 * When the admin sends a directive via the Steering Console, Jeffery uses
 * Claude Sonnet to acknowledge it and produce a 3-5 step execution plan.
 * The plan is parsed into structured steps and stored in jeffery_progress
 * so the UI can render a progress bar.
 *
 * Server-side only.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { emitJefferyMessage } from "./message-bus";

const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const ANTHROPIC_TIMEOUT_MS = 30_000;

interface DirectiveRow {
  id: string;
  title: string;
  instruction: string;
  scope: string;
  priority: string;
}

function buildServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * Parse Jeffery's natural-language acknowledgment into a list of steps.
 * Looks for numbered lines (1. / 1) / Step 1: / etc.) and bullet lists.
 */
function parseStepsFromResponse(text: string): string[] {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const stepRegex = /^(?:step\s*)?(\d+)[\.\)]\s+(.+)$/i;
  const bulletRegex = /^[-*•]\s+(.+)$/;
  const steps: string[] = [];
  for (const line of lines) {
    const m1 = line.match(stepRegex);
    if (m1) { steps.push(m1[2]); continue; }
    const m2 = line.match(bulletRegex);
    if (m2) steps.push(m2[1]);
  }
  // If no structured steps, fall back to the first 5 sentences
  if (steps.length === 0) {
    return text.split(/[.!?]\s+/).slice(0, 5).map(s => s.trim()).filter(Boolean);
  }
  return steps.slice(0, 8);
}

/**
 * Process a newly-created directive: call Claude, parse steps, write
 * jeffery_progress, emit a message into the Command Center feed.
 */
export async function processDirective(directiveId: string): Promise<{ ok: boolean; error?: string }> {
  const client = buildServiceClient();
  const apiKey = process.env.ANTHROPIC_API_KEY;

  const { data: directive, error: fetchErr } = await client
    .from("jeffery_directives")
    .select("id, title, instruction, scope, priority")
    .eq("id", directiveId)
    .single();
  if (fetchErr || !directive) return { ok: false, error: fetchErr?.message ?? "directive not found" };

  const d = directive as DirectiveRow;

  let acknowledgment: string;
  let steps: string[];

  if (!apiKey) {
    // Graceful degradation: stub plan when Claude isn't configured
    acknowledgment = `Directive received: "${d.title}".\n\nANTHROPIC_API_KEY is not configured, so I can't generate a Claude-powered plan right now. I'll mark this as acknowledged and queue it for processing once the key is set.\n\nProposed steps:\n1. Audit current ${d.scope} configuration.\n2. Identify the agents/components that match the directive scope.\n3. Apply the requested changes per the instruction.\n4. Verify outputs and update the progress log.`;
    steps = parseStepsFromResponse(acknowledgment);
  } else {
    const systemPrompt = `You are Jeffery, the Self-Evolution Engine for ViaConnect — Gary's CEO/founder admin assistant. The CEO has given you a directive. Acknowledge it warmly, then explain your plan to implement it in 3-5 concrete steps (numbered). Reference specific agents and systems by name. Keep total response under 250 words.`;
    const userMsg = `Directive: "${d.instruction}"\nTitle: ${d.title}\nScope: ${d.scope}\nPriority: ${d.priority}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ANTHROPIC_TIMEOUT_MS);
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: "user", content: userMsg }],
        }),
        signal: controller.signal,
      });
      if (!r.ok) throw new Error(`anthropic HTTP ${r.status}`);
      const data = await r.json() as { content?: Array<{ type: string; text?: string }> };
      acknowledgment = (data.content ?? []).filter(c => c.type === "text").map(c => c.text ?? "").join("");
      if (!acknowledgment) acknowledgment = `Directive "${d.title}" acknowledged.`;
      steps = parseStepsFromResponse(acknowledgment);
    } catch (e) {
      const err = e as Error;
      const msg = err.name === "AbortError"
        ? `anthropic request timed out after ${ANTHROPIC_TIMEOUT_MS}ms`
        : err.message;
      return { ok: false, error: msg };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Update the directive with Jeffery's plan
  const { error: updErr } = await client
    .from("jeffery_directives")
    .update({
      jeffery_acknowledgment: acknowledgment,
      jeffery_progress: {
        steps_total: steps.length,
        steps_completed: 0,
        current_step: steps[0] ?? "Analyzing directive...",
        steps,
      },
      acknowledged_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", directiveId);
  if (updErr) return { ok: false, error: updErr.message };

  // Surface as a feed message so the admin sees it appear in Live Feed
  await emitJefferyMessage({
    category: "agent_decision",
    severity: "advisory",
    title: `Directive Acknowledged: ${d.title}`,
    summary: `Jeffery received your directive and created a ${steps.length}-step plan.`,
    detail: { directiveId: d.id, steps, acknowledgment, scope: d.scope, priority: d.priority },
    sourceAgent: "jeffery_directive_processor",
  }, client);

  // Also write a learning_log entry — directives are first-class teaching events
  await client.from("jeffery_learning_log").insert({
    source_type: "steering_directive",
    source_id: directiveId,
    lesson: `Admin directive received: "${d.title}". Instruction: ${d.instruction}. Scope: ${d.scope}.`,
    lesson_category: "self_review",
    config_changes: null,
    applied_to_agents: [d.scope],
  });

  return { ok: true };
}

/**
 * Process an inline directive sent as a comment on a specific message.
 * Prefers commentId for the acknowledgment update because duplicate comment
 * text would otherwise collide when matching by content equality.
 */
export async function processCommentDirective(
  messageId: string,
  comment: string,
  commentId?: string,
): Promise<{ ok: boolean }> {
  const client = buildServiceClient();
  await client.from("jeffery_learning_log").insert({
    source_type: "comment_directive",
    source_id: messageId,
    lesson: `Admin inline directive on message ${messageId}: ${comment}`,
    lesson_category: "tone_adjustment",
    config_changes: null,
    applied_to_agents: ["global"],
  });

  const update = client
    .from("jeffery_message_comments")
    .update({
      directive_acknowledged: true,
      directive_acknowledged_at: new Date().toISOString(),
    });

  if (commentId) {
    await update.eq("id", commentId);
  } else {
    // Fallback for legacy callers that didn't pass commentId: acknowledge the
    // most recent directive comment on the message instead of blindly matching
    // content, which broke whenever the same text appeared twice.
    const { data: latest } = await client
      .from("jeffery_message_comments")
      .select("id")
      .eq("message_id", messageId)
      .eq("is_directive", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest?.id) await update.eq("id", latest.id);
  }
  return { ok: true };
}
