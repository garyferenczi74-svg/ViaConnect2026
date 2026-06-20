# Genetic Tests: Variant Report Treatment Rollout (All 6 Panels)

Status: SCOPING ROADMAP (no clinical content authored here)
Date: 2026-06-20
Owner decision: Gary asked to confirm the recent report treatments (Prompts 204f / 204g / 204j / 204k) reach all genetic tests, not just methylation. He chose "plan all 6 tests."

This document maps what each of the six GENEX360 panels needs to receive the full
variant report treatment. It authors NO deep report copy and NO severity tiers.
Those are validated clinical content that ships only on a human clinical and
compliance pass (the same gate held across 204d, 204g, and 204h).

---

## 1. Key finding: the code is already panel-generic

The recent treatments are data-driven, not hardcoded to methylation. There is no
`genex-m` or `methylation` gate anywhere that blocks another panel. Each treatment
lights up automatically for a panel the moment that panel's validated content
ships.

| Treatment | What gates it | File reference |
| --- | --- | --- |
| Description + Full Report tabs (`VariantReportTabs`) | `marker.deepReport ?` (pure data check) | `src/components/shop/genex360/PanelMarkerGroup.tsx` (SNP marker row) |
| Severity tinted genotype rows + matched marker (`SnpDeepReport`) | renders inside the tabs | `src/components/shop/genex360/SnpDeepReport.tsx` |
| Severity score on Your Variants (`severityFor` / `VARIANT_SEVERITY`) | a validated map that ships EMPTY on purpose | `src/lib/genetics/variantSeverity.ts:36` |
| Methylation zygosity score (`methylationSeverityFor`) | the methylation +/+ +/- convention (live) | `src/lib/genetics/variantSeverity.ts:86` |
| Report pill / deep link (`DEEP_REPORT_REGISTRY`) | registry currently lists only `genex-m` | `src/lib/genex360/variantReport.config.ts:35` |
| Your Variants card | already renders all six panels generically | `src/components/genetics/hub/YourVariantsCard.tsx` |

Conclusion: putting these treatments on the other tests is a CONTENT effort
(authored, validated, human gated), not a wiring effort. Deep reports attach only
to GeneXM markers today (`src/data/genex360/panels.ts:1024-1029`) and
`VARIANT_SEVERITY` is intentionally empty so no tier is ever invented.

---

## 2. Per-panel matrix

| Panel | Type | Markers | Report treatment that applies | Status | Gate |
| --- | --- | --- | --- | --- | --- |
| GeneXM (`genex-m`) | snp | 20 SNPs | Full genotype report + zygosity severity | LIVE (reference implementation) | Done |
| NutrigenDX (`nutrigen-dx`) | snp | 27 nutrition markers | Full genotype report + per-genotype severity | Roster signed off (204h-R1); content held | Human clinical + compliance |
| HormoneIQ (`hormone-iq`) | biomarker | 29 hormone / metabolite / genetic | Biomarker monographs (lab track), SNP report only for its genetic subset | Not started | Human clinical + compliance |
| EpigenHQ (`epigen-hq`) | epigenetic | 12 epigenetic markers | Epigenetic age / expression surface (not a genotype table) | Not started | Human clinical + compliance |
| PeptideIQ (`peptide-iq`) | educational | 14 peptide response genes | Educational gene cards (genotype report only if assayed later) | Educational only | Product + clinical decision |
| CannabisIQ (`cannabis-iq`) | educational | 10 cannabinoid response genes | Educational gene cards (genotype report only if assayed later) | Educational only | Product + clinical decision |

---

## 3. Per-panel work list

### 3.1 GeneXM (genex-m) - DONE, the reference
Live today: per SNP deep reports (`genex-m-deep.ts`), the Description / Full Report
tabs, severity tinted rows, the matched-row marker, and the methylation
zygosity-direct score (+/+ High, +/- Moderate). Nothing to do. This is the shape
the other SNP panels copy.

### 3.2 NutrigenDX (nutrigen-dx) - the clear next target (only other SNP panel)
This is the only other genotype panel, so it is the one that genuinely receives
the same treatment. To light it up:

1. Author `nutrigen-dx-deep.ts` (mirror of `genex-m-deep.ts`): one `SnpDeepReport`
   per marker (biological role, functional impact, health associations, nutrient
   strategy, cautions, diet and lifestyle, interactions, protocol tie in, plus the
   per genotype rows and the optional `laySummary` the Description tab reuses).
2. Attach those reports to NutrigenDX markers (extend the merge loop at
   `panels.ts:1024-1029` to also run for `nutrigen-dx`).
3. Register them: add `"nutrigen-dx": NUTRIGEN_DX_DEEP_REPORTS` to
   `DEEP_REPORT_REGISTRY` (`variantReport.config.ts:35`). The Report pill and the
   deep link then work with zero further change.
4. Populate `VARIANT_SEVERITY` with the validated per genotype tiers for the
   NutrigenDX rsIDs (NutrigenDX uploads store an actual genotype, so they use the
   `severityFor` path, NOT the zygosity path). Until populated, those variants
   render the honest unscored fallback.

Prerequisites already in motion: the SNP roster was reconciled and signed off in
204h-R1 (`docs/knowledge-base/204h-panel-roster-reconciliation.md`). The proposed
roster differs from the live 27 (+12 / -9). The FTO rs9939609 exemplar is HELD
pending Hannah must-fixes (strand-flip rule, an unverifiable 2024 citation, and
softening the T2D / CVD language). No deep-report copy or tier has shipped yet.

Gate: every monograph and every tier is human clinical and compliance reviewed
before it is retrievable. A draft can be staged structurally (the 204d KB seed
pattern: pending, non-live) but nothing displays until sign-off.

### 3.3 HormoneIQ (hormone-iq) - biomarker, different surface
HormoneIQ is biomarker-led (cortisol, DHEA, and similar), not a genotype table.
The genotype report treatment does not map to its biomarker rows. Its path is the
Lab Results engine (204c) plus biomarker monographs (204d Phase 1, the 45
biomarker monograph work list), which interpret a measured value against a range,
not a genotype against a tier. Any genetic subset inside the 29 markers (for
example a COMT or MAOA SNP bundled into the hormone panel) could reuse the SNP
report path once its rsIDs and validated content exist, but the bulk of HormoneIQ
belongs to the lab / biomarker track.

### 3.4 EpigenHQ (epigen-hq) - epigenetic, different surface
EpigenHQ reports epigenetic age and expression, not fixed genotypes. There is no
+/+ +/- zygosity and no allele genotype to tier. It needs its own presentation
(age delta, methylation expression bands) and its own validated interpretations.
The genotype-table treatment does not apply. Treat as a separate design item.

### 3.5 PeptideIQ (peptide-iq) and 3.6 CannabisIQ (cannabis-iq) - educational
Both are educational gene panels today (panelType `educational`). They name genes
but do not assay and tier a member's genotype, so there is no per genotype report
or severity to show. If the product decision is to make either a true assayed SNP
test, each then follows the NutrigenDX path (author `*-deep.ts`, register, populate
`VARIANT_SEVERITY`). Until that product decision, they remain educational cards and
the variant report treatment intentionally does not apply.

---

## 4. Recommended sequence

1. NutrigenDX first. It is the only other genotype panel, the wiring is ready, and
   its roster is already signed off. This is where "the treatment on a second test"
   actually becomes visible. Author and gate its `*-deep.ts` and its
   `VARIANT_SEVERITY` tiers.
2. Biomarker / lab track for HormoneIQ in parallel via the 204c engine and the
   204d biomarker monographs (a different surface, not this treatment).
3. EpigenHQ as a separate design once the SNP and biomarker tracks are settled.
4. Peptide / Cannabis only if a product decision turns them into assayed tests.

## 5. Out of scope (this document)
- Authoring any deep report copy, lay summary, or severity tier (all human gated).
- Changing severity assignment logic (204g) or the report components (204f / 204k).
- The methylation panel, which is complete.
- Building the HormoneIQ biomarker surface or the EpigenHQ epigenetic surface
  (each is its own design and plan).
