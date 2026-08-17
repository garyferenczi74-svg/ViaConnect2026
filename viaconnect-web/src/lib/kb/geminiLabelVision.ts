/**
 * Prompt 221 Phase 2 C1: Gemini vision OCR for Supplement Facts labels
 * (screenshot from Firecrawl or product label image URL).
 * Fail-closed. Never invents doses. No package.json change.
 */

import { withAbortTimeout } from "@/lib/utils/with-timeout";
import { getCircuitBreaker } from "@/lib/utils/circuit-breaker";
import { safeLog } from "@/lib/utils/safe-log";
import {
  hasUnknownOnlyIngredients,
  parseCompetitiveLabelText,
  type CompetitiveLabelFacts,
} from "./parseCompetitiveLabel";
import { geminiExtractCompetitiveLabel } from "./geminiLabelExtract";

const GEMINI_MODEL =
  process.env.GEMINI_LABEL_VISION_MODEL?.trim() || "gemini-2.0-flash";
const TIMEOUT_MS = 18_000;
const breaker = getCircuitBreaker("gemini-competitive-label-vision", {
  failureThreshold: 4,
  resetTimeoutMs: 60_000,
  halfOpenMaxAttempts: 1,
});

function geminiKey(): string | null {
  const k =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.Photo_AI_GEMINI_API_KEY?.trim() ||
    process.env.PHOTO_AI_GEMINI_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY_3?.trim() ||
    "";
  return k.length > 0 ? k : null;
}

const VISION_PROMPT = `You read a product label or Supplement Facts panel image.
Transcribe ALL nutrient/ingredient lines with doses into plain text first,
then return ONLY JSON (no markdown):
{
  "label_text": "full OCR transcription",
  "ingredients": [{"name":"string","dose":number|null,"unit":"mg|mcg|IU|g|mL|CFU|null","form":"string|null"}],
  "serving_size": "string|null",
  "servings_per_container": number|null
}
Rules: facts only visible in the image; never invent; skip marketing claims;
max 30 ingredients; if unreadable return empty ingredients.`;

/**
 * Extract label facts from a base64 image (JPEG/PNG/WebP).
 */
export async function geminiVisionExtractLabel(
  imageBase64: string,
  opts?: { mimeType?: string; title?: string }
): Promise<CompetitiveLabelFacts | null> {
  const key = geminiKey();
  if (!key) return null;
  const clean = imageBase64.replace(/^data:image\/\w+;base64,/, "").trim();
  if (clean.length < 200) return null;

  const mime = opts?.mimeType ?? "image/png";

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`;
    const body = {
      contents: [
        {
          role: "user",
          parts: [
            { text: `${VISION_PROMPT}\nProduct title: ${opts?.title ?? ""}` },
            {
              inline_data: {
                mime_type: mime,
                data: clean,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      },
    };

    const res = await breaker.execute(() =>
      withAbortTimeout(
        (signal) =>
          fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal,
          }),
        TIMEOUT_MS,
        "gemini.competitiveLabelVision"
      )
    );

    if (!res.ok) {
      safeLog.warn("kb.geminiVisionLabel", "http error", { status: res.status });
      return null;
    }

    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const rawText =
      json.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? "")
        .join("") ?? "";

    // Prefer structured gemini text extractor on OCR transcription
    let labelText = "";
    try {
      const m = rawText.match(/\{[\s\S]*\}/);
      if (m) {
        const obj = JSON.parse(m[0]) as { label_text?: string };
        labelText = String(obj.label_text ?? "");
      }
    } catch {
      labelText = rawText;
    }

    if (labelText.length > 40) {
      const fromRegex = parseCompetitiveLabelText(labelText, {
        title: opts?.title,
      });
      if (!hasUnknownOnlyIngredients(fromRegex.ingredient_rows)) {
        return {
          ...fromRegex,
          parse_notes: ["gemini_vision_ocr_regex", ...fromRegex.parse_notes],
          extraction_confidence: Math.min(
            94,
            fromRegex.extraction_confidence + 4
          ),
        };
      }
      const fromLlm = await geminiExtractCompetitiveLabel(labelText, {
        title: opts?.title,
      });
      if (fromLlm && !hasUnknownOnlyIngredients(fromLlm.ingredient_rows)) {
        return {
          ...fromLlm,
          parse_notes: ["gemini_vision_ocr_llm", ...fromLlm.parse_notes],
        };
      }
    }

    // Fallback: feed full model JSON text to text extractor
    const fallback = await geminiExtractCompetitiveLabel(rawText, {
      title: opts?.title,
    });
    if (fallback && !hasUnknownOnlyIngredients(fallback.ingredient_rows)) {
      return {
        ...fallback,
        parse_notes: ["gemini_vision_json", ...fallback.parse_notes],
      };
    }
    return null;
  } catch (err) {
    safeLog.warn("kb.geminiVisionLabel", "threw", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Fetch a remote image URL (label image) and OCR via Gemini vision.
 * Only allowlisted hosts should be passed by caller.
 */
export async function geminiVisionExtractLabelFromUrl(
  imageUrl: string,
  opts?: { title?: string }
): Promise<CompetitiveLabelFacts | null> {
  try {
    const res = await withAbortTimeout(
      (signal) => fetch(imageUrl, { signal }),
      12_000,
      "fetch.labelImage"
    );
    if (!res.ok) return null;
    const ctype = res.headers.get("content-type") || "image/jpeg";
    if (!ctype.startsWith("image/") && !ctype.includes("pdf")) {
      // Some CDNs omit type; continue if body looks binary
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 500 || buf.length > 8_000_000) return null;
    const b64 = buf.toString("base64");
    let mime = "image/jpeg";
    if (ctype.includes("png")) mime = "image/png";
    else if (ctype.includes("webp")) mime = "image/webp";
    else if (ctype.includes("pdf")) {
      // PDF bytes: Gemini can accept application/pdf on some models
      mime = "application/pdf";
    }
    return geminiVisionExtractLabel(b64, { mimeType: mime, title: opts?.title });
  } catch (err) {
    safeLog.warn("kb.geminiVisionLabel", "fetch image threw", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/** Pull candidate label image / PDF URLs from product page markdown. */
export function extractLabelAssetUrls(markdown: string, pageUrl: string): string[] {
  const urls: string[] = [];
  const mdImgs = markdown.matchAll(/!\[[^\]]*\]\((https?:[^)\s]+)\)/gi);
  for (const m of mdImgs) {
    if (m[1]) urls.push(m[1]);
  }
  const raw = markdown.matchAll(
    /https?:\/\/[^\s)"']+\.(?:png|jpe?g|webp|pdf)(?:\?[^\s)"']*)?/gi
  );
  for (const m of raw) {
    if (m[0]) urls.push(m[0]);
  }
  // Relative images
  const rel = markdown.matchAll(/!\[[^\]]*\]\((\/[^)\s]+)\)/gi);
  try {
    const base = new URL(pageUrl);
    for (const m of rel) {
      if (m[1]) urls.push(new URL(m[1], base.origin).toString());
    }
  } catch {
    /* open */
  }

  const scored = urls
    .map((u) => {
      const low = u.toLowerCase();
      let score = 0;
      if (/supplement|facts|label|nutrition|ingredient|sfp|panel/i.test(low))
        score += 5;
      if (/\.(png|jpe?g|webp)$/i.test(low)) score += 2;
      if (/\.pdf$/i.test(low)) score += 3;
      if (/logo|icon|avatar|banner|hero|sprite|favicon/i.test(low)) score -= 4;
      return { u, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const out: string[] = [];
  const seen = new Set<string>();
  for (const { u } of scored) {
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(u);
    if (out.length >= 4) break;
  }
  return out;
}
