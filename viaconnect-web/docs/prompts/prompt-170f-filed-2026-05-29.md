# Prompt 170f Filed: Recipe-Aware Logging with Save-as-Recipe and Auto-Match

Date: 2026-05-29
Status: **Filed at spec level; ratified.** No code work in this turn.
Memorialized by: Jeffery (orchestrator) per session pattern (mirrors 170d + 170e).
Wireframe author: Hannah (UX), filling Section 10 below.

## Mission (one line)

Capture the reality that people eat the same meals repeatedly by letting users save a meal as a personal recipe, then auto-matching future captures against the saved set so repeat meals collapse to one-tap portion confirmation with zero provider cost and sub-200 ms latency.

## Three match outcomes

| Outcome | Hamming threshold | Pipeline | Latency | Cost |
|---|---|---|---|---|
| Confident match | <= 4 of 64 | Short-circuit to portion confirmation | sub-200 ms | $0 |
| Suggested match | 5-8 of 64 | Surface match card; open-domain runs in parallel | standard + parallel | standard |
| No match | > 8 of 64 | Standard Prompt 170 pipeline | standard | standard |

Thresholds env-tunable. Multi-signal scoring (§4.3) combines pHash similarity, restaurant match, time correlation, and frequency factor — 0.85 confident, 0.65 suggested, below no match.

## Activation posture

Match check runs on EVERY analyze request before any provider call. The cost is one Postgres query against an indexed pHash column; it's effectively free. Users who never save a recipe get zero behavioral change (every request goes to standard pipeline).

Save-as-Recipe is opt-in via secondary CTA on the result review screen. Default off until the user explicitly saves a meal as a recipe.

## Why this is filed, not built

### Strong structural blocker per spec §21

> "Schedule 170f after at least one of 170d or 170e has shipped to validate composition behavior in production rather than only in integration tests."

Current state:
- 170d (multi-photo): filed + Hannah wireframes, NOT built
- 170e (restaurant context): filed + Hannah wireframes, NOT built

Neither prerequisite met. 170f is more deferred than either of 170d or 170e currently is.

### Additional structural blockers

| Blocker | Status | Resolution path |
|---|---|---|
| 170 production bake | Pushed 2026-05-29 commit `eb7ac04b`; no telemetry yet | Minimum 7 days production before cost-savings claims (§11.2) measurable |
| `photo_meal_blobs` CHECK reconstitution | Documented exception to append-only per §8.3 | Same one-shot pattern as 170e §7.8 |
| New `nutrivision-recipes` storage bucket | Not provisioned | Similar pattern to `nutrivision-meals` provisioned in Phase 1a |
| Two new Edge Functions | Not deployed | `recipe-cleanup-grace-expired` + `recipe-photo-blob-cleanup` |
| Gordon math tuning | Initial weights from §4.3 | Tuning requires post-launch telemetry on `recipe_match_user_rejected` events — by definition cannot pre-tune |
| Hannah wireframes (§10) | This turn | 9 surfaces to fill; second longest-pole Blueprint deliverable per §21 |

### Soft blockers

- **Cost model assumes baseline open-domain cost of $0.05/meal**: §11.2 projects $1,500/mo savings at 100k meals × 30% match rate. Our current state is Gemini-as-primary (no LOGMEAL_API_KEY); actual baseline differs. Projection needs adjustment.
- **Composition behavior with 170d + 170e is integration-tested only without production validation**: per §21, this is exactly why the spec defers 170f until at least one of those ships.

## Composition notes

- **170d (multi-photo): composes powerfully** per §7.1. Frame 1 (top-down) gets the recipe match check; confident match short-circuits the entire multi-frame job. Frames 2-5 are not captured. This is the strongest cost/UX unlock in the whole NutriVision stack.
- **170e (restaurant context): composes** per §7.2. Chain meals generally bypass Save-as-Recipe (chain catalogs already provide the template); user-customized chain meals (specific 7-slot Chipotle order) are the exception. Restaurant match is a hard reject in the multi-signal score (Chipotle recipe never matches a Sweetgreen photo).
- **170b (depth sensors): orthogonal**, optional per §7.3. Depth-validated portion suggestion when available.
- **170c (PHI image redaction + allergies + ED safety): composes** per §7.4 + §7.5. Allergy checks still run on recipe-matched meals; dietary restriction crossover applies identically.

## Cost model (filed reference)

At 30% recipe match rate (realistic post 60-day ramp on opted-in users):

| NutriVision meals/mo | Recipe-matched meals | Cost saved/mo |
|---|---|---|
| 1,000 | 300 | $15 |
| 10,000 | 3,000 | $150 |
| 100,000 | 30,000 | $1,500 |

Compounds with 170e at full adoption: combined savings ~$3,300/mo at 100k meals. Largest single cost reduction available in the NutriVision domain.

## Helix events (filed for 170f build phase)

To be inserted into `helix_earning_event_types` when 170f builds:
- `recipe_saved` (5 pt) — user saved a meal as a recipe template
- `recipe_logged` (4 pt) — user logged a meal that matched a saved recipe
- `recipe_matched_auto` (1 pt) — NutriVision auto-matched a capture with confident score
- `recipe_frequent_use_10` (2 pt) — user logged a recipe 10 times
- `recipe_frequent_use_25` (3 pt) — user logged a recipe 25 times
- `recipe_frequent_use_50` (5 pt) — user logged a recipe 50 times
- `recipe_frequent_use_100` (10 pt) — user logged a recipe 100 times

Geometric scale on frequent-use tiers acknowledges diminishing-likelihood thresholds.

## Migrations filed (8)

To be applied when 170f builds:
- `20260620_recipes.sql` — denormalized total macro columns + tsvector trigram index
- `20260620_recipe_photos.sql` — composite (user_id, phash_64) index for hot-path match query
- `20260620_recipe_items.sql` — mirrors meal_items shape for minimal mapping
- `20260620_photo_meal_blobs_recipe_template.sql` — CHECK reconstitution (documented exception to append-only)
- `20260620_meal_source_add_recipe.sql` — append-only enum extension
- `20260620_meals_recipe_cols.sql` — 5 new columns (source_recipe_id, recipe_portion_multiplier, recipe_match_score, matches_recipe, derived_from_recipe_id)
- `20260620_meal_items_recipe_cols.sql` — source_recipe_item_id FK
- `20260620_helix_recipe_events.sql` — 7 new event rows

## Limits and kill switch

- **Hard cap**: 100 recipes per user (§3.4)
- **Soft warning**: at 80 recipes
- **Photo cap**: 10 reference photos per recipe (FIFO replacement is future enhancement)
- **Soft delete**: 7-day grace window; nightly cleanup purges past expiration
- **Kill switch**: `RECIPE_AWARE_LOGGING_ENABLED` env var defaults true after launch; 24h false at first launch for smoke margin per §21

## Section 10: Wireframes (Hannah)

Hannah fills the wireframes for each surface below. These are the longest-pole Blueprint deliverable per spec §21. Gordon's math tuning is post-launch only (cannot pre-tune without telemetry), so Hannah's UX work is THE blocker for code build readiness.

### 10.1 Save-as-Recipe CTA on result review

**Mobile 375 wireframe (sticky bottom bar of Prompt 170 §10.5 result review):**

```
+-------------------------------------------------+
|  [existing result review scroll content]        |
|  ...                                            |
|  ...                                            |
+-------------------------------------------------+
|  Bottom safe area inset 34px (iOS)              |
|  +-------------------------------------------+  |
|  |  [Bookmark] Save as recipe                |  |  <- secondary outline 44px
|  +-------------------------------------------+  |
|  +-------------------------------------------+  |
|  |  Save meal                                |  |  <- primary Teal 52px
|  +-------------------------------------------+  |
+-------------------------------------------------+
```

**Desktop responsive (>= 768px):** secondary CTA sits to the LEFT of the primary Save meal CTA in a 2-column row, both 44px tall, primary keeps Teal fill and secondary stays outline. Same sticky behavior.

**Three states:**

1. **Default state** (library < 80 of 100, meal is not recipe-matched):
   - Outline Teal border 1.5px, Teal label, transparent fill
   - Icon Bookmark Lucide strokeWidth 1.5 size 20px
   - Label "Save as recipe" Instrument Sans 15px medium

2. **Cap-warning state** (library 80 to 99, meal is not recipe-matched):
   - Outline stays Teal, label unchanged
   - Subtitle BELOW the CTA in 12px Instrument Sans regular Orange #B75E18: "82 of 100 recipes used"
   - Subtitle only appears at >= 80 recipes; not present below 80

3. **Cap-reached state** (library == 100):
   - CTA disabled, border + label muted to Card #1E3054 at 60% opacity
   - Subtitle "Recipe library full. Delete one to save another." in Orange #B75E18

**Hidden vs disabled decision (matches_recipe=true):**

When the current meal is itself a recipe-matched logged meal (`matches_recipe=true`), the CTA is **HIDDEN**, not disabled. Rationale: the user already has this as a recipe; showing "Save as recipe" disabled-with-tooltip surfaces a non-action that the user did not request. Hidden is cleaner and respects the supplement §20 collaborative posture (no offering of dead-end paths). Discoverability concern is mitigated by the fact that the recipe match flow (§10.3 + §10.4) already orients the user to recipe-land in that session.

**Cap-warning surfacing decision (subtitle vs modal-only):**

Cap warning surfaces BOTH at the subtitle and inside the modal (§10.2). Subtitle is the early signal; modal is the commit-gate signal. Rationale: a user who never opens the modal still needs to know they are approaching the cap, otherwise the cap-reached state (option 3 above) is the first signal which is too late. The 80-99 threshold prevents the warning from being visually noisy for the long tail of users who never approach the cap.

**Interaction notes:**

- Tap target 44px minimum height
- Tap state: 150ms ease-out Teal background tint at 8% opacity
- On tap, modal §10.2 opens with 250ms slide-up from bottom (mobile) or 200ms fade-in (desktop)
- If cap-reached, tap is a no-op with 100ms shake animation (translateX +/- 4px three cycles) to signal disabled

**Accessibility:**

- aria-label: "Save this meal as a recipe template"
- When subtitle is present, aria-describedby links subtitle to button
- When disabled, aria-disabled="true" + button stays focusable so screen readers announce the reason via aria-describedby
- Focus order: secondary outline CTA -> primary Save meal CTA (left-to-right desktop; top-to-bottom mobile)
- Motor: 44px target meets WCAG 2.5.5 target size minimum; 8px gap between secondary and primary CTAs prevents fat-finger taps on wrong button
- Subtitle "82 of 100 recipes used" gets aria-live="polite" only when count first crosses 80 threshold (not on every render)

### 10.2 Save-as-Recipe modal

**Mobile 375 full-screen wireframe:**

```
+-------------------------------------------------+
|  Cancel                            Save recipe  |  <- top bar 56px
+-------------------------------------------------+
|                                                 |
|         +---------------------------+           |
|         |                           |           |  <- reference photo
|         |   [meal photo 240x180]    |           |     thumbnail centered
|         |                           |           |
|         +---------------------------+           |
|         Reference photo                         |  <- 13px Card #1E3054
|         1 of 10 reference photos.               |  <- 12px regular
|         More photos help us match better        |
|         next time.                              |
|                                                 |
|  Recipe name                                    |  <- 13px label
|  +-------------------------------------------+  |
|  | Sunday meal prep chicken bowl             |  |  <- 44px input
|  +-------------------------------------------+  |
|                                                 |
|  Note (optional)                                |
|  +-------------------------------------------+  |
|  |                                           |  |  <- 88px textarea
|  |                                           |  |
|  +-------------------------------------------+  |
|                                                 |
|  Include these items                            |  <- section header
|                                                 |
|  +-------------------------------------------+  |
|  |  Grilled chicken breast    [toggle ON]    |  |
|  |  6 oz                                     |  |
|  +-------------------------------------------+  |
|  +-------------------------------------------+  |
|  |  Brown rice                [toggle ON]    |  |
|  |  1 cup cooked                             |  |
|  +-------------------------------------------+  |
|  +-------------------------------------------+  |
|  |  Steamed broccoli          [toggle ON]    |  |
|  |  1 cup                                    |  |
|  +-------------------------------------------+  |
|  +-------------------------------------------+  |
|  |  Diet Coke                 [toggle OFF]   |  |
|  |  12 oz                                    |  |
|  +-------------------------------------------+  |
|                                                 |
|  Toggle off items you don't want as part        |  <- helper text 12px
|  of this recipe template.                       |
|                                                 |
+-------------------------------------------------+
```

**Desktop responsive (>= 768px):** centered card 560px wide, max-height 80vh with internal scroll, dimmed Navy backdrop at 60% opacity behind. Top bar becomes inline header with Cancel (left), title "Save as recipe" (center), Save recipe (right Teal text button). All other content unchanged.

**Cap-warning state (library 80 to 99):**

Subtitle below top bar in 12px Orange #B75E18: "82 of 100 recipes used. Delete recipes from your library if you need room."

**Name field prefill (§3.2 heuristic):**

- Standard: "[dominant_item] bowl" or "[restaurant] [signature_item]"
- Fallback: "Meal from [time of day]" (e.g. "Tuesday lunch")
- Restaurant context (170e composed): "[restaurant_name] [signature_item]" e.g. "Chipotle bowl"

**Name conflict inline validation:**

When the user types a name that already exists in their library, the input border switches to Orange #B75E18 and a 12px message appears below: **"You already have a recipe with this name."**

Rationale for "You already have a recipe with this name" over "Name must be unique": the conversational framing puts the user in the picture (it's THEIR library), matches the supplement §20 collaborative voice, and avoids implying the system is enforcing an arbitrary rule. "Name must be unique" reads like a database constraint message; the user did not ask for the database to be unique, they asked to save a recipe.

**Items list default state decision:**

All items pre-toggled **ON** by default with helper text "Toggle off items you don't want as part of this recipe template." below the list.

Rationale: the default-ON path matches user mental model; they are saving "this meal" as a recipe, which implies "all of this meal". Forcing them to select-in is friction for the dominant case (everything is part of the recipe). The exception case (excluding a side drink or condiment from the template) is served by toggle-off + clear helper text. The toggle-off path is also a useful affordance for the Diet Coke case shown above; the user repeats the chicken + rice + broccoli daily but the drink is incidental.

**Items list toggle interaction:**

- iOS-style toggle 44x24px Teal when ON, Card #1E3054 at 30% opacity when OFF
- Tap toggles + 80ms haptic light impact (Capacitor Haptics)
- When OFF, row content opacity drops to 60% (item name + qty greyed) to reinforce exclusion
- Macros chip below items list updates live as toggles change: "Recipe template macros: 420 kcal, 38g P, 42g C, 12g F"

**Reference photo subtitle:**

"1 of 10 reference photos. More photos help us match better next time."

Note: the "1 of 10" framing is honest (this is photo 1; you can add 9 more via Edit), not aspirational. The "More photos help us match better" framing positions multiple photos as a user benefit (better matching) not a chore.

**Top bar buttons:**

- Cancel: text button Navy #1A2744 left-aligned, no border
- Save recipe: text button Teal #2DA5A0 right-aligned, no border, becomes disabled (40% opacity) when name field is empty or in conflict state
- 56px header height on mobile; tap target 44px minimum

**Save flow:**

- On Save tap: 250ms loading spinner replaces Save label, then modal dismisses (250ms slide-down mobile, fade-out desktop)
- Toast appears at top: "Saved to your recipes" with [Bookmark] icon Teal, dismisses after 3 seconds
- User returns to result review screen with the secondary CTA now hidden (since matches_recipe is now true on the new derived recipe)

**Accessibility:**

- Modal traps focus on open; first focus on name input (already prefilled so user can immediately tap-edit)
- Escape key (desktop) + swipe-down gesture (mobile) trigger Cancel
- All toggles have aria-label "Include [item name] in recipe template"
- Live macros chip aria-live="polite" so screen reader announces updated totals after each toggle
- Cap-warning subtitle aria-live="polite" only on first appearance
- Reference photo has alt text "Captured meal photo, used as recipe reference"

### 10.3 Recipe match badge on result review (suggested match)

**Mobile 375 wireframe (prepended above standard result review):**

```
+-------------------------------------------------+
|  +-------------------------------------------+  |
|  |  [Bookmark]  Familiar?                    |  |  <- header 13px label
|  |                                           |  |
|  |  This looks like your Sunday meal prep    |  |  <- 16px regular
|  |  chicken bowl.                            |
|  |                                           |  |
|  |  +-----------+    +-----------+           |  |
|  |  |  [recipe  |    |  [current |           |  |  <- 120x120 thumbs
|  |  |   ref     |    |   capture |           |  |     8px gap
|  |  |   photo]  |    |   photo]  |           |  |
|  |  +-----------+    +-----------+           |  |
|  |  Saved recipe     Today's capture         |  |  <- 11px labels
|  |                                           |  |
|  |  +-------------------------------------+  |  |
|  |  |  Yes, use this recipe              |   |  |  <- Teal primary 44px
|  |  +-------------------------------------+  |  |
|  |  +-------------------------------------+  |  |
|  |  |  No, different meal                |   |  |  <- outline 44px
|  |  +-------------------------------------+  |  |
|  +-------------------------------------------+  |
|                                                 |
|  +-------------------------------------------+  |
|  |  [standard 170 result review renders here]|  |  <- existing content
|  |  ...                                      |  |
|  +-------------------------------------------+  |
```

**Desktop responsive (>= 768px):** card stays full-width within the result review column (max 720px), thumbnails grow to 160x160 with 12px gap, action row becomes horizontal (2 buttons side by side instead of stacked).

**Card styling:**

- Background Card #1E3054 1px Teal border at 20% opacity
- 16px internal padding
- 12px border-radius
- 16px margin-bottom separating from standard result review below

**Header tone decision: "Familiar?"**

After weighing three candidate framings, the winner is **"Familiar?"** as a 13px secondary header label, with the body copy carrying the proposition: "This looks like your [Recipe Name]."

Rejected alternatives:

- **"Is this your [Recipe Name]?"** is direct but makes the system the asker and the user the answerer in an interrogative posture. It works in voice assistants where the medium is conversational by default; in a card it reads as the app quizzing the user.
- **"We think this might be your [Recipe Name]?"** is appropriately humble but front-loads system uncertainty, which is the opposite of what a suggested-match card should do. The card exists because the system has a reasonable confidence; over-hedging undermines it.
- **"Familiar?"** alone (no body copy) is too terse and forces the user to infer what is familiar.

The chosen pattern, single-word header **"Familiar?"** plus body copy **"This looks like your [Recipe Name]."**, splits the work between the header (catches attention, sets register) and the body (carries the specific proposition). This matches supplement §20 collaborative-not-corrective voice: the system makes an observation, the user decides. The Recipe Name in body copy is rendered in Instrument Sans medium 16px to give it weight without italicizing.

**Auto-dismiss decision:**

The card **never auto-dismisses**. The user must explicitly tap one of the two CTAs to clear it, OR scroll past it and interact with the standard result review below (in which case the card stays at the top of scroll).

Rationale: a timeout dismiss would push the user toward inaction (just wait and the card goes away), which is hostile to the goal of capturing a recipe-match decision. Permanent presence respects the user's choice timing and matches the §20 collaborative posture (the system does not impose deadlines on the user's decisions). The standard result review below remains fully usable while the card is up, so the card does not BLOCK any action; it just persists until handled.

**Interaction notes:**

- "Yes, use this recipe" tap: 200ms card fade-out + replace entire result review with §10.4 portion confirmation screen (the matched-via-capture path). Emit `recipe_match_user_confirmed` helix event.
- "No, different meal" tap: 200ms card fade-out + standard result review remains. Emit `recipe_match_user_rejected` helix event (this is the telemetry source for Gordon's post-launch math tuning per §0 of the build sequencing).
- Both buttons get 80ms haptic light impact on tap (mobile)
- Thumbnails are NOT tappable (they are reference only, not actions)

**Side-by-side thumbnail framing:**

The "Saved recipe" thumbnail is the primary reference photo from the user's recipe library. The "Today's capture" thumbnail is the just-captured photo. Labels are 11px Card #1E3054 at 70% opacity directly beneath each thumbnail. This gives the user a visual confirm-or-reject path without having to remember what their saved recipe looks like.

**Accessibility:**

- Card has role="region" + aria-labelledby pointing to header
- Header "Familiar?" is treated as the region label; body copy reads as supporting content
- Recipe Name is announced inside the body copy (not as a separate aria-label) so screen reader users hear the full sentence
- Thumbnails have descriptive alt: "Saved recipe reference photo for Sunday meal prep chicken bowl" + "Today's captured meal photo"
- Focus order: Yes button -> No button -> (rest of result review)
- Both CTAs have aria-describedby pointing to the body copy so the question is restated in the action context
- Motor: 44px tap targets; 8px gap between CTAs prevents mis-tap

### 10.4 Portion confirmation screen (the one-tap path)

THE HEADLINE UX SURFACE OF 170f. This is what makes a 200ms recipe-matched meal feel rewarding instead of perfunctory.

**Mobile 375 wireframe:**

```
+-------------------------------------------------+
|  [chevron-left]                                 |  <- back to capture
+-------------------------------------------------+
|                                                 |
|  +----------+                                   |
|  | [thumb   |  Logging                          |  <- 13px label
|  |  56x56]  |  Sunday meal prep                 |  <- 18px medium
|  +----------+  chicken bowl                     |     2-line wrap OK
|                                                 |
|  +-------------------------------------------+  |
|  |  [chip] 420 kcal                          |  |
|  |  [chip] 38g P  [chip] 42g C  [chip] 12g F |  |  <- macros row
|  +-------------------------------------------+  |
|                                                 |
|                                                 |
|             +-------------------+               |
|            /                     \              |
|           /     +---------+       \             |
|          |      |   1x    |        |            |  <- portion ring
|          |      |  Save   |        |            |     280px diameter
|          |      +---------+        |            |     Teal stroke 12px
|           \                       /             |     animated on chip
|            \                     /              |     and slider change
|             +-------------------+                |
|                                                 |
|                                                 |
|  [0.5x] [0.75x] [ 1x ] [1.5x] [2x]              |  <- quick chips
|                  ^^^                            |     selected = Teal fill
|                                                 |
|  +---+-----+-----+-----+-----+-----+-----+---+  |
|  |.25|     |     |.75  |1x   |1.5  |2    |3x |  |  <- continuous slider
|  +---+-----+-----+-----+-----+-----+-----+---+  |     marked stops
|                                                 |
|  [Sparkles] This serving looks larger than      |  <- 170b depth note
|  your usual. Try 1.5x?     [Apply 1.5x]         |     when divergence>25%
|                                                 |
+-------------------------------------------------+
|  +-------------------------------------------+  |
|  |  Save                                     |  |  <- Teal primary 52px
|  +-------------------------------------------+  |
|  Edit details                                   |  <- text style 36px
+-------------------------------------------------+
```

**Desktop responsive (>= 768px):** layout uses 2-column grid: left column holds title block + macros + portion ring (centered within column); right column holds quick chips + slider + depth note + actions. Sticky bottom is replaced with right-column actions at bottom of right column. Portion ring grows to 320px.

**"Logging" tense decision (present continuous):**

The header reads **"Logging"** in present continuous (not "Logged" past tense, not "Log" imperative).

Rejected:

- **"Logged: [Recipe Name]"** (past tense) implies the meal is already saved before the user taps Save. It is dishonest because the data is not committed until Save tap. If a user backs out via the chevron-left, "Logged" would be a lie.
- **"Log: [Recipe Name]"** (imperative) reads as a directive (do this thing) which is the opposite of the celebratory tone we want at this moment.

Chosen: **"Logging"** (present continuous) accurately describes the in-progress state. It also subtly conveys momentum; the meal IS in the process of being logged, tapping Save completes it. The supplement §20 voice posture is honesty-by-default, and present continuous matches that. The smaller "Logging" label (13px) above the larger recipe name (18px medium) creates a hierarchy where the recipe is the hero and the verb is the supporting context.

After Save tap, the toast confirmation "Logged: [Recipe Name]" uses past tense correctly, because at that point the data IS saved.

**Portion ring visualization at multipliers > 1x:**

Below 1x: ring fills clockwise from 12 o'clock, Teal stroke, percentage of full ring proportional to multiplier (e.g. 0.5x = half ring).

At exactly 1x: full ring complete in Teal stroke 12px.

Above 1x to 2x: a SECOND ring grows OUTSIDE the first at radius +14px, Teal stroke at 60% opacity, fills clockwise proportional to the overage. So 1.5x shows full inner ring (1.0x) + half outer ring (0.5x overage).

Above 2x to 3x: a THIRD ring at radius +28px, Teal at 30% opacity, fills proportional to overage above 2x. So 2.5x shows full inner ring (1.0x) + full middle ring (1.0x = 2x total) + half outer ring (0.5x = 2.5x total).

This concentric ring treatment scales gracefully, communicates "more than usual" through visual weight, and stays brand-token consistent (no new colors, no badge labels needed). The multiplier number "1x" / "1.5x" / "2x" stays centered as the source of truth.

Rejected alternatives: a "+50%" badge would add a second numeric label competing with the multiplier; a gradient ring would compromise brand-token discipline (no new colors per §10.10).

**170b depth-suggestion note copy:**

When 170b depth sensor is available AND estimated portion divergence from saved recipe baseline is > 25% (estimate >= 1.25x or <= 0.75x), a Sparkles-icon note appears between the slider and the sticky bottom:

**"This serving looks larger than your usual. Try 1.5x?"** with an inline **"[Apply 1.5x]"** Teal text button.

For smaller-than-usual: **"This serving looks smaller than your usual. Try 0.75x?"** with **"[Apply 0.75x]"**.

The spec's draft copy is confirmed verbatim: it's collaborative (suggests not commands), specific (gives the actual multiplier), and reversible (the Apply button is one tap and the slider can be moved again after). The Sparkles icon (Lucide strokeWidth 1.5) telegraphs "smart suggestion" without claiming magical accuracy.

The note never auto-applies; user must tap Apply or ignore it. If the user already moved the slider away from 1x, the note re-renders with updated copy comparing to current value not 1x baseline.

**Quick chips interaction:**

- 5 chips in a single horizontal row, scrollable on narrow screens (375 fits all 5)
- Default selected: "1x" with Teal fill background, white label
- Unselected: Card #1E3054 fill, Teal border, Teal label
- Tap on chip: 150ms ease-out portion ring animates to new multiplier + 80ms haptic light impact + macros chip row updates live
- Slider position snaps to chip value
- Continuous slider drag updates chip selection if value lands exactly on a chip (within 0.05x tolerance)

**Continuous slider:**

- Range 0.25x to 3x, step 0.05x
- 6 marked stops at chip values (0.5x, 0.75x, 1x, 1.5x, 2x) plus endpoints (0.25x, 3x)
- Thumb is Teal 32px circle (large enough for motor accessibility)
- Track is 4px high, Card #1E3054 background, Teal fill from 0 to current position
- Drag end snaps to nearest chip value if within 0.05x tolerance, otherwise stays at exact drag value
- Haptic light impact on every 0.25x crossed during drag

**"Edit details" tone decision:**

The secondary action is **"Edit details"** as a text-style button (Teal label, no border, no background). Below the primary Save in the sticky bottom area, 36px tall, full width centered text.

Rejected: "Or open full editor" sounds like a downgrade; "Make changes" sounds reluctant; "Customize" implies the recipe template needs work.

**"Edit details"** is neutral, declarative, and treats the alternate path as a normal option not a fallback. The visual treatment (text-only, no border) gives it less weight than Save without making it look hidden or disabled. Users who tap fall through to the full result review screen with all 170 fields editable; their portion multiplier choice is preserved across the transition.

**Save flow:**

- Tap Save: 200ms button shrink to 96% + Teal background ripple, then transition to success toast
- Toast appears at top: "Logged: Sunday meal prep chicken bowl" with [Bookmark] icon Teal, dismisses after 3 seconds
- Screen returns to NutriVision capture entry point (not back to result review)
- Helix event `recipe_logged` (4 pt) fires; if frequency tier crossed, additional event fires (e.g. `recipe_frequent_use_10`)

**Accessibility:**

- Portion ring has role="img" with aria-label "Portion size [multiplier]x" updated live as multiplier changes
- Quick chips have role="radiogroup" with each chip role="radio" + aria-checked
- Slider has role="slider" + aria-valuemin="0.25" + aria-valuemax="3" + aria-valuenow + aria-valuetext "1.5 times standard portion"
- 170b depth note has role="status" + aria-live="polite" so it announces on appearance
- "Apply 1.5x" button has aria-label "Apply suggested portion 1.5 times"
- Save button has aria-label "Log meal at [multiplier]x portion"
- Edit details has aria-label "Open full result review to edit meal details"
- Focus order: back chevron -> quick chips (left to right) -> slider -> Apply suggestion (if present) -> Save -> Edit details
- Motor: 32px slider thumb meets 44px effective target (with padding); chip min-height 44px; Save 52px exceeds minimum
- Reduced motion: respect prefers-reduced-motion to skip ring animations (instant snap instead of 150ms ease)

### 10.5 Recipe library list view

**Mobile 375 wireframe (Settings > NutriVision > Recipes route):**

```
+-------------------------------------------------+
|  [chevron-left]    Your recipes        [+]      |  <- header 56px
|                                                 |     [+] = New recipe
|                                  27 of 100      |  <- count subtitle
+-------------------------------------------------+
|  +-------------------------------------------+  |
|  | [Search] Search recipes                   |  |  <- search 44px
|  +-------------------------------------------+  |
|                                                 |
|  [All]  [Favorites]  [Frequent]  [Recent]       |  <- filter chips
|   ^^^                                           |     scroll horizontal
|                                                 |
|  Sort:  Recently used [chevron-down]            |  <- sort 13px tap
|                                                 |
+-------------------------------------------------+
|  +-------------------------------------------+  |
|  | [thumb] Sunday meal prep                  |  |  <- 72px row
|  |  48x48  chicken bowl              [Star]  |  |
|  |         Used 14 times,                    |  |
|  |         last 2 days ago                   |  |
|  +-------------------------------------------+  |
|  +-------------------------------------------+  |
|  | [thumb] Chipotle bowl (my usual)  [Star]  |  |
|  |  48x48  Used 22 times,                    |  |
|  |         last 5 hours ago                  |  |
|  +-------------------------------------------+  |
|  +-------------------------------------------+  |
|  | [thumb] Greek yogurt and berries  [Star*] |  |  <- Star* = favorited
|  |  48x48  Used 8 times,                     |  |
|  |         last yesterday                    |  |
|  +-------------------------------------------+  |
|  ... (scrollable)                               |
|                                                 |
|  +-------------------------------------------+  |
|  | Recently deleted                          |  |  <- text link
|  +-------------------------------------------+  |
+-------------------------------------------------+
```

**Desktop responsive (>= 768px):** 2-column grid for recipe cards (each ~340px wide), search + filters + sort stay as horizontal row at top. Hover state on cards adds subtle elevation.

**Count chip wording decision: "27 of 100"**

Chosen: **"27 of 100"** as a 13px subtitle directly under the page title, right-aligned.

Rejected:

- **"27 recipes"** hides the cap, which means users hit 100 without warning. The cap is a real product constraint not a hidden detail; hiding it would set up a worse moment later.
- **"27 / 100"** is too utilitarian (looks like a progress bar fragment).

**"27 of 100"** is honest, scannable, and frames the 100 as a known ceiling. When the count crosses 80, the color shifts from Card #1E3054 to Orange #B75E18 to match the cap-warning treatment in §10.1 and §10.2. At 100 it stays Orange and the [+] new recipe button in the header dims to 40% opacity.

**Long-press affordance decision:**

Long-press to open action sheet (Quick Log, Edit, Delete) is the secondary path; the visible primary affordance is tap-to-open-detail.

To address discovery, a small **[more]** (Lucide MoreVertical strokeWidth 1.5 at 16px) icon appears at the right edge of each recipe row, vertically centered, between the Star and the row edge. Tap on the icon opens the same action sheet that long-press triggers. This gives discoverability for users who don't know long-press is available without compromising the long-press fast path for power users.

The action sheet appears as a bottom sheet on mobile (320px height, slides up from bottom) or as a popover on desktop (anchored to the [more] icon). Sheet items:

- **Quick log** with Repeat icon (Teal): opens §10.4 portion confirmation directly (no photo)
- **Edit recipe** with PencilLine icon: opens §10.7
- **Delete recipe** with Trash2 icon (Orange #B75E18): triggers delete confirmation

**Empty state decision:**

Zero recipes is a real user state for every user before they save their first recipe. The empty state:

```
+-------------------------------------------------+
|                                                 |
|              +---------------+                  |
|              |    [Library   |                  |  <- Library icon
|              |     icon      |                  |     56px Teal at 30%
|              |     56px]     |                  |
|              +---------------+                  |
|                                                 |
|        No recipes saved yet                     |  <- 18px medium
|                                                 |
|        Recipes save the meals you eat           |  <- 14px Card #1E3054
|        often so you can log them with           |
|        one tap next time.                       |
|                                                 |
|        Open NutriVision to capture a meal,      |
|        then tap Save as recipe.                 |
|                                                 |
|        +---------------------------------+      |
|        |  Open NutriVision               |      |  <- Teal primary 44px
|        +---------------------------------+      |
|                                                 |
+-------------------------------------------------+
```

The empty state is descriptive (what is a recipe?) + instructive (how do I make one?) + actionable (CTA to the path that creates one). The CTA "Open NutriVision" routes to the NutriVision capture screen, not to a tutorial; the user does best by trying it.

**Filter chip behavior:**

- **All**: default selected, shows all non-deleted recipes
- **Favorites**: shows only recipes where favorite=true
- **Frequent**: shows recipes with log_count >= 5 sorted by log_count descending
- **Recent**: shows recipes with last_used_at within 7 days, sorted by last_used_at descending

Selection state: Teal fill + white label when active; Card #1E3054 fill + Teal label when inactive. Scroll horizontal if filter row overflows.

**Sort dropdown:**

Default: "Recently used" (sort by last_used_at descending).

Other options:
- "Most used" (log_count descending)
- "Alphabetical" (name ascending)
- "Recently saved" (created_at descending)

Sort dropdown appears as a bottom sheet on mobile, native select on desktop.

**Row subtitle copy:**

- "Used N times, last [relative time]": N = log_count, relative time formatted by NutriVision time-format library
- When N == 0: "Saved [relative time]" (e.g. "Saved yesterday")
- When N == 1: "Used 1 time, last [relative time]" (not "Used 1 times")
- When last_used_at is today: "last today" or "last [N] hours ago" if available

**Interaction notes:**

- Tap on row body opens §10.6 recipe detail with 300ms slide-from-right
- Tap on star toggles favorite + 80ms haptic + 200ms fill animation
- Long-press (500ms hold) OR tap on [more] icon opens action sheet
- Pull-to-refresh on the list re-queries Postgres for updated log counts and recently used (useful after logging from elsewhere)
- Recently deleted link is text-only Card #1E3054 70% opacity 14px, separated from the list by 24px margin

**Accessibility:**

- Search input has aria-label "Search your recipes"
- Filter chips are role="tablist" with each chip role="tab" + aria-selected
- Recipe rows are role="button" with aria-label "Open recipe details for [Recipe Name], used [N] times, last [relative time]"
- Star toggle has aria-pressed + aria-label "Mark as favorite" or "Remove from favorites"
- [More] icon has aria-label "More actions for [Recipe Name]"
- Empty state CTA has clear aria-label "Open NutriVision to capture a meal"
- Count subtitle aria-live="polite" when count crosses thresholds (80, 100)
- Motor: row tap target is full 72px height including thumb area; [More] icon padded to 44px tap target
- Recently deleted link min 44px tap target via padding

### 10.6 Recipe detail view

**Mobile 375 wireframe:**

```
+-------------------------------------------------+
|  [chevron-left]                    [Share*]     |  <- Share* disabled
+-------------------------------------------------+
|  +-------------------------------------------+  |
|  |                                           |  |
|  |        [hero photo carousel               |  |  <- 280px tall
|  |         swipeable, 1 of 3]                |  |     full bleed
|  |                                           |  |
|  |              o  o  o                      |  |  <- indicator dots
|  +-------------------------------------------+  |
|                                                 |
|  Sunday meal prep                  [Star]       |  <- 22px medium
|  chicken bowl                                   |
|                                                 |
|  [Chipotle]                                     |  <- restaurant chip
|                                                 |     (if applicable)
|  +-------------------------------------------+  |
|  | Macros (1x portion)                       |  |
|  |                                           |  |
|  | 420 kcal                                  |  |
|  | 38g protein                               |  |
|  | 42g carbs                                 |  |
|  | 12g fat                                   |  |
|  +-------------------------------------------+  |
|                                                 |
|  Items                                          |  <- section header
|  +-------------------------------------------+  |
|  | Grilled chicken breast        6 oz        |  |
|  | Brown rice                    1 cup       |  |
|  | Steamed broccoli              1 cup       |  |
|  +-------------------------------------------+  |
|                                                 |
|  When you eat this                              |  <- usage stats
|  +-------------------------------------------+  |
|  |  Time of day                              |  |
|  |  +-----------------------------------+    |  |
|  |  |                  [bar at 12-1pm]  |    |  |
|  |  +-----------------------------------+    |  |
|  |  6a    9a    12p    3p    6p    9p        |  |
|  |                                           |  |
|  |  Days of week                             |  |
|  |  S   M   T   W   T   F   S                |  |
|  |  o   O   o   O   o   .   O                |  |  <- scaled dots
|  +-------------------------------------------+  |
|                                                 |
|  Note                                           |  <- (if non-empty)
|  Eat after gym, skip the rice if doing keto.    |
|                                                 |
+-------------------------------------------------+
|  +-------------------------------------------+  |
|  |  [Repeat] Log this recipe                 |  |  <- Teal primary 52px
|  +-------------------------------------------+  |
|  +-------------------------------------------+  |
|  |  [PencilLine] Edit recipe                 |  |  <- outline 44px
|  +-------------------------------------------+  |
|  +-------------------------------------------+  |
|  |  [Trash2] Delete recipe                   |  |  <- outline 44px
|  +-------------------------------------------+  |     Orange #B75E18
+-------------------------------------------------+
```

**Desktop responsive (>= 768px):** 2-column layout. Left column holds hero carousel + title + restaurant chip + macros + items list. Right column holds usage stats + note + actions (vertical stack). Hero carousel grows to 480x320.

**Hero photo carousel:**

- Up to 10 reference photos (per §3.4 photo cap)
- Swipe left/right (mobile) or arrow keys (desktop) to navigate
- Indicator dots at bottom, current dot Teal solid, others Teal 30% opacity
- Tap on photo expands to full-screen lightbox (standard image viewer pattern)
- First photo in carousel is the primary reference photo (used in §10.3 match card)

**Share-disabled-with-tooltip:**

Top-right header has Share icon Lucide strokeWidth 1.5 at 40% opacity. Tap shows tooltip: **"Sharing coming soon."** (140ms fade-in, 2 second auto-dismiss).

Rationale for keeping the disabled state visible (not hidden): teases the feature roadmap without overcommitting. The tooltip is matter-of-fact.

**Time-of-day pattern viz decision:**

Chosen: **horizontal bar chart with single bar at peak hour band**, 24px tall, full row width minus 16px padding.

- X-axis labels: 6a, 9a, 12p, 3p, 6p, 9p (6 marks evenly spaced)
- Single Teal bar shows the dominant 1-hour band where the user most frequently logs this recipe
- If usage is bimodal (two distinct peaks > 25% each), show two bars
- If usage is uniform (no clear peak), show full-width Teal at 30% opacity with text "Eaten throughout the day"
- If log_count < 3, hide the viz entirely (not enough data) and show "Log this recipe a few more times to see your patterns."

Rejected: calendar heatmap would be visually heavy and gridded; a smaller widget would lose readability. The single-bar approach is brand-token disciplined and scans in 1 second.

**Day-of-week dots scaling decision:**

7 dots labeled S M T W T F S. Each dot diameter scales by frequency:

- Min size: **8px** (motor-impairment readable minimum)
- Max size: **20px**
- Scale: linear from 8px at 0 logs to 20px at max-day logs over last 90 days
- A day with 0 logs renders as 8px dot at 20% Teal opacity (visible but de-emphasized)
- A day at max gets full Teal opacity

Min 8px ensures every dot is perceivable even for users with low-vision or low-contrast displays. The 8 to 20px range gives enough visual differentiation to read frequency without making max-days feel cartoonishly large.

If log_count < 7, hide the day-of-week row (not enough data to be meaningful) and surface only the time-of-day bar.

**Delete confirmation tone decision:**

Tap Delete recipe opens a bottom sheet (mobile) or centered dialog (desktop):

```
+-------------------------------------------------+
|                                                 |
|  Delete Sunday meal prep chicken bowl?          |  <- 18px medium
|                                                 |
|  This recipe will move to Recently deleted      |  <- 14px regular
|  for 7 days. After that, it will be removed     |
|  permanently.                                   |
|                                                 |
|  +-------------------------------------------+  |
|  |  Delete recipe                            |  |  <- Orange primary
|  +-------------------------------------------+  |     #B75E18
|                                                 |
|  Cancel                                         |  <- text Navy
|                                                 |
+-------------------------------------------------+
```

Chosen tone: **informative not alarming**. The body copy describes what happens next (moved to Recently deleted, 7-day grace, then permanent removal) without using fear words like "destroy" or "lose forever". This is the supplement §20 collaborative voice applied to a destructive action: tell the user what is going to happen, let them decide.

Rejected: "Are you sure?" reads mechanical. "Are you sure you want to delete this recipe? This action cannot be undone." has a first half mechanical and a second half misleading (action CAN be undone within 7 days). The chosen copy is both honest and de-escalates the moment.

**Macros card:**

Static at 1x portion. User who wants to see at 1.5x portion can tap Log this recipe and use the §10.4 portion confirmation. Inline portion multiplier on the detail view would be feature-creep and competes with §10.4.

**Items list:**

Read-only on the detail view. Editing happens in §10.7 Edit recipe modal. No edit affordance on rows here.

**Restaurant chip:**

Appears below title only if recipe was saved with restaurant context (170e composed). Chip is Card #1E3054 fill, Teal border 1px, 13px Teal label, MapPin icon Lucide strokeWidth 1.5 at 14px. Tap on chip routes to restaurant detail page (deferred until 170e ships).

**Notes section:**

Renders only when notes field is non-empty. 13px Card #1E3054 label "Note" + 14px body. No edit affordance here; editing routes through §10.7.

**Interaction notes:**

- Carousel swipe gestures use react-swipeable or equivalent (1:1 touch tracking)
- Carousel auto-advance disabled (manual navigation only)
- Log this recipe tap opens §10.4 portion confirmation in Quick Log mode (§10.8)
- Edit recipe tap opens §10.7 modal
- Delete confirmation cancellation closes sheet with 200ms slide-down
- Delete confirmation confirm fires soft-delete + routes back to library list with toast "Recipe deleted. Restore from Recently deleted within 7 days."

**Accessibility:**

- Hero carousel role="region" aria-label "Recipe reference photos, [N] of [total]"
- Indicator dots role="tablist" each role="tab" + aria-selected
- Star toggle aria-pressed + aria-label "Mark as favorite" or "Remove from favorites"
- Share disabled state aria-disabled="true" + aria-describedby pointing to tooltip-text element with "Sharing coming soon"
- Time-of-day viz role="img" aria-label "Most often logged around [peak hour band]"
- Day-of-week dots role="img" aria-label "Logged most on [day], least on [day]"
- When viz is hidden due to insufficient data, the prompt text "Log this recipe a few more times to see your patterns." has role="status"
- Delete confirmation traps focus on the cancel button by default (safer landing per accessibility convention)
- Motor: 52px primary CTA + 44px secondary CTAs; 8px gap between buttons

### 10.7 Edit recipe modal

**Mobile 375 full-screen wireframe:**

```
+-------------------------------------------------+
|  Cancel                          Save changes   |  <- top bar 56px
+-------------------------------------------------+
|                                                 |
|  Reference photos                               |  <- 13px label
|                                                 |
|  +------+ +------+ +------+                     |
|  |      | |      | |      |                     |  <- 3-col grid
|  | [X]  | | [X]  | | [X]  |                     |     104x104px tiles
|  +------+ +------+ +------+                     |     8px gap
|                                                 |
|  +------+ +------+ +------+                     |
|  |      | |      | |  +   |                     |  <- [+] = add tile
|  | [X]  | | [X]  | |      |                     |
|  +------+ +------+ +------+                     |
|                                                 |
|  4 of 10 reference photos                       |  <- 12px subtitle
|                                                 |
|  Recipe name                                    |
|  +-------------------------------------------+  |
|  | Sunday meal prep chicken bowl             |  |
|  +-------------------------------------------+  |
|                                                 |
|  Note (optional)                                |
|  +-------------------------------------------+  |
|  | Eat after gym, skip the rice if doing keto|  |
|  |                                           |  |
|  +-------------------------------------------+  |
|                                                 |
|  Items                                          |
|                                                 |
|  +-------------------------------------------+  |
|  | Grilled chicken breast        [toggle ON] |  |
|  | 6 oz                                      |  |
|  +-------------------------------------------+  |
|  +-------------------------------------------+  |
|  | Brown rice                    [toggle ON] |  |
|  | 1 cup                                     |  |
|  +-------------------------------------------+  |
|  ...                                            |
|                                                 |
+-------------------------------------------------+
```

**Desktop responsive (>= 768px):** centered card 720px wide (wider than §10.2 to accommodate 4-column photo grid). Dimmed Navy backdrop at 60% opacity. Top bar becomes inline header.

**Photo grid layout decision:**

Chosen: **3-column grid on mobile**, 4-column on desktop, 8px gap.

- Each tile is square (104x104 mobile, 156x156 desktop)
- Tiles wrap onto multiple rows
- 10-photo cap means max 4 rows on mobile (3+3+3+1) or 3 rows on desktop (4+4+2)
- The plus tile (add new photo) is always the last tile in the grid

Rejected:

- **2-row horizontal scrollable** would hide photos below the fold and require horizontal scrolling, which is awkward on touch
- **Stacked vertical list** would consume too much vertical space (10 photos = 10 rows)

The 3-column grid stays compact and shows all photos at a glance.

**Photo tile interactions:**

- **X-to-remove**: 24px circle Card #1E3054 background, white X icon Lucide strokeWidth 1.5, top-right corner of tile, 4px inset. Tap shows inline confirm: tile dims to 30% opacity + tile content swaps to "Remove?" text + "Undo" Teal link replaces X. After 3 seconds without Undo, the removal commits in modal state. Save changes commit hits DB.
- Single tile click (not on X): opens full-screen lightbox showing the photo, swipe-down to dismiss
- Plus tile (Plus icon Lucide strokeWidth 1.5 at 32px, centered, Teal): opens add-photo flow

**"Add from recent captures" affordance decision:**

Tap on the [+] plus tile opens a bottom sheet (mobile) or popover (desktop) with two options:

```
+-------------------------------------------------+
|  Add reference photo                            |
|                                                 |
|  +-------------------------------------------+  |
|  |  [Camera] Capture new photo               |  |  <- Teal outline
|  +-------------------------------------------+  |
|  +-------------------------------------------+  |
|  |  [Images] Choose from recent meals        |  |  <- Teal outline
|  +-------------------------------------------+  |
|                                                 |
|  Cancel                                         |
+-------------------------------------------------+
```

Both options are offered. Rationale: the spec asks "photo picker showing last N captures from photo_meal_blobs, Capacitor photo library access, or both"; both is the right answer because they serve different user needs:

- **Capture new photo** is faster when the user is mid-cooking and wants a fresh photo (Capacitor Camera plugin native UI)
- **Choose from recent meals** lets the user retroactively add a photo from a meal they already logged via NutriVision (last 30 photo_meal_blobs queried)

A full photo library picker (any image from iOS Photos) is out of scope for v1; it introduces RLS + storage cost questions (any image, not just NutriVision meals). Defer to future enhancement.

**Choose from recent meals flow:**

Bottom sheet expands to show a scrollable 3-column grid of the user's last 30 NutriVision meal photos:

- Each tile is 104x104 with meal date subtitle "Yesterday 12:30p"
- Tap on tile adds it as the next reference photo, dismisses the sheet, returns to edit modal
- Header "Recent meals" + Cancel text button left

**Capture new photo flow:**

Tap routes to Capacitor Camera plugin native UI. On capture confirm, the photo uploads to `nutrivision-recipes` bucket, adds to recipe's photo array, dismisses sheet, returns to edit modal.

**Cap-at-10 behavior:**

When recipe has 10 photos, the plus tile is hidden. Subtitle changes to "10 of 10 reference photos. Remove one to add another."

**Other fields:**

Same as §10.2 Save-as-Recipe modal: name field with conflict validation, note textarea, items list with toggles.

Difference: items list now reflects current recipe template state. Toggling OFF a previously-included item shows a warning subtitle: "This item will no longer count when matching future captures." Save commits the removal.

**Save flow:**

- Tap Save changes: 250ms loading spinner, then modal dismisses
- Toast appears: **"Recipe updated"** with Bookmark icon Teal, 3-second auto-dismiss
- Returns to §10.6 detail view with refreshed state

**Cancel flow:**

- If no fields changed, Cancel dismisses immediately
- If fields changed, Cancel shows a confirm dialog: "Discard changes to this recipe?" with **Discard** (Orange) + **Keep editing** (Teal text). This prevents accidental data loss.

**Accessibility:**

- Photo grid role="grid" each tile role="gridcell"
- X-to-remove has aria-label "Remove reference photo [N]"
- Inline confirm Undo link has aria-live="polite"
- Plus tile aria-label "Add reference photo, [4] of [10] used"
- Capture new photo / Choose from recent meals are role="button" with descriptive aria-labels
- Toast "Recipe updated" role="status" aria-live="polite"
- Discard confirm traps focus on Keep editing (safer default)
- Motor: 104px tile is far above 44px minimum; X-to-remove 24px icon has 16px padding for 40px effective tap target (still slightly under 44px, accept this trade-off because removing a photo accidentally is undoable via Undo link)

### 10.8 Quick Log from recipe detail (no photo)

**Mobile 375 wireframe (variant of §10.4 with no-photo treatment):**

```
+-------------------------------------------------+
|  [chevron-left]                                 |
+-------------------------------------------------+
|                                                 |
|  +----------+                                   |
|  | [recipe  |  Logging                          |
|  |  primary |  Sunday meal prep                 |
|  |  photo   |  chicken bowl                     |
|  |  56x56]  |                                   |
|  +----------+                                   |
|                                                 |
|  [Repeat] Quick log, no new photo               |  <- pill badge below
|                                                 |     title block
|                                                 |
|  +-------------------------------------------+  |
|  |  [chip] 420 kcal                          |  |
|  |  [chip] 38g P  [chip] 42g C  [chip] 12g F |  |
|  +-------------------------------------------+  |
|                                                 |
|             +-------------------+               |
|            /                     \              |
|           /     +---------+       \             |
|          |      |   1x    |        |            |  <- same portion ring
|           \                       /              |     as §10.4
|             +-------------------+                |
|                                                 |
|  [0.5x] [0.75x] [ 1x ] [1.5x] [2x]              |
|                                                 |
|  +---+-----+-----+-----+-----+-----+-----+---+  |
|  |.25|     |     |.75  |1x   |1.5  |2    |3x |  |
|  +---+-----+-----+-----+-----+-----+-----+---+  |
|                                                 |
+-------------------------------------------------+
|  +-------------------------------------------+  |
|  |  Save                                     |  |  <- Teal primary 52px
|  +-------------------------------------------+  |
|  Edit details                                   |  <- text style
+-------------------------------------------------+
```

**Desktop responsive (>= 768px):** same 2-column layout as §10.4. The 56x56 thumb in the title block uses the recipe's primary reference photo (first in the carousel from §10.6).

**No-current-capture treatment decision:**

The single 56x56 thumb in the title block uses the **recipe's primary reference photo** (the first photo in the recipe's carousel). No separate "current capture" thumb is shown because there is no current capture.

Below the title block, a **pill badge** reads: **"[Repeat] Quick log, no new photo"** with Repeat icon Lucide strokeWidth 1.5 at 14px. Background Card #1E3054, Teal label 12px medium, 4px vertical padding, 10px horizontal padding, full pill border-radius.

Rejected alternatives:

- **Empty space where current capture would be** is confusing because users see asymmetry without explanation
- **Single thumb with no annotation** loses the "this is a fast path, no photo needed" framing that makes the quick log mode feel legitimate not undercut
- **"Logging without a photo"** as a sentence below the title is too apologetic and uses passive negative framing

The pill badge is small, factual, and uses **Repeat** icon to signal "this is a repeat of a known recipe" not "this is missing a photo". The framing is positive (Quick log = fast path) not negative (no photo = data deficit).

**Tone decision: making no-photo feel legitimate**

The supplement §20 voice posture is collaborative not corrective. Quick log without a photo is a deliberately fast path for users who eat the same recipe repeatedly and don't need to re-document it photographically every time. The UX should signal "we know you know what this meal looks like" not "you forgot to take a photo".

Reinforced by:

- The "Quick log" pill badge framing (not "no photo")
- The recipe's primary reference photo standing in as the visual anchor (not empty space)
- No "Add a photo?" prompt anywhere on the screen
- Toast on save uses the same wording as photographed logs: "Logged: Sunday meal prep chicken bowl"
- Helix event `recipe_logged` fires at same 4-pt value whether photo present or not

The result: a user who taps Log this recipe -> Save in 3 taps feels efficient, not skipping a step.

**Optional add-a-photo escape hatch:**

The Edit details text button at the bottom (same as §10.4) takes the user to the full result review where a Camera CTA is available. This is the same "fall through to power-user editor" pattern as §10.4. A user who realizes mid-flow they DO want to attach a photo isn't stuck.

**Save flow:**

- Tap Save: same animation pattern as §10.4
- Toast: "Logged: Sunday meal prep chicken bowl"
- Returns to recipe detail view (NOT to NutriVision capture, since the user came from detail not from capture)
- meal.source = 'recipe_quick_log' (new meal_source enum value covered in §8.5 of spec)
- meal.matches_recipe = true, meal.source_recipe_id set
- No photo_meal_blob row created (consistent with no-photo path)

**Three-tap path:**

1. Tap recipe in library list -> opens detail
2. Tap Log this recipe -> opens §10.8 portion confirmation
3. Tap Save -> meal logged

Adjust multiplier via chips or slider before tap 3 if needed.

**Accessibility:**

- Pill badge has role="status" + aria-label "Quick log mode, no new photo taken"
- Recipe primary photo thumb has aria-label "Recipe reference photo for [Recipe Name]"
- All other a11y patterns same as §10.4 (portion ring, chips, slider, Save, Edit details)
- Save toast wording matches photo-path so screen reader users get parity feedback regardless of mode

### 10.9 Recently deleted subpage

**Mobile 375 wireframe (route /settings/recipes/recently-deleted):**

```
+-------------------------------------------------+
|  [chevron-left]  Recently deleted               |  <- header 56px
+-------------------------------------------------+
|                                                 |
|  Recipes you delete stay here for 7 days,       |  <- 14px Card #1E3054
|  then they are removed.                         |     intro copy
|                                                 |
|  +-------------------------------------------+  |
|  | [thumb] Tuesday taco bowl                 |  |
|  |  48x48  Deleted 1 day ago                 |  |
|  |         6 days left              [Restore]|  |
|  +-------------------------------------------+  |
|  +-------------------------------------------+  |
|  | [thumb] Greek yogurt parfait              |  |
|  |  48x48  Deleted 3 days ago                |  |
|  |         4 days left              [Restore]|  |
|  +-------------------------------------------+  |
|  +-------------------------------------------+  |
|  | [thumb] Quick smoothie                    |  |
|  |  48x48  Deleted 5 days ago                |  |
|  |         2 days left              [Restore]|  |
|  +-------------------------------------------+  |
|  +-------------------------------------------+  |
|  | [thumb] Old chicken bowl                  |  |
|  |  48x48  Deleted 6 days ago                |  |
|  |         1 day left              [Restore] |  |  <- Orange "1 day left"
|  +-------------------------------------------+  |
|                                                 |
+-------------------------------------------------+
```

**Desktop responsive (>= 768px):** 2-column grid for recently-deleted cards (each ~340px), header stays as full-width row.

**Empty state (no recently deleted recipes):**

```
+-------------------------------------------------+
|                                                 |
|              +---------------+                  |
|              |   [History    |                  |  <- History icon
|              |    icon       |                  |     56px Teal at 30%
|              |    56px]      |                  |
|              +---------------+                  |
|                                                 |
|        Nothing here right now                   |  <- 18px medium
|                                                 |
|        Recipes you delete will stay here        |  <- 14px Card #1E3054
|        for 7 days before they are removed.      |
|                                                 |
|        +---------------------------------+      |
|        |  Back to recipes                |      |  <- Teal outline
|        +---------------------------------+      |
|                                                 |
+-------------------------------------------------+
```

**"Permanent removal" tone decision:**

Chosen: **matter-of-fact**, with the slight reframe to "removed" not "permanent removal".

Intro copy reads: **"Recipes you delete stay here for 7 days, then they are removed."**

Per-row subtitle reads: **"Deleted [N] days ago" / "[M] days left"**

Rejected:

- **"permanent removal"** + **"permanently deleted"** are technically accurate but alarming. The word "permanent" front-loads finality at every glance, which is overweighted for the small fraction of cases where the user actually cares.
- **"Forever deleted"** is too dramatic for a personal recipe template
- **"gone for good"** is informal but feels like a taunt

**"They are removed"** is matter-of-fact, accurate, and reads quietly. The 7-day grace is communicated up front, and the per-row days-left is the action-relevant signal. When days-left == 1, the "1 day left" label switches to Orange #B75E18 to escalate the urgency for that specific row; that's where the user attention belongs.

This matches the supplement §20 voice posture: honest, not dramatic. The system tells the user what is going to happen, no fear words, no apology.

**Restore button copy decision:**

Chosen: **"Restore"**.

Rejected:

- **"Bring back"** is warmer but slightly informal. For a settings-area utility action, the system register is "clear and direct" not "warm and folksy". Bring back also has a slight cluttered-cabin feel ("I want my old stuff back") whereas Restore is neutral.
- **"Undelete"** is a technical term that mismatches the consumer-facing tone of the rest of the surface
- **"Recover"** carries data-loss disaster connotations (recover from a crash) that are too heavy for a recipe delete

**"Restore"** is one word, action-clear, register-appropriate for the settings context, and used by many consumer products (iOS Photos, Gmail, etc.) for this exact pattern: familiar without being unimaginative.

**Restore interaction:**

- Tap Restore: 200ms button shrink + Teal background ripple
- 250ms toast appears at top: **"Restored to your recipes"** with Bookmark icon Teal, 3-second auto-dismiss
- Row animates out (200ms fade + 100ms collapse height) and the rest of the list reflows
- DB clears deleted_at and the recipe reappears in §10.5 library list
- If the recipe is restored AND the user is at 100 recipes already (because they deleted to make room and then restored), show an error toast: **"You're at the recipe cap. Delete another recipe to restore this one."** Restore does not commit in that case.

**Ordering decision: most recently deleted first**

Chosen: **most recently deleted first** (deleted_at descending).

Rejected: alphabetical would scatter the "I just deleted this by accident" use case across the alphabet, making the recovery slower. Recency-first puts the most likely restore candidate at the top of the list.

Secondary sort: when two recipes were deleted at the same timestamp (rare; would require batch delete which is not in 170f scope), tiebreak by name ascending.

**Row subtitle formatting:**

- "Deleted [relative time]": uses same time-format library as elsewhere in NutriVision
  - "Deleted today" / "Deleted yesterday" / "Deleted N days ago"
- "[M] days left": countdown from 7
  - "6 days left" / "1 day left" (Orange #B75E18)
  - When < 24 hours remain: "Less than 1 day left" (Orange)

**Auto-purge behavior:**

The nightly cleanup Edge Function `recipe-cleanup-grace-expired` purges recipes where deleted_at < now() - 7 days. When a recipe is purged, it silently disappears from this list at the next page load. No user-facing notification of purge (would create anxiety; user has had 7 days of warning via days-left countdown).

**Accessibility:**

- Header has aria-label "Recently deleted recipes"
- Intro copy is plain text (read in normal flow by screen reader)
- Each row has role="listitem"; row description aria-label "Recipe [Name], deleted [N] days ago, [M] days left, tap Restore to recover"
- Restore button has explicit aria-label "Restore [Recipe Name] to your recipes"
- When days-left changes color to Orange, aria-live="polite" announces "1 day left" only once (not on every render)
- Restored toast has role="status" aria-live="polite"
- Cap-error toast (rare path) role="alert" because it interrupts the user's intent
- Motor: full-row tap target 72px height for the Restore button (button area is right-side aligned but extends visually); 8px padding around Restore label
- Empty state CTA aria-label "Return to your recipes list"

**Voice summary across §10.3 + §10.4 + §10.9:**

- §10.3 suggested match: header "Familiar?" + body "This looks like your [Recipe Name]." reads observational, not interrogative; the user owns the decision
- §10.4 portion confirmation: "Logging [Recipe Name]" uses present continuous, honest about in-progress state, momentum without overclaim; after Save the toast uses past tense correctly
- §10.9 recently deleted: "they are removed" instead of "permanent removal" reads matter-of-fact, escalation only on the 1-day-left row, action verb "Restore" is direct without coldness

### 10.10 Brand tokens enforced

All surfaces use Navy `#1A2744`, Card `#1E3054`, Teal `#2DA5A0`, Orange `#B75E18`. Instrument Sans. Lucide React strokeWidth 1.5. NO emojis. NO em or en dashes.

New icons used in this flow: Bookmark + BookmarkPlus (recipe save and match), Library (library list view), Star (favorite, filled when active), Repeat (quick log), Trash2 (delete), History (recently deleted), Sparkles (recipe auto-match badge), Clock (last used).

## Notes Hannah may want to consider

- The portion confirmation screen (§10.4) is the headline UX innovation in 170f: a meal goes from intent to logged in under 200 ms with one tap. Wireframe the warm "Logged" framing carefully — confirmation should feel rewarding not perfunctory.
- The suggested match card (§10.3) competes for attention with the standard result review below it. Tone needs to be "Is this familiar?" not "We think this is X" (the latter implies the system is making a claim about user identity).
- The cap warning at 80 recipes (§10.2) is borderline: too prominent and feels like a limit; too subtle and users hit the hard cap surprised. Find balance.
- Soft-delete UX (§10.9): the 7-day grace is for accidental deletes. The restore button copy should not feel apologetic ("oops"); it should feel like a normal recovery.

## Sequencing 170f still needs (in order)

1. **170 Phase 1 baked in production minimum 7 days with telemetry**
2. **At least one of 170d or 170e shipped in production** (the explicit §21 directive; this is the strongest blocker)
3. **`nutrivision-recipes` storage bucket provisioned**
4. **Gordon math tuning is post-launch only — cannot pre-tune without telemetry**
5. **Hannah's wireframes (Section 10 below) signed off by Gary**
6. **`RECIPE_AWARE_LOGGING_ENABLED` kill switch ready** as 24h smoke margin
7. **Two Edge Functions deployed** for cleanup + photo blob cleanup

Then Michelangelo Workstream B (build) is unblocked.

## Ratification posture (2026-05-29)

Gary acknowledged 170f at spec level 2026-05-29 by pasting the full spec into the session. Per ViaConnect convention this counts as filed and ratified at the spec level. No code change is required to ratify a filed spec.

The next code action is dispatched when the sequencing prerequisites above are resolved.

## Related

- Prompt 170 (shipped Phase 1, commit `eb7ac04b` on 2026-05-29)
- Prompt 170a + 170a-supplement (ratified 2026-05-29; safe set + §17 + §20 shipped)
- Prompt 170b (filed, not built)
- Prompt 170c (placeholder, not built)
- Prompt 170d (filed 2026-05-29 with Hannah wireframes; the strongest composition partner for 170f)
- Prompt 170e (filed 2026-05-29 with Hannah wireframes; composition partner for chain-meal recipes)
- Heritage: Prompts 15b (90-day AI Product Lookup cache), 17b (emitDataEvent cascade)
