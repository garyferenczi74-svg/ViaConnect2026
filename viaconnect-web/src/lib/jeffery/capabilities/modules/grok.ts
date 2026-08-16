/**
 * Prompt 219G: xAI Grok research capability (OpenAI-compatible REST).
 * No SDK / no package.json change. XAI_API_KEY from env only.
 *
 * COMPLIANCE: outputs are RESEARCH INPUT only. Never surface to consumers
 * without Marshall approval (marshallApproved stays false until explicit gate).
 */

import { tryReserveGrokTokens, budgetEventMeta } from "../budgets";
import type { CapabilityAgentId, CapabilityResult } from "../types";
import { logCapabilityUsage } from "../logUsage";

/** Tunable flagship model constant (Gary can change via env override). */
export const GROK_MODEL =
  process.env.XAI_GROK_MODEL?.trim() || "grok-3-latest";

const XAI_BASE = "https://api.x.ai/v1";
const MAX_COMPLETION_TOKENS = 800;
/** Conservative estimate reserved before call; adjusted from usage if returned. */
const RESERVE_TOKENS = 1200;

function apiKey(): string | null {
  const k =
    process.env.XAI_API_KEY?.trim() ||
    process.env.GROK_API_KEY?.trim() ||
    "";
  return k.length > 0 ? k : null;
}

export function isGrokConfigured(): boolean {
  return Boolean(apiKey());
}

export interface GrokResearchResult {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** Always true for this capability until Marshall gate approves. */
  researchInputOnly: true;
}

export async function capGrokResearch(
  agent: CapabilityAgentId,
  query: string
): Promise<CapabilityResult<GrokResearchResult>> {
  const t0 = Date.now();
  const queryShape = `grok:${query.slice(0, 120)}`;
  const key = apiKey();

  if (!key) {
    const usage = {
      agent: String(agent),
      capability: "grok_research" as const,
      queryShape,
      credits: 0,
      tokens: 0,
      outcome: "skipped" as const,
      reason: "XAI_API_KEY unset",
      durationMs: Date.now() - t0,
      meta: budgetEventMeta("grok_research", agent),
    };
    await logCapabilityUsage(usage);
    return {
      ok: false,
      skipped: true,
      reason: usage.reason,
      usage,
      marshallGateRequired: true,
      marshallApproved: false,
    };
  }

  const reserve = tryReserveGrokTokens(agent, RESERVE_TOKENS);
  if (!reserve.allowed) {
    const usage = {
      agent: String(agent),
      capability: "grok_research" as const,
      queryShape,
      credits: 0,
      tokens: 0,
      outcome: "budget_exhausted" as const,
      reason: reserve.reason,
      durationMs: Date.now() - t0,
      meta: budgetEventMeta("grok_research", agent),
    };
    await logCapabilityUsage(usage);
    return {
      ok: false,
      skipped: true,
      reason: reserve.reason,
      usage,
      marshallGateRequired: true,
      marshallApproved: false,
    };
  }

  try {
    const res = await fetch(`${XAI_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROK_MODEL,
        max_tokens: MAX_COMPLETION_TOKENS,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are a research assistant for ViaConnect internal agents. Provide concise, source-aware health research notes. Structure/function framing only. Do not diagnose. Do not invent citations. Label uncertainty. Output is research input only, never patient-facing advice.",
          },
          { role: "user", content: query.slice(0, 4000) },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const usage = {
        agent: String(agent),
        capability: "grok_research" as const,
        queryShape,
        credits: 0,
        tokens: RESERVE_TOKENS,
        outcome: "failed" as const,
        reason: `http_${res.status}`,
        durationMs: Date.now() - t0,
        meta: {
          ...budgetEventMeta("grok_research", agent),
          bodyPreview: body.slice(0, 120),
        },
      };
      await logCapabilityUsage(usage);
      return {
        ok: false,
        reason: usage.reason,
        usage,
        marshallGateRequired: true,
        marshallApproved: false,
      };
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      model?: string;
    };
    const text = json.choices?.[0]?.message?.content ?? "";
    const inputTokens = json.usage?.prompt_tokens ?? 0;
    const outputTokens = json.usage?.completion_tokens ?? 0;
    const total =
      json.usage?.total_tokens ??
      (inputTokens + outputTokens > 0 ? inputTokens + outputTokens : RESERVE_TOKENS);

    const usage = {
      agent: String(agent),
      capability: "grok_research" as const,
      queryShape,
      credits: 0,
      tokens: total,
      outcome: text ? ("ok" as const) : ("partial" as const),
      durationMs: Date.now() - t0,
      meta: {
        ...budgetEventMeta("grok_research", agent),
        model: json.model ?? GROK_MODEL,
      },
    };
    await logCapabilityUsage(usage);

    return {
      ok: true,
      data: {
        text,
        model: json.model ?? GROK_MODEL,
        inputTokens,
        outputTokens,
        researchInputOnly: true,
      },
      usage,
      marshallGateRequired: true,
      marshallApproved: false,
    };
  } catch (err) {
    const usage = {
      agent: String(agent),
      capability: "grok_research" as const,
      queryShape,
      credits: 0,
      tokens: RESERVE_TOKENS,
      outcome: "failed" as const,
      reason: err instanceof Error ? err.message : "grok_error",
      durationMs: Date.now() - t0,
      meta: budgetEventMeta("grok_research", agent),
    };
    await logCapabilityUsage(usage);
    return {
      ok: false,
      reason: usage.reason,
      usage,
      marshallGateRequired: true,
      marshallApproved: false,
    };
  }
}

/**
 * Explicit Marshall gate: only after compliance approval may research
 * material be considered for consumer-bound pipelines.
 */
export function markMarshallApproved<T>(
  result: CapabilityResult<T>
): CapabilityResult<T> {
  if (!result.marshallGateRequired) return result;
  return { ...result, marshallApproved: true };
}
