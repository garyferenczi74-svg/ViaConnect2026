# Peptide Search + Catalog Consolidation (Prompt 195a)

- Date: 2026-06-14
- Surface: Personal Wellness portal (Consumer)
- Route: /peptide-protocol
- Type: UI consolidation and information-architecture fix
- Parent: Sub-prompt of Prompt 195 (same page)
- Repo: viaconnect-web, branch main

## Problem

The page renders two separate surfaces that browse the same peptide catalog:
a top "Search Peptides" card (category chips + text input) and a bottom
"Browse Full Peptide Catalog" collapsible card. Two browse controls for one
catalog is redundant and confusing.

## Root cause (verified)

The two surfaces use two different data sources and do not talk to each other:

- `PeptideSearchBar` (top card) runs a live Supabase query against the
  `peptide_registry` table (ilike on product_name / category_name), shows a
  floating dropdown of up to 8 matches, and owns `query` + `activeCategory`
  state. Its chips never filter the catalog below.
- `PeptideCatalogSection` (bottom card) reads the static
  `@/config/peptide-database/registry` (`ALL_CATEGORIES`), renders a
  categorized `PeptideCatalogCard` grid behind a collapse toggle, and owns
  `open` state. No search, no chip filtering.

Both components are imported ONLY by the peptide-protocol page (verified), so
consolidation is self-contained.

## Goal

One peptide catalog module: search input and category chips at the top, the
catalog results inline directly beneath them, driven by one shared data
source and one shared filter state. Remove the redundant second card. Leave
the Hannah AI "Generate Your Protocol" card alone.

## Locked decisions

- Module title: "Search Peptides". Subtitle: the derived count line.
- Page order: Disclaimer, then Hannah AI card, then unified module, then
  Practitioner Access.
- Results are always inline (no collapse toggle).

## Design

### Single source of truth

The static `@/config/peptide-database/registry` becomes the only source. It
already exports `ALL_CATEGORIES` (categorized products), `PEPTIDE_REGISTRY`
(flat), and `REGISTRY_STATS`. The Supabase `peptide_registry` query and the
floating dropdown are removed entirely.

### Unified module (evolve `PeptideCatalogSection.tsx`)

Keep the filename (only used here; renaming adds churn). The component becomes
the unified module with this top-to-bottom structure:

1. Header: title "Search Peptides" plus a derived subtitle
   `{totalPeptides} peptides · {totalCategories} categories · educational reference`,
   where the counts are derived from the full post-semaglutide catalog (kept
   derived so they stay accurate). The middle dot is allowed copy.
2. Controls: the text search input ("Search peptide information") and the full
   category chip row (All plus the 8 categories), reusing the existing input
   and chip markup. No floating dropdown.
3. Results: the existing categorized `PeptideCatalogCard` grid
   (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`), rendered inline, filtered
   live. When no category has matches, render a single "No peptides found"
   empty state.

### Chip definitions (preserve labels and colors, fix the filter ids)

The chips keep their exact current labels and colors, but each carries the
real `ALL_CATEGORIES` id for filtering. Three ids must be remapped; the other
five already match.

| Chip label    | Old chip id | Catalog id (catId) | Color (unchanged) |
|---------------|-------------|--------------------|-------------------|
| All           | all         | all                | #2DA5A0           |
| Longevity     | longevity   | longevity          | #7C3AED           |
| Stress / HPA  | stress      | adrenal            | #DC2626           |
| Energy / Mito | energy      | mitochondrial      | #D97706           |
| Immune        | immune      | immune             | #059669           |
| Cognitive     | neuro       | neuro              | #2563EB           |
| Hormonal      | hormonal    | hormonal           | #DB2777           |
| Gut / Repair  | gut         | gut_detox          | #16A34A           |
| Metabolic     | metabolic   | metabolic          | #B75E18           |

The catalog category header labels (for example "Gut & Detox Support") stay
as the registry defines them. Both label sets are preserved as they are today.

### State and filter (one query, one category, one derived list)

- `query: string` (search text), `activeCatId: string` (default "all").
- Base list: `ALL_CATEGORIES` with the existing defensive semaglutide filter.
- `filteredCategories` is a single `useMemo` over `(query, activeCatId)`:
  - keep categories where `activeCatId === 'all' || cat.id === activeCatId`,
  - within each kept category, when query is non-empty keep products whose
    lowercased `name`, `type`, `mechanism`, `category`, or any `targetVariants`
    entry includes the lowercased query,
  - drop categories that end with zero products.
- Search and category combine (both apply). Selecting "All" clears the
  category filter. Filtering is client-side and instant (no debounce, no
  fetch).

### Page wiring (`page.tsx`)

- Remove the `PeptideSearchBar` import and its render.
- Reorder the content stack to: page header, `PeptideDisclaimerBanner`,
  `PersonalizedPeptideStack` (Hannah AI, untouched), the unified
  `PeptideCatalogSection`, `PeptidePractitionerAccess`.

### Deletion

- Delete `src/components/peptide-protocol/PeptideSearchBar.tsx`.

### Intended behavior change

Search changes from "type to open a dropdown of 8 Supabase matches" to "type
to filter the inline catalog live." This removes the absolute-positioned
dropdown, so the dropdown z-index concern is eliminated by design rather than
preserved. Navigation to a peptide's full profile is preserved through each
card's existing "Full Profile" link to /shop/peptides/[id].

## Constraints (from Prompt 195a)

- Do not touch the Hannah AI "Generate Your Protocol" card
  (`PersonalizedPeptideStack`) or its generation logic.
- Do not change peptide copy, category names, the disclaimer, or the
  educational framing. Peptides stay educational and protocol-guidance only.
- Reuse existing design tokens and primitives. Deep Navy #1A2744, Card
  #1E3054, Teal #2DA5A0, Orange #B75E18, Instrument Sans unchanged.
- Lucide icons at strokeWidth 1.5 only if touched. No emojis.
- No em-dash or en-dash in any touched file. The middle dot in the subtitle is
  allowed. Grep before commit.
- Do not touch Supabase email templates, package.json, or existing migrations.
- Keep the standard `max-w-7xl px-4 md:px-6` container from Prompt 195.
- Desktop and mobile synchronism: chip row wraps, grid reflows at sm / md / lg.

## Out of scope

- The Hannah AI card and its API.
- Any change to /shop/peptides, /dashboard, or the registry data itself.
- The search input's pre-existing `text-sm` size (the iOS 16px input rule is a
  separate pre-existing concern, not introduced here; reuse the input as is).
- Pre-existing lint findings in unrelated lines.

## Acceptance criteria

1. The page shows one peptide catalog module, not two. The standalone "Browse
   Full Peptide Catalog" card is gone and `PeptideSearchBar.tsx` is deleted.
2. The search input and the full category chip row sit at the top of the
   unified module; the catalog results render directly beneath them.
3. Typing filters the inline results. Selecting any category chip filters the
   same results, including Stress / HPA, Energy / Mito, and Gut / Repair
   (the remapped ids). Search and category combine. "All" clears the category.
4. One peptide data source, one search state, one category state, one derived
   filtered list. No Supabase peptide query and no duplicate list remain.
5. The "{n} peptides, {m} categories, educational reference" descriptor is
   preserved on the unified module and stays derived.
6. The Hannah AI "Generate Your Protocol" card is unchanged.
7. Desktop, tablet, and mobile render the module correctly with no horizontal
   scroll and correct chip wrapping.
8. Zero em-dash or en-dash in any touched file.

## Verification

- Load /peptide-protocol; confirm exactly one browse surface.
- Type a query; confirm inline results filter. Clear it; confirm the full list
  returns. Click each chip; confirm filtering, including the three remapped
  categories. Click "All"; confirm reset.
- Confirm the count descriptor displays and is accurate.
- Resize through 375 / 768 / 1024 / 1440; confirm reflow and no overflow.
- Grep touched files for U+2013 and U+2014; expect zero.

## Workspace and delivery

- Repo viaconnect-web, branch main. Path-scoped commits: only the touched
  peptide files. Any unrelated working-tree changes are left untouched and
  uncommitted.
- This design doc is committed separately under docs/superpowers/specs/.
- Stop for Gary's confirmation before pushing to main (push triggers a
  production deploy). Flag any pre-existing unpushed commits that a push would
  also carry.

## Tasks (for the plan)

- Task 1: Build the unified module in `PeptideCatalogSection.tsx` (header +
  controls + filtered categorized grid + empty state), with the remapped
  chips and single derived filter.
- Task 2: Rewire `page.tsx` (remove `PeptideSearchBar`, apply the new order)
  and delete `PeptideSearchBar.tsx`.

Each task runs implement, then spec-compliance review, then code-quality
review, per subagent-driven-development.
