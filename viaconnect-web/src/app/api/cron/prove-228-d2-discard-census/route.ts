/**
 * Prompt 228 D2: corruption census for soft-discarded nutrition_logs.
 * READ ONLY. Bearer CRON_SECRET.
 */
import { isCronAuthorized } from "@/lib/jeffery/ops/cronAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!isCronAuthorized(req.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const admin = createAdminClient();

    const { count: discardedCount, error: cErr } = await admin
      .from("nutrition_logs")
      .select("id", { count: "exact", head: true })
      .eq("status", "discarded");
    if (cErr) throw cErr;

    const { data: discardedRows, error: dErr } = await admin
      .from("nutrition_logs")
      .select("id, user_id, photo_url, discarded_at, created_at")
      .eq("status", "discarded")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (dErr) throw dErr;

    const rows = discardedRows ?? [];
    const users = new Set(rows.map((r) => r.user_id).filter(Boolean));
    const withPhoto = rows.filter(
      (r) => typeof r.photo_url === "string" && r.photo_url.trim(),
    ).length;
    const times = rows
      .map((r) => r.discarded_at || r.created_at)
      .filter(Boolean)
      .map(String)
      .sort();

    const { count: pendingReviewCount } = await admin
      .from("nutrition_logs")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_review");
    const { count: confirmedCount } = await admin
      .from("nutrition_logs")
      .select("id", { count: "exact", head: true })
      .eq("status", "confirmed");

    const byMonth: Record<string, { n: number; users: Set<string> }> = {};
    for (const r of rows) {
      const at = String(r.discarded_at || r.created_at || "");
      const ym = at.slice(0, 7) || "unknown";
      if (!byMonth[ym]) byMonth[ym] = { n: 0, users: new Set() };
      byMonth[ym].n += 1;
      if (r.user_id) byMonth[ym].users.add(String(r.user_id));
    }

    return Response.json({
      ok: true,
      prompt: "228",
      phase: "d2-corruption-census",
      generatedAt: new Date().toISOString(),
      discarded: {
        count: discardedCount ?? rows.length,
        fetched: rows.length,
        distinctUsersInFetch: users.size,
        withPhotoUrlInFetch: withPhoto,
        earliestInFetch: times[0] ?? null,
        latestInFetch: times[times.length - 1] ?? null,
      },
      statusCounts: {
        discarded: discardedCount ?? null,
        pending_review: pendingReviewCount ?? null,
        confirmed: confirmedCount ?? null,
      },
      byMonth: Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([ym, v]) => ({ ym, n: v.n, users: v.users.size })),
      sample: rows.slice(0, 20).map((r) => ({
        id: r.id,
        user_id: r.user_id,
        at: r.discarded_at || r.created_at,
        hasPhoto: Boolean(r.photo_url && String(r.photo_url).trim()),
      })),
      note: "READ ONLY. Cleanup not performed. Gary decides user notification before historical hard-delete.",
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message || err.name
        : typeof err === "object" && err && "message" in err
          ? String((err as { message?: unknown }).message ?? "")
          : String(err);
    const details =
      typeof err === "object" && err
        ? {
            name: (err as { name?: string }).name ?? null,
            code: (err as { code?: string }).code ?? null,
            details: (err as { details?: string }).details ?? null,
            hint: (err as { hint?: string }).hint ?? null,
          }
        : null;
    safeLog.error("cron.228.d2-census", "failed", {
      error: message,
      details,
    });
    return Response.json(
      {
        ok: false,
        error: message || "[unserializable error]",
        details,
        blockerHint:
          "If error is empty or HTML/522, Supabase Postgres path is likely down. Retry census before cleanup.",
      },
      { status: 200 },
    );
  }
}

export async function GET(req: Request) {
  return POST(req);
}
