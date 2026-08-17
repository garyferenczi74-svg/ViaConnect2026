/**
 * Prompt 221 Phase 2 C1: force competitive SKU seed + bridge + enrich.
 * Bearer CRON_SECRET. Bypasses ops-tick 6-job batch so seeds always run.
 */
import { isCronAuthorized } from "@/lib/jeffery/ops/cronAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { runCompetitiveIngest } = await import(
      "@/lib/hounddog/ingest/competitive"
    );
    const { bridgeCompetitiveToKb } = await import(
      "@/lib/kb/bridgeCompetitiveToKb"
    );
    const { enrichCompetitiveProducts } = await import(
      "@/lib/kb/enrichCompetitiveProducts"
    );

    // Optional ?offset=N to pin seed window; else wall-clock seconds
    const url = new URL(request.url);
    const offsetParam = url.searchParams.get("offset");
    const seedOffset = offsetParam != null && Number.isFinite(Number(offsetParam))
      ? Number(offsetParam)
      : Math.floor(Date.now() / 1000);

    const ingest = await runCompetitiveIngest({
      runId: `cron-competitive-seed-${Date.now()}`,
      runDate: new Date().toISOString().slice(0, 10),
      // Seeds-only budget: deep path is heavy; discovery optional
      maxQueries: 0,
      seedOffset,
    });
    const bridge = await bridgeCompetitiveToKb(16);
    // Larger enrich batch to clear Serv.Size / UNKNOWN noise after seed
    const enrich = await enrichCompetitiveProducts(12, { allowScrape: true });

    return Response.json({
      ok: ingest.staged > 0 || bridge.withIngredients > 0 || enrich.enriched > 0,
      ingest,
      bridge,
      enrich,
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 200 }
    );
  }
}
