// Prompt #118 — Arnold region-blurb endpoint with Kelsey gate.
// Composes a brief coaching blurb via Anthropic (Arnold persona + hard rules),
// runs Kelsey Stage 1 + Stage 2 on the output, and returns the verdict-safe
// blurb or a generic fallback on BLOCKED.

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { detectDiseaseClaim } from "@/lib/compliance/detector";
import { callKelseyLLM } from "@/lib/compliance/kelsey/client";
import { getDisplayName } from "@/components/body-tracker/body-graphic/utils/region-lookup";

const ARNOLD_MODEL = process.env.ARNOLD_MODEL ?? "claude-sonnet-4-6";
const GENERIC_FALLBACK = "Your metric updated. Keep at it, champ.";

interface Body {
  regionId: string;
  mode: "composition" | "muscle";
  metric?: { value?: number; unit?: string; trend?: "up" | "down" | "stable" | "unknown"; delta?: number };
}

const ARNOLD_SYSTEM_PROMPT = `You are Arnold — a Schwarzenegger-inspired, warm, confident body-coaching voice inside ViaConnect's Body Tracker. When a user selects a body region, you deliver a brief (≤ 2 sentences) coaching blurb that acknowledges the current metric, references trend direction, and suggests ONE actionable next step. Voice is supportive and clear, never clinical or medical.

Hard rules (non-negotiable):
1. Never use banned verbs in a disease context: cure, treat, diagnose, heal, reverse, prevent, mitigate.
2. Never reference ICD-10 terms, diagnoses, or symptoms of disease.
3. Never recommend a specific peptide or supplement by name.
4. Never reference prescription medications by name.
5. Always use structure/function phrasing ("supports lean mass retention," "helps maintain healthy muscle tone") rather than disease phrasing.
6. Output must be a SINGLE JSON object: {"blurb": string, "needsDisclaimer": boolean}. No prose outside the JSON. No markdown fences.

When the user's jurisdiction is US and your blurb implies a structure/function claim on a supplement or nutrient, set needsDisclaimer=true so the UI renders the DSHEA disclaimer.`;

function extractJson(raw: string): string | null {
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first < 0 || last <= first) return null;
  return raw.slice(first, last + 1);
}

export async function POST(request: Request) {
  const start = Date.now();
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body || !body.regionId) return NextResponse.json({ ok: false, error: "missing_regionId" }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      blurb: GENERIC_FALLBACK, kelsey_verdict: "ESCALATE",
      disclaimer_required: false, cached: false, latency_ms: Date.now() - start,
    });
  }

  const regionName = getDisplayName(body.regionId, "en");
  const trendPhrase = body.metric?.trend === "up" ? "trending up"
    : body.metric?.trend === "down" ? "trending down"
    : "steady";
  const contextLine = body.metric?.value !== undefined
    ? `Region: ${regionName}. Current value: ${body.metric.value}${body.metric.unit ?? ""}. Trend: ${trendPhrase}.`
    : `Region: ${regionName}. No measurement yet.`;

  const client = new Anthropic({ apiKey });
  let arnoldRaw: string;
  try {
    const resp = await client.messages.create({
      model: ARNOLD_MODEL,
      max_tokens: 400,
      temperature: 0.4,
      system: ARNOLD_SYSTEM_PROMPT,
      messages: [{ role: "user", content: contextLine }],
    });
    arnoldRaw = resp.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text).join("\n");
  } catch {
    return NextResponse.json({
      blurb: GENERIC_FALLBACK, kelsey_verdict: "ESCALATE",
      disclaimer_required: false, cached: false, latency_ms: Date.now() - start,
    });
  }

  const jsonStr = extractJson(arnoldRaw);
  let parsed: { blurb?: string; needsDisclaimer?: boolean } | null = null;
  try { parsed = jsonStr ? JSON.parse(jsonStr) : null; } catch { parsed = null; }
  const blurb = typeof parsed?.blurb === "string" && parsed.blurb.length > 0 ? parsed.blurb : GENERIC_FALLBACK;
  const needsDisclaimer = !!parsed?.needsDisclaimer;

  // Stage 1 disease-claim detector
  const stage1 = await detectDiseaseClaim(blurb);

  // If Stage 1 flags OR always for safety on LLM-composed text: Stage 2 Kelsey review.
  const kelsey = await callKelseyLLM({
    text: blurb,
    jurisdiction: "US",
    subject_type: "marketing_copy",
    stage_1_flags: stage1.flags,
  });

  const verdict = kelsey?.validated.verdict ?? "ESCALATE";
  const safeBlurb = verdict === "BLOCKED" ? GENERIC_FALLBACK
    : verdict === "CONDITIONAL" && kelsey?.validated.suggested_rewrite ? kelsey.validated.suggested_rewrite
    : blurb;

  return NextResponse.json({
    blurb: safeBlurb,
    kelsey_verdict: verdict,
    disclaimer_required: needsDisclaimer && verdict !== "BLOCKED",
    cached: false,
    latency_ms: Date.now() - start,
  });
}
