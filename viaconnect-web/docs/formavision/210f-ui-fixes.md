# Prompt 210f Body Composition UI Layout Fixes

Date: 2026-07-15. Surface: Body Composition (Segmental body fat analysis view),
`src/app/(app)/(consumer)/body-tracker/composition/page.tsx`. Layout only, no logic,
data, computation, or copy changes. Branch: `fix/210f-body-comp-layout` off origin/main.

## Defect 1: Select Body Part control covered the Neck tab

Before: the Select Body Part control was absolutely positioned top-center over the
avatar (`left-1/2 top-2 -translate-x-1/2 justify-center`), directly over the Neck
region tab, so the Neck tab could not be seen or clicked. Gary's production
screenshots of 2026-07-15 are the before record (the region tab list shows Chest,
Shoulders, biceps, forearms, Waist, Hips, quads, calves, with Neck absent).

Fix: moved the control wrapper to the top-left corner (`left-2 top-2 justify-start`),
aligned with the avatar container's left padding. Position only. The control keeps its
exact styling, size, behavior, and keyboard order. The picker is a native select, so
its option list is browser-rendered and cannot clip regardless of position.

## Defect 2: Segmental Body Fat Analysis legend spacing

Before: the heading and the three legend rows in the desktop KPI column used mixed
gaps (block `gap-2`, list `gap-1`), so the block read unevenly. Note: in the current
DOM the legend is the top block of the tall right-hand column, not a fixed-height card,
so per Gary's decision this fix normalizes spacing only and does not re-position the
block vertically.

Fix: uniform `gap-1.5` between the heading, the legend rows, and each dot-to-label
(the dots and labels were already middle-aligned via `items-center`). Spacing only; the
block position and every metric card are unchanged. Applies to both the Body Fat and
Muscle legends (shared block).

## Verification status

- Code diff: surgical (3 class changes), dash-clean, layout only. Confirmed.
- Pending (Gary localhost / Sherlock): before and after screenshots at desktop, tablet,
  and phone widths plus the Capacitor WebView; pixel-diff confirming nothing else moved;
  confirmation that no region tab overlaps the control's new bounding box at every
  breakpoint (Defect 1 acceptance criterion), with the dropdown open and closed.
- Carry-forward: add the two requirements (control in the top-left corner, legend
  spacing even) to the 210e conformance checklist so the redesign inherits them.
