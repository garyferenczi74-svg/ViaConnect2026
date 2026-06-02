# Prompt 170b RENUMBERED: NutriVision Phase 2 Curated Seed + Native Depth Sensor Plugins (FILED)

**Filed:** 2026-06-01 (launch +0 evening)
**Status:** FILED. NOT YET RATIFIED. NOT YET AUTHORIZED FOR BUILD.
**Spec source:** Gary paste 2026-06-01
**Renumbered from:** old "Prompt 170a" (curated seed + native depth) per the new 170a spec hardening
**Architectural review memorial:** `C:\Users\garyf\.claude\projects\C--WINDOWS-system32\memory\project_prompt_170b_renumbered_filed.md` (14 concerns + 8 ratification asks + sequencing recommendation)

Per `[[feedback_no_unsolicited_changes]]` no spec drafting or build authorization until Gary ratifies the 8 asks.

## Strategic summary

Two-workstream Phase 2 ship for NutriVision:

**A (Gordon, data):** 200-food curated CSV across 9 cuisine buckets (NA + Med + LatAm + EAsian + SAsian + SEAsian + ME + African + ViaCura-adjacent) with per-row 2-source citations + idempotent seed script + 1 unique-index migration + 2 unit tests. Schema lives + table empty.

**B (Michelangelo, native + server):** iOS LiDAR ARKit + Android ARCore Depth Capacitor plugins capturing depth tile + color frame + intrinsics. Server `volume-estimate.ts` consumes depth via RANSAC plate plane fit + intrinsics projection. Stamps `portion_estimation_method='lidar'|'arcore'` on meal_items. Phase 1 fallback on non-supported devices.

Phase 2 macro accuracy targets are the ship gate: **85-90% Western ±10% / 70-80% global ±15%** on calories+protein+carbs+fat.

## Fourteen architectural concerns flagged

Full detail in memorial. Highlights:

1. **papaparse dep claim INCORRECT** — spec §3.5 says it's already in repo; verified NOT in package.json. NEW dep needs Gary approval OR hand-roll pure-TS parser.
2. **farmceutica_curated_foods table empty (0 rows)** — confirms greenfield seeding posture; prior "170b LIVE" memo refs were about schema not rows.
3. **3 Capacitor dev-only deps approval needed** (Workstream B §4.5; spec correctly defers to Gary).
4. **ViaCura branding** — possible carryover from old Prompt 170a OR intentional separate brand. Needs clarification per `[[feedback_separate_entities_scope]]`.
5. **Workstream B native plugin effort NOT sized** — realistic 4-8 engineer-weeks Michelangelo + 2 weeks server-side volume integration.
6. **Real iPhone 13 Pro+ + Pixel 6+ procurement** required for Audit gate; not yet funded.
7. **RANSAC volume integration + synthetic ground-truth fixtures** moderate complexity (~5-8 days work not in spec sizing).
8. **Depth tile privacy posture undefined** — analog to 170s photo policy: discard immediately post-analysis.
9. **ARCore device floor + Capacitor plugin choice** — Android 11+ + Pixel 4 vs Pixel 6 + community plugin vs custom.
10. **ARKit Capacitor wrapper choice** — from-scratch implied; higher control + higher effort.
11. **Workstream A 200-food authoring effort** — 40-80 hr Gordon + 5-10 hr Kelsey claim review.
12. **Missing `updated_at` column** on farmceutica_curated_foods (minor; non-blocking).
13. **Cuisine bucket math** — sums exactly to 200; ±2/bucket tolerance per §3.7.
14. **Workstream B no-runtime-dep claim** verified safe IF custom-plugin route taken.

## Eight ratification asks for Gary

(Full detail in memorial.)

1. **papaparse dep approval** (Workstream A) OR hand-roll pure-TS parser
2. **3 Capacitor dev-only deps approval** (Workstream B)
3. **ViaCura branding clarification** (carryover vs separate brand)
4. **Workstream sequencing** (parallel default vs A-first phase split)
5. **Real-device procurement plan** (iPhone 13 Pro+ + Pixel 6+)
6. **Workstream B phase split** (single phase vs iOS LiDAR first)
7. **Phase 2 accuracy targets confirmation** (85-90% Western / 70-80% global)
8. **Depth tile privacy posture** (discard immediately + Kelsey disclosure copy)

## Sequencing recommendation

| Option | Phasing | Trade-off |
|---|---|---|
| A | Both workstreams parallel per spec | Highest throughput; needs Gary capacity |
| **B (recommended)** | A first (2-3 wk; ratifies curated cascade), B after device procurement (4-6 wk parallel iOS + Android) | Reduces device-on-critical-path risk; matches 170p/170r/170s precedent |
| C | Defer to Q3 2026 single batch | Lowest priority risk during 173-series launch stabilization |

## Standing rules

Per spec §6: append-only migrations, no package.json mods without Gary approval (papaparse + 3 Capacitor dev-deps require explicit exceptions), no Supabase email/auth touches, Lucide React strokeWidth 1.5, no emojis in code OR CSV cells, Bio Optimization verbatim, Helix Rewards consumer-only, bioavailability "10x to 28x", no Semaglutide / Retatrutide injectable only / Tesofensine pending FDA, desktop-mobile simultaneous (A data-only; B touches CameraCapture.tsx), no em/en dashes anywhere (incl. CSV cells + sources doc), brand tokens + Instrument Sans, direct push to main no PR, architectural exception preserved on `/api/nutrition/analyze-text` + `/nutrition/log-meal`.

## Related

- `project_prompt_170b_renumbered_filed.md` (memorial; primary working doc)
- `project_capacitor_setup.md` (Capacitor 6.x baseline)
- `project_prompt_170p_phase_split.md` (workstream-split precedent)
- `project_prompt_170r_filed.md` (ultrathink-review-then-Option-B pattern)
- `project_prompt_170s_filed.md` (photo privacy analog for depth tile)
- `feedback_permanent_protections.md` (package.json lock; needs exceptions)
- `feedback_separate_entities_scope.md` (ViaCura clarification)
- `feedback_marshall_dictionary_predelivery_scan.md` (Kelsey claim review)
- `feedback_no_unsolicited_changes.md` (no build until Gary ratifies)
