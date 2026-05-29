# Genomic Prior Effect Sizes (Tier 3)

## Status: DEFERRED, not implemented in Phase 1

Tier 3 genomic priors are NOT in this build. There are no genomic effect sizes wired into the shipped body composition pipeline, and none are read at scan time. This document records the intended design so that Tier 3 can be built later against a clear, honest baseline. It deliberately contains NO fabricated effect-size numbers presented as if they were in use.

Evidence in code that Tier 3 is deferred:

- `src/lib/body-tracker/scan-tier.ts` always resolves to Tier 1 in Phase 1. The resolver accepts a `hasCompletedGenex360Panel` flag but ignores it; the file comment states Tier 3 (GeneX360 panel integration) "will be wired in Phase 3 once the device capability APIs and genomics data plumbing are in place. Do not add Phase 2/3 logic here until that work ships."
- The Helix `body_scan_completed` event records a tier value that defaults to 1.
- No SNP table, effect-size table, or genomic adjustment factor is referenced anywhere in the scanning composition path (`src/lib/arnold/scanning/`).

## What Tier 3 is intended to be

When built, Tier 3 is intended to refine, not replace, the Phase 1 anthropometric estimate by applying genomic priors from a completed GeneX360 panel. The intent is a small, well-bounded Bayesian-style adjustment around the measured estimate, with the genomic contribution always secondary to actual measurement, and always disclosed.

Design guardrails for the future build:

- Genomic priors adjust the estimate; measurement always dominates. A prior must never override a confident measured or manually calibrated value.
- Effect sizes will be sourced from published, peer-reviewed consortia and meta-analyses (for example large GWAS consortia for body composition and adiposity traits), with each effect size carrying a citation, an ancestry note, and a confidence interval.
- Effect sizes will be stored as data with provenance, never hard-coded as bare constants, mirroring the discipline already used for the body composition equations.
- Ancestry transferability will be stated explicitly per SNP; effect sizes derived predominantly in one ancestry will be flagged when applied to others.
- The genomic layer is practitioner-aware: genomic detail surfaced to consumers stays at the wellness, non-diagnostic altitude, consistent with the FDA General Wellness posture in the body composition model card.

## Intended SNP set (illustrative scope, not yet sourced or implemented)

The intended scope covers well-studied adiposity and body composition associated loci. The following are named only as trait areas and example loci to scope future sourcing work. No effect size is asserted here, and the final set plus its effect sizes must be sourced from published consortia at build time and signed off before use.

- Adiposity and BMI associated loci (for example the FTO and MC4R regions).
- Fat distribution and waist to hip ratio associated loci.
- Lean mass and muscle related loci.
- Metabolic and energy expenditure related loci relevant to the Bio Optimization Score metabolic pillar.

The exact panel must be reconciled with the GeneX360 testing line's actual reported markers before any of this is built.

## Acceptance criteria for promoting Tier 3 out of deferred status

1. GeneX360 genomics data plumbing exists and is readable at scan time.
2. A versioned, cited effect-size dataset (with ancestry notes and confidence intervals) is on file and reviewed.
3. The genomic adjustment is bounded, secondary to measurement, and disclosed to the user.
4. The compliance review (Marshall dictionary scan plus the standard pre-delivery audit) clears the genomic copy.
5. Gary signs off on the panel and the consumer-facing framing.

## Provenance

- Spec: Prompt #169 / #169a, section 16.
- Status source: `src/lib/body-tracker/scan-tier.ts` (Tier always 1 in Phase 1).
- This document is a placeholder for a deferred capability and must be replaced with a sourced, cited effect-size record before Tier 3 ships.
