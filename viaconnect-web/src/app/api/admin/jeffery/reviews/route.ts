/**
 * Prompt 221A: Jeffery Review Desk API
 * GET  — queue snapshot, stats, needs_human inbox, scorecards
 * POST — Gary escalation decision (approve/reject) for needs_human rows
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { JEFFERY_REVIEW_SLA_MINUTES } from "@/lib/jeffery/reviews/types";
import { safeLog } from "@/lib/utils/safe-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: Response.json({ error: "unauthenticated" }, { status: 401 }) };
  }
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

function slaMinutesFor(artifactType: string): number {
  const map = JEFFERY_REVIEW_SLA_MINUTES as Record<string, number>;
  return map[artifactType] ?? 240;
}

export async function GET() {
  try {
    const gate = await requireAdmin();
    if ("error" in gate && gate.error) return gate.error;

    const admin = createAdminClient();

    const { data: reviews, error: revErr } = await admin
      .from("jeffery_reviews")
      .select(
        "id, artifact_type, artifact_ref, verdict, reviewer_mode, review_checks, rationale_summary, produced_by_agent, is_current, reviewed_at, handler_version"
      )
      .eq("is_current", true)
      .order("reviewed_at", { ascending: false })
      .limit(100);

    if (revErr) {
      safeLog.warn("admin.jeffery.reviews", "list failed", {
        error: revErr.message,
      });
    }

    const rows = reviews ?? [];
    const now = Date.now();

    const queue = rows.map((r) => {
      const reviewedAt = r.reviewed_at
        ? new Date(String(r.reviewed_at)).getTime()
        : now;
      const ageMin = Math.max(0, Math.round((now - reviewedAt) / 60000));
      const sla = slaMinutesFor(String(r.artifact_type));
      return {
        id: r.id,
        artifactType: r.artifact_type,
        artifactRef: r.artifact_ref,
        verdict: r.verdict,
        reviewerMode: r.reviewer_mode,
        checks: r.review_checks,
        rationale: r.rationale_summary,
        producedByAgent: r.produced_by_agent,
        reviewedAt: r.reviewed_at,
        handlerVersion: r.handler_version,
        ageMinutes: ageMin,
        slaMinutes: sla,
        slaBreached: r.verdict === "needs_human" && ageMin > sla,
      };
    });

    const needsHuman = queue.filter((q) => q.verdict === "needs_human");
    const stats = {
      totalCurrent: queue.length,
      approved: queue.filter((q) => q.verdict === "approved").length,
      rejected: queue.filter((q) => q.verdict === "rejected").length,
      needsHuman: needsHuman.length,
      slaBreached: needsHuman.filter((q) => q.slaBreached).length,
      byType: {} as Record<string, number>,
    };
    for (const q of queue) {
      const t = String(q.artifactType);
      stats.byType[t] = (stats.byType[t] ?? 0) + 1;
    }

    // Pending KB promotions (Marshall gated, Jeffery not yet approved)
    const { data: pendingKb } = await admin
      .from("kb_items")
      .select("id, title, gate_status, jeffery_verdict, payload_type, created_at")
      .in("gate_status", ["approved", "lex_approved"])
      .or("jeffery_verdict.eq.pending,jeffery_verdict.is.null,jeffery_verdict.eq.needs_human")
      .order("created_at", { ascending: false })
      .limit(40);

    // Per-agent scorecard from current reviews
    const byAgent: Record<
      string,
      { approved: number; rejected: number; needsHuman: number }
    > = {};
    for (const q of queue) {
      const a = String(q.producedByAgent ?? "unknown");
      if (!byAgent[a]) {
        byAgent[a] = { approved: 0, rejected: 0, needsHuman: 0 };
      }
      if (q.verdict === "approved") byAgent[a].approved += 1;
      else if (q.verdict === "rejected") byAgent[a].rejected += 1;
      else byAgent[a].needsHuman += 1;
    }

    // Collection tiles (counts)
    const { data: collections } = await admin
      .from("kb_collections")
      .select("slug, display_name, status, seeding_phase, gate_profile");

    const { count: itemCount } = await admin
      .from("kb_items")
      .select("id", { count: "exact", head: true });

    const { count: liveCount } = await admin
      .from("kb_items")
      .select("id", { count: "exact", head: true })
      .in("gate_status", ["approved", "lex_approved"])
      .eq("jeffery_verdict", "approved");

    return Response.json({
      ok: true,
      stats,
      needsHuman,
      queue: queue.slice(0, 50),
      pendingKb: pendingKb ?? [],
      scorecards: byAgent,
      collections: collections ?? [],
      corpus: {
        items: itemCount ?? 0,
        liveRetrievable: liveCount ?? 0,
      },
      backlogAlert: stats.needsHuman >= 10 || stats.slaBreached > 0,
    });
  } catch (err) {
    safeLog.error("admin.jeffery.reviews", "GET failed", { error: err });
    return Response.json({ error: "failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const gate = await requireAdmin();
    if ("error" in gate && gate.error) return gate.error;

    let body: {
      artifactType?: string;
      artifactRef?: string;
      decision?: "approved" | "rejected";
      notes?: string;
    };
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "invalid_json" }, { status: 400 });
    }

    if (
      !body.artifactType ||
      !body.artifactRef ||
      (body.decision !== "approved" && body.decision !== "rejected")
    ) {
      return Response.json({ error: "invalid_body" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin.rpc("record_jeffery_review", {
      p_artifact_type: body.artifactType,
      p_artifact_ref: body.artifactRef,
      p_review_checks: [
        {
          name: "gary_escalation",
          result: body.decision === "approved" ? "pass" : "fail",
          detail: body.notes?.slice(0, 400) || "Gary decision via Review Desk",
        },
      ],
      p_verdict: body.decision,
      p_reviewer_mode: "gary_escalation",
      p_handler_version: "221a.desk.1",
      p_rationale_summary: body.notes?.slice(0, 500) || `Gary ${body.decision}`,
      p_produced_by_agent: "gary",
    });

    if (error) {
      return Response.json(
        { ok: false, error: error.message },
        { status: 200 }
      );
    }

    return Response.json({ ok: true, review: data });
  } catch (err) {
    safeLog.error("admin.jeffery.reviews", "POST failed", { error: err });
    return Response.json({ error: "failed" }, { status: 500 });
  }
}
