# GeneX360 Purchase Seeding + Upload Test Tabs Design

Date: 2026-06-21
Status: Approved (Gary, 2026-06-21)

## Goal

Two linked outcomes:

1. When a user purchases the GeneX360 bundle, all six panels populate
   immediately with SAMPLE results so the user sees their panels right away.
2. The Upload Genetic Data page carries a tab per test category (renaming
   EpigenHQ to "Epigenetic"), so every test has a home in one place.

## Approved decisions (Gary)

- Populate immediately on purchase with seeded SAMPLE results (not pending /
  not lab-import-later).
- One bundle: a GeneX360 purchase populates all six panels.
- Everything seeded is clearly labeled SAMPLE in the UI (compliance: a user
  must never mistake demo data for their real DNA / readouts).
- (Default, accepted) One fixed Hannah-vetted SAMPLE set per panel, drawn from
  existing validated content, not fabricated.
- (Default, accepted) HormoneIQ seeds only its genetic markers for now; its
  measured hormone levels are deferred (no hormone store yet).

## Architecture

### Purchase seeding

- Trigger: `finalizeOrderForSession()` in `src/lib/shop/checkout-helpers.ts`,
  after `shop_order_items` are inserted. This single server-side path runs once
  per paid order (also reached by the Stripe webhook), so seeding is triggered
  exactly once.
- Detection: any order item with `product_type === 'testing'` and a GeneX360
  product slug (the bundle, e.g. `genex360-complete`). Bundle => seed all six
  panels.
- Seed service `seedSamplePanels(supabase, userId)`:
  - Idempotent: if the user already has sample rows (is_sample = true), do
    nothing (a re-purchase or webhook + success double-fire must not duplicate).
  - Writes genotype panels (methylation, nutrition, hormone genetic markers,
    peptide, cannabis) into `user_variants` with `is_sample = true`.
  - Writes the 12 EpigenHQ markers into `user_epigenetic_markers` with
    `is_sample = true`.
  - Fail-soft: a seeding error never fails the order (the purchase still
    completes); it is logged.

### Sample dataset (no-invent)

- A curated `SAMPLE_PANEL_DATA` constant built from EXISTING validated content:
  real rsIDs / genes already present in the panel definitions
  (`src/data/genex360/panels.ts`, `VARIANT_SEVERITY`), each given one chosen
  sample genotype and reusing the panel's existing `clinical_significance`
  text. EpigenHQ uses the 12 markers from `epigenMarkerMap` with sample
  numeric/level values and directions.
- Hannah reviews the chosen sample genotypes/values for plausibility and
  confirms no new clinical copy is introduced.

### SAMPLE labeling

- `is_sample` boolean column added to `user_variants` and
  `user_epigenetic_markers` via a NEW migration (default false; existing rows
  unaffected).
- `/api/genetics/variants` and `/api/genetics/epigenetic` return `is_sample`.
- A neutral SAMPLE badge renders wherever a member's panel result shows:
  `YourVariantsCard` / `VariantReportPill` and the EpigenHQ "Your reading"
  block in `EpigeneticInterpretationCard`. Token-driven, non-alarm.

### Upload page tabs

- Tabs become one per GeneX360 panel category: Methylation, Nutrition, Hormone,
  Epigenetic (rename), Peptide, Cannabis, plus the existing raw DNA upload
  (23andMe etc.) that feeds the genotype panels.
- Tab behavior: genotype panels (Nutrition / Peptide / Cannabis / Methylation)
  are explainer tabs that describe what the panel covers and route to the DNA
  upload (their data is read from the DNA file); Epigenetic keeps its real
  report-upload panel; Hormone is an explainer (genetic markers from DNA +
  measured hormones from the GeneX360 sample). Each tab links to view its panel
  on the blueprint. No duplicate dropzones; no fabricated backend.

## Out of scope (follow-ups)

- Real Genemetrics lab import refresh to the current six panels.
- HormoneIQ measured hormone-level store + ingestion.
- Per-panel SKUs (only the one bundle is wired now).

## Risks

- Compliance: sample genetic data MUST be unmistakably SAMPLE. Mitigation: the
  is_sample flag + a badge on every result surface + sample values drawn from
  generic validated content.
- Double-seed: success page + webhook both call finalize. Mitigation: seeding
  is idempotent on the is_sample marker.
