/**
 * 219N: authenticated Grok smoke (Bearer CRON_SECRET).
 * Returns configured flag, outcome, reason, and non-secret body preview.
 * Never returns API key material.
 */
import { isCronAuthorized } from "@/lib/jeffery/ops/cronAuth";
import {
  capGrokResearch,
  isGrokConfigured,
  GROK_MODEL,
} from "@/lib/jeffery/capabilities/modules/grok";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const configured = isGrokConfigured();
  if (!configured) {
    return Response.json({
      ok: false,
      configured: false,
      model: GROK_MODEL,
      outcome: "skipped",
      reason: "XAI_API_KEY and GROK_API_KEY both unset or empty in this deployment",
    });
  }

  const result = await capGrokResearch(
    "sherlock",
    "Smoke test: reply with one short sentence confirming research input mode only."
  );

  const meta = (result.usage.meta ?? {}) as Record<string, unknown>;
  return Response.json({
    ok: result.ok,
    configured: true,
    model: GROK_MODEL,
    outcome: result.usage.outcome,
    reason: result.reason ?? null,
    tokens: result.usage.tokens,
    durationMs: result.usage.durationMs,
    bodyPreview:
      typeof meta.bodyPreview === "string" ? meta.bodyPreview.slice(0, 200) : null,
    marshallGateRequired: result.marshallGateRequired,
    marshallApproved: result.marshallApproved,
    textLen: result.ok && result.data ? result.data.text.length : 0,
  });
}
