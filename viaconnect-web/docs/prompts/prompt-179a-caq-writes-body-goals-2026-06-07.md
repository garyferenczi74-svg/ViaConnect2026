# Prompt 179a: CAQ writes the body_goals trajectory (authority and write-through) (Specification)

Filed 2026-06-07. Authored by Gary as the ratified answer to the Prompt 179 goal-model question (Option 1, with the read/write split refinement below). Depends on Prompt 179 (Goals tab, body_goals, body_goal_targets, the goal engine). Status: filed. The CAQ surface, the four extra body_goals columns, the lazy backfill, and the needs_resync self-heal hardening are built in a dedicated 179a turn, not in #179. Prompt 179 wires only the goal-save write-through projection.

Platform: ViaConnect (Via Cura consumer brand). Entity: Farmceutica Wellness Ltd. Module: CAQ onboarding plus Body Tracker (Arnold) and Daily Macros (Gordon). Stack: Next.js / TypeScript / Supabase / Vercel. Delivery: direct push to main after the localhost gate. Desktop and mobile built simultaneously with responsive Tailwind from the start.

## 1. Context and the question being answered

Prompt 179 introduced `body_goals` (the trajectory authority) and `body_goal_targets` (the daily calorie and macro targets that drive the daily scores when a goal is active). Prompt 173 already shipped `user_weight_goals`, which stores current weight, goal weight, and direction, and which feeds both the macro engine and the Weight tab timeline card.

The two tables overlap on current weight, goal weight, and direction. This prompt resolves that overlap and makes the CAQ questionnaire populate `body_goals` at the end of onboarding, so a member finishes the CAQ with a live trajectory and daily targets already computed.

## 2. Decision on the relationship

Selected: Option 1, `body_goals` is the authority and writes through to `user_weight_goals`, with reads and writes split.

Rationale and tradeoffs. Option 3 (keep independent) is rejected: it violates single-source-of-truth and allows goal weight to diverge between the Weight tab and the Goals tab, the exact inconsistency class the recent design audit flagged. Option 2 (replace everywhere) is the correct long-term end-state but the wrong blast radius for an "a" follow-up; it would touch CAQ capture, the Weight tab card, and the macro engine read paths in one change, and belongs in a dedicated later migration. Option 1 is chosen with one refinement so it is genuinely correct and not merely convenient: split reads from writes. Readers of `user_weight_goals` stay untouched. Every writer of goal weight funnels through `body_goals`, and a projection mirrors goal weight and direction back into `user_weight_goals`. `body_goals` becomes the single writer of truth while legacy read paths never change. This is also a clean stepping-stone to Option 2 later.

## 3. Objective

Establish `body_goals` as the single write authority for goal weight, with a write-through projection into `user_weight_goals`. Redirect the Weight tab card edit action and the Goals tab planner to write through `body_goals` (reads unchanged). Make the CAQ Weight Goals step capture a pace or target date and, on submission, upsert the active `body_goals` row and fire the initial_plan target computation. Lazily and idempotently backfill `body_goals` for existing members who have `user_weight_goals` but no active goal.

## 4. Authority and write-through model

### 4.1 Reads (unchanged)

The macro engine static path and the Weight tab timeline card continue to read `user_weight_goals` exactly as they do today. No read-path changes.

### 4.2 Writes (single writer = body_goals)

All goal-weight writes go through `body_goals`: CAQ Weight Goals submit, the Weight tab card edit action, and the Goals tab planner. The Weight tab card edit action is redirected from writing `user_weight_goals` directly to writing `body_goals`.

After every `body_goals` create or update, an application-layer write-through service projects into `user_weight_goals`: `goal_weight` always set from `body_goals.goal_weight_lb`; `direction` derived as lose when goal is less than start, gain when goal is greater than start, maintain when equal; `current_weight` set only when `user_weight_goals` has no current weight, so live weight tracking from existing flows is never clobbered. The projection is idempotent: re-deriving from the same `body_goals` row yields the same `user_weight_goals` values.

### 4.3 Resilience and self-heal

The committed transaction is the `body_goals` write. The projection runs in the same request wrapped in try/catch fail-open with a Promise.race timeout and structured logging. If the projection fails, the `body_goals` write still succeeds, a structured log entry and a `needs_resync` flag are recorded, and the projection re-runs on the next read of the Goals tab or the next `body_goals` write (self-heal). Optional hardening, left to Gary's call: a Postgres trigger that mirrors the same three fields as defense in depth; not required for this prompt, the app-layer service is the canonical path so it stays logged and testable.

## 5. CAQ changes

Hard constraint: do not change the CAQ canonical structure. It remains 7 phases, 16 progress dots, 10 interstitials, single video (DNA HD.mp4). The pace capture below is added inside the existing Weight Goals step, not as a new phase, dot, or interstitial.

### 5.1 Pace or target-date capture (inside the existing Weight Goals step)

Add a lightweight pace selector with presets: Gentle (about 0.5 lb per week), Steady (about 1.0 lb per week), Ambitious (about 1.5 lb per week), and an alternative "Pick a target date" control. Default to Steady if the member does not choose. For a maintain goal (goal weight equals current weight), pace is not shown; store driver = rate with target_rate_lb_per_week = 0. Presets that would breach the safety floor or rate cap for a light member are clamped exactly as in Prompt 179 (bend the date, never the calories), with the conflict surfaced.

### 5.2 On Weight Goals submit and CAQ completion

Upsert the active `body_goals` row with start_weight_lb (current weight from the CAQ), goal_weight_lb, driver (rate or date), target_rate_lb_per_week or target_date, and origin = caq. Snapshot profile fields already collected elsewhere in the CAQ: sex, age, height, and activity_level. goal_bodyfat_pct stays NULL unless captured. Stop writing `user_weight_goals` directly from the CAQ; the write-through projection now owns that table. No double-writes. Fire the Prompt 179 initial_plan target computation so `body_goal_targets` exists at the moment onboarding ends and the daily scores are goal-driven from day one.

## 6. Data model deltas (append-only migration)

Append-only. Do not alter or drop existing columns. Do not change the `user_weight_goals` schema; it is written via projection only. Add to `body_goals`:

| column | type | notes |
| --- | --- | --- |
| origin | text | caq, goals_tab, weight_card, caq_backfill |
| target_pace_preset | text | gentle, steady, ambitious, custom_date; nullable |
| needs_resync | boolean | default false; set true when projection fails, cleared on successful resync |
| legacy_synced_at | timestamptz | nullable; last successful projection time |

## 7. Backfill for existing members (lazy, idempotent)

No destructive bulk migration. On the first Goals tab open, or the first daily-score resolve, for a member who has a `user_weight_goals` row but no active `body_goals`, seed an active `body_goals` from `user_weight_goals`: start_weight from the latest Arnold weight log when present else the `user_weight_goals` current weight, goal_weight and direction from `user_weight_goals`, driver = rate with the Steady default (legacy rows lack a date or rate), origin = caq_backfill. Idempotent: running the backfill twice for the same member does not create a second active goal, guarded by the one-active-goal-per-user partial unique index from Prompt 179. Seeding triggers the initial_plan target computation so backfilled members also get goal-driven daily targets.

## 8. Reconciliation with Prompt 179 daily scores

Because the CAQ now seeds `body_goals` at onboarding, most members carry an active goal immediately, so the Prompt 179 daily-score resolver uses `body_goal_targets` from day one. The DD-1 precedence is unchanged: same-day manual override, then latest effective goal target, then the static CAQ / Daily Macros target as the fail-open fallback. The fallback still applies for members with no active goal, a maintain goal with no deficit, or an engine fallback event. Use the exact label "Bio Optimization Score" wherever the downstream score is referenced. Protein remains anchored at 0.8 g per lb lean body mass.

## 9. Resilience (every new path)

Apply all three layers on the write-through service, the CAQ submit handler, and the backfill path: timeout via Promise.race; try/catch fail-open (the `body_goals` write is authoritative and never blocked by a projection or target-computation failure; failures fall back, log, and self-heal); structured logging of origin, projection result, clamps, and resync events.

## 10. Acceptance criteria (Michelangelo TDD)

1. Completing the CAQ with a lose goal and the Steady preset creates an active `body_goals` row with origin caq and target_rate about 1.0, projects goal_weight and direction lose into `user_weight_goals`, and produces an initial_plan `body_goal_targets` row.
2. Completing the CAQ with a maintain goal stores driver rate with target_rate 0 and yields a target equal to estimated maintenance with no deficit.
3. Editing goal weight on the Weight tab card writes through `body_goals`, and `user_weight_goals` reflects the new goal_weight and direction with no divergence.
4. The macro engine static path and the Weight tab timeline card read paths are unchanged and still function.
5. An existing member with `user_weight_goals` and no active `body_goals` gets a lazy backfill on first Goals tab open with origin caq_backfill; running it twice does not create a second active goal.
6. Forcing the projection to throw leaves the `body_goals` write committed, sets needs_resync true with a structured log, and the next read self-heals and clears the flag.
7. CAQ structure is unchanged: 7 phases, 16 dots, 10 interstitials, single video.
8. No emojis, no em or en dashes, Lucide icons at strokeWidth 1.5, tokens only.

## 11. Out of scope

The Option 2 mass migration that deprecates `user_weight_goals` and flips all readers to `body_goals`; a later dedicated prompt. Any change to the CAQ phase, dot, or interstitial counts, the single video, or the GENEX360-independent AI protocol. Any change to package.json or Supabase email templates.

## 12. Delivery checklist

Append-only migration adding the four `body_goals` columns. Write-through projection service with resilience and idempotency. Weight tab card edit action and Goals tab planner redirected to write through `body_goals`. CAQ Weight Goals step pace or target-date capture inside the existing step, no canonical count change. CAQ submit upserts `body_goals` and fires initial_plan target computation; stops direct `user_weight_goals` writes. Lazy idempotent backfill for existing members. Acceptance tests for the criteria above. Paired .md and .docx delivered to the Prompt Library.
