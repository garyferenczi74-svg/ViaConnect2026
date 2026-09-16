/**
 * Stage A ViaCura supplement-education lane — separate from PeptideIQ ≤20.
 * Elizabeth-approved first slice (2026-09-16): cite_id + stored label only.
 * Not dose SSOT. No milligrams / PK folds / genotypes / monographs on cites.
 * Held-outs stay out of this slice. Flag remains OFF.
 */

import { VIA_CURA_DRAFT_BANNER } from "./copy";
import { isEducationAsk } from "./education-allowlist";
import type { RetrieverChunk } from "./types";

export const STAGE_A_VIACURA_SUPP_EDU_MAX = 5;

/** Exact Elizabeth first-slice ids. Do not append held-outs without a NEW GATE. */
export const STAGE_A_VIACURA_SUPPLEMENT_EDU_ALLOWLIST = [
  "edu-viacura:nad-plus",
  "edu-viacura:mthfr-plus",
  "edu-viacura:catalog-index",
  "edu-viacura:rise-plus",
  "edu-viacura:relax-plus",
] as const;

export type StageAViacuraSupplementEduId =
  (typeof STAGE_A_VIACURA_SUPPLEMENT_EDU_ALLOWLIST)[number];

export interface ViacuraSupplementEduSeed {
  cite_id: StageAViacuraSupplementEduId;
  label: string;
  doc_type: "education";
  audience: "consumer";
  product_skus: readonly string[];
  safety_flags: readonly ["edu_not_dx", "no_new_dose"];
}

/** Stored consumer catalog labels only — no restatable invented body. */
export const STAGE_A_VIACURA_SUPPLEMENT_EDU_SEEDS: Record<
  StageAViacuraSupplementEduId,
  ViacuraSupplementEduSeed
> = {
  "edu-viacura:nad-plus": {
    cite_id: "edu-viacura:nad-plus",
    label: "ViaCura Replenish NAD+",
    doc_type: "education",
    audience: "consumer",
    product_skus: ["NAD+", "Replenish NAD+"],
    safety_flags: ["edu_not_dx", "no_new_dose"],
  },
  "edu-viacura:mthfr-plus": {
    cite_id: "edu-viacura:mthfr-plus",
    label: "ViaCura MTHFR+",
    doc_type: "education",
    audience: "consumer",
    product_skus: ["MTHFR+"],
    safety_flags: ["edu_not_dx", "no_new_dose"],
  },
  "edu-viacura:catalog-index": {
    cite_id: "edu-viacura:catalog-index",
    label: "ViaCura catalog",
    doc_type: "education",
    audience: "consumer",
    product_skus: [],
    safety_flags: ["edu_not_dx", "no_new_dose"],
  },
  "edu-viacura:rise-plus": {
    cite_id: "edu-viacura:rise-plus",
    label: "ViaCura RISE+",
    doc_type: "education",
    audience: "consumer",
    product_skus: ["RISE+"],
    safety_flags: ["edu_not_dx", "no_new_dose"],
  },
  "edu-viacura:relax-plus": {
    cite_id: "edu-viacura:relax-plus",
    label: "ViaCura RELAX+",
    doc_type: "education",
    audience: "consumer",
    product_skus: ["RELAX+", "RELAX+ 2.0"],
    safety_flags: ["edu_not_dx", "no_new_dose"],
  },
};

const ALLOWLIST_SET: ReadonlySet<string> = new Set(STAGE_A_VIACURA_SUPPLEMENT_EDU_ALLOWLIST);

const EXPLICIT_ID_RE = /\bedu-viacura:[a-z0-9-]+\b/gi;

const NAME_TO_KEY: Array<{ re: RegExp; key: StageAViacuraSupplementEduId }> = [
  { re: /\breplenish\s+nad\+?\b|\bnad\+?\b/i, key: "edu-viacura:nad-plus" },
  { re: /\bmthfr\+?\b/i, key: "edu-viacura:mthfr-plus" },
  { re: /\bvia-?cura catalog\b|\bcatalog-index\b/i, key: "edu-viacura:catalog-index" },
  { re: /\brise\+|\brise plus\b/i, key: "edu-viacura:rise-plus" },
  { re: /\brelax\+|\brelax plus\b/i, key: "edu-viacura:relax-plus" },
];

const DOSE_INVENT_RE =
  /\b(\d+\s*x|\d+\s*mg|mcg|milligram|monograph|genotype|absorption|pk fold)\b/i;

export function isStageAViacuraSupplementEduId(id: string): id is StageAViacuraSupplementEduId {
  return ALLOWLIST_SET.has(id);
}

export function assertStageAViacuraSupplementEduCapsHeld(): boolean {
  return (
    STAGE_A_VIACURA_SUPP_EDU_MAX === 5 &&
    STAGE_A_VIACURA_SUPPLEMENT_EDU_ALLOWLIST.length <= STAGE_A_VIACURA_SUPP_EDU_MAX &&
    STAGE_A_VIACURA_SUPPLEMENT_EDU_ALLOWLIST.length ===
      Object.keys(STAGE_A_VIACURA_SUPPLEMENT_EDU_SEEDS).length
  );
}

/**
 * Allowlist-exact + stored label only. Label-only Via Cura / draft / dose
 * strings stay denied even when they mention ViaCura.
 */
export function isEducationShapedViacuraSupplementEduCite(cite: {
  cite_id: string;
  label: string;
}): boolean {
  const cite_id = cite.cite_id.trim();
  const label = cite.label.trim();
  if (!isStageAViacuraSupplementEduId(cite_id) || !label) return false;
  const seed = STAGE_A_VIACURA_SUPPLEMENT_EDU_SEEDS[cite_id];
  if (seed.doc_type !== "education" || seed.audience !== "consumer") return false;
  if (seed.label !== label) return false;
  if (DOSE_INVENT_RE.test(label)) return false;
  if (label === VIA_CURA_DRAFT_BANNER || /clinician draft/i.test(label)) return false;
  return true;
}

export function extractViacuraSupplementEduIds(message: string | undefined): string[] {
  const text = message ?? "";
  const found: string[] = [];
  const seen = new Set<string>();
  const push = (id: string) => {
    const trimmed = id.trim();
    if (!isStageAViacuraSupplementEduId(trimmed) || seen.has(trimmed)) return;
    seen.add(trimmed);
    found.push(trimmed);
  };
  EXPLICIT_ID_RE.lastIndex = 0;
  for (const match of text.matchAll(EXPLICIT_ID_RE)) {
    if (match[0]) push(match[0]);
  }
  if (isEducationAsk(text)) {
    for (const token of NAME_TO_KEY) {
      if (token.re.test(text)) push(token.key);
    }
  }
  return found.slice(0, STAGE_A_VIACURA_SUPP_EDU_MAX);
}

/** Retriever mapping: cite_id + stored label. Empty text — never dose SSOT. */
export function mapViacuraSupplementEduToChunk(id: string): RetrieverChunk | null {
  if (!isStageAViacuraSupplementEduId(id)) return null;
  const seed = STAGE_A_VIACURA_SUPPLEMENT_EDU_SEEDS[id];
  if (!seed.label.trim()) return null;
  return {
    chunk_id: seed.label,
    cite_id: seed.cite_id,
    doc_type: "education",
    text: "",
    audience: "consumer",
  };
}
