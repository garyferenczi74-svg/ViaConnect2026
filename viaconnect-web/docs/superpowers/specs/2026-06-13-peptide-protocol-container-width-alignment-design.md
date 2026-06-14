# Peptide Education Page, Container Width Alignment (Prompt 195)

- Date: 2026-06-13
- Surface: Personal Wellness portal (Consumer)
- Route: /peptide-protocol
- Type: UI consistency fix (layout only)
- Repo: viaconnect-web, branch main

## Problem

The /peptide-protocol page renders its content inside a max-w-3xl (768px)
column while every standard Personal Wellness page uses max-w-7xl (1280px).
The result is wide empty gutters on both sides and a visibly narrower page
than its siblings.

## Root cause (verified, not assumed)

- Canonical wide container used by /dashboard, /supplements,
  /genetics/blueprint, /nutrition/insights, /shop, and the sibling
  /shop/peptides: `mx-auto max-w-7xl px-4 md:px-6`.
- Peptide page (`src/app/(app)/(consumer)/peptide-protocol/page.tsx`):
  outer `min-h-screen rounded-t-3xl px-4 py-8 md:px-8`, inner
  `mx-auto max-w-3xl space-y-5`.
- There is no shared layout-wrapper component. Standard pages inline the
  canonical classes, so the fix is to copy those classes verbatim, not to
  import a wrapper.

## Goal

Make /peptide-protocol content width, horizontal padding, and responsive
behavior identical to /dashboard at every breakpoint. Layout only: no copy,
disclaimer logic, media, routing, or data behavior changes.

## Changes

### 1. Container alignment (core), page.tsx

Move the horizontal padding onto the same element as the max-width and
centering so the content box becomes identical to the dashboard's
`mx-auto max-w-7xl px-4 md:px-6`.

Before:

    <div className="min-h-screen rounded-t-3xl px-4 py-8 md:px-8">
      <div className="mx-auto max-w-3xl space-y-5">

After:

    <div className="min-h-screen rounded-t-3xl py-8">
      <div className="mx-auto max-w-7xl space-y-5 px-4 md:px-6">

Rationale: `rounded-t-3xl` has no background and no visible effect today; the
outer keeps `min-h-screen` and `py-8` for vertical rhythm, and the inner now
matches the dashboard exactly. This single change cascades to every child
card (page header, Disclaimer banner, Search Peptides card, Personalized
Stack / Hannah AI card, Catalog, Practitioner Access) because they all sit
inside this box.

### 2. Catalog grid parity, PeptideCatalogSection.tsx

The collapsible catalog grid is `grid-cols-1 sm:grid-cols-2`, with a comment
saying it was tuned for the narrower max-w-3xl container. Its mirror page
/shop/peptides uses `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`. Add
`lg:grid-cols-3` so the cards do not stretch at the wider container, and
update the stale comment.

### 3. Chip sizing alignment, PeptideSearchBar.tsx

The category filter chips use a bespoke `text-[10px]` with `px-2 py-1`. The
app chip standards (pill-styles.ts, BrandCategoryFilterChips) never go below
`text-xs`. Align the chips to `text-xs` with `px-2.5 py-1`. Keep rounded-full,
the per-category brand colors (active inline backgroundColor), and flex-wrap.
No component swap: TabPills would drop the per-category colors and force a
no-wrap row, and BrandCategoryFilterChips is coupled to shop brand data.

## Constraints (from Prompt 195)

- Layout only. No copy, disclaimer, media, routing, or data changes.
- Reuse existing design tokens. Invent no new spacing values. Brand tokens
  unchanged: Deep Navy #1A2744, Card #1E3054, Teal #2DA5A0, Orange #B75E18,
  Instrument Sans.
- Lucide icons at strokeWidth 1.5 only if an icon is touched. No emojis.
- No em-dash or en-dash anywhere in touched files. Grep before commit.
- Do not touch Supabase email templates, package.json, or existing
  migrations.
- Do not regress the Search Peptides dropdown z-index. Wrapper stays z-30,
  dropdown stays z-50.

## Out of scope

- The full-bleed fixed hero background stays as-is. Only the content
  container width is aligned.
- No changes to /shop/peptides or /dashboard.
- The unrelated uncommitted nutrition work in the working tree is not
  touched and not committed.

## Acceptance criteria

1. /dashboard and /peptide-protocol show identical content width and
   identical left and right gutter widths at desktop. The outer content
   container computed width and left offset match.
2. Page header, Disclaimer card, Search Peptides card, Personalized Stack
   card, Catalog, and Practitioner Access all share the max-w-7xl box.
3. Category chips match the app-standard chip sizing. Per-category colors are
   preserved and chips still wrap.
4. The catalog grid shows 3 columns at lg, matching /shop/peptides.
5. No horizontal scroll at 375px, 768px, or 1440px.
6. The Search Peptides dropdown still opens above sibling content.
7. Zero em-dash or en-dash in any touched file.

## Verification

- In dev tools, compare the content container computed width and left offset
  on both pages at 1440px. They match.
- Resize through 375 / 768 / 1024 / 1440. Confirm no narrower column and no
  horizontal overflow.
- Grep touched files for U+2013 and U+2014. Zero matches.

## Workspace and delivery

- Repo viaconnect-web, branch main (existing checkout).
- Path-scoped commit: only the touched peptide files (page.tsx,
  PeptideCatalogSection.tsx, PeptideSearchBar.tsx). The unrelated nutrition
  work-in-progress is left untouched and uncommitted.
- This design doc is committed separately under docs/superpowers/specs/.
- Stop for Gary's confirmation before pushing to main, because a push to main
  triggers a production deploy.

## Tasks (for the implementation plan)

- Task 1: Container alignment in page.tsx.
- Task 2: Catalog grid parity in PeptideCatalogSection.tsx.
- Task 3: Chip sizing alignment in PeptideSearchBar.tsx.

Each task runs implement, then spec-compliance review, then code-quality
review, per subagent-driven-development.
