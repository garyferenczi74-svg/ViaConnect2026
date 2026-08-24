/**
 * Prompt 225 G7: apply staged kb_peptide_regulatory_events via Jeffery.
 * Bearer CRON_SECRET. Never auto-runs from Thanos; explicit cron only.
 */
import { applyPeptideRegulatoryEvent } from "@/lib/jeffery/applyPeptideRegulatoryEvent";
import { isCronAuthorized } from "@/lib/jeffery/ops/cronAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type StagedRow = {
  id: string;
  peptide_id: string;
  jurisdiction: string;
  new_status: string;
  applied_at: string | null;
  kb_peptides: { slug: string; display_name: string } | null;
};

export async function POST(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const slugFilter = url.searchParams.get("slug")?.trim() || null;
    const eventIdFilter = url.searchParams.get("eventId")?.trim() || null;
    const limit = Math.min(
      Number(url.searchParams.get("limit") ?? "5") || 5,
      25,
    );

    const admin = createAdminClient();
    let query = admin
      .from("kb_peptide_regulatory_events")
      .select(
        "id, peptide_id, jurisdiction, new_status, applied_at, kb_peptides(slug, display_name)",
      )
      .is("applied_at", null)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (eventIdFilter) {
      query = admin
        .from("kb_peptide_regulatory_events")
        .select(
          "id, peptide_id, jurisdiction, new_status, applied_at, kb_peptides(slug, display_name)",
        )
        .eq("id", eventIdFilter)
        .limit(1);
    }

    const { data, error } = await query;
    if (error) {
      return Response.json(
        { ok: false, error: error.message },
        { status: 200 },
      );
    }

    let rows = (data ?? []) as unknown as StagedRow[];
    if (slugFilter) {
      rows = rows.filter((r) => r.kb_peptides?.slug === slugFilter);
    }

    if (rows.length === 0) {
      return Response.json(
        {
          ok: true,
          applied: [],
          skipped: [],
          message: "no_staged_events",
          jefferyFnProbe: true,
        },
        { status: 200 },
      );
    }

    const applied: Array<Record<string, unknown>> = [];
    const skipped: Array<Record<string, unknown>> = [];

    for (const row of rows) {
      if (row.applied_at) {
        skipped.push({
          eventId: row.id,
          reason: "already_applied",
          slug: row.kb_peptides?.slug ?? null,
        });
        continue;
      }

      const result = await applyPeptideRegulatoryEvent({
        eventId: row.id,
        reviewerMode: "gary_escalation",
        rationale:
          "Gary continue authorized Jeffery apply of staged Prompt 225 sample regulatory event (G7).",
      });

      if (!result.ok) {
        skipped.push({
          eventId: row.id,
          reason: result.error ?? "apply_failed",
          slug: row.kb_peptides?.slug ?? null,
        });
        continue;
      }

      const { data: peptideAfter } = await admin
        .from("kb_peptides")
        .select("slug, regulatory_status")
        .eq("id", row.peptide_id)
        .maybeSingle();

      applied.push({
        eventId: result.eventId ?? row.id,
        appliedAt: result.appliedAt,
        slug: row.kb_peptides?.slug ?? peptideAfter?.slug ?? null,
        jurisdiction: row.jurisdiction,
        newStatus: row.new_status,
        regulatoryStatus: peptideAfter?.regulatory_status ?? null,
      });
    }

    return Response.json(
      {
        ok: skipped.length === 0 || applied.length > 0,
        applied,
        skipped,
        appliedCount: applied.length,
        skippedCount: skipped.length,
      },
      { status: 200 },
    );
  } catch (err) {
    safeLog.error("cron.apply-225-jeffery-regulatory", "threw", { error: err });
    return Response.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 200 },
    );
  }
}

export async function GET(request: Request): Promise<Response> {
  return POST(request);
}
