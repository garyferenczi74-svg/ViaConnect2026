# Prompt #161e — Legacy BOS Card Recovery Findings

**Author:** Michelangelo (via Claude Code session 2026-05-12)
**Status:** Discovery only. No code written. Awaiting Gary review per Section 6.1 Step 4 + Section 11.
**Purpose:** Recover the legacy Bio Optimization Score card from git history before any corrective rewrite. Section 6.1 of Prompt #161e mandates this as the first execution step.

---

## 1. Identification

| Item | Value |
|---|---|
| Legacy file | `viaconnect-web/src/components/dashboard/BioOptimizationGauge.tsx` |
| Total lines | 273 |
| Last existed in commit | parent of `5693f53` (i.e., commit immediately preceding the #162 merge) |
| Deleted by commit | `5693f53` "feat(dashboard): #162 Bio Optimization Score Card UI redesign (two-axis pill design)" |
| Deletion diff line in commit stat | `BioOptimizationGauge.tsx | 273 ---------------------` |

Recovery procedure used:
```
git log --all --oneline -- 'viaconnect-web/src/components/dashboard/*.tsx' | head -20
git show 5693f53 --stat
git show 5693f53^:viaconnect-web/src/components/dashboard/BioOptimizationGauge.tsx
```

---

## 2. What the legacy card HAD (and the #162 PR removed)

### 2.1 Circular gauge — 270 degree sweep, open at bottom

```ts
const size = 240;
const stroke = 14;
const radius = (size - stroke) / 2;
const center = size / 2;
const sweep = 270;                // 270deg arc, open at the bottom
const startAngle = 135;           // bottom-left start point
const circumference = 2 * Math.PI * radius;
const arcLength = (sweep / 360) * circumference;
const fillLength = (score / 100) * arcLength;
```

Two SVG `<circle>` strokes:
- Track ring at `stroke="rgba(255,255,255,0.06)"` with `strokeWidth={14}`, `strokeDasharray={arcLength + " " + circumference}`, `strokeLinecap="round"`
- Fill ring as `<motion.circle>` animating from `0 ${circumference}` to `${fillLength} ${circumference}` over 1.5 seconds with `ease: "easeOut"` and `delay: 0.2`, plus a `drop-shadow(0 0 12px {color}66)` glow

SVG container rotated `transform: rotate(135deg)` to place the gap at the bottom.

Geometry: outer diameter **240 pixels** (desktop and mobile per the legacy code; #161e Section 2.2 calls for 160px desktop, 120px mobile — confirm with Gary which sizing wins).

### 2.2 Score number — count-up animation

Custom `useCountUp(target, duration = 1500)` hook (NOT Framer Motion spring; ease-out cubic over 1500ms via `requestAnimationFrame`):

```ts
function useCountUp(target: number, duration = 1500): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}
```

Rendered centered inside the gauge with `text-5xl font-bold sm:text-6xl` colored by score band, with `/ 100` denominator in `text-sm text-white/40` below the number.

### 2.3 5-tier score color and label map

```ts
const colorForScore = (score: number): string => {
  if (score >= 91) return '#A855F7'; // Optimal     (purple)
  if (score >= 76) return '#22C55E'; // Excellent   (green)
  if (score >= 51) return '#2DA5A0'; // Good        (brand teal)
  if (score >= 26) return '#F59E0B'; // Building    (amber)
  return '#EF4444';                  // Needs Attention (red)
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

### 2.4 Side panel — eyebrow + headline + 3 info chips

Right column of a `md:grid-cols-[auto_1fr]` layout:

- Eyebrow: `text-[10px] font-semibold uppercase tracking-wider text-white/40` reading `"Bio Optimization Score"`
- Headline: `text-lg font-bold sm:text-xl` reading `"Your score is {Optimal|Excellent|Good|Building|Needs attention}"` with the status word colored by band
- Three info chips in a `grid-cols-1 sm:grid-cols-3` row:
  1. **Weekly delta** chip — `TrendingUp` / `TrendingDown` / `Minus` Lucide icon, sub-label `"vs last week"`, value `"+{weeklyDelta} pts"` or `"-{weeklyDelta} pts"` or `"0 pts"`
  2. **Tier** chip — `ShieldCheck` Lucide icon, sub-label `"Tier"`, value `"{tier} · {1.5x|2x|5x}"` showing tier name plus point multiplier
  3. **Confidence** chip — sub-label `"Confidence"`, value `"96%" | "86%" | "72%" | "—"` derived from `hasGenetics`/`hasLabs`/`hasCAQ` props

Chip styling: `rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5` with a 2-column inner flex.

### 2.5 Accuracy pills — VERY DIFFERENT from #162's accuracy pills

Three pills in a `flex flex-wrap gap-2` row. Critically, these had **state-distinct rendering already in legacy**:

```tsx
{/* CAQ (always treated as complete in legacy since the legacy card was only
    rendered when CAQ existed) */}
<span className="rounded-full border border-[#2DA5A0]/30 bg-[#2DA5A0]/15 px-3 py-1 text-xs font-medium text-[#2DA5A0]">
  CAQ: 72%
</span>

{/* Labs — completed vs unlocked */}
{hasLabs ? (
  <span className="rounded-full border border-[#2DA5A0]/30 bg-[#2DA5A0]/15 px-3 py-1 text-xs font-medium text-[#2DA5A0]">
    Labs: 86%
  </span>
) : (
  <Link
    href="/shop"
    title="Add lab work to unlock 86% confidence"
    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/40 transition-colors hover:border-white/20 hover:text-white/60"
  >
    Labs: 86% · unlock
  </Link>
);

{/* Genetics — completed vs unlocked, same pattern */}
{hasGenetics ? (
  <span className="...teal-tinted...">Genetics: 96%</span>
) : (
  <Link href="/shop" title="Complete your genetic testing to unlock 96% confidence" className="...low-opacity...">
    Genetics: 96% · unlock
  </Link>
);
```

Key observations:
- **Completed state:** teal-tinted background, teal border, teal text, no icon, no "unlock" verb
- **Locked state:** low-opacity background, white-10% border, white-40% text, "unlock" verb appended after a middle dot `·` (U+00B7)
- **Pill shape:** `rounded-full` (full pill, not the `rounded-xl` square-ish chip used in #162)
- **Pill content:** just `"{Name}: {pct}%"` plus optional `· unlock` verb. No icon. No two-line layout.
- **Link target:** `/shop` for both Labs and Genetics unlock pills (because the unlock IS a purchase). Title attribute carries the explanatory tooltip text.

The state differentiation Gary expects in #161e was ALREADY in the legacy card. The #162 PR collapsed it.

### 2.6 5-dot data-completeness indicator (Prompt #66)

```tsx
{trackedDimensions && (
  <div className="flex items-center gap-1.5">
    {(['sleep', 'activity', 'stress', 'recovery', 'hrv'] as const).map((dim) => (
      <div
        key={dim}
        title={dim}
        className={`h-2 w-2 rounded-full transition-colors duration-300 ${
          trackedDimensions[dim] ? 'bg-[#2DA5A0]' : 'bg-white/15'
        }`}
      />
    ))}
    <span className="ml-1 text-[11px] text-white/40">
      {Object.values(trackedDimensions).filter(Boolean).length} / 5 tracked
    </span>
  </div>
)}
```

This is a Prompt #66 carry-over: five 2x2 px dots showing which of the five daily-score dimensions (sleep, activity, stress, recovery, hrv) have data today. The #162 PR removed this entirely. Not mentioned in #161e Section 2.1's six-section list; flag for Gary whether to restore.

### 2.7 Card container styling

```
relative overflow-hidden rounded-3xl border border-white/10
  bg-gradient-to-br from-[#1E3054]/60 via-[#1A2744]/60 to-[#141E33]/60
  backdrop-blur-md p-5 sm:p-6 md:p-8
```

Plus a soft-glow background div `absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-20 blur-3xl` whose background color matches the score band.

`<section>` wrapper, no explicit `aria-label` in legacy (the #162 implementation added `aria-label="Bio Optimization Score"` which is an improvement worth preserving).

---

## 3. What the legacy card DID NOT have

The legacy card was a HERO GAUGE card, more compact than #161e's six-section spec. The legacy card lacked:

1. **Static explanatory teaching copy.** Section 2.3 of #161e calls for two-to-three teaching sentences. The legacy card had NO teaching copy — only the eyebrow + headline + chips + pills. **The teaching copy is a NEW requirement in #161e, not a preserved element.** Therefore Hannah drafts the copy per #161e Section 2.3.
2. **Hannah's dynamic explanation panel.** The legacy card had no per-compute Hannah text. The #162 PR introduced this via `BOSExplanation`. **Preserved from #162.**
3. **Engagement pill row.** The legacy card had no engagement levers. Only the three accuracy pills (CAQ / Labs / Genetics). The #162 PR introduced the six engagement pills (nutrition / supplements / body / wearables / plug-ins / Helix Challenges). **Preserved from #162.**
4. **"Improved Accuracy" descriptive header + sentence.** Section 5 of #161e Section 2.1. The legacy used a 10px uppercase eyebrow `"Bio Optimization Score"` for the whole card; it did not differentiate an accuracy section header. **NEW requirement.**
5. **"How can I improve my score?" header + sentence.** Section 6 of #161e Section 2.1. Did not exist in legacy. **NEW requirement.**

---

## 4. What #162 broke (the failures #161e exists to correct)

| # | Failure | Legacy state | #162 state |
|---|---|---|---|
| F1 | Circular gauge removed | 270deg sweep, 240px, animated arc with glow | Flat `{score} / 100` text in `bos-score-display.tsx` |
| F2 | Static teaching copy missing | Did not exist in legacy either; #161e adds it | Did not exist in #162 either; #161e adds it |
| F3 | Pill descriptive text missing | Did not exist; #161e adds it | Only an `"Accuracy"` and `"Engagement"` 10px eyebrow |
| F4 | Pill state collapsed | Already differentiated in legacy (completed teal vs locked low-opacity) | All pills render identically via `accuracy-pill.tsx` + `engagement-pill.tsx` |
| F5 | Mobile clipping at 380px | Legacy was a 1-column card with 3 short pills, didn't clip | #162 9-pill grid clips at 380px |

Plus two preservation items from legacy that #162 dropped and #161e did NOT explicitly require — but that Gary may want back:

- **5-tier color band (purple/green/teal/amber/red) with band-keyed status label.** Currently #162 uses a fixed teal color regardless of score. The dashboard's Daily Scores gauges below this card may or may not use band coloring; verify with Gary whether to restore band coloring on the BOS gauge.
- **5-dot data-completeness indicator (Prompt #66).** Trivial reinstatement if Gary wants it back; otherwise drop it permanently and update this finding.

---

## 5. What #162 added that #161e Section 0 decision 1 says to PRESERVE (upgrade not redesign)

Per the prompt's framing, the corrective rewrite is an UPGRADE that preserves everything #162 did well. Carry-forward from #162:

| Element | Source |
|---|---|
| SWR-style hook `useBOSCurrent` polling `/api/bos/current` every 60s | `src/hooks/use-bos-current.ts` |
| Read API response shape with `accuracy_pills[*].state`, `engagement_pills[*].state`, `velocity_pct` etc. | `src/lib/scoring/types.ts` |
| Pill route map | `src/lib/scoring/pill-routes.ts` |
| Pill icon map | `src/lib/scoring/pill-icons.ts` |
| State branches: skeleton / error / empty / populated | `bos-card-skeleton.tsx`, `bos-card-error.tsx`, `bos-card-empty-state.tsx` |
| Hannah's dynamic explanation panel | `bos-explanation.tsx` |
| `aria-label="Bio Optimization Score"` on the `<section>` wrapper | `bos-card-client.tsx:36` |
| The composition pattern: client island consumes the hook, presentational subs render branches | `bos-card-client.tsx` overall shape |
| Engagement pills with per-day velocity from `engagement_pills[*].velocity_pct` | `engagement-pill.tsx` |

The corrective work touches the visual rendering of these subcomponents but does NOT change the data flow or API contract.

---

## 6. Open questions for Gary BEFORE any code is written

These need answers in the finding-report review per Section 6.1 Step 4 + Section 11:

1. **Gauge geometry.** Legacy uses 240px diameter with 270deg sweep open at bottom. #161e Section 2.2 calls for 160px desktop / 120px mobile, full 360deg ring. Which sizing wins? My recommendation: **match the Daily Scores gauges that sit below this card on the same dashboard.** Whatever those use is the answer. Section 8.3 of #161e flags this as a pre-flight check; I haven't run it yet because I'd need to read the Daily Scores gauge component, which is out of scope for legacy-recovery discovery.
2. **Gauge sweep direction.** Legacy is 270deg open-at-bottom. #161e Section 2.2 example code shows full 360deg ring. Which?
3. **Score number color.** Legacy colors by 5-tier band. #161e Section 2.2 shows fixed teal. Which?
4. **Status label ("OPTIMAL" / "EXCELLENT" / "GOOD" / "BUILDING" / "NEEDS ATTENTION").** Restore from legacy, or omit?
5. **5-dot data-completeness indicator (Prompt #66 carry-over).** Restore, or drop permanently?
6. **Headline copy.** Legacy headline: `"Your score is Good"` (etc.) with status word colored by band. #161e Section 2.1 doesn't specify a headline beyond the static teaching copy + Hannah panel. Restore the band-colored headline, or omit?
7. **Teaching copy text.** Section 2.3 of #161e drafts placeholder text: `"Your Bio Optimization Score is a measure of how well your daily choices align with what your biology needs. The score is built from a baseline derived from your assessment, then refined as you log nutrition, sync wearables, and engage with your wellness plan."` Approve as-is, edit, or rewrite?
8. **Pill shape — `rounded-full` (legacy) vs `rounded-xl` (#162).** Legacy used full pill chips; #162 uses rounded-square chips with multi-line content (icon + label + accuracy% + state label). Which shape wins?
9. **Accuracy pill — single-line vs multi-line.** Legacy: `"Labs: 86% · unlock"` on one line. #162: icon + label + accuracy% + state-label, four-line stack. #161e Section 6.6 mandates the multi-line stack with state-distinct icons. Confirm this is wanted, given the legacy was simpler.

I will not write any new code until these are answered.

---

## 7. Pre-flight checks NOT yet run (Section 8.x of #161e)

Section 8 of #161e lists pre-flight checks. I ran the legacy recovery (8.1). I have NOT run:

- **8.2 — Read API state verification.** Verify `/api/bos/current` returns correctly-populated `accuracy_pills[*].state` and `engagement_pills[*].state` for users at each tier. Requires test users; backend bug risk.
- **8.3 — Daily Scores gauge geometry capture.** Open dashboard, capture diameter/stroke of the Daily Scores gauges. Recommend running after Q1 in Section 6 above is settled.
- **8.4 — Data-fetching primitive verification.** I noted that `bos-card-client.tsx` uses `useBOSCurrent` which calls `refetch` (TanStack Query pattern) not `mutate` (SWR pattern). The #162 PR docs at `docs/components/bos-card.md` may misstate the primitive. Worth a spot-check when implementation begins.
- **8.5 — Lucide icon availability.** All of `Check`, `Lock`, `Clock`, `ArrowUpRight` are common Lucide exports; spot-check during implementation but no risk anticipated.

---

## 8. Files in current main (after #162) that #161e will need to touch

From `git show 5693f53 --stat`:

**New (from #162, to be rewritten or composed differently):**
- `viaconnect-web/src/components/dashboard/accuracy-pill.tsx` (rewrite for state distinction)
- `viaconnect-web/src/components/dashboard/bos-accuracy-pills.tsx` (likely replaced by `bos-accuracy-row.tsx` per #161e)
- `viaconnect-web/src/components/dashboard/bos-card-client.tsx` (rewrite composition order)
- `viaconnect-web/src/components/dashboard/bos-card-empty-state.tsx` (verify still renders correctly)
- `viaconnect-web/src/components/dashboard/bos-card-error.tsx` (no change anticipated)
- `viaconnect-web/src/components/dashboard/bos-card-skeleton.tsx` (rewrite for new vertical rhythm)
- `viaconnect-web/src/components/dashboard/bos-card.tsx` (compose new subs)
- `viaconnect-web/src/components/dashboard/bos-engagement-pills.tsx` (likely replaced by `bos-engagement-row.tsx`)
- `viaconnect-web/src/components/dashboard/bos-explanation.tsx` (preserve, add "From Hannah" label)
- `viaconnect-web/src/components/dashboard/bos-score-display.tsx` (DELETE — replaced by `bos-score-gauge.tsx`)
- `viaconnect-web/src/components/dashboard/engagement-pill.tsx` (rewrite for state distinction)
- `viaconnect-web/src/hooks/use-bos-current.ts` (no change)
- `viaconnect-web/src/lib/scoring/pill-icons.ts` (no change)
- `viaconnect-web/src/lib/scoring/pill-routes.ts` (no change)

**New (to be created by #161e):**
- `viaconnect-web/src/components/dashboard/bos-score-gauge.tsx`
- `viaconnect-web/src/components/dashboard/bos-static-explanation.tsx`
- `viaconnect-web/src/components/dashboard/bos-accuracy-row.tsx`
- `viaconnect-web/src/components/dashboard/bos-engagement-row.tsx`
- Tests: `bos-score-gauge.test.tsx`, `bos-accuracy-row.test.tsx`, `bos-engagement-row.test.tsx`
- E2E: `e2e/bos-card-states.spec.ts`, `e2e/bos-card-mobile-fit.spec.ts`
- Docs update: `docs/components/bos-card.md`

The legacy `BioOptimizationGauge.tsx` file does NOT need to be restored as a file. Its content (gauge logic, count-up hook, color/label maps, headline) gets distributed into the new subcomponents.

---

## 9. Screenshot

**NOT CAPTURED.** Capturing a screenshot of the legacy card requires running the dev server against the pre-`5693f53` commit, which requires interactive shell + browser access I do not have from this session. Gary or Michelangelo will need to:

```
git checkout 5693f53^ -- viaconnect-web/src/components/dashboard/BioOptimizationGauge.tsx
# add a temporary mount on the dashboard, or render a Storybook story
pnpm dev
# screenshot at 380, 768, 1280
git restore viaconnect-web/src/components/dashboard/BioOptimizationGauge.tsx
```

Or simply review the recovered source above and approve from the static code listing.

---

## 10. Recommendation to Gary

1. Read Section 6 (open questions) above. Answer Q1-Q9 in the PR comment thread or directly in this file.
2. Approve or amend the teaching copy text in Q7.
3. Confirm: full-PR scope is the corrective rewrite per #161e Section 2.1's six-section structure, plus any legacy preservation items from Sections 4 and 6 above that you say `restore`.
4. Once these are settled, give Michelangelo the green light to start writing code per Section 6 of #161e. Not before.

The reconstruction is complete. No new code has been written. Working tree is clean (no staged changes from this discovery pass).

---

## 11. APPENDIX — Phase 1 closure for the 2026-05-12 dispatch (corrective rewrite)

A subsequent dispatch on 2026-05-12 instructs Michelangelo to proceed past Section 6's open-questions gate and author Phase 2 directly, with the spec providing verbatim text and structure. The orchestrator owns the post-author screenshot sign-off via Vercel preview on the feature branch `fix/bos-card-corrective`. Decisions taken to close Q1 through Q9 for this dispatch:

| Q | Decision for this dispatch | Rationale |
|---|---|---|
| Q1 (gauge diameter) | 160px desktop, 120px mobile via `size` prop; matches the `DailyScoreGauge.tsx` family on the same dashboard | Section 5 pre-flight finding from orchestrator: mirror DailyScoreGauge geometry; this keeps the BOS gauge consistent with the per-metric gauges sitting below |
| Q2 (sweep direction) | 270deg sweep open at bottom, rotation 135deg | Legacy pattern; matches DailyScoreGauge / DailyMetricGauge |
| Q3 (score number color) | Color by 5-tier band (purple / green / teal / amber / red), matching legacy `colorForScore` | Restores legacy band coloring that #162 dropped; aligns with all other dashboard gauges |
| Q4 (status label) | OPTIMAL / EXCELLENT / GOOD / BUILDING / NEEDS ATTENTION, colored by band, rendered as a tracking-[0.18em] uppercase strip below the gauge | Legacy pattern preserved per §0 "upgrade not redesign" |
| Q5 (5-dot completeness) | Not restored in this corrective rewrite | The six-engagement-pill row is now the canonical completeness surface; the 5-dot widget would duplicate it |
| Q6 (headline copy) | Restored: eyebrow "Bio Optimization Score" + headline "Your score is X" with band-colored status word | Legacy pattern preserved |
| Q7 (teaching copy) | Hannah-voice draft authored fresh (legacy had no such copy); see scratch findings above for exact paragraph | #161e §6.3 contingency |
| Q8 (pill shape) | `rounded-full` chips per spec §6.6 + §6.7 (not square) | Legacy used full pills; #161e spec §6.6 keeps full pills |
| Q9 (pill multi-line) | Per #161e spec §6.6/§6.7 (icon + label + state-distinct visual) | Spec is explicit |

These decisions are reflected in the Phase 2 code that follows on branch `fix/bos-card-corrective`. They are subject to override by Gary during the Vercel-preview screenshot sign-off.

### Pre-render Marshall scan over recovered legacy

Re-running the dash + emoji scan over `scratch/161e/legacy-bos-card-recovered.tsx`:
- em-dashes (U+2014): 3 occurrences
  - Line 3: code comment, not user-facing
  - Line 80: code comment, not user-facing
  - Line 213: user-facing placeholder `'—'` rendered when CAQ/Labs/Genetics all absent
- en-dashes (U+2013): 0
- emojis: 0

Normalization for the rebuild: the user-facing `'—'` placeholder on legacy line 213 is replaced by `'--'` (two ASCII hyphens). Code-comment em-dashes are not reproduced.

### Static explanation copy (Hannah-voice draft)

The legacy card carried NO static teaching paragraph; only data chips and an embedded `Link`-bearing pill row. Therefore `BOSStaticExplanation` ships fresh Hannah-voice copy per #161e §2.3 + §6.3:

> Your Bio Optimization Score blends two signals: how accurate your diagnostic foundation is, and how consistently you engage the daily levers. As your foundation moves from CAQ to Labs to Genetics, the score grows more precise. As you log meals, supplements, body measurements, wearable data, plug ins, and challenges, the score moves with you.

Zero em-dashes, zero en-dashes, zero emojis. Hannah register: clinical-but-friendly, no therapeutic claims, no disease names. The dynamic `BOSExplanation` ("From Hannah" panel) carries the per-user, per-compute narrative; this static block carries the evergreen "what the score is" teaching.

### Phase 1 status

Recovery: complete. Findings: written. Decisions Q1–Q9: settled for this dispatch. Phase 2 authoring proceeds.

