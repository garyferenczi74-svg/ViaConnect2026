# 204h-R1: SNP Panel Roster Reconciliation (approved scope)

Status: scope approved by Gary 2026-06-19. No clinical content is drafted into
rendered code by this document. Per the 204d workflow and the prompt's own gate,
a deep-report entry ships into a `*-deep.ts` file and is registered ONLY after
the human clinical and compliance sign-off passes. This file records the approved
rosters, the structural decisions, and the per-gene status so the build-out has a
written spec; it asserts no validated clinical claim.

## Panel scoping (confirmed against panels.ts)

The genotype deep-report model applies to the three genotype panels:
`nutrigen-dx`, `peptide-iq`, `cannabis-iq`.

Out of scope for the variant build-out, confirmed by `panelType` in
`src/data/genex360/panels.ts`:

- `hormone-iq` is `panelType: "biomarker"` (DUTCH dried-urine hormone test, 29
  hormone and metabolite markers). Needs its own hormone-metabolite report model.
- `epigen-hq` is `panelType: "epigenetic"` (MethylationEPIC aging clocks:
  Horvath, PhenoAge, GrimAge, DunedinPACE). Needs its own biological-age model.

These two are separate efforts and are not built with the rsID + genotype-tier +
severity model.

## Approved decisions (Gary 2026-06-19)

1. NutrigenDX roster: ADOPT THE PROPOSED SOURCE TABLE. panels.ts is updated to
   match it (adds FADS2, BCO1, APOE, HFE, MC4R, PPARG, ELOVL2, NQO1, CYP1A2,
   GSTP1, ATP7B, CLOCK; drops the 9 listed below). This is a deliberate change to
   the shipped NutrigenDX roster and its marker descriptions, so it goes through
   the content pass, not a silent edit.
2. Confirm-flagged genes: DRAFT ESTABLISHED GENES, MARK CONFIRM GENES PENDING.
   Established-rsID genes get a full deep report. Confirm genes render with the
   existing `pendingAssayDefinition` pattern (identity shown, no genotype tiers,
   short pending note) until the lab assay sheet specifies the assayed rsID.
3. Overlapping genes: PANEL-CONTEXTUALIZED TEXT, SHARED rsID TIER. An overlapping
   gene gets a separate deep-report entry per panel with panel-specific framing,
   but the severity tier stays keyed by rsID (204g `variantSeverity.ts`), so the
   same genotype reads the same tier on every panel it appears in. No engine
   change (the severity key stays rsID, not rsID+panel).
4. Deletion and HLA markers: NON-TIERED EDUCATIONAL ENTRIES. GSTM1-null,
   GSTT1-null (copy-number deletions) and HLA-DQ2/DQ8 (haplotypes) use a
   deletion/haplotype genotype model with educational copy, NO severity tier and
   NO rsID deep link (no synthetic rsID). Per Hannah, ATP7B, AIRE, and FOXN1 are
   clinical/monogenic-disease genes and are NOT tiered as wellness predispositions
   either.

## NutrigenDX roster (source table, adopted) with status

Established (single canonical rsID, subject to 193b per-variant DB confirmation):
MTHFR rs1801133 (+ A1298C rs1801131, overlaps GeneXM), FTO rs9939609, SOD2 rs4880
(overlaps GeneXM), DAO/AOC1 rs10156191 + rs1049742 + rs1049793 + rs2052129
(overlaps GeneXM), TCN2 rs1801198 (overlaps GeneXM), FADS1 rs174537, FADS2 rs1535,
BCO1 rs7501331 + rs12934922, APOE rs429358 + rs7412 (two-SNP haplotype), FUT2
rs601338, HFE rs1800562 + rs1799945, SLC30A8 rs13266634, MC4R rs17782313, TCF7L2
rs7903146, PPARG rs1801282, GPX1 rs1050450, CAT rs1001179, NQO1 rs1800566
(overlaps GeneXM), MCM6/LCT rs4988235, CYP1A2 rs762551, GSTP1 rs1695, CLOCK
rs1801260.

Confirm (assayed variant unspecified, render pending until the assay sheet):
VDR (FokI rs2228570 vs BsmI rs1544410 vs ApaI/TaqI, opposite-direction stories,
Hannah flag), GC (Gc1/Gc2 is a two-SNP haplotype rs7041 + rs4588, not one rsID),
SLC23A1 (rs33972313 vs rs6596473), ELOVL2 (rs953413 vs others), ATP7B (clinical
Wilson gene, do not wellness-tier; genetic-counseling framing only).

Not an rsID (decision 4, non-tiered educational): GSTM1-null, GSTT1-null,
HLA-DQ2/DQ8 (tag SNPs rs2187668 / rs7454108 conventionally, or HLA typing).

panels.ts delta this roster implies (decision 1): IN (not currently in panels.ts):
FADS2, BCO1, APOE, HFE, MC4R, PPARG, ELOVL2, NQO1, CYP1A2, GSTP1, ATP7B, CLOCK.
OUT (currently in panels.ts, dropped): PEMT, APOA2, AMY1, LIPC, IL6, TNF, AHR,
NAT2, ABCG2. Final count must land on the panels.ts markerCount (27) after the
in/out is applied, or markerCount is updated alongside.

## PeptideIQ roster (practitioner-only framing) with status

Established: IGFBP3 rs2854744, COL1A1 rs1800012, COL3A1 rs1800255, MMP1 rs1799750,
MMP3 rs3025058, IL7R rs6897932.
Confirm (render pending): GHSR (rs509035 / rs572169), GHRHR (varies), GH1
rs2665802, IGF1 rs35767, SLC15A1/PEPT1 (varies), SLC15A2/PEPT2 (rs1143672 /
rs2257212), DPP4 (rs3788979 / rs2909451), FOXN1 (varies; immune gene, Hannah
flag, do not wellness-tier), AIRE (varies; immune/monogenic, Hannah flag, do not
wellness-tier).
All PeptideIQ content is educational and practitioner-only, never a consumer
commercial recommendation (peptide compliance rule).

## CannabisIQ roster (genetics only, no cultivation context) with status

Established: CYP2C9 rs1799853 + rs1057910, CYP2C19 rs4244285 + rs12248560, CYP3A4
rs35599367, CNR2 rs2501432, FAAH rs324420, COMT rs4680 (overlaps GeneXM), DRD2 /
ANKK1 rs1800497 (note the variant is at the ANKK1 locus), TRPV1 rs8065080.
Confirm (render pending): UGT1A9 (varies), CNR1 (rs1049353 vs rs806368 /
rs2023239), MGLL (varies), AKT1 (rs2494732 / rs1130233), OR terpene-receptor
group (specific genes and variants unspecified).

## FTO exemplar status (held, validation-pending)

The FTO rs9939609 exemplar (NutrigenDX) is approved IN PRINCIPLE for voice, depth,
and structure. It is HELD at `compliance_status: pending`, `retrievable: false`,
and is NOT drafted into `nutrigen-dx-deep.ts` until the must-fixes below are
resolved AND the human clinical + compliance gate passes.

Hannah advisory genomics review (not the final gate). Verified: rs9939609 = FTO
intron-1, A = risk allele (dbSNP, forward strand); the AA High / AT Moderate / TT
Low additive tier model is defensible; the three primary citations (Peng 2011 BMC
Med 9:71, Wardle 2008 JCEM 93(9):3640, Tanofsky-Kraff 2009 Am J Clin Nutr
90:1483) are real and correctly attributed.

Must-fix before the human clinical gate:

1. Add a forward-strand annotation and an A to T flip rule. A minus-strand assay
   would silently invert AA/TT, which would invert the 204g severity tiers. This
   is the highest-impact gap.
2. The "Crit Rev Food Sci Nutr 2024" attenuation citation is unverifiable as
   written (no title, authors, volume, or DOI). Supply full metadata and confirm
   it supports the claim, or remove it and grade the diet/activity attenuation
   strategy below A. Citation fabrication is the 204d top risk.
3. Soften the downstream T2D and CVD language (weight-mediated, general and
   educational, not a personal disease-risk claim) and present the per-allele OR
   as population epidemiology, not "your risk is 1.31x."

When the exemplar passes, its tiers populate `variantSeverity.ts['rs9939609']`
(AA high, AT moderate, TT low) and its content ships into `nutrigen-dx-deep.ts`
with a registry entry, lighting up the Full Report tab, the Report pill (204e),
the Description tab (204f), and the severity score and cross-reference (204g).

## What is NOT done here, and the next step

- Not done: any clinical content drafted into rendered code, the panels.ts roster
  update, the new `nutrigen-dx-deep.ts` file, and the registry wiring. All gated.
- Blocking the FTO exemplar: the three must-fixes above (the unverifiable citation
  needs the real source) plus the human clinical and compliance sign-off.
- Next step on approval and a clean exemplar: update panels.ts to the adopted
  NutrigenDX roster (with new-gene descriptions through the content pass), scaffold
  `nutrigen-dx-deep.ts` and register the panel, then ship the FTO entry, then the
  remaining Established genes, with Confirm genes pending and deletion/HLA markers
  as non-tiered educational entries.
