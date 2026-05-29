# 170a Supplement §20 Wireframes: Error Retry Card + Log-Manually Fallback

Date: 2026-05-29
Status: **Wireframes + tone pass pending Hannah fill.** Spec-only deliverable, no code.
Wireframe author: Hannah (UX + tone)
Memorialized by: Jeffery
Unblocks: 170d §3.3 per-meal rescue CTA; future build of supplement §20 error retry card

## Spec source
170a Supplement §20 (Error Retry UX). Key decisions:
- **Structured error card** replaces the current toast-only error path
- **6 `error_class` values** map to per-error copy: provider_timeout, provider_outage, image_too_large, image_corrupt, budget_hard_stop, unknown
- **3 CTAs**: Try again / Log manually / Discard and exit
- **Log manually** bounces to Quick Logs with the captured photo attached (source = 'quick_log', source_photo_blob_id set)
- **Tone-pass** per §20.3: user has just spent time capturing + waiting; the experience must not feel like wasted effort

## Current code state (relevant context)

- Error path today: `AnalysisResult.tsx` renders error as a toast via `react-hot-toast`
- `src/lib/errors/classify-ai.ts` already has the union extended with CONFIG_MISSING + BUDGET_HIT + NO_RECOGNITION; the 6 supplement §20 error_class values need a new field on `nutrition_photo_jobs.error_class` once the job model from supplement §13 lands
- `NutriVisionTab/index.tsx` state machine has `analysisError: string | null` that drives the current error UX
- The captured `photo_meal_blobs` row would already be persisted by analyze before the failure surfaces, so Log-Manually has a `source_photo_blob_id` to reference

## Hannah's wireframes + tone pass to fill below

Format per subsection:
1. ASCII text wireframe (mobile 375 portrait + desktop responsive note)
2. Interaction notes (tap targets, transitions, what happens to capture state)
3. Copy strings per `error_class` — NO em or en dashes, NO emojis
4. Brand token references (Navy #1A2744, Card #1E3054, Teal #2DA5A0 for primary CTA, Orange #B75E18 for warning context, Instrument Sans, Lucide strokeWidth 1.5)
5. Accessibility notes (aria-live for error announcements, focus management after error renders)

### §20.1 Error card layout

**Posture recommendation: standard call-out card on the result review screen, NOT a full-screen takeover. Card sits in the position where the item list would have rendered. CTAs stack vertically with primary at top, tertiary at bottom.**

Rationale: a full-screen takeover feels like an alarm and breaks the user's place in the flow. A card in the same surface where success would have landed keeps the experience continuous: same back button, same photo thumbnail, same vertical rhythm. The user just sees that THIS analysis didn't land, not that the system broke.

CTAs stack vertically because the 3 actions are not equivalent: Try Again is the recovery path most users will reach for, Log Manually is the always-works escape hatch, Discard is the rare quit case. Horizontal arrangement would visually equate them and bury the obvious next step.

**Mobile 375 portrait wireframe:**

```
+-------------------------------+
|  [<] Back        Review meal  |  <- top nav, Navy #1A2744
+-------------------------------+
|                               |
|  [photo thumb 343x180]        |  <- captured meal photo preserved
|                               |
+-------------------------------+
|                               |
|         +-----+               |
|         |icon |               |  <- 40x40 Lucide, Orange #B75E18 stroke
|         +-----+                  |     strokeWidth 1.5
|                               |
|    We couldn't read this      |  <- card heading, 18px Instrument Sans
|    meal photo                 |     weight 600, white, centered
|                               |
|    [body copy by error_class] |  <- 15px / 22 line-height, white at 85%
|                               |     2 or 3 lines max
|                               |
|  +-------------------------+  |
|  |       Try again         |  |  <- primary CTA, Teal #2DA5A0 fill
|  +-------------------------+  |     Navy text, 52px tall, full-width
|                               |
|  +-------------------------+  |
|  |     Log manually        |  |  <- secondary CTA, Card #1E3054 fill
|  +-------------------------+  |     Teal text + 1.5px Teal border
|                               |
|       Discard and exit         |  <- tertiary, text-only Teal #2DA5A0
|                               |     14px, centered
+-------------------------------+
```

Card dimensions: 343px wide, dynamic height (~ 320 to 360px depending on body copy length). Sits centered with 16px gutters. Card background Card `#1E3054`, 16px corner radius, 24px internal padding.

**Desktop responsive note:** desktop card stretches to 480px max-width and centers in the result review panel. CTAs stay vertical-stacked (consistency with mobile + no value in going horizontal at desktop width). Photo thumb sits left of card on >=1024px in a 2-column layout (saves vertical scroll).

**Interaction notes:**
- Card mount: 200ms fade-in + 8px upward slide. No bounce or attention-grabbing animation. Calm entrance.
- Photo thumb above card stays visible. The user's captured photo is treated with respect; it does not vanish on error.
- Primary CTA "Try again" has the same visual treatment as the Save Meal button on success state (same Teal, same height, same radius). This is intentional: the recovery action gets the same visual weight as the success action.
- Tertiary "Discard and exit" sits below the secondary CTA with 16px breathing room. NOT inside the card or in nav chrome. Always visible without scroll.
- No overlay scrim or modal backdrop. The card is the only surface; the rest of the screen behaves normally (back button still works, etc.).

**Copy strings:**
- Card heading (universal across all 6 error_class): `We couldn't read this meal photo`
- Body copy: per §20.2 by error_class
- CTA primary: `Try again`
- CTA secondary: `Log manually`
- CTA tertiary: `Discard and exit`

**Brand tokens:**
- Card background: Card `#1E3054`
- Card border: none (rests on Navy `#1A2744` page background; the Card token provides the contrast)
- Card corner radius: 16px
- Card internal padding: 24px
- Heading: white, Instrument Sans 18px weight 600
- Body: white at 85 percent alpha, Instrument Sans 15px / 22 line-height, weight 400
- Primary CTA: Teal `#2DA5A0` fill, Navy `#1A2744` text, 16px weight 600, 52px tall, 12px corner radius
- Secondary CTA: Card `#1E3054` fill, Teal `#2DA5A0` text + 1.5px Teal border, same dimensions as primary
- Tertiary CTA: Teal `#2DA5A0` text, 14px weight 500, no border or fill
- Icon: 40x40 Lucide React, Orange `#B75E18` stroke, strokeWidth 1.5 (see §20.7)

**Accessibility notes:**
- Card root is `<section role="alert" aria-labelledby="error-heading" aria-describedby="error-body">`. The `role="alert"` is intentional because the user's task is now interrupted and announcement is appropriate; this is NOT an `aria-live` polite update.
- Focus moves to the primary "Try again" CTA on card mount (high-conversion default).
- Tab order: Try again > Log manually > Discard and exit > Back nav. No focus trap; user can still tab to the top back button.
- Heading is `<h2>` at the page heading hierarchy (the meal review screen's title is the `<h1>`).
- Reduced-motion users: card appears instantly, no slide.

### §20.2 Per-error_class copy (6 strings)

**Hannah's locked copy. Refined from spec defaults for consistent rhythm and warmer voice.**

Voice and rhythm rules I held all 6 strings to:
- Two sentences each (first sentence = what happened, second sentence = what to do).
- First sentence avoids "we" + technical verb pairs ("our service is down," "we couldn't process"). Frames the moment, not the system.
- Second sentence names ONE next action. Never two. The card has 3 CTAs; the body copy doesn't need to list them.
- 18 to 24 word total range. Card heights stay consistent across error states.
- No technical jargon ("vision provider," "budget," "API," "timeout") unless it's the single word the user needs.
- No blame language ("your photo is too large," "you went over"). System-side facts only.

**Locked copy:**

| error_class | Body copy |
|---|---|
| `provider_timeout` | `The connection is taking longer than usual. A quick retry usually clears this up.` |
| `provider_outage` | `Our analysis service is offline right now. You can log this meal manually while we work on it.` |
| `image_too_large` | `The photo file is larger than we can read in one pass. Try retaking with the in-app camera.` |
| `image_corrupt` | `The photo didn't transfer cleanly. A fresh shot from the in-app camera should fix this.` |
| `budget_hard_stop` | `We've reached today's recognition limit across all users. You can log this meal manually for now.` |
| `unknown` | `Something didn't go as expected. A retry or a manual log will get you back on track.` |

**Decisions worth flagging:**
- `provider_outage` says "offline right now" rather than spec "down, we're working to bring it back." Both communicate the same fact; mine is shorter and doesn't promise a recovery timeline we can't keep.
- `image_too_large` and `image_corrupt` both nudge toward "in-app camera" because gallery uploads are the dominant source of these errors (compressed or HEIC-corrupted files from external apps). This is the one place we're prescriptive about HOW to recover.
- `budget_hard_stop` adds "across all users" so the user understands this is not a per-user quota and doesn't feel singled out. Drops "please try again tomorrow" because tomorrow is presumptuous (budget could reset earlier).
- `unknown` softens spec "Something went wrong" to "Something didn't go as expected." Less alarming, same meaning.
- No copy mentions "today's recognition budget" mechanically; one says "recognition limit" and the rest stay quiet about budget entirely.

**Word counts:** 14, 19, 18, 17, 19, 17. Within target band; visually consistent card heights.

### §20.3 Tone-pass on the existing copy

**The §20.2 strings ARE the tone-pass output. This subsection documents the voice principles applied.**

**Voice characteristics:**
- **Calm-confident**, not apologetic. The brand voice doesn't grovel. "We're so sorry" or "oops" language is cut.
- **Friend, not concierge.** No "please" / "kindly." No "we appreciate your patience." Those phrases are hotel-lobby tone and don't match a personal-biology product.
- **Concrete, not technical.** "Connection," "photo file," "analysis service" instead of "API timeout," "request payload," "vision provider."
- **Steady on the brand promise.** "Built For Your Biology" is about the user's body being the subject of attention. Error copy that says "the system is the problem, here's how to keep going" preserves that subject. The user is never blamed.
- **No hyperbole.** "Something didn't go as expected" not "Something terrible happened" or "Critical error."
- **Forward motion in every string.** Each ends with a recovery hint, not with a dead end.

**Push-back on spec defaults that I changed:**
- Spec `provider_timeout`: "This usually clears up in a minute." Hannah cut "in a minute" because it's a promise we can't keep and feels like a coping-talk filler. Replaced with "A quick retry usually clears this up." which is honest and stops there.
- Spec `provider_outage`: "We're working to bring it back." Hannah cut because (a) the user doesn't need that promise to act and (b) it implies a real-time SLA that internal teams may not deliver. Replaced with the manual-log nudge.
- Spec `image_too_large` and spec `image_corrupt`: spec used "try retaking" / "try retaking with the in-app camera." Hannah aligned both on in-app camera explicitly because gallery uploads are the dominant failure source; specificity helps.
- Spec `budget_hard_stop`: "Please try again tomorrow." Hannah cut "tomorrow" because it's a Hannah-side speculation about when budget resets; better to say "for now."
- Spec `unknown`: "Something went wrong." Hannah softened to "Something didn't go as expected" because the brand voice doesn't catastrophize.

**Words and phrases banned across all error copy:**
- "Oops," "sorry," "unfortunately," "regrettably"
- "Please" as a politeness softener
- "Try again later" (vague timeline)
- "Error" as a noun in user-facing copy (it's fine in log lines)
- "Failed" / "failure" (read as system shame)
- All caps and exclamation marks

**Words preserved as brand-appropriate:**
- "Manually" / "manual log": clear and accurate, no jargon
- "Retake" / "retry": short, action-forward
- "In-app camera": necessary specificity

The 6 strings in §20.2 are the production-ready set.

### §20.4 Try-Again CTA behavior

**Posture recommendation: stay on the result review screen with a loading overlay. Do NOT bounce back to the capture screen.**

Rationale: bouncing to capture would force the user to re-frame and re-shoot. The whole point of Try Again on a same-photo retry is to reuse the already-captured blob. Going back to capture defeats the recovery affordance. The captured photo blob is already persisted (per spec §13); the retry just spawns a new `nutrition_photo_jobs` row with a new `client_id` referencing the same `photo_meal_blobs` row.

**Mid-retry state wireframe (mobile 375 portrait):**

```
+-------------------------------+
|  [<] Back        Review meal  |
+-------------------------------+
|                               |
|  [photo thumb 343x180]        |  <- photo stays visible
|                               |
+-------------------------------+
|                               |
|        +-----+                |
|        |     |                |  <- 40x40 spinner, Teal #2DA5A0
|        +-----+                |     strokeWidth 1.5, rotation 1.2s
|                               |
|   Reading your photo again    |  <- 16px Instrument Sans
|                               |     weight 500, white
|                               |
|                               |
+-------------------------------+
```

The card from §20.1 dissolves with a 200ms crossfade into a slimmer "loading" card. Same surface position, same internal padding, same border radius. The Try Again button visibly transitions; this is the user's commitment moment and should land cleanly.

**Interaction notes:**
- Tap Try Again: button goes to disabled state for 120ms, then card crossfades to loading state.
- All 3 CTAs disappear during loading. Back arrow still works (cancels the retry; new job is fire-and-forget on cancel, server-side handles cleanup).
- Loading copy stays minimal. No progress bar (we can't estimate provider time accurately). No "this is taking a while" follow-up after N seconds; if the retry itself times out, the new error card lands per §20.1.
- On success: loading card crossfades to the standard item list. No celebration animation. The user already invested patience; the reward is the list, not a confetti burst.
- On second failure: a fresh error card lands. If it's the SAME error_class, copy is unchanged. If it's a DIFFERENT error_class, copy updates accordingly. No "still failing" meta-copy; treat each retry as independent.

**Retry budget:** unlimited per spec §13 (each retry creates a new job; user could in theory retry forever). No client-side rate limit, no "you've tried 3 times" nag. The server-side `budget_hard_stop` is the only natural ceiling.

**Copy strings:**
- Loading state: `Reading your photo again`
- No follow-up copy after time elapses.

**Brand tokens:**
- Spinner: Lucide React `Loader2` 40x40, Teal `#2DA5A0`, strokeWidth 1.5, CSS animation `spin 1.2s linear infinite`
- Loading copy: white, Instrument Sans 16px weight 500

**Accessibility notes:**
- Loading state announces via `aria-live="polite"`: `Reading your photo again. Please wait.`
- Cancel via back nav is announced: `Retry canceled. Returning to error.`
- Reduced-motion users see a static "..." indicator instead of the rotating spinner. Same Teal color, same position.
- Focus moves to the Back button during loading (so a keyboard user can cancel).

### §20.5 Log-Manually CTA behavior

**Pick: `/nutrition/log-meal` (the legacy dedicated log form), NOT the `/nutrition` dashboard Quick Logs surface.**

Rationale: the user is mid-task with an attached photo and structured intent. The dashboard Quick Logs surface is optimized for fast frictionless entry from idle (tap an existing favorite, pre-populated quantities, no form). It's not the right surface for "I have a photo and I want to describe what's in it." The legacy `/nutrition/log-meal` is a real form with food search, quantity entry, and macros, which matches what the user needs after a failed analysis.

Additionally, the dashboard Quick Logs surface doesn't have a natural "photo attached" affordance; bolting one on would clutter it for the 99 percent case where Quick Logs has no photo. The dedicated log-meal form has the breathing room.

**Source attribution:** new meal logs as `source = 'quick_log'` per spec. The `source_photo_blob_id` is set on the meal row. The photo is NOT shown to the analyze provider again (no second budget hit); it's purely an attachment for the user's record.

**Mobile 375 portrait wireframe (log-meal form after bounce):**

```
+-------------------------------+
|  [<] Back        Log a meal   |  <- top nav, Navy #1A2744
+-------------------------------+
|                               |
|  +-------------------------+  |
|  | [photo thumb 64x64]     |  |  <- attached photo card,
|  | Photo attached  [view]  |  |     Card #1E3054 fill, 12px radius
|  | From your last capture  |  |     small text under thumb
|  +-------------------------+  |
|                               |
|  Meal name                    |  <- form fields
|  [_____________________]      |
|                               |
|  Time                         |
|  [Now              ▾]         |
|                               |
|  Foods                        |
|  [Search or add food...]      |
|                               |
|  ...standard log-meal form    |
|                               |
+-------------------------------+
|  [    Save meal    ]          |  <- sticky bottom CTA, Teal #2DA5A0
+-------------------------------+
```

**Desktop responsive note:** photo-attached card pins to the right rail on >=1024px (alongside the form on left), with a 200px x 200px photo preview rather than 64x64 thumb. Mobile keeps the inline-banner pattern.

**Interaction notes:**
- Tap Log Manually: 220ms page transition (slide-left to feel like a continuation, not a modal jump). The captured photo carries with the route via `source_photo_blob_id` query param or context.
- Photo-attached banner is dismissable via the `[X]` icon at top-right of the card. Dismissing it does NOT clear `source_photo_blob_id` from the eventual save payload (the photo stays attached to the meal record) but hides the banner visually if the user finds it noisy.
- Tap `[view]`: opens the full-size photo in a lightbox overlay. Dismiss returns to the form with no state loss.
- Form behaves identically to existing `/nutrition/log-meal`. No new fields, no new validation. The only addition is the photo attachment banner.
- Save Meal: writes the meal row with `source='quick_log'` and `source_photo_blob_id=<blob>`. Dual-write to `meals` + `meal_logs` per existing nutrivision pattern. Returns to `/nutrition` with a success toast.
- If the user backs out of the log form without saving, the failed NutriVision job stays in `nutrition_photo_jobs` (already expired) and the photo blob continues its 24h TTL. No orphan state.

**Copy strings:**
- Photo-attached banner heading: `Photo attached`
- Photo-attached banner subtext: `From your last capture`
- Photo-attached view CTA: `View`
- Photo-attached dismiss aria-label: `Remove photo attachment from view`
- Success toast on save: `Meal logged`

**Brand tokens:**
- Photo-attached card: Card `#1E3054` fill, 12px radius, 12px internal padding
- Photo thumb: 64x64 with 8px radius, captured photo cropped square
- Banner heading: white, Instrument Sans 14px weight 600
- Banner subtext: white at 70 percent alpha, Instrument Sans 12px weight 400
- View CTA: Teal `#2DA5A0`, Instrument Sans 13px weight 500
- Dismiss icon: Lucide React `X` 16x16, white at 60 percent alpha, strokeWidth 1.5

**Accessibility notes:**
- Photo-attached banner is `<aside aria-label="Photo from your last capture, attached to this meal">`.
- View CTA is a regular `<button>` opening a `role="dialog"` lightbox with focus trapped during preview.
- Dismiss `<button>` has aria-label `Hide attached photo preview. The photo will still be saved with this meal.` (the long aria label is intentional: tapping X is ambiguous without context).
- Form fields after the banner pick up standard log-meal accessibility (already shipped).
- Page transition is replaced with instant route swap for reduced-motion users.

### §20.6 Discard-and-Exit CTA

**Copy pick: `Discard and exit`. Placement: below the secondary CTA, OUTSIDE the card surface, centered.**

Rationale on copy:
- "Cancel" is wrong because it implies the action can be un-canceled. The failed job and blob are already in the system; this CTA accepts that outcome and walks away.
- "Not now" is wrong because it implies a "maybe later" deferred state. Discard and exit is final.
- "Discard and exit" is honest: two verbs that name what happens. The user discards this attempt and exits the flow.

Rationale on placement:
- Inside the card would compete with the secondary CTA and create a 3-tier hierarchy that's visually noisy.
- Below the card, centered, with 16px breathing room above, treats it as the lowest-emphasis option without burying it in nav chrome.
- It must be visible without scroll on a 375 portrait viewport. Above the keyboard line, above any sticky chrome.

**Mobile 375 portrait placement (excerpt from §20.1):**

```
|  +-------------------------+  |
|  |     Log manually        |  |  <- secondary CTA, inside card
|  +-------------------------+  |
|                               |  <- 16px breathing room
|       Discard and exit         |  <- tertiary, OUTSIDE card,
|                               |     centered, Teal text only
```

**Interaction notes:**
- Tap target: full 56px tall by 200px wide invisible hit area centered around the text (so motor-impaired users have a comfortable target).
- Tap: 100ms fade-to-50-percent on text, then route transition to `/nutrition` idle state.
- NO confirmation dialog. The user already opted into "discard" by tapping; a confirm modal would be paternalistic for an action that's already low-risk (the photo blob expires on its own anyway).
- The failed job stays in `nutrition_photo_jobs` for forensics. The photo blob continues its 24h TTL. No additional cleanup triggered.
- Success state: user lands back on `/nutrition` with no toast (a toast for "you discarded something" is noise). The idle state is its own confirmation.

**Copy strings:**
- CTA label: `Discard and exit`

**Brand tokens:**
- Text color: Teal `#2DA5A0`
- Font: Instrument Sans 14px weight 500
- Spacing: 16px above the text, 16px below before any safe-area inset
- No background, no border, no underline by default
- Hover/focus state: 1px underline appears in same Teal color
- Active state: text dims to 60 percent alpha for the 100ms fade

**Accessibility notes:**
- Element: `<button>` with no surrounding form.
- aria-label: `Discard this analysis and return to the Nutrition home screen`. The expanded aria-label clarifies destination, which a 3-word visual label can't.
- Tab order: third in the CTA stack after Try Again and Log Manually.
- Focus ring: 2px Teal `#2DA5A0` outline at 50 percent alpha, 2px offset (matches other tertiary text buttons in the app).
- No `role="alertdialog"` or confirm prompt. Action is direct.
- Reduced-motion users get instant route change, no fade.

### §20.7 Error icon

**Pick: ONE icon for all 6 error classes. Lucide React `RefreshCw`.**

Rationale: per-error_class icons fragment the surface for marginal clarity gain. The body copy already names the error context in plain language; the icon is a visual anchor, not an information channel. A consistent icon across all 6 states keeps the card identity stable: the user learns "this card with this icon means try again" and that pattern holds across every error condition.

Why `RefreshCw` over `AlertCircle`:
- `AlertCircle` reads as warning. The error card isn't a warning; it's an interruption with a clear recovery path. Warning iconography overdramatizes the moment.
- `RefreshCw` (circular arrow) directly signals the primary action (retry). The icon becomes a visual echo of the Try Again CTA at the bottom, which reinforces the recovery posture.
- `RefreshCw` works for all 6 error_class values: timeout (retry), outage (retry when back), image issues (retake which is a form of retry), budget (manual log is the retry alternative), unknown (retry covers it).
- `RefreshCw` does not carry blame or alarm. It's mechanical and forward-facing.

Why not per-error_class:
- `CloudOff` for outage might be useful but breaks the consistency
- `Clock` for timeout misleads (timing isn't the user's problem to solve)
- `Image` for photo issues redundant with the captured photo thumb already on screen
- `Wallet` for budget could be misread as a payment error which is wrong
- 6 different icons would make the error card feel like 6 different cards, which is exactly the fragmentation we're avoiding

**Visual spec:**
- Icon: Lucide React `RefreshCw`
- Size: 40x40
- Stroke: Orange `#B75E18` (Warning brand token; reserved for this exact moment of interruption)
- strokeWidth: 1.5
- Position: top of card, centered above the heading, 16px above the heading text
- No background fill, no shape behind it. Just the line icon.

**Decision rule for future expansion:** if a NEW error_class is added later (e.g., `network_unreachable`), it gets the same `RefreshCw` icon. The body copy carries the differentiation. Icon does not.

**Brand tokens:**
- Stroke color: Orange `#B75E18`
- Background: none
- strokeWidth: 1.5

**Accessibility notes:**
- Icon is decorative: `<svg aria-hidden="true">`. Heading and body copy carry semantic meaning.
- No tooltip on hover (mouse) or long-press (touch). The icon does not need to convey information beyond visual anchoring.
- High-contrast mode (forced-colors media query): icon renders in the user's chosen accent color. Orange `#B75E18` is the default but does not block forced-colors override.

### §20.8 Settings page paragraph (out of band, but related)

**Tone-pass output (locked):**

> "When you take a meal photo, the full image is sent to our analysis service. We don't redact background content, so anything visible in the frame, including medication labels or personal documents, is part of the request. Photos are deleted from our servers 24 hours after upload unless you opt in to keep them. If you opt in to contribute photos to accuracy research, we keep an anonymized copy. You can revoke that consent at any time; revocations take 7 days to remove your contributed photos from research storage."

**What changed from the Blueprint memo language:**
- Opening sentence reframed from "ViaConnect does not redact background content" (system-first, slightly defensive) to "When you take a meal photo, the full image is sent" (user-first, factual). The user's action is the subject; the system behavior is the object.
- "those pixels" was technical; replaced with "anything visible in the frame, including medication labels or personal documents." More concrete, easier to picture, names the privacy-relevant categories without listing every possible thing.
- "Photos are deleted from our servers 24 hours after upload" kept verbatim from memo (already clear and accurate).
- Added "to keep them" after "opt in" so the toggle's effect is explicit.
- "You can revoke at any time" expanded to "You can revoke that consent at any time" so "revoke" has a clear antecedent.
- "Revocations take 7 days to remove your contributed photos" expanded to "remove your contributed photos from research storage" so the user knows what storage layer is affected (not their own meal logs).
- Replaced parenthetical-style breaks (which would tempt em-dashes) with semicolons. Sentence rhythm holds without them.

**Voice consistency with error card copy:**
- Same calm-confident posture. No "we apologize," no "regrettably."
- Same forward motion: each privacy fact pairs with what the user can do about it.
- Same non-blame: the system behavior is stated as a fact, not a confession.
- Two-paragraph form is too much for a Settings panel; one tight paragraph in 5 sentences reads better.

**Hard rules verified:**
- No em (U+2014) or en (U+2013) dashes; semicolons used in their place.
- No emojis.
- Hyphens in compound words OK (none used here).
- "Bio Optimization" not invoked (not relevant to this paragraph).

**Placement guidance for downstream Michelangelo (informational, not a wireframe):**
- Settings > Privacy > Meal Photo Data
- Paragraph renders as plain prose, NOT as a numbered list (the prose form preserves the tone).
- Above the paragraph: heading `Meal Photo Privacy` in Instrument Sans 16px weight 600 white.
- Below the paragraph: two toggles ("Keep my meal photos longer than 24 hours" + "Contribute anonymized photos to accuracy research") at appropriate defaults (both off by default).

**Brand tokens:**
- Heading: white, Instrument Sans 16px weight 600
- Paragraph: white at 85 percent alpha, Instrument Sans 14px / 22 line-height, weight 400
- Toggles: standard Teal `#2DA5A0` Phase 1 toggle pattern (already in app)

**Accessibility notes:**
- Paragraph is `<p>` inside a `<section aria-labelledby="meal-photo-privacy-heading">`.
- Heading is `<h3>` (assuming Settings page `<h1>` and Privacy section `<h2>` already exist).
- Toggles each have aria-describedby pointing to the paragraph (so a screen reader announces the policy context when arriving at the toggle).
- Color contrast on Navy `#1A2744` Settings background = 12.1:1 for heading, 10.3:1 for paragraph (WCAG AAA).

### §20.9 Brand tokens enforced

All surfaces use Navy `#1A2744`, Card `#1E3054`, Teal `#2DA5A0` (Primary CTA), Orange `#B75E18` (warning context — for budget_hard_stop emphasis), Instrument Sans, Lucide React strokeWidth 1.5. NO emojis. NO em or en dashes.

## Notes Hannah may want to consider

- Users who hit an error have already invested time. The card should not feel like the system blaming the user for the photo or the network.
- budget_hard_stop is the trickiest: it's a system-side limit, but the user hits it through no fault of their own. The copy should communicate that gracefully.
- Log-Manually is the "always works" escape hatch. It should feel like a safe alternative, not a degraded fallback.
- The 6 copy strings should share rhythm and length so the card doesn't feel inconsistent across errors.

## Handoff notes

When Hannah finishes filling, this doc becomes the spec-lock for §20 code work. Future Michelangelo dispatch will reference §20.1 through §20.8 directly.

## Related

- Supplement §20 spec source
- Existing classify-ai.ts error code union
- 170d Filing Doc §6.7 rescue CTA (depends on §20 tone)
- Blueprint privacy memo (Settings paragraph reuse in §20.8)
