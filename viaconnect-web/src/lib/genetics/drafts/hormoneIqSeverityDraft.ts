// Prompt 204 (2026-06-20): DRAFT per-genotype severity for HormoneIQ (Phase 2).
// PENDING the human clinical and compliance gate. NOT merged into VARIANT_SEVERITY
// and read by nothing live; imported only by its test.
//
// Shape mirrors VARIANT_SEVERITY: rsID (lowercase) -> normalized genotype
// (uppercase, no separators) -> validated SeverityTier. Severity capped at
// moderate throughout; no high tier, because these are clearance and conversion
// paces, not disease states. cyp19a1 (rs10046) is OMITTED: its effect is small,
// population level, and bidirectional with no clean low-to-high ladder, so it
// renders the honest unscored fallback and is read through the lab metabolites.
//
// The same GO-LIVE BLOCKER recorded for NutrigenDX applies here: the 204i STATUS
// chip and the matched-row highlight derive tier from allele copy count, but these
// ladders are clinical (CYP1A1 GG, CYP1B1 GG, SRD5A2 CC score moderate, not high),
// so before HormoneIQ goes live the chip and highlight must read the validated
// severity tier directly, not re-derive it from copy count.
//
// COMT rs4680 also appears in the GeneXM (methylation) severity context; here it
// is the hormone-clearance reading. Keep the two keyed by panel slug, not merged.
//
// Standing rules honored: no invented tiers, no em or en dashes, TypeScript
// strict (no any).

import type { SeverityTier } from "@/lib/genetics/severity";

export const HORMONE_IQ_SEVERITY_DRAFT: Record<string, Record<string, SeverityTier>> = {
  rs4680: { GG: "low", GA: "moderate", AA: "moderate" },
  rs1048943: { AA: "low", AG: "moderate", GG: "moderate" },
  rs1056836: { CC: "low", CG: "moderate", GG: "moderate" },
  rs523349: { GG: "low", GC: "low", CC: "moderate" },
  // cyp19a1 (rs10046) omitted by design: small, bidirectional, population-level.
};
