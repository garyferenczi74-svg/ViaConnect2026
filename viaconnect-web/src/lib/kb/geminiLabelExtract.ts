/**
 * Prompt 221 Phase 2 C1: budgeted Gemini text extract when deterministic
 * regex fails but page text likely contains Supplement Facts / doses.
 * Fail-closed: returns null on any error. Never invents ingredients.
 * Uses existing GEMINI_API_KEY (no package.json change).
 */

import { withAbortTimeout } from "@/lib/utils/with-timeout";
import { getCircuitBreaker } from "@/lib/utils/circuit-breaker";
import { safeLog } from "@/lib/utils/safe-log";
import {
  parseCompetitiveLabelText,
  type CompetitiveIngredientRow,
  type CompetitiveLabelFacts,
} from "./parseCompetitiveLabel";

const GEMINI_MODEL =
  process.env.GEMINI_LABEL_MODEL?.trim() || "gemini-2.0-flash";
const TIMEOUT_MS = 12_000;
const breaker = getCircuitBreaker("gemini-competitive-label", {
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

/** Heuristic: page may contain label facts worth an LLM pass. */
export function pageLooksLikeHasLabelFacts(text: string): boolean {
  const t = text.toLowerCase();
  if (t.length < 40) return false;
  if (/supplement\s*facts/.test(t)) return true;
  if (/amount per serving/.test(t)) return true;
  if (/servings per container/.test(t)) return true;
  // At least two dose-like tokens
  const doses = t.match(
    /\b\d{1,5}(?:\.\d{1,3})?\s*(?:mg|mcg|µg|iu|g|ml|cfu)\b/gi
  );
  return Boolean(doses && doses.length >= 2);
}

const EXTRACT_PROMPT = `You extract Supplement Facts from competitive product page text.
Return ONLY valid JSON (no markdown) with this shape:
{
  "ingredients": [{"name":"string","dose":number|null,"unit":"mg|mcg|IU|g|mL|CFU|null","form":"string|null"}],
  "serving_size": "string|null",
  "servings_per_container": number|null,
  "list_price": number|null,
  "label_claims": ["string"]
}
Rules:
- Facts only from the text. If a field is not present, use null or [].
- Do NOT invent ingredients or doses.
- Prefer rows under Supplement Facts / Amount Per Serving.
- Skip marketing claims as ingredients.
- Max 25 ingredients.
- Units normalize to mg, mcg, IU, g, mL, or CFU.`;

interface GeminiJsonShape {
  ingredients?: Array<{
    name?: string;
    dose?: number | null;
    unit?: string | null;
    form?: string | null;
  }>;
  serving_size?: string | null;
  servings_per_container?: number | null;
  list_price?: number | null;
  label_claims?: string[];
}

function stripFences(raw: string): string {
  return raw.replace(/```json?\s*/gi, "").replace(/```/g, "").trim();
}

function parseGeminiJson(raw: string): GeminiJsonShape | null {
  const clean = stripFences(raw);
  const m = clean.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as GeminiJsonShape;
  } catch {
    return null;
  }
}

function toIngredientRows(
  items: GeminiJsonShape["ingredients"]
): CompetitiveIngredientRow[] {
  const rows: CompetitiveIngredientRow[] = [];
  for (const it of items ?? []) {
    const name = String(it?.name ?? "")
      .replace(/[\u2013\u2014]/g, "-")
      .trim()
      .slice(0, 120);
    if (!name || name.toLowerCase() === "unknown") continue;
    if (/net\s*wt|fl\.?\s*oz|calories|add to cart|shipping/i.test(name)) {
      continue;
    }
    const dose =
      typeof it?.dose === "number" && Number.isFinite(it.dose) && it.dose > 0
        ? it.dose
        : null;
    let unit = it?.unit ? String(it.unit).trim() : null;
    if (unit) {
      const u = unit.toLowerCase();
      if (u === "ug" || u === "µg") unit = "mcg";
      else if (u === "iu") unit = "IU";
      else if (u === "ml") unit = "mL";
      else if (u === "cfu") unit = "CFU";
      else unit = u;
    }
    // Require dose for competitive facts (no bare names)
    if (dose == null || !unit) continue;
    rows.push({
      ingredient_name: name,
      canonical_ingredient_id: null,
      dose_amount: dose,
      dose_unit: unit,
      form: it?.form ? String(it.form).slice(0, 40) : null,
      dose_confidence: 80,
      note: "gemini_label_extract",
    });
    if (rows.length >= 25) break;
  }
  return rows;
}

/**
 * Attempt Gemini structured extract. Returns CompetitiveLabelFacts or null.
 */
export async function geminiExtractCompetitiveLabel(
  text: string,
  opts?: { title?: string }
): Promise<CompetitiveLabelFacts | null> {
  const key = geminiKey();
  if (!key) return null;
  if (!pageLooksLikeHasLabelFacts(text)) return null;

  // Always seed shell fields from deterministic parse
  const base = parseCompetitiveLabelText(text, { title: opts?.title });
  const clip = text.slice(0, 10000);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`;
    const body = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${EXTRACT_PROMPT}\n\nProduct title: ${opts?.title ?? ""}\n\nPAGE TEXT:\n${clip}`,
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
        "gemini.competitiveLabel"
      )
    );

    if (!res.ok) {
      safeLog.warn("kb.geminiLabel", "http error", { status: res.status });
      return null;
    }

    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const rawText =
      json.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? "")
        .join("") ?? "";
    const parsed = parseGeminiJson(rawText);
    if (!parsed) return null;

    const rows = toIngredientRows(parsed.ingredients);
    if (rows.length === 0) {
      // Prefer base (may still be UNKNOWN)
      return null;
    }

    const servings =
      typeof parsed.servings_per_container === "number" &&
      parsed.servings_per_container > 0
        ? parsed.servings_per_container
        : base.servings_per_container;
    const list_price =
      typeof parsed.list_price === "number" && parsed.list_price > 0
        ? parsed.list_price
        : base.list_price;
    let price_per_serving = base.price_per_serving;
    if (list_price && servings && servings > 0) {
      price_per_serving = Math.round((list_price / servings) * 1000) / 1000;
    }

    return {
      ingredient_rows: rows,
      serving_size:
        typeof parsed.serving_size === "string" && parsed.serving_size.trim()
          ? parsed.serving_size.trim().slice(0, 80)
          : base.serving_size,
      servings_per_container: servings,
      list_price,
      currency: "USD",
      price_per_serving,
      label_claims: Array.isArray(parsed.label_claims)
        ? parsed.label_claims.map((c) => String(c).slice(0, 40)).slice(0, 12)
        : base.label_claims,
      delivery_technology: base.delivery_technology,
      availability_note: base.availability_note,
      extraction_confidence: Math.min(92, 78 + Math.min(rows.length, 8)),
      parse_notes: ["gemini_label_extract", ...base.parse_notes],
    };
  } catch (err) {
    safeLog.warn("kb.geminiLabel", "threw", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
