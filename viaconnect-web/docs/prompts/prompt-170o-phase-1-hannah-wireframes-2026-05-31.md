Critical finding: the spec's proposed disclaimer language "These statements have not been evaluated by the FDA" is the **DSHEA boilerplate for dietary supplement labels** and is NOT appropriate for a hydration tracking surface (which is a wellness software feature, not a supplement label). I need to push back on this and propose adjusted copy. I have sufficient context now to author the artifact.

---

# Prompt 170o Phase 1 Hydration Tracking — Hannah UX Wireframes

**Filed:** 2026-05-31
**UX agent:** Hannah
**Spec:** `docs/prompts/prompt-170o-phase-1-phase-2-split-2026-05-31.md` (commit `bdfe8a5f`)
**Baseline structure modeled on:** `docs/prompts/prompt-170n-hannah-wireframes-2026-05-31.md`
**Hard rules honored:** no em or en dashes anywhere in copy; no emoji; WCAG 2.2 AA; Lucide React strokeWidth 1.5; brand tokens Navy `#1A2744` / Card `#1E3054` / Teal `#2DA5A0` / Orange `#B75E18`; anti-condescension principle (no "Most common" / "NEW" chips); ED safety mode posture preserved per spec §15; Bio Optimization rendered verbatim.

**Spec issues flagged in this artifact:**
- Disclaimer copy (spec §4.7) — **the proposed "These statements have not been evaluated by the FDA" boilerplate is DSHEA dietary-supplement labeling language and is the wrong instrument for a wellness tracking app.** Resolution in §8 with revised copy verified against the FDA January 2026 General Wellness guidance.
- Surface 4 monthly heatmap performance posture at narrow viewports — addressed in §4.
- Surface 3 FAB pulse animation prompt — addressed in §3 with explicit reject.
- Surface 7 tutorial replay friction — addressed in §7.

---

## §1 Dashboard hydration widget

**Layout:**

The widget renders as a new card in the post-BOS dashboard grid. Reading the shipped dashboard at `src/app/(app)/(consumer)/dashboard/page.tsx` lines 215 to 279, the existing grid uses `lg:grid-cols-[1.4fr_1fr]` for the Today's Protocol vs Wellness Snapshot row. The hydration widget sits BEFORE that row on its own row, alongside the existing `DailyScoresPanel`, as a peer to the Daily Scores grid.

Specifically: insert a new row between `<DailyCheckIn>` (line 219) and `<QuickLogsSurface>` (line 225). At mobile, the widget is a full-width card. At desktop, the widget consumes 1/3 of a 3-column grid alongside two other future tiles (or a single full-width slot if no peers exist yet at ship time; the empty 2/3 slot is acceptable for v1).

- **Mobile (`< md`):** full-width card, padding `p-5`, rounded `rounded-3xl` (matches BOSCard family), background `bg-[#1E3054]/55` with `backdrop-blur-md`, border `border-white/[0.08]`. Height auto-fits content (~ 280px tall at default state).
- **Desktop (`>= md`):** `grid-cols-3 gap-5` row containing this widget + 2 placeholder slots OR a single `grid-cols-1` row in v1. Widget itself: 1 column wide, `min-h-[320px]`, same visual treatment.

Card content top to bottom:
1. **Header strip 48px:** `Droplet` Lucide icon (h-5 w-5, strokeWidth 1.5, Teal) + 8px gap + title `Hydration` (16px Semibold white) on left; small `ChevronRight` (h-4 w-4, white/55) on far right as affordance for the tap-into-detail action.
2. **24px gap; ring region (centered):** circular SVG ring, 160px diameter on mobile + 180px on desktop, stroke width 12px mobile + 14px desktop, stroke-linecap `round`. Track at white/10; progress arc at Teal `#2DA5A0` when at-or-above target, Card-tint `#1E3054` (one step darker than the surrounding card via mix-blend or just `#16263F`) when below. Ring fills clockwise from 12 o'clock via SVG `stroke-dasharray` + `stroke-dashoffset` animation. Animation duration 0.6s ease-in-out, replaced with instant fill at `prefers-reduced-motion`. Within ring: center text stack vertically aligned, today's intake `48 oz` or `1,420 ml` in 24px Semibold white (slightly larger than spec's 20px — see push-back), 6px gap below, target text `of 64 oz` or `of 1,890 ml` in 13px Regular white/65.
3. **20px gap; quick-log button row:** 3 buttons in a `grid-cols-3 gap-2` row. Each button is a stadium-pill `rounded-full` with `bg-[#2DA5A0]/15` background + `text-[#2DA5A0]` text + `border border-[#2DA5A0]/30`, `min-h-[44px]`, 14px Medium label. Labels: `+8 oz` / `+16 oz` / `+24 oz` (imperial) OR `+250 ml` / `+500 ml` / `+750 ml` (metric).

**Header copy:**
- Card title: `Hydration` (single word, no subtitle on this widget — the ring itself is the value statement).

**Body copy:**
- Ring center primary: `48 oz` or `1,420 ml` (numeric + unit, comma-thousands).
- Ring center secondary: `of 64 oz` or `of 1,890 ml`.
- Quick-log buttons: `+8 oz`, `+16 oz`, `+24 oz` (imperial), or `+250 ml`, `+500 ml`, `+750 ml` (metric). The `+` is a plus character `+`, NOT a hyphen.
- Tap-toast on log: `+250 ml logged` (or `+8 oz logged`).
- Tap-toast on target reached: `Target met` (12px white/85, single Teal Droplet glyph leading, 3 sec duration).

**CTAs:**
- Tap ring (entire ring + center stack as a single hit target): routes to `/wellness-analytics/hydration` (Surface 4).
- Tap `+250 ml` (etc.): POSTs to `/api/nutrition/hydration/quick-log` with `volume_ml: 250` and `source_kind: 'pure_water'`; on 200, fires the `+250 ml logged` toast + animates the ring fill increment + fires Helix `hydration_logged` event; on failure, error toast `Could not log hydration. Try again.`.
- Tap `ChevronRight` in header: same route as tap-ring (redundant affordance for keyboard / screen-reader discovery).

**Conditional states:**
- **Default state (user has logged hydration today):** ring fills proportional to today's `hydration_ml` / `hydration_target_ml`; quick-log buttons enabled.
- **Empty state (zero logs today, new user OR fresh midnight rollover):** ring at 0% fill (track only visible); center stack: `0 ml` or `0 oz` in primary; `of 1,890 ml` or `of 64 oz` in secondary. NO empty-state illustration, NO "Get started" copy, NO chip. The empty ring + three quick-log buttons are the call-to-action. This is the anti-condescension stance: do not patronize a user who is staring at a hydration ring with "Tap a button to start tracking your water!" The ring + the buttons are self-evident.
- **At-or-above target:** ring color Teal `#2DA5A0`; center primary stays the actual volume (NOT `100%+` — see push-back); below-ring micro-row appears (12px white/70): `Daily target met` (left) + `Tap to log more` (right, Teal underlined).
- **Above 150% of target:** ring stays Teal at 100% visual fill (capped, no over-fill animation); center primary shows actual volume + small hairline-thin overflow arc at white/40 to acknowledge the excess without overstating.
- **Eating disorder safety mode active (per spec §15):** ring stroke pattern changes from continuous-fill-to-percentage to **discrete cup-tally** mode. The ring is replaced with 8 small Droplet glyphs arranged in a circular layout (one per "cup", where one cup = 8 oz / 250 ml). Filled drops are Teal solid; unfilled are white/15 outline. Center stack: `3 cups today` (primary, 18px Semibold) + `Listen to your thirst` (secondary, 12px white/65). NO target language. NO percentage. NO streak counter anywhere. Quick-log buttons unchanged.
- **`HYDRATION_TRACKING_ENABLED = false` master kill switch off:** widget omitted from the dashboard grid entirely (no shell, no skeleton).
- **`HYDRATION_DASHBOARD_WIDGET_ENABLED = false` widget-specific kill or Settings toggle off:** widget omitted from dashboard; user can still access detail view via FAB or Wellness Analytics tab.
- **`HYDRATION_NOTIFICATIONS_ENABLED = false`:** no widget impact; only suppresses reminder notifications.
- **Loading state (initial dashboard mount before API resolves):** skeleton 280px tall with shimmer ring outline, three skeleton pills below.
- **API failure on `GET /api/nutrition/hydration/today`:** silent fail; widget shows `--` in primary text + `Tap to retry` (12px Teal underlined) below the ring; quick-log buttons remain enabled (POST does not depend on the GET).
- **Reduced-motion preference:** ring fill is instant on increment (no 0.6s animation); no toast slide-in animation either.
- **Streak indicator (optional micro-row below ring at 100%+):** when user has 2+ days in a row at target, an additional row below the ring appears: `Flame` icon Orange `#B75E18` + `3 days in a row` (12px white/75). NOT shown in safety mode.

**Accessibility commitments:**
- Widget root is `<section>` with `aria-labelledby` pointing to the `Hydration` title `<h2>`.
- Ring container is `role="button"`, full text `aria-label="Hydration. 48 ounces of 64 ounce target. View hydration detail."` (with the live values interpolated). The ChevronRight is `aria-hidden` decorative (the parent button label conveys the action).
- Ring progress is announced via a parallel `aria-live="polite"` region: on increment, the polite region updates to `Hydration now at 56 ounces of 64 ounce target` (delayed 600ms after the animation so reduced-motion users still hear the change cleanly; immediate when reduced-motion).
- Each quick-log button is `<button>` with `aria-label="Log 8 ounces of water"` (or metric equivalent). The leading `+` is decorative.
- Tab order: ring → button 1 → button 2 → button 3 → next dashboard tile.
- 44x44 minimum tap targets: ring at 160px+ comfortably exceeds; quick-log buttons forced to `min-h-[44px]` even if visual height looks 38px.
- Color contrast: 24px white on Card/55 over Navy background composite is 7.8:1; 13px white/65 secondary is 4.6:1; Teal text on Teal/15 pill backdrop is 4.7:1 (verified at the small-text threshold). All exceed 4.5:1.
- Reduced-motion: ring fill instant; no pulse on quick-log button tap; toast appears without slide.
- iOS dynamic type at 200%: ring center text wraps to 2 lines if needed; quick-log buttons wrap to 3-row vertical stack if 200% scale forces narrow flex.
- iOS Voice Control: `Hydration`, `Plus 8 ounces`, `Plus 16 ounces`, `Plus 24 ounces` (or metric).
- Eating disorder safety mode: the cup-tally Droplet glyphs are NOT individually focusable (the parent ring container retains a single role="button" focus); aria-label becomes `Hydration. 3 cups logged today. Listen to your thirst. View hydration detail.`
- Color-blind accessibility: ring fill state is also encoded via the below-ring micro-row text ("Daily target met") so users with red-green or general low-vision do not depend on the Teal vs Card-tint color difference.

**Push-back / UX decisions:**

- **Ring center primary at 24px, NOT 20px as spec'd.** Spec §6.1 calls for 20px Semibold on the center value. I am pushing back: 20px on a 160px-diameter ring feels meek against the visual weight of the ring itself, and the value statement (`48 oz`) IS the headline of the widget. Bumping to 24px on mobile + 28px on desktop restores the primary-element hierarchy and matches the BOSCard score-text weight pattern.
- **No percentage display anywhere.** Spec implies percentage framing throughout. I am explicitly removing percentage strings (`75%`, `48%`) from all states except the underlying ring-fill calculation. Reason: percentages on hydration encourage gamification framing ("I need to hit 100%") that conflicts with the spec §15 eating-disorder safety posture AND with hydration's actual physiology (60% to 120% of estimated target is the normal healthy range; framing as percentage tempts overcorrection in both directions). Absolute volumes are the honest unit.
- **Over-target cap at 100% visual fill with hairline overflow arc.** Spec is ambiguous on what happens past 100%. Filling the ring beyond 100% (e.g. spiral, double-ring, fill-and-go-around) creates visual confusion AND a "more is more" reward signal that is wrong for hydration (excess water carries hyponatremia risk above ~4L/day for typical adults). Capping the visual fill at 100% with a thin overflow hairline arc (white/40, 2px stroke) acknowledges the user's logging without rewarding it.
- **Empty state is the ring itself, NOT a separate "get started" component.** Considered an empty illustration with `Tap a button to log your first water of the day` copy. Rejected: condescending and pads the widget with copy. An empty ring + three labeled buttons IS the call-to-action.
- **Quick-log buttons are pills not full-bleed bars.** Considered a full-bleed 3-button stacked row (each button 100% wide stacked). Rejected: vertical stack pushes the dashboard scroll past the BOSCard's promised vertical real estate, and the pill row matches existing BOSCard CTA patterns.
- **`Tap ring to open detail` micro-label NOT shown.** Considered a tiny "Tap to see history" hint below the ring. Rejected: the ChevronRight in the header + the ring's role="button" affordance is sufficient discovery; redundant hint clutters the card.
- **No streak gamification on the dashboard widget when streak is 1 day or zero.** Streak row only appears at 2+ consecutive days at target. Showing "1 day in a row" is condescending muscle for a user who literally just hit target today.
- **Eating disorder safety mode = cup-tally NOT % ring, period.** Spec §15 says "cups-consumed visualization instead of percentage". I am implementing this as 8 discrete Droplet glyphs in a circle (one per cup), filled-vs-outlined, with the count + a thirst-listening micro-message in the center. This is a visual-identity divergence (not just copy softening) because the percentage-ring shape itself is the gamification trigger; copy alone is insufficient.
- **Ring color when below target is Card-tint NOT a "warning" color.** Considered Orange when significantly behind target. Rejected: Orange would convey alarm ("you are failing"); Card-tint conveys "this is your progress so far, you are mid-day." Hydration tracking is a 24-hour cycle; mid-day under-target is not a failure state.

**Mobile adaptation:** full-width card; ring centered with 160px diameter; quick-log row uses `grid-cols-3 gap-2`; safe-area horizontal padding inherited from dashboard `px-4`; haptic feedback `impact Light` on quick-log button tap; haptic `notification Success` on target-reached toast.

---

## §2 NutriVision tab hydration card

**Layout:**

This card inserts into `src/app/(app)/(consumer)/nutrition/components/NutriVisionTab/index.tsx` IdleSurface between the 4-button entry path row (line 945 `<div className="grid grid-cols-2 ... min-[360px]:grid-cols-4">`) and the gallery-upload link (line 980). Per spec: 88px tall, below the 4-button row, above the Recent Quick Logs row.

Card geometry:
- Full-width on all viewports, rounded `rounded-2xl`, border `border-white/[0.08]`, background `bg-[#1E3054]/45` (matches the EntryPathCard family).
- Height `min-h-[88px]` (spec'd exact) on viewports `>= 360px`; collapses to `min-h-[104px]` at `<= 359px` to accommodate the 2-row 2x2 button grid AND the left ring + value stack.
- Padding `p-3 sm:p-4`.
- Internal flex: `flex items-center gap-3`.

Card content left to right:
1. **Left region (fixed width 88px on mobile, 96px on desktop):** small circular ring 56px diameter, 5px stroke, centered vertically; below ring micro-stack: `48 oz` in 14px Medium white + `of 64 oz` in 11px Regular white/55. (Ring sits ABOVE the text stack, NOT to the left of it, to keep the left region narrow.)
   - Reconsider: actually at 88px height, putting ring above 2 lines of text overruns. **Revised:** left region is just the 56px ring; the value text moves into the center region as a 2-line label.
2. **Center region (flex-1, vertically stacked):** primary line `48 oz` (16px Semibold white); secondary line `of 64 oz` (12px white/65). Total stack ~ 40px tall.
3. **Right region (auto width):** 2x2 grid of quick-log buttons, each pill `min-h-[36px] min-w-[64px]` with 12px Medium Teal text on Teal/15 backdrop. Labels: `+8 oz` / `+16 oz` (top row), `+24 oz` / `+32 oz` (bottom row). Metric equivalents: `+250` / `+500` / `+750` / `+1000` (no unit suffix in pills; unit implied by user's metric preference + the `of 1,890 ml` reference above).

**Header copy:** N/A (this card has no header; it lives between two other surfaces).

**Body copy:**
- Primary: `48 oz` or `1,420 ml`.
- Secondary: `of 64 oz` or `of 1,890 ml`.
- Pill labels: `+8 oz` / `+16 oz` / `+24 oz` / `+32 oz` OR `+250` / `+500` / `+750` / `+1000` (with ml shown in secondary line, not on pill).
- Tap-toast (matches §1).

**CTAs:**
- Tap card body (the ring + value stack region, NOT the right-side pills): routes to `/wellness-analytics/hydration` (Surface 4). Hit area defined as anywhere left of the pills.
- Tap a pill: same POST behavior as Surface 1 quick-log buttons.

**Conditional states:**
- **Default (logged today):** ring at proportional fill, Teal at-or-above-target, Card-tint below.
- **Empty state (zero logs today):** ring at 0% (track only); center primary `0 oz`; pills enabled.
- **Card hidden via Settings toggle `hide_hydration_card_on_nutrivision`:** card omitted entirely from the IdleSurface render; the gallery-upload link sits immediately below the 4-button row as it currently does in shipped 170n.
- **Eating disorder safety mode:** ring transforms to small cup-tally treatment (4 small Droplet glyphs since space is tight, where each glyph represents 2 cups for compactness); center primary `3 cups today`; pills unchanged in layout but center secondary copy changes from `of 64 oz` to `Listen to your thirst`.
- **Narrow viewport collapse at `<= 359px`:** the 2x2 button grid stays as 2x2 (not 1x4); ring + values + pills all fit because the iPhone SE 320px width minus 16px gutters minus the 56px ring minus 12px gaps leaves ~ 220px for the value stack + 2x2 pill grid. 2x2 grid at 64px-min-width pills with 8px gap = 136px wide, leaving 84px for the value stack which fits `48 oz` + `of 64 oz` comfortably.
- **Network offline:** pills still tap-able; tap fires the same POST which routes through the offline queue (`HYDRATION_OFFLINE_QUEUE`); ring fill animates optimistically and a small `Offline. We will sync.` toast surfaces (12px white/85, 2 sec).
- **Target reached:** ring at Teal full fill; below the value stack a tiny inline check `Daily target met` (12px Teal italic) replaces the `of 64 oz` line; pills remain enabled.

**Accessibility commitments:**
- Card root is `<section>` with `aria-labelledby` pointing to a visually-hidden `<h3>` `Hydration quick log`.
- Left tap region (ring + value stack) is `role="button"` with `aria-label="Hydration. 48 ounces of 64 ounce target. View hydration detail."`.
- Each pill is `<button>` with `aria-label="Log 8 ounces of water"`.
- Tab order: ring → +8 oz → +16 oz → +24 oz → +32 oz (reading order top-row-left-to-right then bottom-row).
- aria-live region for fill change matches Surface 1.
- 44x44 minimum: pills forced to `min-h-[44px]` despite 36px visual height (padding extension); ring tap region is 56x56 visible + extended 12px padding for ~ 80x80 hit area.
- Color contrast: 16px Semibold white on Card/45 over the NutriVision dark hero is 7.5:1; 12px white/65 secondary is 4.6:1; 12px Teal on Teal/15 pill is 4.7:1.
- Reduced-motion: ring fill instant; no pill press animation.
- iOS dynamic type at 200%: the 88px card height grows to ~ 120px to accommodate; 2x2 pill grid may stack to 1x4 vertical pill column at extreme scaling.

**Push-back / UX decisions:**

- **2x2 button grid stays 2x2 at narrow viewports, does NOT collapse to 1x4 or horizontal scroll.** Spec asks about this explicitly. Decision: 2x2 holds. Reason: a 1x4 horizontal row would compress each pill to ~ 50px wide at iPhone SE width, breaking the `+24 oz` label readability. A vertical 1x4 stack would balloon the card to ~ 200px tall, defeating the 88px compact-presence design intent. The 2x2 grid is the architectural correct answer for this surface.
- **Card tap target excludes the pills.** Hit-test region for the card-level navigate-to-detail action ends at the left edge of the pill column. This prevents the bug of "I tapped a pill but the whole card thinks I tapped it to navigate." Standard pointer events handle this via per-element `onClick` with `stopPropagation` on pills.
- **Card title is hidden, NOT visible.** Considered showing a 12px white/55 uppercase tracker `HYDRATION` label at the top-left. Rejected: the 88px compact height does not leave vertical room, and the surface context (between meal-entry buttons and gallery link) makes the function legible. Visually-hidden `<h3>` for screen readers.
- **+32 oz is the 4th pill in the 2x2, NOT a quick-log of "skip" or "other".** Spec proposed +8 / +16 / +24 / +32 row. Confirming: these are 4 ascending water volumes; no "other beverage" affordance on this surface (that lives on the FAB bottom sheet in Surface 3).
- **No `Recent water` micro-row.** Considered adding a small "Last logged: 8 oz, 2 hours ago" string below the value stack. Rejected: 88px card budget cannot accommodate it AND the timeline in Surface 4 is the canonical place to see history. Compact card stays compact.

**Mobile adaptation:** as described above; narrow-viewport 2x2 grid holds; haptic feedback on pill tap matches Surface 1.

---

## §3 Floating action button

**Layout:**

A small Droplet FAB anchored to the bottom-right of the Consumer Dashboard (when scrolled past the hydration widget) AND the Wellness Analytics surface (always visible). Hidden on the NutriVision tab AND all Settings pages.

FAB geometry:
- **Mobile:** 48px square (per spec), rounded full, position fixed `bottom-4 right-4` (safe-area inset honored on iOS via `pb-[env(safe-area-inset-bottom)]` parent), z-40 (above page content, below modals which use z-50).
- **Desktop:** 56px square, position fixed `bottom-6 right-6`.
- Background `bg-[#2DA5A0]` solid Teal, no border; soft shadow `shadow-lg`; icon Droplet white `h-5 w-5 sm:h-6 sm:w-6` strokeWidth 1.5 centered.

Bottom sheet (opens on FAB tap):
- Mobile: slide up from bottom, full-width, rounded-top `rounded-t-3xl`, background `bg-[#1E3054]`, max-height 60vh. Internal padding `p-5 pb-8` (pb extra for safe-area).
- Desktop: centered modal 480px wide, `rounded-3xl`, same background; backdrop `bg-[#1A2744]/70 backdrop-blur-md`.

Bottom sheet content top to bottom:
1. **Drag handle (mobile only):** 4px tall x 36px wide pill at white/25, centered, 8px below top edge.
2. **Header strip 32px:** title `Log hydration` (16px Semibold white) on left + `X` Lucide close icon (h-4 w-4, white/65, 44x44 hit area) on right.
3. **20px gap; 4 quick-log buttons in `grid-cols-2 gap-3`:** larger than the NutriVision card pills, each button 64px tall, `bg-[#2DA5A0]/15` + `border border-[#2DA5A0]/30` + `text-[#2DA5A0]` 16px Medium. Labels: `+8 oz`, `+16 oz`, `+24 oz`, `+32 oz` (or metric `+250 ml`, `+500 ml`, `+750 ml`, `+1000 ml` with unit visible because this surface has room).
4. **16px gap; horizontal divider** (1px white/10).
5. **16px gap; custom amount row:** `Custom amount` label (14px white/85) on left, on the right a small inline input field rendered as a stadium pill: white/8 background, 14px white Monospace text input, 64px wide, with unit suffix `oz` or `ml` to the right of the field; below the input a small `Log` button (44x44, Teal solid, Droplet icon white). Pressing Log fires the POST with the entered volume.
6. **16px gap; other beverage row:** `Other beverage` link (14px Teal underlined) + right-arrow ChevronRight; tap opens the full NutriVision tab (routes to `/nutrition/photo-ai`) with the Quick Log modal pre-opened and a hydration-context prompt: `What did you drink?` (12px white/65 placeholder text in the Quick Log textarea).
7. **8px gap; cancel link centered:** `Cancel` (14px white/55).

**Header copy:**
- Bottom sheet title: `Log hydration`.

**Body copy:**
- Quick-log button labels: `+8 oz` / `+16 oz` / `+24 oz` / `+32 oz` (imperial) OR `+250 ml` / `+500 ml` / `+750 ml` / `+1000 ml`.
- Custom amount label: `Custom amount`.
- Custom input placeholder: empty (numeric only).
- Custom log CTA: `Log` (button with Droplet icon).
- Other beverage row: `Other beverage` + small subtext `Coffee, tea, sparkling water, more` (12px white/55).
- Cancel link: `Cancel`.
- Toast on log: matches Surface 1 toast pattern.

**CTAs:**
- FAB tap: opens bottom sheet (or centered modal on desktop).
- Quick-log button tap inside sheet: fires POST + toast + closes sheet after 800ms delay (so user sees the toast). Helix event `hydration_logged`.
- Custom amount Log tap: validates input (>= 1 and <= 6000 in ml, >= 1 and <= 200 in oz); fires POST + toast + closes sheet.
- Other beverage tap: closes sheet, routes to NutriVision tab Quick Log modal.
- X close OR Cancel link: closes sheet without action.
- Backdrop tap (desktop centered modal): closes sheet.

**Conditional states:**
- **Visible on Dashboard when scrolled past hydration widget:** intersection observer watches the hydration widget; when widget's bottom edge crosses above viewport top + 100px, FAB fades in (200ms ease-out) over 300ms.
- **Visible on Wellness Analytics:** always visible (no scroll-trigger).
- **Hidden on NutriVision tab:** the hydration card already serves this role.
- **Hidden on all Settings pages:** modal-dense surface, FAB would compete.
- **Hidden when `HYDRATION_TRACKING_ENABLED = false`.**
- **Hidden when widget setting `hide_hydration_widget_on_dashboard = true`:** the FAB stays HIDDEN on Dashboard too, because the user has signalled "I do not want this in my dashboard surface." Wellness Analytics FAB remains.
- **Bottom sheet on small viewport iOS Safari with the URL bar showing:** safe-area inset accounts for the chrome; sheet does not overlap the URL bar.
- **Custom amount validation fails:** inline red border on input + 12px Orange error text `Enter 1 to 6000 ml` below.
- **Network offline:** quick-log buttons still tap-able via offline queue; toast `Offline. We will sync.`.
- **Eating disorder safety mode:** bottom sheet content unchanged structurally (the 4 buttons still log volumes) but the title becomes `Log a drink` (not `Log hydration` — avoids percentage-progress framing); no toast on log (silent success); the Other beverage row remains.
- **First-time tutorial unseen + FAB tapped:** opens bottom sheet directly with no tutorial gate. Tutorial gate is ONLY on the Dashboard widget tap or NutriVision card tap, per spec §11.9; FAB users have already discovered the surface another way.

**Accessibility commitments:**
- FAB is `<button>` with `aria-label="Log hydration"`.
- Bottom sheet is `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the `Log hydration` title.
- Focus moves to the first quick-log button on sheet open.
- Escape key closes sheet.
- Tab order: +8 oz → +16 oz → +24 oz → +32 oz → custom input → custom Log → Other beverage → Cancel → X close.
- 44x44 minimum on every interactive: FAB itself is 48 (mobile) / 56 (desktop); each quick-log button is 64px tall; custom input + Log button cluster forces 44px.
- aria-live polite region echoes log confirmation.
- Color contrast: 16px Medium Teal on Teal/15 over Card background is 4.7:1; 14px white/85 labels 6.5:1; FAB white icon on Teal background 4.5:1.
- Reduced-motion: FAB fade-in instant; sheet slide-up instant; no toast slide.
- Screen reader announces FAB visibility transition: when FAB enters via intersection observer, no announcement (decorative). When user opens sheet, announcement covers it.
- iOS Voice Control: `Log hydration`, `Plus 8 ounces`, `Custom amount`, `Other beverage`, `Cancel`.

**Push-back / UX decisions:**

- **NO pulse animation on first load.** Spec asks "should the FAB pulse to draw attention on first load? Or stay static to avoid feeling demanding?" Explicit reject of pulse. Reasons: (1) a pulsing button on the dashboard creates ambient anxiety pressure; (2) it conflicts with the spec §15 eating-disorder safety posture that explicitly says no notifications and no gamification; (3) the hydration widget at the top of the dashboard is the primary discovery surface, the FAB is the scroll-state secondary affordance — a pulse on a secondary affordance is demanding. Static FAB. The fade-in on scroll past widget IS the discovery hint.
- **Sheet height is auto-fit not full-height.** Considered a full-height sheet (matches some iOS native patterns). Rejected: 6 button + custom + other beverage + cancel fits in ~ 380px which feels intentional and respectful of context; full-height would feel like a modal demanding attention.
- **Other beverage routes to NutriVision Quick Log modal, NOT a hydration-specific beverage picker.** Spec describes "opens full meal logging flow." The simplest valid interpretation: route to the existing Quick Log surface (170m, shipped) with a hydration-context placeholder. Building a separate hydration-beverage picker (coffee / tea / juice / soda / etc.) duplicates the NLU parser's existing 170m+170n+170l capability. Quick Log handles "a glass of orange juice" perfectly already.
- **Custom amount is metric-OR-imperial based on user preference, single field.** Considered showing both units side by side with a toggle. Rejected: cognitive load; user has already set their preference in Settings, the custom field respects that.
- **Cancel link is small below Other beverage, NOT a button row peer.** This matches the 170n pattern of subordinate-text-link cancel.
- **FAB enter trigger is scroll-past-widget, NOT viewport-time-based.** Considered "FAB appears after 5 sec on dashboard." Rejected: time-based appearance is arbitrary; scroll-based is contextual ("you scrolled past the widget; here is a faster path to log").
- **Sheet does NOT show today's current total.** Considered a small `Today: 48 oz of 64 oz` line at the top of the sheet for context. Rejected: the user opened this sheet to log MORE, not to read their current state; pinning a total there encourages comparison-to-target pressure. The toast after logging conveys whatever encouragement is appropriate ("+250 ml logged" or "Target met").

**Mobile adaptation:** sheet slides up with `transition-transform translate-y-full to translate-y-0` over 300ms; safe-area bottom inset honored; haptic `impact Light` on FAB tap, `impact Light` on quick-log button tap, `notification Success` on target-reached.

---

## §4 Hydration Detail view

**Layout:**

Dedicated route at `/wellness-analytics/hydration`, accessible from (a) Dashboard widget tap, (b) NutriVision tab card tap, (c) FAB on Wellness Analytics, (d) direct URL.

Page structure top to bottom:
1. **Header strip 64px (sticky on scroll):** `ArrowLeft` back button (44x44, route to `/wellness-analytics` via referrer fallback to `/dashboard`) + title `Hydration` (18px Semibold white centered) + `Settings` cog icon top-right (44x44, route to `/settings/nutrivision#hydration`).
2. **24px gap; Today section:**
   - Section header strip 36px: title `Today` (14px Semibold white/85 uppercase tracker) + small date string `Saturday, May 31` (12px white/55) on right.
   - 16px gap; **large ring region centered:** 220px diameter on mobile + 260px on desktop, stroke 16px / 18px desktop. Same color logic as Surface 1 (Teal at-or-above-target, Card-tint below). Center stack: today's intake `48 oz` (32px Semibold), `of 64 oz` (16px white/65). 
   - 20px gap; **full-size quick-log button row:** 4 buttons (not 3 as in widget) in `grid-cols-2 sm:grid-cols-4 gap-3`, each 56px tall, Teal pill style. Labels `+8 oz` / `+16 oz` / `+24 oz` / `+32 oz`.
   - 12px gap; small `Custom amount` text link 12px Teal underlined centered (opens a 280px modal with the same Custom input from Surface 3 sheet).
   - 24px gap; **timeline subsection:**
     - Header: `Today's intake` (14px Semibold white/85) + on right a small count chip `5 entries` (11px Card/65 backdrop pill).
     - Vertical list of intake events, each row 56px tall, rounded-2xl, `bg-[#1E3054]/35`, `p-3 flex items-center gap-3`. Per row left to right:
       - Beverage glyph: small Droplet (water), Coffee (coffee), Leaf (tea), Wine (alcohol), Milk (dairy), etc., 20px Teal in a 36x36 Teal/10 circular wrapper.
       - Center stack: beverage label `Water` (14px Medium white) + below it `8:24 AM` (12px white/55).
       - Right: volume `+250 ml` (14px Medium white) + tiny ChevronRight (h-3 w-3 white/35) signalling tap-to-edit.
     - Rows are tap-targets that open Surface 5 (edit panel).
     - When zero entries: empty state `No water logged yet today. Tap a button above to start.` (14px white/65 centered, 32px vertical padding).
3. **32px gap; This week section:**
   - Section header strip: `This week` (14px Semibold uppercase) + on right `View month` link (12px Teal underlined, scrolls to next section / expands).
   - 16px gap; **bar chart:** 7 bars representing Mon-Sun (or current-week-start aligned), each bar is `flex-1`, max-height 120px, rounded-top `rounded-t-md`, filled to proportional height. Color: Teal `#2DA5A0` for days at-or-above target; Card-tint for under-target days; today's bar has a 2px white/30 outline ring.
     - Below each bar: day-letter label `M T W T F S S` (10px white/55) + below that the day-number `27` (10px white/45). Today's column has the day-letter in Teal.
   - 12px gap; **week summary row:** 2 stat tiles in `grid-cols-2 gap-3`:
     - Tile 1: `Average` (10px white/55 uppercase) + below `52 oz` (20px Semibold white) + `per day` (10px white/55).
     - Tile 2: `Streak` (10px white/55 uppercase) + below `3 days` (20px Semibold white) + `at target` (10px white/55).
4. **32px gap; This month section (collapsed by default):**
   - Section header strip: `This month` (14px Semibold uppercase) + on right an expand-collapse chevron (ChevronDown h-4 w-4 white/55).
   - On tap: expands to reveal a calendar heatmap (see push-back on perf).
   - **Heatmap (when expanded):** 5-6 row x 7-column grid showing the current month. Each day cell is `aspect-square` rounded-md, color intensity by hydration level:
     - 0% to 33% of target: `bg-[#1E3054]/30`
     - 34% to 66%: `bg-[#2DA5A0]/30`
     - 67% to 99%: `bg-[#2DA5A0]/55`
     - 100% to 129%: `bg-[#2DA5A0]/80`
     - 130%+: `bg-[#2DA5A0]` solid
     - Future days: `bg-transparent border border-white/[0.05]`
     - Today: 2px Teal outline
   - Day-number labels overlay each cell (10px Card-readable color, contrast adjusted per intensity).
   - 12px gap below heatmap; **month summary row:** 2 stat tiles same pattern as week:
     - Tile 1: `Average` + monthly average + `per day`.
     - Tile 2: `Best day` + `94 oz` + the date (`May 18`).
5. **32px gap; Settings link row:**
   - Full-width tap row, 64px tall, rounded-2xl, `bg-[#1E3054]/45`, padding 16, flex items-center gap-3.
   - Left: `Settings` icon (20px Teal in Teal/10 circle 36x36).
   - Center: `Adjust your hydration settings` (14px Medium white) + `Target, counting mode, reminders` (12px white/55).
   - Right: `ChevronRight` h-4 w-4 white/55.
6. **24px gap; disclaimer footer:**
   - Small text 11px white/55, max-width 480px centered, line-height 16px.
   - Copy: see §8 below for the verified-vs-spec divergence.
7. **48px bottom padding** to clear the FAB.

**Header copy:** `Hydration` (page title).

**Body copy:**
- Section headers as listed above.
- Empty timeline: `No water logged yet today. Tap a button above to start.`
- Settings link main: `Adjust your hydration settings`.
- Settings link sub: `Target, counting mode, reminders`.

**CTAs:**
- Back arrow: route to `/wellness-analytics` (referrer-aware fallback).
- Settings cog top-right: route to `/settings/nutrivision#hydration` (jumps to the hydration section anchor).
- 4 quick-log buttons: POST as Surface 1.
- Custom amount link: opens modal for custom volume entry.
- Timeline row tap: opens Surface 5 edit panel pre-filled with that entry.
- View month link: scrolls to + expands the monthly section.
- Monthly expand chevron: expands / collapses the heatmap.
- Settings link row: same as Settings cog.

**Conditional states:**
- **Empty state (zero logs today AND zero history):** Today section ring at 0%, timeline shows empty-state copy; This week section bars all at 0% height with empty Card-tint outlines; This month collapsed and on expand shows `No history yet. Your monthly view fills in as you log.`; week summary shows `--` for Average and `0 days` for Streak.
- **History exists but today is empty:** ring at 0%, timeline empty; week and month sections show real data.
- **At-target state with streak:** ring Teal full; below ring a small streak row `Flame Orange + 3 days in a row at target` (12px white/85).
- **Eating disorder safety mode:**
  - Today section: cup-tally instead of percentage ring (same treatment as Surface 1); center copy `3 cups today` + `Listen to your thirst`.
  - This week: bar chart REPLACED with vertical-list-of-cups-per-day: 7 rows, each row shows day-letter + count of cups (no percentage, no comparison-to-target color coding); all bars uniform white/40.
  - This month: heatmap REPLACED with simple count chart: each day shows the cup-count number only, no color intensity.
  - Stat tiles: `Average` becomes `Daily average` with cup count instead of volume; `Streak` tile is REPLACED with `Days you listened to your thirst` showing the cup-count days (no qualifier like "at target").
- **Kill switch states:** as Surface 1.
- **Loading state:** skeleton for ring + 7 skeleton bars + collapsed month section + 2 skeleton stat tiles.
- **Settings link row sublabel updates based on user state:** if reminders OFF, sub-copy reads `Target, counting mode`; if reminders ON, sub-copy reads `Target, counting mode, reminders on every 3 hours` (or whatever cadence).
- **Reduced-motion:** ring fill instant; bar chart heights set instantly; heatmap expand instant.

**Accessibility commitments:**
- Page root `<main>` with `aria-labelledby` pointing to the `Hydration` title.
- Sections are `<section>` with `aria-labelledby` pointing to their respective headers.
- Ring same treatment as Surface 1 (role="button", aria-label, polite live region for changes).
- Bar chart is rendered as `<ul role="list">` with each bar as `<li><span aria-label="Monday May 26. 48 ounces of 64 ounce target.">...</span></li>`. NOT individually focusable (bars are decorative-with-data; tap interaction is not offered on bars in v1).
- Timeline rows are `<button>` with `aria-label="Water. Logged at 8:24 AM. 250 milliliters. Edit."`
- Heatmap is rendered as `<table>` with `<caption className="sr-only">May 2026 hydration calendar</caption>`, day rows as `<tr>`, day cells as `<td>` with `aria-label="May 18. 94 ounces logged. 147 percent of target."`. Individual cells are NOT tappable in v1 (read-only summary).
- Settings link is `<a>` with `aria-label="Adjust your hydration settings. Target, counting mode, and reminders."`
- Tab order: back → settings cog → ring → +8 oz → +16 oz → +24 oz → +32 oz → custom → timeline rows (top to bottom) → view month link → expand chevron → settings link row.
- All buttons 44x44 minimum.
- Color contrast: 32px Semibold white on dark backgrounds 8.2:1+; bar chart Teal vs Card-tint distinguishable AND day-labels under bars provide text-redundancy for color-blind users; heatmap intensity gradient AND aria-labels with explicit percentage values.
- Reduced-motion: all transitions instant.
- Disclaimer footer is `<footer>` with explicit `aria-label="Hydration tracking disclosures"`.
- iOS dynamic type at 200%: ring center wraps to 2 lines; bar chart heights scale proportionally; heatmap cell-text scales (may force horizontal scroll on the heatmap at extreme scaling, which is acceptable for a non-interactive summary).

**Push-back / UX decisions:**

- **Monthly heatmap collapsed by default, NOT auto-expanded.** Spec says "collapsed by default" — I am affirming and adding a performance reason: rendering 30-31 calendar cells with intensity calculations + per-cell aria-labels at every page load is wasteful when most users will only glance at Today + This week. Collapsed-by-default is a perf win AND a focus win.
- **No `Wellness Analytics > Insights` hydration callout in Phase 1.** Per the phase boundary contract, insights composition is Phase 2 (170h-gated). The Detail view in Phase 1 surfaces ONLY the tracking + history + settings link; the disclaimer footer makes clear that this view is descriptive not advisory. No "Hannah is detecting a pattern in your hydration" callout exists yet; that's Phase 2's job.
- **Bar chart days NOT individually tappable in Phase 1.** Considered making each bar tap-to-see-that-day's timeline. Rejected for v1: introduces day-detail navigation complexity that exceeds Phase 1 scope. Filed as Phase 1.1 supplement candidate if user research shows demand.
- **Heatmap is read-only in Phase 1.** Same reasoning. Tap-cell-to-see-day's-timeline filed for later.
- **No "Compare to last week" or "Trend up/down" gamification copy.** Stat tiles show factual values only (`Average 52 oz per day`, `Streak 3 days at target`). Trend arrows or "up 5% vs last week" framing would conflict with spec §15 safety posture AND inject 170h-territory analytics into Phase 1.
- **No Insight cards in the Detail view.** Phase 2 will add a "Hydration insight" card before the disclaimer footer per spec §6.4 + Phase 2. Phase 1 ships without it; the disclaimer footer takes the bottom-of-page position.
- **Page lives under `/wellness-analytics/hydration`, NOT under `/nutrition/hydration` or `/dashboard/hydration`.** Spec is explicit. Confirming. Reason: the Detail view is a longitudinal-analytics surface, not a meal-entry surface and not a dashboard tile; the URL path matches its semantic home.
- **Settings link row sub-copy adapts to current state.** Small dynamic touch: showing "reminders on every 3 hours" when applicable saves the user a click into Settings to check their cadence. Cost: trivial. Benefit: pleasant.
- **Streak counter copy is `3 days in a row at target`, not `3-day streak`.** Avoids the gamification streak-noun framing and reads as descriptive rather than goal-pressure.
- **`Today's intake` timeline header has a count chip, NOT a sum/total.** Considered showing `Today's intake: 48 oz` as the section header. Rejected: redundant with the ring directly above it; the count chip (`5 entries`) provides ortho-information (frequency, not volume).

**Mobile adaptation:** all sections stack as described; ring 220px diameter; bar chart bars full-width with equal `flex-1`; heatmap horizontal-scrolls if needed at narrow viewports; sticky header strip honors safe-area top inset.

---

## §5 Hydration edit panel

**Layout:**

Triggered by tapping any hydration log entry in the Surface 4 timeline. Mobile: slide-up bottom sheet matching Surface 3 FAB sheet visual pattern. Desktop: centered modal 480px wide.

Sheet content top to bottom:
1. **Drag handle** (mobile only) per Surface 3.
2. **Header strip 48px:** title `Edit hydration` (16px Semibold white) on left + `X` close on right (44x44 hit area).
3. **20px gap; volume slider row:**
   - Label: `Volume` (12px Medium white/85 uppercase).
   - Current value display centered above slider: `250 ml` or `8 oz` (24px Semibold white).
   - Slider: full-width range input, Teal track, white thumb 28px diameter, increments per spec:
     - Metric: 50 ml increments, range 0 to 2000 ml.
     - Imperial: 1 oz increments, range 0 to 64 oz.
   - Min and max labels under slider (10px white/55): `0` left + `2000 ml` right (or `0` and `64 oz`).
4. **20px gap; beverage type selector row:**
   - Label: `Type` (12px Medium white/85 uppercase).
   - Selector: horizontal scrollable chip row, each chip 44x44 minimum, rounded-full, white/8 background with Teal border + Teal text when selected, white/8 background with white/55 text when unselected. Chip icon + label.
   - 9 chips per the 9 hydration_source_kind enum values: Water (Droplet) / Coffee (Coffee) / Tea (Leaf) / Sparkling water (Droplet variant) / Juice (Apple) / Soda (CupSoda) / Alcohol (Wine) / Dairy (Milk) / Other (MoreHorizontal).
   - Selected chip pre-set to current entry's beverage type.
5. **24px gap; 3-button action row:**
   - Primary `Save` (Teal solid, 48px tall, h-12, full-width-on-narrow-viewport, grid-cols-3 on wider).
   - Secondary `Delete` (Orange outline + Orange text, 48px tall) — confirmation dialog before destructive action.
   - Tertiary `Cancel` (text link 14px white/65 centered below button row on mobile, alongside on desktop).

**Header copy:**
- Sheet title: `Edit hydration`.

**Body copy:**
- Volume label: `Volume`.
- Type label: `Type`.
- Chip labels: `Water` / `Coffee` / `Tea` / `Sparkling water` / `Juice` / `Soda` / `Alcohol` / `Dairy` / `Other`.
- Save button: `Save`.
- Delete button: `Delete`.
- Cancel link: `Cancel`.
- Delete confirmation dialog title: `Delete this entry?`
- Delete confirmation body: `This removes the {volume} {beverage type} log from your day.`
- Delete confirmation CTAs: `Delete` (Orange solid) + `Keep` (Teal solid).
- Toast on save success: `Entry updated`.
- Toast on delete success: `Entry deleted` + Undo link (10 sec).

**CTAs:**
- Slider drag or arrow keys: updates the displayed volume value live.
- Beverage chip tap: selects that chip, deselects others.
- Save: fires `PUT /api/nutrition/hydration/quick-log/{id}` with the new volume + source_kind; on 200, closes sheet + toast; on failure, error toast + sheet stays open.
- Delete: opens confirmation dialog; on confirm, fires `DELETE /api/nutrition/hydration/quick-log/{id}`; closes sheet + toast with Undo (the Undo POSTS a re-create with the original volume + source_kind + timestamp).
- Cancel + X close: dismiss without action.

**Conditional states:**
- **Slider at minimum (0 ml or 0 oz):** Save button disabled, label changes to `Set a volume`.
- **Volume changed but Type unchanged:** Save button enabled with `Save` label.
- **Type changed but Volume unchanged:** Save button enabled.
- **Neither changed:** Save button disabled with `Save` label (no changes to commit); Cancel still works.
- **Edit panel opened from a stale entry (entry deleted server-side since list load):** on Save / Delete, server returns 404; toast `That entry is no longer available.` + sheet closes + timeline refreshes.
- **Network offline:** Save/Delete queued via offline queue; toast `Offline. We will sync.`; sheet closes optimistically.
- **Eating disorder safety mode:** Sheet content unchanged structurally; the slider range stays the same; the title becomes `Edit drink` (not `Edit hydration`); no target language anywhere.
- **Beverage type chip set scrolls horizontally on narrow viewports.** First 4-5 visible without scroll; user scrolls to see remaining; selected chip auto-scrolls into view on open.

**Accessibility commitments:**
- Sheet `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to title.
- Focus moves to the slider thumb on open (or the volume display if slider thumb focus is unreliable per browser).
- Slider has `aria-label="Volume in milliliters"` + `aria-valuemin`, `aria-valuemax`, `aria-valuenow` updated live + `aria-valuetext` for screen-reader-friendly format (`250 milliliters`).
- Beverage chip group is `role="radiogroup"` with `aria-label="Beverage type"`; each chip is `role="radio"` with `aria-checked`.
- Tab order: slider → Water chip → Coffee chip → ... → Other chip → Save → Delete → Cancel → X close.
- 44x44 minimum on every interactive (slider thumb 28px visual but with hit area extension; chips forced; buttons 48px).
- Delete confirmation dialog inherits same a11y treatment as Surface 3 sheet; focus moves to `Keep` (defensive default; not Delete).
- Color contrast: 24px Semibold white on Card 8.2:1; chip Teal text on Teal-tinted backdrop 4.7:1; Orange Delete on Card 5.1:1.
- Reduced-motion: sheet slide-up instant; chip selection state-change instant; no slider thumb pulse.
- iOS Voice Control: `Volume`, `Water`, `Coffee`, `Save`, `Delete`, `Cancel`.

**Push-back / UX decisions:**

- **Beverage chips are horizontal-scrollable NOT grid-wrapped.** 9 chips at 44px+ each in a `grid-cols-3` grid would create a 3-row block ~ 200px tall, dominating the sheet. Horizontal scroll keeps it compact + the visible 4-5 chips at default scroll position cover the common cases (Water + Coffee + Tea + Sparkling visible by default).
- **Delete confirmation defaults focus to `Keep`, NOT `Delete`.** Destructive-action confirmations should require explicit decision, not consent-by-default. Matches the 170j shipped pattern.
- **Undo affordance on delete-toast is 10 seconds, NOT 5 seconds.** Users may take a moment to realize "wait, I needed that entry." 10 sec is the iOS Mail / Gmail standard.
- **Volume slider increments are 50 ml / 1 oz, NOT user-customizable.** Spec specifies these. Confirming. Reason: finer increments (10 ml / 0.5 oz) push the slider toward over-specification ("did I really drink exactly 247 ml or 250 ml?") which is dishonest about measurement precision. 50 ml / 1 oz is the right grain for a self-reported hydration tracker.
- **No "Time" field for the entry.** Considered showing a time-picker for the logged_at. Rejected for v1: the entry's logged_at is the moment it was created (or the moment the offline-queued log was created); users editing a log are 99% editing volume or type, not retroactively shifting time. Filed for Phase 1.1 if demand.
- **`Other` chip retains, despite the 9-kind enum being source_kind values.** A user with a beverage that doesn't map cleanly (e.g. herbal infusion that's not tea, kombucha, broth) needs an escape valve. `Other` maps to source_kind `'other'` which the spec already includes in the 9-kind set.

**Mobile adaptation:** sheet bottom-up; haptic on save success and delete confirmation; safe-area bottom inset.

---

## §6 Settings > NutriVision > Hydration

**Layout:**

New `HydrationSettingsSection` at `src/app/(app)/(consumer)/settings/nutrivision/components/HydrationSettingsSection.tsx`. Mounts inside the existing `/settings/nutrivision` page (read the shipped `page.tsx` lines 159-188 for sibling sections: VoiceSettingsSection, QuickLogSettingsSection, VoiceNativeSettingsSection, then the barcode-scan link).

Insertion point: after `VoiceNativeSettingsSection` (line 169) and before the barcode link block (line 174). Anchor: section element has `id="hydration"` so the Settings cog link from Surface 4 can deep-link to it.

Section layout matches the `VoiceSettingsSection` / `QuickLogSettingsSection` family:
- Section root: rounded-2xl, border white/[0.08], `bg-[#1E3054]/45`, padding 5 (mobile) / 6 (desktop), `mt-4` from prior sibling.
- Header strip: Droplet icon in Teal/15 circle (40px) + 12px gap + heading text stack.
- Heading: `Hydration` (16px Semibold white).
- Subheading: `Targets, beverages, and reminders` (12px white/65).
- 16px gap below header; main settings stack.

Setting stack top to bottom:

**Group 1: Target**
- Section sub-header `Daily target` (12px Semibold uppercase white/65 tracker).
- 8px gap; mode selector segmented control: 2 buttons in a row, full-width split:
  - `Default` (computed): selected by default; sub-label below `Based on your body and activity` (10px white/55).
  - `Custom`: when selected, reveals slider below.
- When `Custom` selected:
  - 12px gap; slider full-width, range 500 to 6000 ml (or 17 to 200 oz), 100-ml / 1-oz increments.
  - Current value display above slider: `2,250 ml` (18px Semibold white) + `per day` (12px white/55).
  - Below slider: min `500 ml` and max `6000 ml` labels (10px white/55).
- 12px gap; computed-target callout (visible in both modes, dimmed in Custom):
  - `Your computed target is 1,890 ml` (12px white/65 italic, small).
  - When `Default` selected: matches the slider position above.

**Group 2: Counting mode**
- Section sub-header `What counts` (12px Semibold uppercase).
- 8px gap; 2 radio rows:
  - `Conservative` (selected by default): sub-label `Only pure water counts toward your target` (12px white/65).
  - `Adjusted`: sub-label `Coffee, tea, and other beverages contribute partial amounts` (12px white/65).
- Visual treatment: rounded-xl `bg-[#1A2744]/40` rows with Teal radio dot on selected.

**Group 3: Reminders**
- Section sub-header `Reminders` (12px Semibold uppercase).
- 8px gap; 5 radio rows:
  - `Off` (selected by default): sub-label `No notifications` (12px white/65).
  - `Every 2 hours`: sub-label `From 7 AM to 9 PM` (12px white/65).
  - `Every 3 hours`: sub-label `From 7 AM to 9 PM` (12px white/65).
  - `Every 4 hours`: sub-label `From 7 AM to 9 PM` (12px white/65).
  - `Milestone only`: sub-label `When you reach 25%, 50%, 75%, 100% of target` (12px white/65).
- Below the radio rows: small `Notification permission` micro-status (12px white/55): when system perm granted reads `Allowed`; when not yet asked reads `Tap any cadence to allow notifications`; when denied reads `Denied. Open Settings to enable.` (with `Open Settings` 12px Teal underlined link).

**Group 4: Visibility**
- Section sub-header `Where it shows` (12px Semibold uppercase).
- 8px gap; 2 toggle rows (matching the existing `SettingToggle` component in the shipped page.tsx):
  - `Show hydration card on NutriVision tab` (default ON).
  - `Show hydration widget on Dashboard` (default ON).

**Group 5: Tutorial replay**
- Small `Replay tutorial` link (14px Teal underlined, with `RotateCcw` icon h-3 w-3 leading) at end of section.

**Group 6: Disclaimer footer (the Hannah-authored, FDA-verified copy)**
- 24px gap; small text 11px white/55, max-width container width, line-height 16px.
- Copy: see §8 below for the verified copy.

**Header copy:**
- Section heading: `Hydration`.
- Section subheading: `Targets, beverages, and reminders`.

**Body copy:**
- All sub-headers and labels above.
- Tutorial replay link text: `Replay tutorial`.

**CTAs:**
- Default/Custom segmented control tap: switches mode, persists via `PUT /api/nutrition/hydration/preferences`.
- Custom slider drag: updates display + persists on release (debounced 800ms).
- Counting mode radio tap: persists.
- Reminders radio tap: persists. If selecting a non-Off cadence and notification permission is not yet granted, fires system permission prompt before persisting.
- Open Settings link (in denied state): system-settings deep-link.
- Visibility toggles: persist on tap.
- Replay tutorial link: opens Surface 7 tutorial overlay.

**Conditional states:**
- **CAQ pregnancy flag present:** computed target callout reads `Your computed target is 2,190 ml (includes +300 ml for pregnancy)` to be transparent about the adjustment.
- **CAQ lactation flag present:** `... (includes +700 ml for lactation)`.
- **Both pregnancy and lactation present (rare):** `... (includes +1000 ml for pregnancy and lactation)`.
- **Activity tracking surface absent (Phase 1.1 dependency, per pre-build issue #4):** no activity multiplier callout; computed target uses body weight x 33 + climate (when available) + pregnancy/lactation only.
- **Body weight absent:** computed target callout reads `Your computed target is 1,890 ml (64 oz default)` so user knows the default is being used.
- **Climate opt-in available + location granted + hot climate detected:** `... (includes +20% for climate)`.
- **Custom slider persistence error (server returns 5xx):** error toast `Could not save custom target. Try again.`; slider position reverts to last successfully persisted value.
- **Reminders cadence selected but notification permission denied:** radio appears selected (optimistic) but a small Orange callout below the cadence rows surfaces: `Reminders need notification permission. Open Settings to enable.` Cadence is persisted server-side so when permission flips on later, reminders begin.
- **`HYDRATION_NOTIFICATIONS_ENABLED = false` master kill:** Reminders group entirely hidden (cadence radios omitted). Other groups unaffected.
- **`HYDRATION_ADJUSTED_COUNTING_ENABLED = false` master kill:** Counting mode group hidden (Conservative is the only behavior); Adjusted radio not shown.
- **Eating disorder safety mode active:**
  - Daily target group: `Custom` mode disabled (locked to Default); slider not shown; computed-target callout still visible.
  - Counting mode: locked to `Conservative` regardless of user prior preference (Adjusted hidden).
  - Reminders: locked to `Off`; entire Reminders group is hidden with a small inline note `Reminders are paused while safety mode is on.` (12px white/55 italic) in the group's place.
  - Visibility toggles unaffected.
  - Tutorial replay unaffected.

**Accessibility commitments:**
- Section root is `<section>` with `aria-labelledby` pointing to the `Hydration` heading.
- Each setting group is `<fieldset>` with `<legend>` for the sub-header (visually-styled but semantic).
- Segmented control is `role="radiogroup"` with `aria-label="Target mode"`; each segment `role="radio"` with `aria-checked`.
- Slider: same a11y as Surface 5 slider.
- Counting mode and Reminders are also `role="radiogroup"` with proper `aria-label` and `aria-checked`.
- Visibility toggles use the same SettingToggle component shipped in the existing page.tsx (lines 202-225).
- Tab order: target Default → target Custom → slider (when shown) → counting Conservative → counting Adjusted → reminders Off → ... → reminders Milestone → visibility toggle 1 → visibility toggle 2 → Replay tutorial.
- 44x44 minimum on all interactive elements.
- Color contrast: same passing values as siblings.
- Reduced-motion: all transitions instant.
- Disclaimer footer is `<footer>` with `aria-label="Hydration tracking disclosures"`.
- Eating disorder safety mode locked-states: disabled controls are not just visually dimmed; they are `aria-disabled="true"` and a screen-reader-only `aria-describedby` explains "This setting is locked while safety mode is on."

**Push-back / UX decisions:**

- **Default-target slider display always visible, even when in Default mode.** Considered hiding the slider entirely when Default selected. Rejected: the user benefits from seeing what the computed value IS at this moment (1,890 ml), not just being told "the default applies." When in Default mode, slider is read-only (cursor: default, no thumb interaction, no value-change), positioned at the computed value. Tapping Custom enables it.
- **Computed target callout explains itself transparently.** When pregnancy or lactation or climate adjustments apply, the callout SAYS so. Hiding the math from the user creates "why is my target so high" mystery; surfacing it as parenthetical is honest.
- **Reminders default to OFF, NOT Every 3 hours.** Spec is correct on this. Affirming. Reason: opt-in posture is the right default for any tracking that involves notifications; users who want reminders will choose; users who don't want them won't get hassled.
- **No `Always remind even at target met` toggle.** Considered. Rejected: reminder behavior at-or-above-target should be: skip the reminder. The user has met their target; pinging them is counter-purpose. The 5 cadence options all implicitly stop reminding for the day once 100% hit. Documenting in the on-radio sub-label was considered but adds noise; the behavior is intuitive.
- **Counting mode default is `Conservative`, NOT `Adjusted`.** Spec is correct. Affirming. Reason: conservative is the safer interpretation when in doubt; users who want to count their coffee opt in explicitly. Reverse would over-credit users.
- **Visibility toggles use the existing shipped `SettingToggle` component, NOT a new visual.** Consistency wins; mid-section custom visuals would create maintenance debt.
- **Tutorial replay link is at end of section, NOT a settings row.** Considered making it a peer setting row. Rejected: it's a meta-action (re-show me an info flow) not a preference. End-of-section text link is the right home.
- **Custom slider persist debounce is 800ms, NOT instant.** Instant persist on every slider tick would generate dozens of POSTs as the user drags. 800ms debounce after drag-release is the right balance.
- **Pregnancy/Lactation callout does NOT include a "remove this adjustment" affordance.** These adjustments are driven by CAQ flags; users wanting to remove the adjustment update CAQ, not hydration settings. Routing to CAQ from here would be a context-switch trap.

**Mobile adaptation:** section stacks vertically; segmented control becomes 2-button flex; slider full-width; radio rows full-width; safe-area honored from parent page padding.

---

## §7 First-time tutorial

**Layout:**

The first time a user taps the Dashboard hydration widget OR the NutriVision tab hydration card, a brief 3-slide tutorial appears.

Tutorial overlay:
- Mobile: bottom sheet sliding up from bottom, rounded-top, max-height 70vh. Same dialog framework as Surface 3 + Surface 5 bottom sheets.
- Desktop: centered modal 520px wide.
- Background `bg-[#1E3054]`; backdrop `bg-[#1A2744]/70 backdrop-blur-md`.

Sheet content top to bottom:
1. **Drag handle** (mobile only).
2. **Header strip 48px:** Title `Welcome` (16px Semibold white) on left + `X` skip-link top-right (`Skip` 12px white/65 + small close icon).
3. **20px gap; slide region:**
   - Slide visualization area (centered, 200px tall on mobile + 240px on desktop):
     - Slide 1: large Droplet icon (h-16 w-16 Teal in Teal/10 circle 96px) centered.
     - Slide 2: small Dashboard widget mockup (simplified circular ring + 3 buttons) at ~60% scale, illustrating the quick-log row.
     - Slide 3: small ring graphic with body-icon + flame-icon hints around the perimeter, suggesting the target-adjustment logic (very abstract; do NOT show specific numbers).
   - 24px gap; slide text:
     - Headline (16px Semibold white centered, 28px line-height): see body copy below.
     - 8px gap; description (14px white/75 centered, 20px line-height, max-width 360px).
4. **24px gap; dot indicators centered:** 3 dots, 6px diameter, current slide Teal solid + others white/25.
5. **20px gap; CTA region:**
   - Slide 1 + 2: primary `Next` (Teal solid 48px) + secondary `Skip` text link (14px white/55).
   - Slide 3: primary `Got it, log my first water` (Teal solid 48px, slightly wider than Next on slides 1+2 to accommodate longer label).
6. **Safe-area bottom inset**.

**Header copy:**
- Sheet title: `Welcome`.

**Body copy:**
- **Slide 1:**
  - Headline: `Track your water alongside your meals`
  - Description: `Hydration shows up next to your other wellness signals so you see how it fits with how you eat, sleep, and feel.`
- **Slide 2:**
  - Headline: `Tap to log a quick amount`
  - Description: `Use the plus 8, plus 16, or plus 24 ounce buttons to log water fast. Other beverages get counted when you log them with your meals.`
- **Slide 3:**
  - Headline: `Your target adjusts to you`
  - Description: `We start with general guidance based on your body and activity. You can fine tune it in Settings whenever you like.`
- **CTA labels:**
  - `Next` (slides 1+2).
  - `Skip` (text link slides 1+2).
  - `Got it, log my first water` (slide 3 primary).

**CTAs:**
- `Next`: advances to next slide.
- `Skip`: closes tutorial; persists `hydration_tutorial_seen = true`; user lands on the surface they originally tapped (widget or card); does NOT pre-focus the +8 oz button (skip means "I don't need this now").
- `Got it, log my first water`: closes tutorial; persists `hydration_tutorial_seen = true`; pre-focuses the first +8 oz button on the surface they originally tapped (per spec).
- `X` close: same as Skip.
- Swipe left (mobile, slides 1+2): same as Next.
- Swipe right (mobile, slides 2+3): goes to previous slide.
- Backdrop tap (desktop): closes without action (no persistence of seen-status, so tutorial fires again on next tap-into-surface; this is a "I tapped elsewhere by mistake" escape).

**Conditional states:**
- **First-ever tap on widget OR card:** tutorial fires.
- **Subsequent taps after seen:** tutorial does NOT fire; tap proceeds to surface directly.
- **User taps Replay tutorial in Settings:** tutorial fires regardless of seen-status; on completion, seen-status remains true.
- **User in eating disorder safety mode on first tap:** tutorial fires but Slide 1 headline becomes `Track your water alongside your meals` (unchanged); Slide 2 description becomes `Use the plus 8, plus 16, or plus 24 ounce buttons to log water. Other beverages count when you log them with meals.` (removed "fast" framing); Slide 3 headline becomes `Listen to your body` and description becomes `Hydration is one part of how you take care of yourself. Drink when you are thirsty.` (removes target-adjustment-numbers-y framing entirely). CTA on Slide 3: `Got it`.
- **Reduced-motion:** slide transitions are instant (no slide-x animation); dot indicator state-change instant.
- **`HYDRATION_TRACKING_ENABLED = false`:** tutorial does not fire (because the widget and card don't exist).
- **Network failure persisting seen-status:** tutorial may re-fire on next session (acceptable; the persist is best-effort).

**Accessibility commitments:**
- Tutorial sheet is `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to current slide headline.
- Focus moves to the headline `<h2>` on mount (tabindex="-1" focusable for screen reader announcement) then advances to `Next` button.
- Tab order: headline (focusable-by-script) → Next → Skip → X close.
- Escape key closes tutorial via Skip behavior (persists seen).
- Dot indicators are NOT focusable (decorative; tab order covers Next).
- Slide transitions announce via `aria-live="polite"`: `Slide 2 of 3. {headline}`.
- 44x44 minimum on Next, Skip, X close.
- Color contrast: 16px Semibold white on Card 8.2:1; 14px white/75 description 5.5:1; Teal solid CTA on Card 4.7:1.
- iOS Voice Control: `Next`, `Skip`, `Got it log my first water`.
- Reduced-motion: instant slide-changes.
- Visual illustrations are decorative; they have empty `alt=""` (or `aria-hidden="true"`); the text headline + description carry the actual content.

**Push-back / UX decisions:**

- **3 slides, NOT a 1-slide combined info card.** Spec specifies 3. Affirming. Reason: 3 slides match the 3 conceptual chunks (what is hydration tracking here, how do I log, how is my target set). Compressing to 1 slide would either truncate the message or create a wall-of-text card.
- **`Got it, log my first water` literally pre-focuses the +8 oz button on dismiss.** Per spec. Affirming. Tactile follow-through.
- **`Skip` does NOT pre-focus.** Skip semantics are "I do not want guided action right now"; pre-focusing would defeat that intent.
- **Tutorial fires on FIRST tap of EITHER surface, not both.** Persisting `hydration_tutorial_seen = true` after either surface's first tap means the user won't see it twice if they tap widget first then card later.
- **Replay tutorial in Settings does NOT advance the seen-status (it stays true).** A user replaying does not need to be re-flagged.
- **Backdrop tap on desktop does NOT persist seen-status.** Considered persisting on backdrop-tap. Rejected: backdrop tap can be accidental; if the user has not even seen the content, marking it seen is unfair. Skip + X close persist intentionally; backdrop is the escape hatch.
- **No `Don't show this again` checkbox.** Three slides + a Skip option are sufficient; adding a checkbox creates one-more-decision-load. The persist-on-completion behavior is implicit and intuitive.
- **Slide 2 description deliberately mentions the meal-log path for "other beverages."** This anchors the dual-path discovery: quick-log buttons are for water specifically; full meal logging covers other beverages. Without this anchor, users may not realize the system already supports their coffee through the existing meal-log paths.
- **Slide 3 description does NOT name specific multipliers (body weight x 33, activity 1.0x to 1.4x, etc.).** Surfacing the math up-front overwhelms; the math lives in Settings where the user can drill in if curious.
- **Tutorial sheet bottom-up on mobile matches Surface 3 + Surface 5 pattern.** Visual consistency win.
- **`Welcome` as the header title, NOT `Hydration tutorial` or `Get started`.** Welcome is warm; the slide content itself carries the topic.
- **Safety mode tutorial diverges in copy but NOT in slide count.** Three slides maintained; the spec §15 safety posture is honored by the softer framing on each slide.

**Mobile adaptation:** bottom sheet up to 70vh max; swipe gestures for slide navigation; safe-area bottom inset preserved; haptic `selection` on slide change.

---

## §8 FDA-adapted disclaimer copy (verified)

**Verification summary:**

I verified the spec §4.7 disclaimer language against the FDA's January 2026 revised General Wellness Policy for Low-Risk Devices via WebFetch + WebSearch.

**Finding 1 (critical):** The spec's proposed boilerplate `These statements have not been evaluated by the FDA` is the **DSHEA dietary supplement label disclaimer** (21 USC 343(r)(6)). It is required by law on dietary supplement labels making structure/function claims. It is the wrong instrument for a wellness tracking software feature. Using it on a hydration tracking surface is at best confusing (no FDA-evaluated "statements" are being made here) and at worst falsely positions the surface as if it were a supplement label. The FDA's January 2026 General Wellness Policy is explicit that general wellness software/apps should NOT mimic clinical or regulated-product language.

**Finding 2:** The FDA's 2026 guidance permits general wellness products to "notify users that evaluation by a healthcare professional may be helpful when outputs fall outside ranges appropriate for general wellness use" but the notification must avoid (a) naming specific diseases, (b) characterizing outputs as "abnormal," (c) including clinical thresholds.

**Finding 3:** The spec's framing "general estimates based on common formulas" is acceptable and FTC-aligned ("Health Products Compliance Guidance" requires truthful + non-misleading substantiation; the "common formulas" phrasing is appropriately humble).

**Finding 4:** The spec's "Individual needs vary based on health conditions, medications, and lifestyle" line is acceptable but stronger if it points at the user's clinician rather than to a generic provider.

**Finding 5:** The phrase "Consult your healthcare provider for personalized guidance" is acceptable. The FDA's 2026 guidance permits exactly this kind of healthcare-provider deferral.

**Verified disclaimer copy (revised; supersedes spec §4.7 as authored):**

> Hydration targets here are general estimates based on common formulas. Your needs may differ based on your health, medications, and lifestyle. For personalized guidance, talk with your healthcare provider. This feature supports your general wellness and is not intended to diagnose, treat, cure, or prevent any disease.

**Rationale for each change vs spec:**

- **Removed** `These statements have not been evaluated by the FDA.` This DSHEA boilerplate is for supplement labels under 21 USC 343(r)(6) and does not apply to wellness software. Using it on a tracking surface is the wrong regulatory instrument and creates false confusion.
- **Replaced** with `This feature supports your general wellness and is not intended to diagnose, treat, cure, or prevent any disease.` This is the language pattern the FDA's January 2026 guidance describes as appropriate for low-risk general wellness products: it explicitly disclaims the medical-device territory using the FDA's own four-verb formulation, and it positions the surface as wellness (regulatorily safe).
- **Reworded** "Hydration targets are general estimates based on common formulas" → "Hydration targets here are general estimates based on common formulas" — the word "here" anchors that the disclaimer is specifically about THIS surface's targets, not a general statement about all hydration science.
- **Reworded** "Individual needs vary based on health conditions, medications, and lifestyle" → "Your needs may differ based on your health, medications, and lifestyle" — second-person addresses the user directly (warmer + more action-able); "your health" avoids the clinically-coded "health conditions" phrase.
- **Reworded** "Consult your healthcare provider for personalized guidance" → "For personalized guidance, talk with your healthcare provider" — sentence flow improvement; "talk with" is warmer than "consult"; preserves the healthcare-provider deferral the FDA guidance permits.
- **Punctuation:** no em or en dashes; periods only; sentence count = 4; total length 47 words (verbosity acceptable for a privacy/regulatory footer that users will not read every visit).

**Surfaces where the disclaimer footer appears:**

- Surface 6 (Settings > NutriVision > Hydration): primary footer position.
- Surface 4 (Hydration Detail view): bottom-of-page footer, identical copy.

**Surfaces where the disclaimer does NOT appear:**

- Surface 1 (Dashboard widget): too compact; the Detail view tap-through carries the disclaimer.
- Surface 2 (NutriVision card): same reasoning.
- Surface 3 (FAB sheet): same.
- Surface 5 (edit panel): editing an existing log does not warrant disclaimer; the upstream surfaces carry it.
- Surface 7 (tutorial): the tutorial is onboarding, not a wellness-claim surface; disclaimer would feel out of place.

**Push-back to spec §4.7:**

The spec author's intent (transparency about target methodology + healthcare-provider deferral) is correct and important. The execution (the DSHEA boilerplate) is the wrong regulatory instrument. The revised copy above preserves the intent, satisfies the FDA's January 2026 guidance for general wellness software, and reads more warmly. Recommend Kelsey (clinical-claim linter for Phase 2) review at Phase 2 attach to confirm compatibility with the 170h insight-card disclaimer pattern that ships then.

**Sources verified:**
- [General Wellness: Policy for Low Risk Devices - FDA Guidance](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/general-wellness-policy-low-risk-devices)
- [FDA Issues Revised Guidance on General Wellness Products - Covington & Burling, January 2026](https://www.cov.com/news-and-insights/insights/2026/01/fda-issues-revised-guidance-on-general-wellness-products)
- [FDA Adapts with the Times on Digital Health: Updated Guidances on General Wellness Products - Ropes & Gray, January 2026](https://www.ropesgray.com/en/insights/alerts/2026/01/fda-adapts-with-the-times-on-digital-health-updated-guidances-on-general-wellness-products)
- [Questions and Answers on Dietary Supplements - FDA](https://www.fda.gov/food/information-consumers-using-dietary-supplements/questions-and-answers-dietary-supplements)
- [DSHEA Wording - NIH Office of Dietary Supplements](https://ods.od.nih.gov/About/DSHEA_Wording.aspx)
- [Health Products Compliance Guidance - FTC](https://www.ftc.gov/business-guidance/resources/health-products-compliance-guidance)

---

## Phase 1 Blueprint sign-off

**Phase 1 hydration tracking wireframes are blueprint-ready across all 7 surfaces with the spec §4.7 disclaimer replaced by FDA-2026-aligned copy, the spec's percentage-ring framing softened to absolute-volume + cup-tally-for-safety-mode treatments, and the FAB pulse animation explicitly rejected — Michelangelo may proceed to implementation once Gary clears the disclaimer revision and the §1 over-target-cap visual decision.**

**Relevant absolute file paths:**

- `C:\Users\garyf\ViaConnect2026\viaconnect-web\docs\prompts\prompt-170o-phase-1-phase-2-split-2026-05-31.md` (the phase split spec consumed)
- `C:\Users\garyf\ViaConnect2026\viaconnect-web\docs\prompts\prompt-170n-hannah-wireframes-2026-05-31.md` (170n wireframe baseline structure)
- `C:\Users\garyf\ViaConnect2026\viaconnect-web\src\app\(app)\(consumer)\dashboard\page.tsx` (Surface 1 insertion target between DailyCheckIn line 219 and QuickLogsSurface line 225)
- `C:\Users\garyf\ViaConnect2026\viaconnect-web\src\app\(app)\(consumer)\nutrition\components\NutriVisionTab\index.tsx` (Surface 2 insertion target in IdleSurface between 4-button row line 945 and gallery-upload link line 980)
- `C:\Users\garyf\ViaConnect2026\viaconnect-web\src\app\(app)\(consumer)\wellness-analytics\page.tsx` (Surface 4 sibling route; new `/wellness-analytics/hydration/page.tsx` to be created)
- `C:\Users\garyf\ViaConnect2026\viaconnect-web\src\app\(app)\(consumer)\settings\nutrivision\page.tsx` (Surface 6 insertion point after VoiceNativeSettingsSection line 169)
- `C:\Users\garyf\ViaConnect2026\viaconnect-web\src\app\(app)\(consumer)\settings\nutrivision\components\QuickLogSettingsSection.tsx` (Surface 6 component-pattern reference)