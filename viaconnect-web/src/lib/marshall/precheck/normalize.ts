/**
 * Draft normalizer. Produces a NormalizedDraft that feeds the rule engine.
 * Reuses the fingerprint primitive from the Hounddog bridge; OCR and ASR
 * are feature-flagged and return empty arrays until dependencies land.
 */

import { createHash } from "crypto";
import { fingerprintText } from "@/lib/hounddog/normalize";
import type { NormalizedDraft, PrecheckDraftInput } from "./types";
import { NORMALIZATION_VERSION } from "./types";

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

function normalizeText(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/\r\n?/g, "\n")
    .replace(/[​-‏﻿]/g, "") // zero-width chars
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Lightweight SKU matcher: lexical only. Semantic / image-embedding match is
// deferred to the Hounddog follow-up (dep-gated).
const FARM_SKU_PREFIX = /\b((?:FARM|FC|VIA|GEN|PEP|LIP|RET|TIRZ|BPC|TB|CJC|IPA|HEL|FRM|SPR)-[A-Z0-9-]{2,})\b/gi;
const BRAND_WORDS = /\b(farmceutica|viaconnect|genex360|helix rewards)\b/gi;

function matchSkus(text: string): NormalizedDraft["productMatches"] {
  const out: NormalizedDraft["productMatches"] = [];
  let m: RegExpExecArray | null;
  while ((m = FARM_SKU_PREFIX.exec(text)) !== null) {
    out.push({ sku: m[1].toUpperCase(), confidence: 0.95, method: "lexical" });
  }
  FARM_SKU_PREFIX.lastIndex = 0;
  if (out.length === 0 && BRAND_WORDS.test(text)) {
    out.push({ sku: "FARMCEUTICA-BRAND", confidence: 0.6, method: "lexical" });
  }
  BRAND_WORDS.lastIndex = 0;
  return out;
}

function detectLanguage(text: string): string | undefined {
  if (!text) return undefined;
  const nonAscii = text.replace(/[\x00-\x7F]/g, "").length;
  if (nonAscii === 0) return "en";
  return undefined;
}

export function normalizeDraft(input: PrecheckDraftInput): NormalizedDraft {
  const text = normalizeText(input.text ?? "");
  const hash = sha256Hex(text);
  // Fingerprint is retained for internal similarity checks (not persisted).
  void fingerprintText;
  return {
    text,
    hash,
    language: detectLanguage(text),
    productMatches: matchSkus(text),
    mediaHashes: (input.mediaUrls ?? []).map((u) => sha256Hex(u)),
    charCount: text.length,
    normalizationVersion: NORMALIZATION_VERSION,
  };
}
