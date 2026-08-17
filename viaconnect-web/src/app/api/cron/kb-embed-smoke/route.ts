/**
 * Prompt 221: diagnose embedding path (Bearer CRON_SECRET).
 * Never returns API keys or vectors.
 */
import { isCronAuthorized } from "@/lib/jeffery/ops/cronAuth";
import { embedText, EMBEDDING_DIMS } from "@/lib/kb/embeddings";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const keyPresent = Boolean(
    process.env.GEMINI_API_KEY?.trim() ||
      process.env.Photo_AI_GEMINI_API_KEY?.trim() ||
      process.env.GEMINI_API_KEY_3?.trim()
  );

  const sample = await embedText(
    "ViaConnect KB embed smoke: liposomal curcumin absorption study grade B"
  );

  let rpcOk = false;
  let rpcError: string | null = null;
  let itemId: string | null = null;
  let writeOk = false;

  try {
    const sb = createAdminClient();
    const { data: row } = await sb
      .from("kb_items")
      .select("id")
      .eq("jeffery_verdict", "approved")
      .limit(1)
      .maybeSingle();
    itemId = row?.id ? String(row.id) : null;

    if (sample && itemId) {
      const literal = `[${sample.join(",")}]`;
      const { error } = await sb.rpc("set_kb_item_embedding", {
        p_item_id: itemId,
        p_embedding: literal,
      });
      if (error) {
        rpcError = error.message.slice(0, 200);
      } else {
        rpcOk = true;
        writeOk = true;
      }
    }
  } catch (e) {
    rpcError = e instanceof Error ? e.message : String(e);
  }

  return Response.json({
    ok: Boolean(sample && sample.length === EMBEDDING_DIMS && writeOk),
    keyPresent,
    embedOk: Boolean(sample && sample.length === EMBEDDING_DIMS),
    dims: sample?.length ?? 0,
    expectedDims: EMBEDDING_DIMS,
    sampleItemId: itemId,
    rpcOk,
    writeOk,
    rpcError,
  });
}
