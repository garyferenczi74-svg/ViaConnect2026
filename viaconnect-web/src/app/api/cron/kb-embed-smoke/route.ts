/**
 * Prompt 221: diagnose embedding path (Bearer CRON_SECRET).
 * Never returns API keys or full vectors.
 */
import { isCronAuthorized } from "@/lib/jeffery/ops/cronAuth";
import { EMBEDDING_DIMS, EMBEDDING_MODEL } from "@/lib/kb/embeddings";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function resolveGeminiKey(): {
  present: boolean;
  source: string | null;
  len: number;
} {
  const candidates: Array<[string, string | undefined]> = [
    ["GEMINI_API_KEY", process.env.GEMINI_API_KEY],
    ["Photo_AI_GEMINI_API_KEY", process.env.Photo_AI_GEMINI_API_KEY],
    ["GEMINI_API_KEY_3", process.env.GEMINI_API_KEY_3],
  ];
  for (const [name, raw] of candidates) {
    const v = raw?.trim() ?? "";
    if (v.length > 0) return { present: true, source: name, len: v.length };
  }
  return { present: false, source: null, len: 0 };
}

export async function GET(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const keyInfo = resolveGeminiKey();
  let geminiStatus: number | null = null;
  let geminiBodyPreview: string | null = null;
  let dims = 0;
  let embedOk = false;
  let sample: number[] | null = null;

  if (keyInfo.present) {
    const key =
      process.env.GEMINI_API_KEY?.trim() ||
      process.env.Photo_AI_GEMINI_API_KEY?.trim() ||
      process.env.GEMINI_API_KEY_3?.trim() ||
      "";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${encodeURIComponent(key)}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: `models/${EMBEDDING_MODEL}`,
          content: {
            parts: [
              {
                text: "ViaConnect KB embed smoke: liposomal curcumin absorption study grade B",
              },
            ],
          },
          outputDimensionality: EMBEDDING_DIMS,
        }),
        signal: AbortSignal.timeout(10000),
      });
      geminiStatus = res.status;
      const text = await res.text();
      geminiBodyPreview = text.slice(0, 240).replace(key, "[redacted]");
      if (res.ok) {
        try {
          const json = JSON.parse(text) as {
            embedding?: { values?: number[] };
          };
          const values = json.embedding?.values;
          if (Array.isArray(values)) {
            dims = values.length;
            embedOk = values.length === EMBEDDING_DIMS;
            sample = values;
          }
        } catch {
          geminiBodyPreview = (geminiBodyPreview ?? "") + " | json_parse_fail";
        }
      }
    } catch (e) {
      geminiBodyPreview =
        e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200);
    }
  }

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
    ok: embedOk && writeOk,
    keyPresent: keyInfo.present,
    keySource: keyInfo.source,
    keyLen: keyInfo.len,
    model: EMBEDDING_MODEL,
    geminiStatus,
    geminiBodyPreview,
    embedOk,
    dims,
    expectedDims: EMBEDDING_DIMS,
    sampleItemId: itemId,
    rpcOk,
    writeOk,
    rpcError,
  });
}
