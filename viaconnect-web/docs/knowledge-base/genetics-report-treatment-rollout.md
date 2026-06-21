# Genetic Tests: Variant Report Treatment Rollout (All 6 Panels)

Status: LIVE (four panels shipped to users 2026-06-20 after Gary's clinical and compliance sign-off)
Date: 2026-06-20
Owner decision: Gary asked to confirm the recent report treatments (Prompts 204f / 204g / 204j / 204k) reach all genetic tests, not just methylation, then chose to author per-SNP clinical content for every test, one phase per test (PeptideIQ and CannabisIQ as educational). After authoring all phases as gated drafts, Gary signed off (the clinical and compliance gate) and took all ready panels live at once.

This document maps what each of the six GENEX360 panels needs, and now records that
four panels are LIVE to users on the blueprint. See the implementation plan at
`docs/superpowers/plans/2026-06-20-genetics-snp-clinical-content.md`.

---

## 0. Live status (2026-06-20)

Four panels are LIVE: their deep reports are attached to markers (`panels.ts`),
registered in `DEEP_REPORT_REGISTRY`, and the two SNP panels' severity is merged
into `VARIANT_SEVERITY`, which is now PANEL-SCOPED so a shared rsID never crosses
panels. EpigenHQ is the one panel still gated (no display surface yet, see 3.4).
The two former go-live blockers are both RESOLVED.

| Phase | Test | Status | Severity |
| --- | --- | --- | --- |
| 0 | GeneXM | LIVE | LIVE (zygosity) |
| 1 | NutrigenDX | LIVE (27 SNP reports) | LIVE (per-genotype) |
| 2 | HormoneIQ | LIVE (5 SNP reports) | LIVE (per-genotype; CYP19A1 untiered) |
| 3 | EpigenHQ | LIVE v1 (educational interpretations; member-result values pending) | none (not a genotype panel) |
| 4 | PeptideIQ | LIVE (14 educational) | none (educational) |
| 5 | CannabisIQ | LIVE (10 educational) | none (educational) |

THE TWO GO-LIVE BLOCKERS ARE RESOLVED:
1. RESOLVED. The STATUS chip, row tint, and matched-row highlight now read the
   VALIDATED per-genotype tier first (panel-scoped `severityFor`), copy count only
   as the fallback; the highlight marks the member's exact genotype. The
   methylation panel is provably unchanged (absent from the panel-scoped
   `VARIANT_SEVERITY`, stays on the zygosity path).
2. RESOLVED. NAT2 has a dedicated composite resolver (`src/lib/genetics/nat2.ts`),
   phenotype-only and untiered.

KNOWN FOLLOW-UP (data integrity): `user_variants` upserts on (user_id, rsid) only.
A member who uploads two panels that share an rsID (COMT rs4680 is in four panels)
would have one overwrite the other; the fix adds panel_key to the conflict key and
its matching unique constraint.

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
| NutrigenDX (`nutrigen-dx`) | snp | 27 nutrition markers | Full genotype report + per-genotype severity | Draft authored (non-live) | Human clinical + compliance |
| HormoneIQ (`hormone-iq`) | biomarker | 29 hormone / metabolite / genetic | SNP report for its 5 genetic SNPs; 24 biomarkers route to the lab track | Draft authored (5 SNPs, non-live) | Human clinical + compliance |
| EpigenHQ (`epigen-hq`) | epigenetic | 12 epigenetic markers | Epigenetic interpretations (not a genotype table) | Draft authored (non-live) | Human clinical + compliance |
| PeptideIQ (`peptide-iq`) | educational | 14 peptide response genes | Educational gene monographs (no tiers, no severity) | Draft authored (educational, non-live) | Product + clinical decision |
| CannabisIQ (`cannabis-iq`) | educational | 10 cannabinoid response genes | Educational gene monographs (no tiers, no severity) | Draft authored (educational, non-live) | Product + clinical decision |

---

## 3. Per-panel work list

### 3.1 GeneXM (genex-m) - DONE, the reference
Live today: per SNP deep reports (`genex-m-deep.ts`), the Description / Full Report
tabs, severity tinted rows, the matched-row marker, and the methylation
zygosity-direct score (+/+ High, +/- Moderate). Nothing to do. This is the shape
the other SNP panels copy.

### 3.2 NutrigenDX (nutrigen-dx) - DRAFT AUTHORED (Phase 1, non-live)
The only other genotype panel, and the first one taken. All 27 SNP deep reports
plus the per-genotype severity draft are authored in `nutrigen-dx-deep.draft.ts`
and `nutrigenDxSeverityDraft.ts`. The FTO exemplar resolved all three 204h holds
(a single forward-strand A-risk orientation with the effect allele labeled per
row, no reliance on the unverifiable 2024 citation, and T2D and CVD framed as
soft population-level associations). Descriptive markers are correctly left
untiered: FUT2, SLC30A8, AMY1, GSTM1, GSTT1, HLA-DQ2/DQ8, MCM6, and NAT2. The
remaining go-live wiring (NOT done, gated) is:

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

Roster basis: the SNP roster was reconciled and signed off in 204h-R1
(`docs/knowledge-base/204h-panel-roster-reconciliation.md`); the draft is authored
against the live 27 markers.

Gate: every monograph and every tier is human clinical and compliance reviewed
before it is retrievable. The drafts are staged structurally (the 204d KB seed
pattern: pending, non-live) and nothing displays until sign-off.

### 3.3 HormoneIQ (hormone-iq) - DRAFT AUTHORED (Phase 2, non-live) + biomarker handoff
HormoneIQ is biomarker-led, so only its 5 genotype SNPs (COMT, CYP1A1, CYP1B1,
CYP19A1, SRD5A2) get the genotype report; those are authored in
`hormone-iq-deep.draft.ts` with a severity draft (CYP19A1 left untiered, small
bidirectional effect). COMT rs4680 is re-authored for the estrogen and
catecholamine clearance context, kept distinct from the GeneXM COMT report. The
other 24 markers are lab analytes and route to the Lab Results engine (204c) plus
biomarker monographs (204d Phase 1); that handoff is recorded in the draft header
and is a separate track, not this treatment.

### 3.4 EpigenHQ (epigen-hq) - DRAFT AUTHORED (Phase 3, non-live), different content type
EpigenHQ reports epigenetic age and expression, not fixed genotypes, so there is
no allele to tier. Its 12 markers are authored as a new `EpigeneticInterpretation`
shape (`epigen-hq-interpretations.draft.ts`): measures, higher-suggests,
lower-suggests, and a wellness note per marker, with no genotype and no severity.
Composition markers are framed neither-direction-better; exposure signatures are
framed reversible and non-blaming. The EpigenHQ display surface that consumes
these interpretations is still its own design item.

### 3.5 PeptideIQ (peptide-iq) and 3.6 CannabisIQ (cannabis-iq) - DRAFTS AUTHORED (Phases 4 and 5, educational, non-live)
Per Gary's decision both stay EDUCATIONAL. The 14 PeptideIQ genes
(`peptide-iq-deep.draft.ts`) and the 10 CannabisIQ genes
(`cannabis-iq-deep.draft.ts`) are authored as educational monographs with NO
genotype tiers and NO severity: each gene has one keyVariant with a single
empty-genotype row labeled "Educational" so the UI derives no tier. CannabisIQ
holds a strict education-not-advice framing (AKT1 as hedged risk-awareness,
DRD2/Taq1A ANKK1 location disclosed, metabolism genes defer to a clinician). If a
future product decision makes either a true assayed SNP test, each then follows
the NutrigenDX path (tiered genotype rows + a severity draft + the go-live wiring).

---

## 4. Sequence (executed)

1. DONE - NutrigenDX authored first (Phase 1), the only other genotype panel.
2. DONE - HormoneIQ genotype subset authored (Phase 2); its 24 biomarkers remain
   on the separate lab / biomarker track (204c engine + 204d biomarker monographs).
3. DONE - EpigenHQ interpretations authored (Phase 3); the EpigenHQ display surface
   that consumes them is still its own design item.
4. DONE - PeptideIQ and CannabisIQ authored as educational monographs (Phases 4
   and 5); tiered genotype rows only if a future product decision makes them
   assayed tests.

Next, per panel, when content passes the gate: resolve the two go-live blockers in
section 0, then wire that panel live (attach the draft to its markers via the
`panels.ts` merge loop, register it in `DEEP_REPORT_REGISTRY`, and merge its
severity draft into `VARIANT_SEVERITY`). Each go-live is a separate, human-gated
step and is NOT done here.

## 5. Out of scope (still not done)
- Flipping any draft live: attaching to markers, registering, or merging severity.
  Each go-live is human-gated and needs the two section 0 blockers resolved first.
- Changing severity assignment logic (204g) or the report components (204f / 204k).
- The methylation panel (GeneXM), which is already complete and live.
- Building the HormoneIQ biomarker surface or the EpigenHQ epigenetic display
  surface (each is its own design and plan).
- Confirming the three carry items at the gate: the cross-panel COMT framing, the
  DRD2/Taq1A ANKK1 location disclosure, and the unverified-citation pass.
