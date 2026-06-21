# EpigenHQ Display Surface: Scoping Note

Status: SCOPING (no surface built; design + build is a separate cycle)
Date: 2026-06-20

## Why this exists

In the genetics go-live (2026-06-20), four panels went live (NutrigenDX, HormoneIQ,
PeptideIQ, CannabisIQ). EpigenHQ was the one panel held back, because it is NOT a
genotype panel and has no surface that consumes its content. Its 12 interpretations
are authored and committed (`src/data/genex360/epigen-hq-interpretations.draft.ts`,
the `EpigeneticInterpretation` type) but nothing renders them. This note scopes what
a display surface needs so EpigenHQ can go live later, without building it blind.

## What is and is not in place

- IN PLACE: the panel config (`panels.ts`, slug `epigen-hq`, panelType `epigenetic`,
  12 markers in 5 groups, each with a `description`), and the 12 validated
  interpretations (marker / measures / higherSuggests / lowerSuggests / wellnessNote).
- NOT IN PLACE: any component, page, hook, or DB read that surfaces an EpigenHQ
  RESULT. Today an epigen-hq marker renders only its static `description` paragraph
  via the generic `PanelMarkerGroup` fallback (no deepReport), with no readout value,
  no higher/lower interpretation, no `wellnessNote`, no chart, no trend.

## The core difference from the SNP panels

The SNP panels show a fixed genotype (a member either has CT or they do not). EpigenHQ
markers are MEASURED READOUTS that change over time (epigenetic age, methylation
indices, exposure signatures), more like the lab biomarkers than like a genotype.
So the surface is closer to the Lab Results engine (204c) than to the variant report:
it needs a per-marker VALUE, a directional read (higher / lower than expected), and a
retest trend, not a Typical / Moderate / High genotype tier.

## What a surface needs (the work-list, for a future design + build)

1. A data source for the member's EpigenHQ RESULTS. There is no table feeding
   epigenetic readouts today (unlike `user_variants` for genotypes or `lab_biomarkers`
   for labs). Decide: a new `user_epigenetic_markers` table (value, reference range or
   expected, measured_at), or reuse the lab/biomarker ingestion path. This is the
   gating dependency: without a result source, the interpretations have nothing to
   interpret.
2. A render surface that, per marker: shows the value, picks `higherSuggests` vs
   `lowerSuggests` by comparing the value to its expected range, and shows the
   `wellnessNote`. Group by the 5 EpigenHQ groups from `panels.ts`. Mirror the plain,
   non-diagnostic, non-alarm wellness tone already authored.
3. Retest / trend: epigenetic age and pace-of-aging are most meaningful as a trend
   over repeat tests, so the surface should support a previous-vs-current comparison
   where data exists. (Optional for v1.)
4. Composition and exposure framing: the interpretations already encode that the
   composition markers (Immune Cell, Global Methylation) are "neither direction
   better" and the exposure signatures (combustion, alcohol, stress) are reversible
   and non-blaming. The surface must preserve that framing, not coerce them into a
   good / bad axis.
5. The DSHEA disclaimer (the shared #113 component) on the surface, as on the My
   Genetics hub.

## Recommended next step

Treat this as its own brainstorm + design + build cycle (it is a new measured-result
surface with a new data dependency, not a wiring step). The interpretations are
production-ready; the surface and its result source are the work. Until then,
EpigenHQ correctly stays gated: its panel renders its descriptions, and the
interpretations wait behind the data source.
