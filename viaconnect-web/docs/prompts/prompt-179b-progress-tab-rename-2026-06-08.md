# Prompt 179b: Rename the Body Tracker "Goals" tab to "Progress" (Specification)

Filed 2026-06-08. Ratified by Gary the same day: rename the user-facing surface only; keep all internal identifiers as `body_goals`. Because Prompt 179 and 179a are not yet merged, the tab ships as "Progress" from the first commit (no rename churn). Canonical name going forward for this tab is Progress.

Platform: ViaConnect (Via Cura consumer brand). Entity: Farmceutica Wellness Ltd. Module: Body Tracker (Arnold). Stack: Next.js / TypeScript / Supabase / Vercel. Delivery: direct push to main after the localhost gate. Desktop and mobile built simultaneously with responsive Tailwind from the start. Depends on: Prompt 179 (the tab) and Prompt 179a (CAQ write-through).

## 1. Context

Prompt 179 added a Body Tracker tab labeled "Goals," sitting immediately to the right of "Milestones." This prompt renames that user-facing tab to "Progress." The internal data model, API routes, and engine keep the `body_goals` namespace; only the member-facing label and the page route segment change.

## 2. Scope decision (ratified)

Selected: rename the user-facing surface only. Keep all internal identifiers as `body_goals`.

User-facing: the tab label, the page route segment, page headers, breadcrumbs, navigation entries, and any accessibility labels for this tab change from Goals to Progress. Internal: the tables (`body_goals`, `body_goal_targets`, `body_goal_recalibrations`), the API routes (`/api/body/goals` and its children), the engine module, and telemetry event keys keep their names.

Rationale. The table genuinely stores goals (goal weight, target date, target rate); renaming it to progress would mislead future maintainers, and the append-only migration rule exists to keep us from renaming live tables. UI labels and internal names do not need to match; decoupling them keeps this a safe copy-level change instead of a destructive migration.

## 3. Exact user-facing changes

- Tab label: "Goals" becomes "Progress." Position is unchanged, immediately to the right of "Milestones."
- Page route segment for the tab becomes `progress` (for example `/body-tracker/progress`). Set it correctly from the start; no redirect is needed since the surface is new.
- Any page title, header, breadcrumb, or aria-label that currently reads Goals for this tab reads Progress.
- Navigation and any deep-link display text that names this tab reads Progress.
- Provenance copy stays accurate: lines such as "Set by Gordon from your goal trajectory" are unchanged, since they describe the trajectory, not the tab name.
- Inner section rename: the Prompt 179 section titled "Adherence and Progress" becomes "Adherence," to remove the echo now that the tab itself is named Progress. The content is unchanged.

## 4. What stays unchanged

All `body_goals` tables and columns. All `/api/body/goals` routes. The Gordon goal engine module and the daily-score resolver precedence (DD-1). Telemetry event keys, so historical analytics continuity is preserved. The CAQ "Weight Goals" step is untouched, including its 7 phases, 16 dots, and 10 interstitials.

## 5. Application timing

Because Prompt 179 and 179a are not yet merged, apply the Progress label and the `progress` route segment at implementation time, so the tab ships as Progress from the first commit and no rename churn occurs. Going forward, the canonical name for this tab is Progress.

## 6. Conventions

No emojis, no em or en dashes anywhere in copy. Lucide React icons at strokeWidth 1.5, tokens only (Deep Navy #1A2744, Card #1E3054, Teal #2DA5A0, Orange #B75E18; match existing Body Tracker typography). Any touched path keeps the standard resilience pattern; this change is copy-level and adds no new data paths.

## 7. Acceptance criteria (Michelangelo TDD)

1. The Body Tracker tab reads Progress, positioned immediately to the right of Milestones, on both mobile (360px) and desktop (1280px).
2. The tab page route segment is `progress`, and the page title, breadcrumb, and aria-label all read Progress.
3. The `body_goals` tables, the `/api/body/goals` routes, the engine module, and telemetry event keys are unchanged.
4. The inner section formerly titled Adherence and Progress now reads Adherence, with unchanged content.
5. The CAQ Weight Goals step is unchanged, including phase, dot, and interstitial counts.
6. No emojis, no em or en dashes, Lucide icons at strokeWidth 1.5, tokens only.

## 8. Out of scope

Any rename of the `body_goals` data model, API routes, or engine module. Any change to the CAQ. Any change to package.json or Supabase email templates.

## 9. Delivery checklist

Tab label and page route segment renamed to Progress. Headers, breadcrumbs, navigation, and aria-labels for the tab updated to Progress. Inner section retitled from Adherence and Progress to Adherence. Internal identifiers confirmed unchanged. Acceptance tests for the criteria above. Paired .md and .docx delivered to the Prompt Library.
