# Peptide Catalog Accordion (Prompt 195b)

- Date: 2026-06-14
- Surface: Personal Wellness portal (Consumer)
- Route: /peptide-protocol
- Type: UI behavior change (accordion)
- Parent: Sub-prompt of 195a (same unified Search Peptides module)
- Repo: viaconnect-web, branch main

## Problem

After 195a the unified Search Peptides module renders every category expanded
by default, which is a long wall of cards. Gary wants the category sections
collapsed by default and opened by the category pills.

## Goal

Make the catalog an accordion: all category header rows are visible but
collapsed by default; activating a category pill (or clicking its header)
expands that category's cards and collapses the others. The "All" pill expands
every section. Search reveals matches across categories.

## Design

### Interaction

- Default (load): header, subtitle, chip row, search box, then all category
  header rows collapsed (icon + label + count + a chevron). No cards shown.
- A category pill click opens that category and collapses the others (single
  open at a time). Clicking the active pill again closes it. The header row is
  also a toggle and stays in sync with the pill.
- The "All" pill expands every section. Clicking it again collapses all.
- Search: while the query is non-empty, every category with a match shows
  expanded (search overrides the accordion so hits are visible). Clearing the
  query returns to the collapsed accordion with the previously open category
  restored.

### State

- `openCatId: string | null` replaces the former `activeCatId`. `null` = all
  collapsed (default). `'all'` = all expanded. Otherwise the single open
  category id.
- A category is expanded when: the query is non-empty (searching), OR
  `openCatId === 'all'`, OR `openCatId === cat.id`.
- One toggle handles pills and headers:
  `setOpenCatId(prev => prev === id ? null : id)`, where id is a category
  catId or `'all'`. A chip is highlighted when `openCatId === chip.catId`.

### Code changes

- `filterCatalog.ts`: `filterCatalogCategories` drops its `activeCatId`
  parameter and becomes search-only `(categories, query)`. Empty query returns
  all categories unchanged; a non-empty query narrows each category's products
  and drops empty categories. `CATEGORY_CHIPS` (with the remapped catIds) is
  unchanged; it now selects which category to open instead of which to filter.
- `__tests__/filterCatalog.test.ts`: update the filter tests to the
  `(categories, query)` signature (empty query returns all; query filters and
  drops empty; case-insensitive; no match returns none). Keep the two
  `CATEGORY_CHIPS` guard tests.
- `PeptideCatalogSection.tsx`: replace `activeCatId` with `openCatId` (default
  `null`); call `filterCatalogCategories(categories, query)`; render every
  filtered category header as a `type="button"` toggle with `aria-expanded` and
  a chevron that rotates when open; render the card grid only when that
  category is expanded. Re-import `ChevronDown`.

## Constraints

- No em-dash or en-dash in any touched file. Grep before commit.
- Reuse existing tokens and primitives. No copy, color, disclaimer, or data
  changes. The "Search Peptides" title and derived count subtitle stay.
- Do not touch the Hannah AI card, package.json, email templates, or migrations.
- Keep desktop + mobile synchronism: chips wrap, grid is
  `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, no horizontal scroll. Header
  toggles are full-width tap targets.

## Acceptance criteria

1. On load, all category sections are collapsed (headers visible, no cards).
2. Clicking a category pill expands that category and collapses the others;
   clicking it again closes it; the header chevron reflects state.
3. The "All" pill expands every section.
4. Typing a query expands matching categories; clearing it returns to the
   collapsed accordion.
5. One `openCatId` state; the filter is search-only; chip-to-category mapping
   and its guard test remain.
6. Hannah AI card unchanged. No copy or data changes.
7. Desktop, tablet, mobile render correctly, no horizontal scroll.
8. Zero em-dash or en-dash in any touched file. Unit tests pass.

## Verification

- Load /peptide-protocol: all sections collapsed.
- Click each pill: only that category opens; click again closes. Click All:
  all open. Type a query: matches expand; clear: collapses back.
- `npx vitest run src/components/peptide-protocol/__tests__/filterCatalog.test.ts`.
- Grep touched files for U+2013 / U+2014: zero.

## Workspace and delivery

- Repo viaconnect-web, branch main. Path-scoped commits, peptide files only.
- Stop for Gary's confirmation before pushing to main (production deploy).
