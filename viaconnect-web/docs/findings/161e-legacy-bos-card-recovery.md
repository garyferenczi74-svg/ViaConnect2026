# Prompt #161e: Legacy BOS Card Recovery Findings

**Author**: Michelangelo (Claude Code session, 2026-05-12)
**Purpose**: Recover the legacy Bio Optimization Score card from git history before the corrective rewrite. #161e §6.1 mandates this as the first execution step.

---

## 1. Identification

| Item | Value |
|---|---|
| Legacy file (recovered) | `viaconnect-web/src/components/dashboard/BioOptimizationGauge.tsx` (273 lines) |
| Recovered from commit | `4b9770e1aa4d716f8230758e9efc44ee64223685` (i.e. `5693f53^`, the commit immediately preceding the #162 merge) |
| Deleted by commit | `5693f53` "feat(dashboard): #162 Bio Optimization Score Card UI redesign" |
| Recovery copy 1 | `scratch/161e/legacy-bos-card-recovered.tsx.txt` |
| Recovery copy 2 | `scratch/161e/legacy-dashboard-page.tsx.txt` (216 lines, the pre-#162 dashboard page that mounted the gauge) |

File extensions are `.txt` so the recovered legacy does not enter tsc's include glob; it is reference material only.

Recovery commands used:
```bash
git show 5693f53^:viaconnect-web/src/components/dashboard/BioOptimizationGauge.tsx \
  > scratch/161e/legacy-bos-card-recovered.tsx
git show '5693f53^:viaconnect-web/src/app/(app)/(consumer)/dashboard/page.tsx' \
  > scratch/161e/legacy-dashboard-page.tsx
# files later renamed to .txt for tsc isolation
```

Recovery outcome: **full legacy file present**.

---

## 2. What the legacy card had

### 2.1 Circular gauge (270 degree sweep, open at bottom)

```ts
const size = 240;
const stroke = 14;
const radius = (size - stroke) / 2;
const center = size / 2;
const sweep = 270;
const startAngle = 135;
const circumference = 2 * Math.PI * radius;
const arcLength = (sweep / 360) * circumference;
const fillLength = (score / 100) * arcLength;
```

Two SVG `<circle>` strokes:
- Track ring at `stroke="rgba(255,255,255,0.06)"`, strokeWidth 14, dashed to expose only the 270deg arc.
- Fill ring as `<motion.circle>` animating `strokeDasharray` from `0 ${circumference}` to `${fillLength} ${circumference}` over 1.5s with `ease: 'easeOut'` and `delay: 0.2`. Drop shadow glow `drop-shadow(0 0 12px ${color}66)`.

SVG container rotated `transform: rotate(135deg)` to place the gap at the bottom.

Diameter 240px on the legacy card. The corrective rewrite uses 120px mobile / 160px desktop to match the `DailyScoreGauge.tsx` family that sits below on the same dashboard (matching gauge family is the orchestrator's pre-flight finding).

### 2.2 Score number count-up

Custom `useCountUp(target, duration = 1500)` hook using `requestAnimationFrame` with `ease-out cubic`. Rendered centered inside the gauge with `text-5xl font-bold sm:text-6xl`, colored by score band, with `/ 100` denominator below.

### 2.3 5-tier color band and label

```ts
const colorForScore = (score: number): string => {
  if (score >= 91) return '#A855F7'; // Optimal
  if (score >= 76) return '#22C55E'; // Excellent
  if (score >= 51) return '#2DA5A0'; // Good
  if (score >= 26) return '#F59E0B'; // Building
  return '#EF4444';                  // Needs Attention
};

const labelForScore = (score: number): string => {
  if (score >= 91) return 'OPTIMAL';
  if (score >= 76) return 'EXCELLENT';
  if (score >= 51) return 'GOOD';
  if (score >= 26) return 'BUILDING';
  return 'NEEDS ATTENTION';
};
```

The tier label renders below the gauge in `text-xs font-semibold uppercase tracking-[0.18em]`, colored to match the band.

### 2.4 Side panel (eyebrow + headline + 3 info chips)

Right column of a `md:grid-cols-[auto_1fr]` layout:

- Eyebrow `text-[10px] font-semibold uppercase tracking-wider text-white/40` reading `Bio Optimization Score`
- Headline `text-lg font-bold sm:text-xl` reading `Your score is <SentenceCase(label)>` with the status word colored by band
- Three info chips: weekly delta, tier, confidence. Each `rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5`.

### 2.5 Accuracy pills (in legacy)

Three pills in a `flex flex-wrap gap-2` row. Already state-differentiated in legacy (the #162 PR collapsed the differentiation):

- Complete state: teal-tinted background + teal border + teal text + no "unlock" verb. Example: `CAQ: 72%`.
- Locked state: low-opacity background + white-10% border + white-40% text + middle-dot `·` separator + "unlock" verb. Example: `Labs: 86% · unlock`.

Legacy pill shape was `rounded-full` (full pill, single line). The #161e spec adopts `rounded-full` chips at a larger size with 2-line content.

### 2.6 5-dot data-completeness indicator

Five 2x2 px dots showing which of sleep/activity/stress/recovery/hrv have data today (Prompt #66 carry-over). The #162 PR removed this and #161e does not call for its restoration; it stays removed.

### 2.7 Card container

```
rounded-3xl border border-white/10
bg-gradient-to-br from-[#1E3054]/60 via-[#1A2744]/60 to-[#141E33]/60
backdrop-blur-md p-5 sm:p-6 md:p-8
```

Plus a soft-glow accent at `absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-20 blur-3xl` colored to match the score band.

---

## 3. What the legacy card did NOT have

1. **Static teaching paragraph**. Section 2.3 of #161e calls for an evergreen Hannah-voice teaching block. The legacy had NO such copy. **NEW requirement.**
2. **Hannah dynamic explanation panel**. The legacy had no per-compute Hannah text. #162 introduced this via `BOSExplanation`. **Preserved from #162.**
3. **Engagement pill row**. The legacy had no engagement levers. **NEW from #162; preserved.**
4. **"Improved Accuracy" descriptive header + sentence**. **NEW requirement in #161e.**
5. **"How can I improve my score?" header + sentence**. **NEW requirement in #161e.**

The legacy did NOT include a static explanatory paragraph anywhere. The "side panel" was data-driven info chips + Link-bearing unlock pills.

---

## 4. What #162 broke (the failures #161e exists to correct)

| # | Failure | Legacy state | #162 state |
|---|---|---|---|
| F1 | Circular gauge removed | 270deg sweep, animated arc, band-colored | Flat `{score} / 100` text in `bos-score-display.tsx` |
| F2 | Static teaching copy missing | Did not exist in legacy; #161e adds it | Does not exist in #162; #161e adds it |
| F3 | Pill descriptive sentences missing | Did not exist; #161e adds them | Only an "Accuracy" / "Engagement" 10px eyebrow |
| F4 | Pill state collapsed | Already differentiated (complete teal vs locked low-opacity) | All pills render with the same visual treatment |
| F5 | Mobile clipping at 380px | Legacy was a 1-column card with 3 short pills | #162 9-pill grid clips |

---

## 5. Items preserved from #162

| Element | Source |
|---|---|
| TanStack Query hook `useBOSCurrent` polling `/api/bos/current` every 60s | `src/hooks/use-bos-current.ts` |
| Read API response shape | `src/lib/scoring/types.ts` |
| Pill route map | `src/lib/scoring/pill-routes.ts` |
| Pill icon map | `src/lib/scoring/pill-icons.ts` |
| Skeleton / Error / Empty / Populated state branches | `bos-card-skeleton.tsx`, `bos-card-error.tsx`, `bos-card-empty-state.tsx` |
| Hannah's dynamic explanation panel | `bos-explanation.tsx` |
| `aria-label="Bio Optimization Score"` on the `<section>` wrapper | `bos-card-client.tsx` |

Data flow and API contract are unchanged. The corrective work touches only the visual rendering of the subcomponents.

---

## 6. Pre-render Marshall scan over recovered legacy

```
em-dashes (U+2014): 3 occurrences
  Line 3:  // BioOptimizationGauge — Hero radial SVG gauge for the consumer dashboard.   (comment)
  Line 80: // SVG geometry — 270° sweep (open at bottom)                                  (comment)
  Line 213: {hasGenetics ? '96%' : hasLabs ? '86%' : hasCAQ ? '72%' : '—'}                (user-facing)
en-dashes (U+2013): 0
emojis: 0
```

Normalization for the rebuild: the user-facing `'—'` placeholder is replaced by `'--'` (two ASCII hyphens, matching the post-#162 `bos-score-display.tsx` pattern that we deleted). Code-comment em-dashes are not reproduced. New files contain zero dashes of any kind anywhere.

---

## 7. Static explanation copy (Hannah-voice, authored for #161e)

The legacy card had no static teaching paragraph. Per #161e §6.3, the new `BOSStaticExplanation` ships fresh Hannah-voice copy:

> Your Bio Optimization Score blends two signals: how accurate your diagnostic foundation is, and how consistently you engage the daily levers. As your foundation moves from CAQ to Labs to Genetics, the score grows more precise. As you log meals, supplements, body measurements, wearable data, plug ins, and challenges, the score moves with you.

Zero em dashes, zero en dashes, zero emojis. Hannah register: clinical-but-friendly, no therapeutic claims, no disease names. The dynamic `BOSExplanation` ("From Hannah" panel) carries the per-user, per-compute narrative; this static block carries the evergreen "what the score is" teaching.

---

## 8. Q1-Q9 decisions for this corrective rewrite

A prior Michelangelo session paused at an open-questions gate. The current dispatch (2026-05-12) instructs Michelangelo to proceed past that gate with the spec providing verbatim text and structure. Decisions taken to close Q1-Q9 for this dispatch:

| Q | Decision for this dispatch | Rationale |
|---|---|---|
| Q1 (gauge diameter) | 160px desktop, 120px mobile via Tailwind responsive switch | Mirrors `DailyScoreGauge.tsx` family on the same dashboard |
| Q2 (sweep direction) | 270deg sweep open at bottom, rotation 135deg | Legacy pattern; matches DailyScoreGauge / DailyMetricGauge |
| Q3 (score number color) | Color by 5-tier band (purple / green / teal / amber / red) | Restores legacy band coloring that #162 dropped; aligns with all other dashboard gauges |
| Q4 (status label) | OPTIMAL / EXCELLENT / GOOD / BUILDING / NEEDS ATTENTION below the gauge | Legacy pattern preserved per §0 "upgrade not redesign" |
| Q5 (5-dot completeness) | Not restored | Six engagement pills are the new completeness surface |
| Q6 (headline copy) | Restored within the decomposition line under the gauge: "Your score is X, Confidence Y%, Baseline N" | Legacy pattern preserved + new baseline visibility |
| Q7 (teaching copy) | Hannah-voice draft authored fresh (see §7 above) | #161e §6.3 contingency |
| Q8 (pill shape) | `rounded-full` chips per spec §6.6 + §6.7 | Legacy used full pills; #161e spec keeps full pills |
| Q9 (pill multi-line) | Per #161e spec §6.6 / §6.7 (icon + label + state-distinct visual) | Spec is explicit |

These decisions are subject to override by Gary during the Vercel-preview screenshot sign-off.

---

## 9. Files in the corrective rewrite

**New files (created Phase 2)**:
- `src/components/dashboard/bos-score-gauge.tsx`
- `src/components/dashboard/bos-gauge-helpers.ts` (JSX-free helpers for the gauge; supports node-environment Vitest)
- `src/components/dashboard/bos-static-explanation.tsx`
- `src/components/dashboard/bos-accuracy-row.tsx`
- `src/components/dashboard/bos-engagement-row.tsx`
- `src/components/dashboard/bos-row-copy.ts` (verbatim row copy constants; supports node-environment Vitest)
- `src/components/dashboard/bos-pill-helpers.ts` (JSX-free pill state classifiers + aria-label builders; supports node-environment Vitest)

**Files rewritten**:
- `src/components/dashboard/accuracy-pill.tsx` (state-distinct visual treatments per §6.6)
- `src/components/dashboard/engagement-pill.tsx` (state-distinct visual treatments per §6.7)
- `src/components/dashboard/bos-card-client.tsx` (compose new 6-section vertical rhythm)
- `src/components/dashboard/bos-card-empty-state.tsx` (mirrors the new vertical rhythm with placeholder gauge)
- `src/components/dashboard/bos-card-skeleton.tsx` (mirrors the new 6-section vertical rhythm with circular gauge placeholder)

**Files deleted**:
- `src/components/dashboard/bos-score-display.tsx` (superseded by `bos-score-gauge.tsx`)
- `src/components/dashboard/bos-accuracy-pills.tsx` (superseded by `bos-accuracy-row.tsx`)
- `src/components/dashboard/bos-engagement-pills.tsx` (superseded by `bos-engagement-row.tsx`)

**Files NOT touched** (still healthy after #162):
- `src/components/dashboard/bos-card.tsx`
- `src/components/dashboard/bos-card-error.tsx`
- `src/components/dashboard/bos-explanation.tsx`
- `src/hooks/use-bos-current.ts`
- `src/lib/scoring/pill-routes.ts`
- `src/lib/scoring/pill-icons.ts`
- `src/lib/scoring/types.ts`
- `src/app/api/bos/current/route.ts`
- `src/app/(app)/(consumer)/dashboard/page.tsx` (already mounts `<BOSCard />`)

---

## 10. Tests authored

All under `tests/dashboard/bos-card/`:

- `bos-score-gauge.test.ts` — color band classifier, label classifier, sentence case, geometry helper (15 assertions)
- `bos-accuracy-row.test.ts` — verbatim header/sentence locks, pill state matrix (3 states), aria-label composition per state
- `bos-engagement-row.test.ts` — verbatim header/sentence locks, pill state matrix (3 states), aria-label composition per state, velocity formatter
- `bos-static-explanation.test.ts` — locks the static teaching paragraph against drift; whitespace-normalized substring assertions
- `bos-card-marshall.test.ts` — standing Marshall scan (no em dashes / en dashes / emojis / "Vitality Score" reference) across all 12 BOS files

**91 assertions, all green** as of 2026-05-12 13:10 local.

Playwright spec authored at `tests/e2e/dashboard/bos-card-mobile-fit.spec.ts`:
- Mobile fit at 320 / 360 / 380 viewports (no horizontal scroll, all 9 pills present, gauge SVG square)
- Pill state visual differentiation for tier 1 users (CAQ complete + Labs/Genetics unlock)
- **Deferred**: skipped via `test.skip` until an authenticated test user fixture lands. The spec is syntactically valid and listed by `npx playwright test --list` (50 tests across viewports).

---

## 11. Mobile fit verification

Per #161e §6.7 + AC11: at 380px viewport with `grid-cols-3 gap-2` and card padding `p-5` (20px each side), pill cell width is approximately `(380 - 40 padding - 16 gap) / 3 = ~108px`. Pill content is sized to fit:

- Accuracy pills: 2 lines, `text-[11px]` font, label + state-icon + state-label (where state-label is `Complete` / `Unlock` / `Awaiting results`).
- Engagement pills: 2 lines, `text-[11px]` font, label + velocity-or-sub-label. Labels like "Body Tracker" (12 chars) fit comfortably.

All inner spans use `truncate` so worst-case overflow falls back to ellipsis rather than horizontal scroll.

The Playwright spec at §10 above will assert this empirically once the auth fixture lands.

---

## 12. Status

Phase 1 (recovery + findings): complete.
Phase 2 (corrective implementation): complete.
Authoring complete on branch `fix/bos-card-corrective`. Awaiting orchestrator to push branch, build Vercel preview, capture Gary screenshot sign-off, and merge to main.
