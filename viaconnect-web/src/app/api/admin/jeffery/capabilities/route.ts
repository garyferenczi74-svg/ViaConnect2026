/**
 * GET  /api/admin/jeffery/capabilities  — matrix + usage + budgets
 * POST /api/admin/jeffery/capabilities  — admin demo invoke (Section 4 demos)
 */

import { createClient } from "@/lib/supabase/server";
import { listGrantMatrix } from "@/lib/jeffery/capabilities/grants";
import { fetchCapabilityUsage } from "@/lib/jeffery/capabilities/logUsage";
import {
  CAPABILITY_DEFINITIONS,
  CORE_SEVEN_AGENTS,
  invokeCapability,
  runCoreSevenCapabilityDemos,
  snapshotBudgets,
  isGrokConfigured,
  GROK_MODEL,
  isConsumerPublishAllowed,
  markMarshallApproved,
  type CapabilityAction,
  type CapabilityAgentId,
} from "@/lib/jeffery/capabilities/registry";
import { safeLog } from "@/lib/utils/safe-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: Response.json({ error: "unauthenticated" }, { status: 401 }) };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "admin") {
    return { error: Response.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { user };
}

export async function GET() {
  try {
    const gate = await requireAdmin();
    if ("error" in gate && gate.error) return gate.error;

    const [matrix, usage] = await Promise.all([listGrantMatrix(), fetchCapabilityUsage(60)]);
    return Response.json({
      coreSeven: CORE_SEVEN_AGENTS,
      definitions: CAPABILITY_DEFINITIONS,
      matrix,
      usage,
      budgets: snapshotBudgets(),
      grok: { configured: isGrokConfigured(), model: GROK_MODEL },
    });
  } catch (err) {
    safeLog.error("api.admin.jeffery.capabilities", "GET failed", { error: err });
    return Response.json({ error: "failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const gate = await requireAdmin();
    if ("error" in gate && gate.error) return gate.error;

    let body: {
      mode?: "demo" | "invoke" | "gate_test" | "budget_test";
      agent?: string;
      action?: CapabilityAction;
      userId?: string;
    };
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "invalid_json" }, { status: 400 });
    }

    if (body.mode === "demo" || !body.mode) {
      const demos = await runCoreSevenCapabilityDemos({ userId: body.userId });
      return Response.json({
        demos: demos.map((d) => ({
          agent: d.agent,
          capability: d.capability,
          ok: d.result.ok,
          outcome: d.result.usage.outcome,
          reason: d.result.reason,
          marshallGateRequired: d.result.marshallGateRequired,
          marshallApproved: d.result.marshallApproved,
          consumerPublishAllowed: isConsumerPublishAllowed(d.result),
          credits: d.result.usage.credits,
          tokens: d.result.usage.tokens,
        })),
      });
    }

    if (body.mode === "gate_test") {
      // Prove Grok-derived material cannot reach consumers without Marshall.
      const result = await invokeCapability("sherlock", {
        capability: "grok_research",
        action: "research",
        query: "gate test: omega-3 research note",
      });
      const before = isConsumerPublishAllowed(result);
      const after = isConsumerPublishAllowed(markMarshallApproved(result));
      return Response.json({
        gateTest: {
          marshallGateRequired: result.marshallGateRequired,
          beforeMarshall: before,
          afterMarshall: after,
          pass: before === false && after === true,
        },
        outcome: result.usage.outcome,
        reason: result.reason,
      });
    }

    if (body.mode === "budget_test") {
      // Two agents draw on Firecrawl soft-cap / shared ceiling.
      const a1 = await invokeCapability("hounddog", {
        capability: "firecrawl",
        action: "search",
        query: "budget test one",
        limit: 1,
      });
      const a2 = await invokeCapability("sherlock", {
        capability: "firecrawl",
        action: "search",
        query: "budget test two",
        limit: 1,
      });
      return Response.json({
        budgetTest: {
          hounddog: {
            outcome: a1.usage.outcome,
            credits: a1.usage.credits,
            agent: a1.usage.agent,
          },
          sherlock: {
            outcome: a2.usage.outcome,
            credits: a2.usage.credits,
            agent: a2.usage.agent,
          },
          snapshot: snapshotBudgets(),
        },
      });
    }

    if (body.mode === "invoke" && body.agent && body.action) {
      const result = await invokeCapability(body.agent as CapabilityAgentId, body.action);
      return Response.json({
        result: {
          ok: result.ok,
          denied: result.denied,
          reason: result.reason,
          usage: result.usage,
          marshallGateRequired: result.marshallGateRequired,
          marshallApproved: result.marshallApproved,
          consumerPublishAllowed: isConsumerPublishAllowed(result),
          // data intentionally omitted for large payloads in admin list views
          dataPreview: result.data
            ? JSON.stringify(result.data).slice(0, 400)
            : null,
        },
      });
    }

    return Response.json({ error: "invalid_mode" }, { status: 400 });
  } catch (err) {
    safeLog.error("api.admin.jeffery.capabilities", "POST failed", { error: err });
    return Response.json({ error: "failed" }, { status: 500 });
  }
}
