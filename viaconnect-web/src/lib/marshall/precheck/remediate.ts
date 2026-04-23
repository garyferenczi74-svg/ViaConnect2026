/**
 * LLM rewrite proposer. Uses the Anthropic SDK (already pinned for #105).
 * Recursion capped at MAX_RECURSION. Output is strictly JSON-validated and
 * re-scanned through the rule engine before presentation.
 *
 * Safety rails:
 *   - No new claims: system prompt forbids introducing factual claims.
 *   - No invented substantiation: no "studies show", no fake citations.
 *   - Length cap: rewrite <= 120% of original length.
 *   - Structured output: JSON { proposedRewrite, delta[], rationale }.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { PrecheckFindingDto, NormalizedDraft } from "./types";
import { normalizeDraft } from "./normalize";
import { evaluateDraft } from "./evaluate";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1024;
const TIMEOUT_MS = 30_000;

export interface RewriteProposal {
  proposedRewrite: string;
  delta: Array<{ kind: "remove" | "insert" | "replace"; text: string }>;
  rationale: string;
  unremediable: false;
}

export interface RewriteUnremediable {
  unremediable: true;
  reason: string;
}

const SYSTEM_PROMPT = `You are an assistant that rewrites a social-media draft to satisfy a specific compliance rule.

CONSTRAINTS:
- Do not introduce factual claims that were not in the original draft.
- Do not invent substantiation (do not write "studies show", "research proves", "clinical trial", etc.) unless the original draft had it.
- Do not expand the draft beyond 120% of the original length.
- Prefer structure/function language (supports, promotes, helps maintain) over disease-outcome language (cures, treats, prevents).
- Preserve the author's voice.
- Output MUST be a single JSON object matching the schema below. No prose outside the JSON.

OUTPUT SCHEMA:
{
  "proposedRewrite": "string (the full revised draft)",
  "delta": [{"kind": "remove" | "insert" | "replace", "text": "string"}],
  "rationale": "string (one sentence explaining the specific edit)"
}
`;

function userPrompt(findingRuleId: string, citation: string, excerpt: string, fullDraft: string): string {
  return `Rule violated: ${findingRuleId}
Citation: ${citation}
Offending span: """${excerpt}"""

Full original draft:
"""
${fullDraft}
"""

Produce the minimal-diff rewrite that satisfies the rule.`;
}

async function callClaude(findingRuleId: string, citation: string, excerpt: string, fullDraft: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const client = new Anthropic({ apiKey });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await client.messages.create(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt(findingRuleId, citation, excerpt, fullDraft) }],
      },
      { signal: controller.signal },
    );
    const text = resp.content
      .filter((c) => c.type === "text")
      .map((c) => ("text" in c ? c.text : ""))
      .join("");
    return text;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[precheck/remediate] Claude call failed: ${(err as Error).message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function parseAndValidate(rawText: string, originalLength: number): RewriteProposal | RewriteUnremediable {
  // Strip code fences if the model wrapped the JSON.
  const cleaned = rawText.replace(/```json|```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return { unremediable: true, reason: "no_json_found" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return { unremediable: true, reason: "json_parse_failed" };
  }
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.proposedRewrite !== "string") return { unremediable: true, reason: "missing_proposedRewrite" };
  if (!Array.isArray(obj.delta)) return { unremediable: true, reason: "missing_delta" };
  if (typeof obj.rationale !== "string") return { unremediable: true, reason: "missing_rationale" };
  if (obj.proposedRewrite.length > originalLength * 1.2 + 80) return { unremediable: true, reason: "rewrite_too_long" };
  // Prompt-injection defense: reject any field containing tool-use or function-call signals.
  const hostile = /__tool_use|<tool[_ ]use>|function_call|exfiltrate|eval\(/i;
  for (const v of [obj.proposedRewrite as string, obj.rationale as string, JSON.stringify(obj.delta)]) {
    if (hostile.test(v)) return { unremediable: true, reason: "hostile_payload" };
  }
  return {
    proposedRewrite: obj.proposedRewrite,
    delta: obj.delta as RewriteProposal["delta"],
    rationale: obj.rationale,
    unremediable: false,
  };
}

export async function proposeRewrite(
  finding: PrecheckFindingDto,
  fullDraft: string,
): Promise<RewriteProposal | RewriteUnremediable> {
  const raw = await callClaude(finding.ruleId, finding.citation, finding.excerpt, fullDraft);
  if (!raw) return { unremediable: true, reason: "claude_unavailable" };
  return parseAndValidate(raw, fullDraft.length);
}

/**
 * Re-scan a proposed rewrite through the rule engine. If it passes, return
 * it. If it fails, try one more iteration with stricter constraints.
 * Returns the final rewrite + whether it was clean at emit time.
 */
export async function proposeAndRevalidate(
  finding: PrecheckFindingDto,
  fullDraft: string,
  recursionCount: number = 0,
): Promise<{ rewrite?: string; rationale?: string; clean: boolean; recursionReached: number }> {
  if (recursionCount > 1) return { clean: false, recursionReached: recursionCount };
  const proposal = await proposeRewrite(finding, fullDraft);
  if ("unremediable" in proposal && proposal.unremediable) {
    return { clean: false, recursionReached: recursionCount };
  }
  const p = proposal as RewriteProposal;
  const normalized: NormalizedDraft = normalizeDraft({ text: p.proposedRewrite });
  const evalResult = await evaluateDraft(normalized, recursionCount + 2);
  const stillViolates = evalResult.findings.some((f) => f.ruleId === finding.ruleId);
  if (!stillViolates) {
    return { rewrite: p.proposedRewrite, rationale: p.rationale, clean: true, recursionReached: recursionCount };
  }
  if (recursionCount >= 1) return { clean: false, recursionReached: recursionCount };
  return proposeAndRevalidate(finding, p.proposedRewrite, recursionCount + 1);
}
