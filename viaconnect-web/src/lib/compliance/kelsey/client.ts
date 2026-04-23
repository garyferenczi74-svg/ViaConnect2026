// Prompt #113 — Kelsey LLM client.
// Calls Anthropic API via the already-installed @anthropic-ai/sdk. Model
// selection:
//   - Default: claude-sonnet-4-6 (latest Sonnet per environment knowledge).
//     Spec referenced claude-sonnet-4-5; bumped forward to 4-6; configurable
//     via KELSEY_MODEL env var.
//   - Fallback for high-severity (any Stage-1 flag with severity >= 4):
//     claude-opus-4-7 for maximum careful reasoning.
//
// No streaming; temperature 0.0 for deterministic verdicts.

import Anthropic from "@anthropic-ai/sdk";
import { KELSEY_SYSTEM_PROMPT } from "./prompt";
import { extractJson, validateKelseyResponse, type ValidatedKelseyResponse } from "./verdict-schema";
import type { DetectorFlag, JurisdictionCode, SubjectType } from "../types";

const DEFAULT_MODEL = process.env.KELSEY_MODEL ?? "claude-sonnet-4-6";
const HIGH_SEVERITY_MODEL = process.env.KELSEY_MODEL_HIGH_SEVERITY ?? "claude-opus-4-7";
const HIGH_SEVERITY_THRESHOLD = 4;
const MAX_TOKENS = 1200;

let cachedClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Prompt #113 Kelsey: ANTHROPIC_API_KEY not configured");
  cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

function pickModel(stage1Flags: DetectorFlag[]): string {
  const maxSeverity = stage1Flags.reduce((m, f) => Math.max(m, f.severity), 0);
  return maxSeverity >= HIGH_SEVERITY_THRESHOLD ? HIGH_SEVERITY_MODEL : DEFAULT_MODEL;
}

export interface KelseyLLMInput {
  text: string;
  jurisdiction: JurisdictionCode;
  subject_type: SubjectType;
  ingredient_scope?: string[];
  sku_scope?: string[];
  context?: string;
  stage_1_flags: DetectorFlag[];
}

export interface KelseyLLMResult {
  validated: ValidatedKelseyResponse;
  model_used: string;
  raw_response: string;
}

function buildUserMessage(input: KelseyLLMInput): string {
  const parts: string[] = [];
  parts.push(`Jurisdiction: ${input.jurisdiction}`);
  parts.push(`Subject type: ${input.subject_type}`);
  if (input.ingredient_scope && input.ingredient_scope.length > 0) {
    parts.push(`Ingredient scope: ${input.ingredient_scope.join(", ")}`);
  }
  if (input.sku_scope && input.sku_scope.length > 0) {
    parts.push(`SKU scope: ${input.sku_scope.join(", ")}`);
  }
  if (input.context) {
    parts.push(`Context: ${input.context.slice(0, 2000)}`);
  }
  if (input.stage_1_flags.length > 0) {
    parts.push(`Stage 1 flags: ${JSON.stringify(input.stage_1_flags)}`);
  }
  parts.push("---");
  parts.push("Text to review:");
  parts.push(input.text);
  return parts.join("\n");
}

export async function callKelseyLLM(input: KelseyLLMInput): Promise<KelseyLLMResult | null> {
  const model = pickModel(input.stage_1_flags);
  const client = getClient();

  let raw: string;
  try {
    const resp = await client.messages.create({
      model,
      max_tokens: MAX_TOKENS,
      temperature: 0,
      system: KELSEY_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserMessage(input) }],
    });
    const text = resp.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    raw = text;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[kelsey] Anthropic call failed:", e);
    return null;
  }

  const jsonStr = extractJson(raw);
  if (!jsonStr) return null;
  let parsed: unknown;
  try { parsed = JSON.parse(jsonStr); } catch { return null; }
  const validated = validateKelseyResponse(parsed);
  if (!validated) return null;
  return { validated, model_used: model, raw_response: raw };
}
