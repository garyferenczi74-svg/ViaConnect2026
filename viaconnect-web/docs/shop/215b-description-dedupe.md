# Prompt 215b: Description rename and de-duplication

## Changes
1. First accordion header: **Description** (was Full Description).
2. Deep link: `#description` primary; `#full-description` aliased via `resolveSectionHash`.
3. Description bodies: narrative only (`What does [Product] do?` + paragraphs).
4. Long-scroll category blocks split by `splitLongScrollDescription` and moved to proper sections before removal from Description.
5. Source of truth: seed builders (`contentSeed`, `buildFromProduct`) so data is clean, not render-time filter.

## Parity
- Catalog: 60 master formulations.
- Zero-loss: every product has Description + Ingredient Breakdown + Who Benefits + Formulation content after cleanup.
- Master marketing strings rarely embed ## Ingredient headings; when product.description is long-scroll (live DB), de-dupe runs on merge.

## CI
`descriptionDedupe215b.test.ts` + updated 215a header assertions.

## Marshall
Lexicon normalizer still applied; locked **10x to 28x** and **Built For Your Biology** retained in Who Benefits drafts.
