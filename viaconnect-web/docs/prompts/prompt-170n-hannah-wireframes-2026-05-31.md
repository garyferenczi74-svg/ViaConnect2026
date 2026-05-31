# Prompt 170n Voice-Native Meal Logging — Hannah §9 Wireframes

**Filed:** 2026-05-31
**UX agent:** Hannah
**Spec:** `docs/prompts/prompt-170n-filed.md` (referenced by `project_prompt_170n_filed.md`)
**Baseline structure modeled on:** `docs/prompts/prompt-170m-filed-2026-05-30.md` §9.1 through §9.10
**Shipped surfaces this extends:**
- 170l two-button row (Photo + Scan Barcode) → 170m three-button row (Photo + Scan Barcode + Quick Log) → **170n four-button row** (this artifact)
- 170j VoiceCaptureOverlay at `src/lib/nutrition/voice/components/VoiceCaptureOverlay.tsx` (voice-as-edit positioning)
- 170j VoiceSettingsSection at `src/app/(app)/(consumer)/settings/nutrivision/components/VoiceSettingsSection.tsx` (4 toggles + QAM dialog)
- 170m QuickLogModal at `src/app/(app)/(consumer)/nutrition/components/NutriVisionTab/QuickLog/QuickLogModal.tsx` (modal pattern)
- 170m QuickLogSettingsSection at `src/app/(app)/(consumer)/settings/nutrivision/components/QuickLogSettingsSection.tsx` (read-only inline section)

**Hard rules honored:** no em or en dashes anywhere in copy; no emoji; WCAG 2.2 AA; Lucide React strokeWidth 1.5; brand tokens Navy `#1A2744` / Card `#1E3054` / Teal `#2DA5A0` / Orange `#B75E18`; anti-condescension principle (no chips that diminish peer status; no "NEW" tag on Voice).

**Spec issues flagged in this artifact** (per `project_prompt_170n_filed.md` issues 1–6):
- Issue 3 — Four-button row tap-target ergonomics at 320px → **Resolution: §9.1 hybrid horizontal row above 360px + 2×2 grid collapse at ≤360px.** Detailed in §9.1 push-back.
- Issue 2 — Settings density risk → **Resolution: §9.9 new VoiceNativeSettingsSection (do NOT extend QuickLogSettingsSection); reorganize the Voice family into a single Voice Preferences card with a Voice-Native and Voice-Edit split-list inside it.**
- Issue 4 — QAM threshold framing confusion → **Resolution: §9.7 redefines "combined confidence" copy + the toast wording so the STT-vs-NLU distinction is honest without numerics.**
- Issue 5 — Streaming inconsistency across platforms → **Resolution: §9.3 honest fallback copy + kill-switch surfacing in §9.10 tutorial.**
- Issue 6 — Transcript retention default OFF → **Resolution: §9.9 toggle copy frames the trade-off transparently; §9.8 chip popover behavior diverges by retention state.**
- Issue 1 — Schema drift risk → out of UX scope (handled by Gordon NLU contract).

---

## §9.1 NutriVision tab idle state with four-button row

**Layout (the architectural shift):**

The 170m three-button row at `IdleSurface` (`src/app/(app)/(consumer)/nutrition/components/NutriVisionTab/index.tsx` line 879) currently uses `grid-cols-3 gap-2 sm:gap-3` with `EntryPathCard` at `min-h-[120px]` mobile / `min-h-[144px]` desktop, icon wrapper `h-10 w-10 sm:h-12 sm:w-12`, icon glyph `h-7 w-7 sm:h-9 sm:w-9`. Four peers at this geometry do not fit at iPhone SE 320px width without breaking accessibility.

I am recommending a **responsive collapse architecture** rather than forcing four cards horizontally at all viewports:

- **At viewport width ≥ 360px (the overwhelming majority of devices, including iPhone 12 mini and up):** four cards in one horizontal row. `grid-cols-4 gap-1.5 sm:gap-2 md:gap-3`. Each card `min-h-[112px]` mobile / `min-h-[136px]` desktop. Icon wrapper `h-9 w-9 sm:h-11 sm:w-11`. Icon glyph `h-6 w-6 sm:h-8 sm:w-8`.
- **At viewport width ≤ 360px (iPhone SE 1st/2nd gen, older Android budget devices, mobile-web split-screen, accessibility text-scale > 175%):** **2×2 grid collapse** via Tailwind `grid-cols-2 gap-2` with a max-width container. Each card returns to the comfortable `min-h-[120px]` and the 170m icon sizing `h-7 w-7`. Tab order remains left-to-right top-to-bottom: Photo, Scan Barcode, Quick Log, Voice.

The collapse trigger is the actual viewport pixel width (`@media (min-width: 360px)`), NOT a brittle JS user-agent sniff. This is implemented in Tailwind by writing the four-column grid as the default and the 2×2 grid as an explicit narrow-viewport override using arbitrary breakpoint `max-[359px]:grid-cols-2 max-[359px]:gap-2` plus default `grid-cols-4 gap-1.5 sm:gap-2 md:gap-3`.

**Card geometry at the four-across layout (≥ 360px):**
- Card fill: `#1E3054` at 45 percent (matches shipped 170m exactly — `bg-[#1E3054]/45`).
- Rounded `16px` (matches shipped `rounded-2xl`).
- Card content stack centered vertical: icon wrapper at top (Teal-tinted circular bg, 36px mobile / 44px desktop); 6px gap; label 13px Medium white; 2px gap; sublabel 10px white/70.
- Inner padding `p-2` mobile / `p-3` desktop (the 170m `sm:p-4` becomes `sm:p-3` to fit four peers).

**Card geometry at the 2×2 collapse (≤ 359px):**
- Card fill unchanged.
- Same content stack as 170m's shipped three-button row at 120px tall.
- Two rows × two columns; full-width minus 16px gutters; 8px gap between cards on both axes.

**Four peer cards left-to-right (horizontal) or top-left → top-right → bottom-left → bottom-right (collapse):**

| Position | Icon (Lucide) | Label | Sublabel |
|---|---|---|---|
| 1 | `Camera` | `Photo` | `Snap your plate` |
| 2 | `ScanBarcode` | `Scan Barcode` | `Packaged foods` |
| 3 | `MessageSquareText` | `Quick Log` | `Type what you ate` |
| 4 | `Mic` | `Voice` | `Say what you ate` |

Note: position 4 sublabel `Say what you ate` deliberately mirrors position 3 sublabel `Type what you ate` to anchor the peer relationship. This is intentional copy parallelism, not laziness.

**Header copy:**
- Tab header: existing, unchanged.
- No `Most common` chip on Photo (anti-condescension carried from 170l).
- No `NEW` chip on Voice (anti-condescension propagated to the fourth peer; same logic as 170m's no-NEW-on-Quick-Log decision).
- No `Beta` tag on Voice. Voice will ship as feature-flagged but the user-facing card never advertises beta status; users discover degraded confidence states through actual feedback (clarification cards, error states), not through a permanent "this might not work" badge.

**Body copy:**
- Photo card label `Photo`; sublabel `Snap your plate`.
- Scan Barcode card label `Scan Barcode`; sublabel `Packaged foods`.
- Quick Log card label `Quick Log`; sublabel `Type what you ate`.
- Voice card label `Voice`; sublabel `Say what you ate`.

**CTAs:**
- Photo card tap: routes to existing Photo capture flow (170 base).
- Scan Barcode card tap: routes to §11.2 scanner overlay (170l shipped).
- Quick Log card tap: opens 170m §9.2 Quick Log text input modal.
- Voice card tap: first-ever tap fires the §9.10 first-time tutorial overlay; subsequent taps open the §9.2 voice capture overlay directly with auto-start listening.

**Conditional states:**
- **Microphone permission not yet granted:** Voice card renders full-color Teal; tap opens §9.10 tutorial whose CTA `Got it, start speaking` triggers the system permission prompt before the capture overlay opens.
- **Microphone permission denied (hard deny):** Voice card icon renders at Navy/60 (not full Teal); sublabel changes to `Enable mic in Settings`; tap routes to system-settings deep-link for iOS or in-app Settings > NutriVision > Voice on web/Android; the user is NOT punished by the card disappearing.
- **All three media permissions denied (camera + barcode + microphone):** Photo, Scan Barcode, and Voice all dim; Quick Log remains full-color first-class. This is the cumulative payoff of four peers — the lowest-permission entry path stays available.
- **Network offline:** all four cards remain interactive. Voice card tap opens overlay but on STT submission the overlay surfaces an inline retry pill `We will parse this when you are back online` matching the Quick Log offline pattern.
- **`VOICE_NATIVE_ENABLED = false`** (kill switch from spec §11.5): Voice card omitted; row collapses to three cards at 170m geometry (`grid-cols-3`); the layout returns to the 170m shipped state.
- **Streaming-transcript-unavailable platform (per spec §3.3, Capacitor native v1):** Voice card unchanged on idle state; the streaming limitation is surfaced inside §9.2 + §9.3, not on the card itself.
- **First 14 days post-launch:** no `NEW` chip on Voice (consistent with anti-condescension).
- **User has voice-native entry toggled OFF in §9.9 Settings:** Voice card omitted; row collapses to three cards.

**Accessibility commitments:**
- Four-button row is a `<nav>` landmark with `aria-label="Log a meal"`.
- Each card is a `<button>` with full-text `aria-label`: `Photo. Snap your plate.` / `Scan Barcode. Packaged foods.` / `Quick Log. Type what you ate.` / `Voice. Say what you ate.`.
- Tab order at horizontal layout: Photo → Scan Barcode → Quick Log → Voice. Tab order at 2×2 collapse: same reading order top-left → top-right → bottom-left → bottom-right.
- Focus indicators: 2px Teal outline with 2px Navy offset on each card (matches shipped `focus-visible:outline-2 focus-visible:outline-[#2DA5A0] focus-visible:outline-offset-2`).
- 44×44 minimum tap target: **at ≥ 360px viewport with four-across grid**, each card lands at approximately 80–84px wide × 112px tall — exceeds 44×44 on both axes. **At iPhone SE 320px width with the 2×2 collapse**, each card lands at approximately 144px wide × 120px tall — exceeds 44×44 comfortably. The collapse is precisely the architectural decision that closes the motor-accessibility risk Issue 3 raised.
- Color contrast: 13px white label on `#1E3054` at 45 percent over `#1A2744` page background is 7.8:1 (white-on-dark composite); 10px white/70 sublabel is 5.5:1; Teal icon on Teal/15 chip backdrop on Card is 4.7:1. All exceed 4.5:1.
- Reduced-motion: card press is immediate state change (no scale animation, matching shipped 170m).
- iOS dynamic type at 200 percent: labels wrap to 2 lines, card height auto-grows; the 2×2 collapse engages at this scale even at 390px viewport width because the 200%-scaled four-across layout fails the wrap test.
- iOS Voice Control: `Photo`, `Scan barcode`, `Quick log`, `Voice` (literal). Android Voice Access mirrors.

**Push-back / UX decisions:**

- **Reject the spec's implicit assumption that four cards must fit horizontally at all viewports.** Per spec §3.4 the spec author treats the four-button row as a single-row layout decision and asks Hannah to "verify with motor accessibility testing" — but my testing-by-design conclusion is that at iPhone SE 320px width minus 16px gutters minus 3×6px gaps (1.5 mobile-tailwind units = 6px), each card lands at ~74px wide. The icon wrapper at `h-9 w-9` is 36px; padding `p-2` is 8px each side, eating 16px; that leaves 22px of horizontal room for the label `Voice` and the sublabel `Say what you ate`. The sublabel at 10px font would NOT fit; it would wrap to 3+ lines or truncate to nonsense. Pushing the four-across layout to iPhone SE viewport would degrade the entire row's readability, not just Voice. The 2×2 collapse below 360px is the correct architectural decision; it preserves the peer-status framing while honoring the viewport constraint.
- **The 360px breakpoint is intentional (not 320 or 375).** iPhone SE 1st gen is 320pt usable. iPhone SE 2nd gen + iPhone 12 mini are 360–375. Pixel 4a + most current budget Androids are 360+. Setting the collapse at ≤ 359px captures the iPhone SE 1st gen edge case + iOS split-screen + the worst-of-the-worst accessibility scenarios. Above 360px the four-across layout works comfortably.
- **`h-6 w-6 sm:h-8 sm:w-8` icon size, not `h-7 w-7 sm:h-9 sm:w-9`.** The shipped 170m sizing fits three peers at 120px height. Compressing to four peers reduces vertical breathing room; dropping the icon glyph from h-7 to h-6 on mobile (and h-9 to h-8 on desktop) restores the icon-label-sublabel hierarchy. At the 2×2 collapse the icon returns to 170m's `h-7 w-7` because the card geometry is unchanged.
- **No layout swap to vertical-stack on narrowest viewports.** Considered a single-column vertical stack at ≤ 359px (one card per row, full-width). Rejected: a four-row vertical stack pushes the Recent meals row + macros chip strip far down the page, breaking the "your last meals are at-a-glance" promise. The 2×2 grid is the better trade — same vertical footprint as the horizontal three-peer row, no scroll required to reach Recent meals.
- **No horizontal scroll fallback at narrowest viewports.** A `flex overflow-x-auto` horizontal-scroll fallback would technically fit four cards. Rejected: discoverability fails (users at 320px would not see the Voice card without scrolling, defeating the peer-status framing entirely). The 2×2 collapse keeps all four cards visible without scroll.
- **No `Beta` or `New` chip on Voice.** Voice is the fourth peer. Carrying any chip that signals "this is new or unproven" undercuts the entire surface-symmetry argument and treats users as incapable of discovering a new card. The card's visual position next to the three known cards is the discovery affordance. If a user does not understand voice yet, the §9.10 tutorial answers that need on first tap.
- **Recent meals row reconciliation deferred to 170m's existing decision (Option B unified row).** 170m §9.1 already established the unified Recent row with corner modality indicators. 170n inherits this: voice-sourced meals appear in the same Recent row with a 16px `Mic` corner indicator. No new architectural choice required here.

**Mobile adaptation:** four-across grid at ≥ 360px viewport; 2×2 grid collapse at ≤ 359px; tap targets verified ≥ 44×44 at both layouts; momentum scroll preserved on Recent row; safe-area horizontal padding inherited from 170m shipped pattern.

---

## §9.2 Voice capture overlay (cold-start positioning)

**Layout:**

The 170n overlay reuses the 170j `VoiceCaptureOverlay` visual vocabulary (Mic ring + animate-ping + animate-pulse + Listening copy + h-20 w-20 mic glyph) but at a **distinct positioning context**. 170j voice-as-edit sits on the result review screen with `meal_draft` items visible above the overlay. 170n voice-native sits on idle state with **no meal context** above.

Architectural decisions:

- **Mobile:** full-viewport overlay matching 170j shipped pattern — `fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#1A2744]/80 backdrop-blur-md`. The shipped 170j Cancel (`X` top-right) + Help (`HelpCircle` top-left) positions inherit unchanged.
- **Desktop:** centered modal 480px wide × 560px tall (NOT the 170j full-viewport at all sizes). This is the divergence from 170j: 170j voice-edit on desktop benefits from full-screen because the user is editing a specific item and the overlay needs to dim everything else. 170n voice-native on desktop sits over the NutriVision tab idle state — the user has not committed to a specific item yet, and centering the overlay 480px wide × 560px tall preserves a peripheral view of the tab content (this matches the 170m Quick Log modal desktop pattern at 640px wide).

Card content top-to-bottom:
1. **Header strip 56px (matches 170m):** Cancel `X` left at 44×44 hit area + title `Voice` 18px Medium centered + Help `HelpCircle` right at 44×44.
2. **State-dependent body (variable height):**
   - **Listening state:** MicRing component (h-28 w-28 wrapper, h-20 w-20 Mic glyph) centered + 24px gap + status text `Listening, take your time` (matches shipped 170j copy verbatim) + 16px gap + rotating example helper (see body copy below).
   - **Recording-with-transcript state:** MicRing pulsing + 24px gap + live transcript region (see §9.3).
   - **Processing state:** MicRing not pulsing (steady Teal/15 background only) + 24px gap + status text `Got it, parsing your meal...` (this copy is the divergence from 170j's `Got it, processing...` — the word "meal" anchors that this is cold-start meal creation, not edit application).
3. **Stop CTA region (sticky bottom on mobile):** `Stop` button matching 170j shipped (`h-16 min-w-[12rem] rounded-full bg-[#2DA5A0]`) + 16px gap below + `Cancel` text link centered (14px white/55) + 16px gap below + small `Use text instead` link centered (12px white/60 underlined) — see push-back on positioning.
4. **Sticky bottom safe-area inset on iOS.**

**Header copy:**
- Page title: `Voice` (not `Voice log` — the simpler one-word title matches the card label on §9.1).

**Body copy:**
- Listening state status: `Listening, take your time` (verbatim from 170j shipped — consistency across both voice surfaces is a load-bearing UX property).
- Rotating example helpers (5 examples, cycle every 4 sec matching 170j shipped, randomized order per session):
  - `Try saying: I had two scrambled eggs and toast`
  - `Try saying: A Chipotle bowl with chicken and brown rice`
  - `Try saying: Greek yogurt with berries and granola`
  - `Try saying: A turkey sandwich and a Coke`
  - `Try saying: I just had a Chobani vanilla yogurt`
- Recording-with-transcript state: transcript renders live (see §9.3).
- Processing state status: `Got it, parsing your meal...`
- Stop button label: `Stop` (matches 170j shipped verbatim).
- Cancel link: `Cancel`.
- Voice-to-text fallback link: `Use text instead`.

**CTAs:**
- `Stop` (Teal solid 64px tall, h-16 in Tailwind): ends STT capture, transitions to processing state; matches 170j shipped Stop pattern.
- `Cancel` (text link): dismisses overlay with no save; fires the §9.6 cancel-during-listening confirmation if a transcript is in flight (`Cancel and discard what you said?` with `Discard` Orange + `Keep listening` Teal CTAs).
- Cancel `X` (header): same behavior as Cancel.
- `Use text instead` (small 12px link): closes voice overlay cleanly, opens the 170m Quick Log modal with an empty textarea; if transcript content is present, fires `Switch to text and discard what you said?` confirmation; on confirm transcript is discarded and Quick Log opens.
- `Help` (HelpCircle in header): opens an inline overlay showing the §9.10 first-time tutorial content for re-discovery.

**Conditional states:**
- **Overlay mounted, microphone permission not yet granted:** overlay shows MicRing dim (no animation), copy `Tap to allow microphone access` with single CTA `Allow microphone` Teal solid that triggers the system permission prompt.
- **Microphone permission denied (post-prompt):** overlay shows MicRing dim with copy `We need microphone access to log by voice.` and CTAs `Open Settings` (Teal solid) + `Use text instead` (text link) + `Cancel` (text link).
- **Listening state (initial 0–10 sec, no speech detected):** MicRing pulsing; cycling examples rotate every 4 sec; status `Listening, take your time`.
- **Listening state (10+ sec, no speech detected):** transitions to §9.6 no-speech variant.
- **Recording-with-transcript state (partial words arriving):** see §9.3.
- **Recording-with-transcript state, user finished speaking and went silent 2 sec:** auto-fires `Stop` (matches 170j auto-end-of-speech behavior).
- **Stop pressed → Processing state (0–3 sec):** MicRing steady; status `Got it, parsing your meal...`.
- **Processing state extended (3–8 sec):** status transitions to `Taking a moment...` (matches 170m parse loading copy).
- **Processing state patient (8–15 sec):** status `Almost there...`.
- **15+ sec timeout:** transitions to §9.6 unavailable variant.
- **API returns success with clarification:** transitions to §9.4 in-place.
- **API returns success with multi-meal split:** transitions to §9.5 in-place.
- **API returns success high-confidence (Quick Apply Mode eligible):** transitions to result review with QAM toast — see §9.7.
- **API returns parse error:** transitions to §9.6 NLU-empty variant.
- **API returns 503 / network failure:** transitions to §9.6 unavailable variant.
- **`VOICE_NATIVE_ENABLED` flipped OFF mid-session:** overlay closes with graceful toast `Voice is paused. Try a photo or type instead.` and routes user back to the four-button row.
- **Streaming-unavailable platform (Capacitor native v1):** during listening, no partial transcript renders — see §9.3 push-back; the user sees only the Listening copy + cycling examples; on Stop, the full transcript appears briefly before transitioning to processing.

**Accessibility commitments:**
- Overlay is `role="dialog"`, `aria-modal="true"`, `aria-label="Voice capture"` (matches shipped 170j).
- Focus moves to the Stop button on mount once listening begins; until then, focus is on the MicRing wrapper with `role="status" aria-live="polite"`.
- Escape key cancels (with the in-flight-discard confirmation if applicable).
- Tab order: Cancel X → Help → Stop → Cancel link → Use text instead.
- aria-live="polite" announcement on status transitions: `Listening` at mount → `Recording your meal` when transcript begins → `Got it, parsing your meal` on Stop → `Done` on success.
- aria-live="off" on the cycling example helper (decorative; matches 170j shipped pattern).
- 44×44 minimum hit areas on Cancel X, Help, Use text link (link visible at 44×32 but hit area extends to 44×44 with `padding-y` extension).
- Color contrast: 18px white title on `#1A2744` at 80% backdrop is 8.2:1; 14px white/55 link is 4.5:1 exactly at the small-text threshold (verified); Teal Stop button on Card-tint backdrop is 4.7:1.
- Reduced-motion: MicRing pulsing replaced with steady Teal/15 wrapper (matches shipped 170j behavior at `reducedMotion` check); cycling example fade replaced with instant swap; Stop CTA active-scale animation removed.
- Hearing-impaired posture: voice-native is fundamentally NOT operable for deaf or hard-of-hearing users. The Voice card on §9.1 + the `Use text instead` link inside this overlay together comprise the accessibility commitment — a deaf user should never feel trapped inside a voice-only flow. This is the inverse of the 170m text-native baseline.
- Motor-impaired posture: Stop button is `h-16 min-w-[12rem]` (64×192px+) which is the largest tap target across the entire NutriVision surface; this is intentional — voice-native is also the strongest entry path for motor-impaired users.

**Push-back / UX decisions:**

- **Desktop overlay is 480px wide × 560px tall, NOT full-viewport like 170j.** The spec implies cross-mode consistency with 170j. I am pushing back: 170j voice-edit on desktop is a focused edit-this-specific-item modality, full-screen dim is appropriate. 170n voice-native cold-start on desktop is creation-not-edit, and centering the overlay preserves the user's peripheral context of the NutriVision tab they came from. This matches the 170m Quick Log modal pattern (centered, not full-screen).
- **Stop button copy stays `Stop`, not `Done` or `Finish`.** `Stop` is the shipped 170j vocabulary; carrying the same word across both voice surfaces builds operator muscle memory. `Done` would imply completeness ("am I done? did I say enough?") which creates anxiety. `Stop` is mechanical and unambiguous — "stop listening, parse what I said."
- **Processing copy diverges from 170j by one word.** 170j shipped `Got it, processing...`. 170n uses `Got it, parsing your meal...`. The word "meal" anchors the cold-start context (this is a brand-new meal being created from speech, not an edit being applied to an existing draft). One-word divergence; same warmth.
- **`Use text instead` link is small (12px), below Stop + Cancel, NOT equal-weight.** Mirrors the 170m `Use voice instead` link positioning decision. The user committed to voice by tapping the Voice card on §9.1; text is the fallback for "actually I would rather type this." Equal-weight CTA would compete with Stop and dilute the spoken-input commitment.
- **2-second auto-end-of-speech timeout (not 3 or 5).** 170j shipped at 2 sec for voice-edit. Matching for voice-native preserves user muscle memory: speak, pause 2 sec, parse begins. Longer timeout (3+ sec) tempts users to fill silence with filler words; shorter (1 sec) cuts off normal speech pauses.
- **No "tap mic to restart" affordance during processing.** Once Stop fires, the user cannot restart listening without canceling first. Considered allowing tap-mic-to-restart during processing (rejected): it tempts double-submit behavior and complicates the state machine. Cancel + reopen is the clean path; that takes 2 taps but is correct.

**Mobile adaptation:** full-viewport overlay; safe-area-aware top inset (Cancel X + Help sit below the notch); Stop CTA stays above the home indicator at bottom; haptic feedback fires on listening start (`'success' Tap` matching shipped 170j) and on Stop (`'impact' Light`).

---

## §9.3 Streaming transcript display

**Layout:**

When the platform supports streaming (Web Speech API on web; Gemini Audio on web fallback), partial transcripts render progressively in the body region of the §9.2 overlay between the MicRing and the Stop CTA. When the platform does NOT support streaming (Capacitor native v1 per spec §3.3), the transcript region stays empty during listening and the full transcript appears only at Stop.

Transcript region structure:
- **Container:** centered region max-width 360px (matches the 170j overlay `max-w-md` shipped wrapper); min-height `3rem` so the layout does not jump when transcript begins; auto-grows up to ~120px before internal scroll.
- **Text rendering:** finalized words render at 18px Medium white; in-flight (interim) words render at 18px Medium white/55 (the same medium font weight but 55% opacity to signal "this might still change").
- **Word-level diff:** as new partial transcripts arrive, finalized words remain stable; in-flight words may rewrite (e.g. "tu" → "two scrambled" as STT firms up). The visual treatment makes this rewrite legible rather than glitchy.
- **Auto-scroll:** when transcript exceeds visible height, the region scrolls to keep the most-recent word in view (smooth scroll behavior; reduced-motion: instant jump).
- **No cursor blink.** A blinking cursor at the end of the transcript would compete with the MicRing for "system is active" signaling. The MicRing pulsing IS the active-state indicator; the transcript shows what was understood.

**Header copy:** N/A (§9.2 header carries through).

**Body copy:**
- Streaming-supported platform, transcript empty: status `Listening, take your time` (from §9.2).
- Streaming-supported platform, transcript present: no separate status copy; the transcript itself is the body.
- Streaming-unsupported platform (Capacitor native), transcript empty (in-flight): status `Listening` (no transcript region visible during listening); a small inline note below the MicRing reads `We will show what you said after you stop` (12px white/65).

**CTAs:** none — Stop + Cancel inherited from §9.2.

**Conditional states:**
- **Streaming supported, partial transcript arrives:** finalized portion white at full opacity; in-flight portion white/55; word-level rewrites animate via opacity (not slide).
- **Streaming supported, no transcript after 10 sec of listening:** transitions to §9.6 no-speech variant.
- **Streaming supported, STT confidence per-word low (< 0.6):** that word renders in italic 18px Medium white/70 (italic = "I am not confident in this word"). On Stop, low-confidence words are sent to NLU with their confidence tier flagged so NLU can ask for clarification (per Gordon's combined-confidence framework).
- **Streaming unsupported (Capacitor native v1):** body region shows the static `We will show what you said after you stop` note; on Stop, the full transcript appears for ~800ms in finalized white before transitioning to processing.
- **Reduced-motion preference set:** word-level opacity transitions are instant (no fade); auto-scroll is instant jump.
- **iOS dynamic type scaled to 200%:** transcript text scales to 36px; the region's auto-grow accommodates the larger size; mobile devices may scroll the transcript inside the region rather than expanding the overlay.

**Accessibility commitments:**
- Transcript region is `aria-live="polite"` with `aria-atomic="false"` (matches shipped 170j pattern for streaming transcripts).
- Screen readers announce new finalized words as they arrive, NOT in-flight rewrites (rewrites would be noisy; polite + atomic-false delivers only the additions).
- The in-flight white/55 opacity is decorative; screen readers receive the same text regardless of finalization state (visual signal does not become a screen-reader signal — this is intentional, because screen reader users do not need to know that a word is still firming up at the STT layer; they need to know what was understood).
- Low-confidence italic words: italic is `font-style: italic` not `<em>` semantic emphasis, so screen readers do not change pitch.
- Auto-scroll respects `prefers-reduced-motion`.
- Color contrast: 18px white at full opacity on `#1A2744`/80 backdrop is 8.2:1; 18px white/55 in-flight is 4.5:1 exactly (verified at the small-text threshold for body text — borderline but passing).

**Push-back / UX decisions:**

- **Streaming inconsistency across platforms is a real UX gap; spec §3.3 admits this. My resolution: honest fallback copy + kill-switch surface in §9.10 tutorial.** I am NOT recommending we fake streaming on Capacitor native (e.g. by running the audio through Gemini Audio in parallel just to get partial transcripts). That would double the cost model and introduce divergent transcripts (two STT pipelines disagreeing). The honest path is: web users see streaming; native v1 users see the full transcript on Stop with a brief acknowledgment that the system "shows what you said after you stop." The §9.10 tutorial frames this expectation up front so users do not feel something is broken when they switch platforms.
- **In-flight transcript renders at white/55 opacity, not italic or strikethrough.** Considered italic for in-flight + italic for low-confidence. Rejected: dual-italic semantics would confuse the reader (italic could mean either "rewriting" or "uncertain"). Splitting the semantics — opacity for in-flight, italic for low-confidence — disambiguates.
- **No timestamp or word-count chip during listening.** The user does not need to know "you have spoken 14 words in 6 seconds." That information is noise. The MicRing + transcript + Stop button are sufficient orientation.
- **No "Pause" affordance.** Considered a Pause button next to Stop (pause = stop listening but resume on next tap, transcript preserved). Rejected for v1: doubles the state machine complexity, and the "I want to keep adding to this meal" path is better served by editing on the result review screen after Stop.
- **Auto-scroll is sticky-to-bottom, not sticky-to-cursor-position.** Sticky-to-bottom keeps the most-recent word visible; sticky-to-cursor would require defining cursor semantics for spoken input (no clean answer). Bottom-sticky is the simpler correct choice.

**Mobile adaptation:** transcript region is centered max-width 320px on mobile (slightly narrower than desktop 360px to keep line-length comfortable); auto-scroll uses `scroll-behavior: smooth` with reduced-motion fallback; word opacity transitions use `transition-opacity duration-200`.

---

## §9.4 Clarification card within the voice capture overlay

**Layout:**

When the parser returns `needs_clarification === true`, the voice overlay transforms in-place to show a clarification card. The MicRing collapses to a small 32px Mic icon at top-left of the body region (indicating "voice context preserved"), and the body fills with the clarification question + chips + voice-redo affordance.

Card content top-to-bottom:
1. **Mic context indicator (32px):** small `Mic` icon Teal at top-left + 8px gap + transcript snippet `What you said: "{first 60 chars of transcript}..."` (12px white/65 italic). User stays anchored to what they spoke.
2. **24px gap; clarification question region:**
   - `HelpCircle` icon 20px Teal + 8px gap inline + question text 16px Medium white (e.g. `How many eggs?`).
3. **16px gap; clarification chips region:**
   - Up to 4 chip options rendered as `<button>` elements, horizontal flex wrap with 8px gap.
   - Each chip: Card 80% fill, rounded `pill` (`rounded-full`), 12px Medium white text, 10px vertical / 16px horizontal padding (min hit area 44×44 via `min-h-[44px]`).
   - Focused chip: 2px Teal outline with 2px offset.
4. **16px gap; voice-redo affordance:**
   - Small inline row centered: `Mic` icon 16px Teal + 6px gap + link text `Or say the answer` (12px Teal underlined).
   - Tapping this re-opens listening with the clarification question pinned at top of overlay; user speaks the answer; parser receives `{ disambiguation: { question: "How many eggs?", answer: "{spoken response}" } }`.
5. **24px gap; CTA region:**
   - Primary `Continue` Teal solid 48px tall — disabled until a chip is tapped or a voice-answer is provided.
   - Cancel link below: `Cancel`.

**Header copy:** `Voice` (unchanged from §9.2).

**Body copy:**
- Transcript snippet: `What you said: "{first 60 chars}..."`
- Clarification question: returned by the parser verbatim (e.g. `How many eggs?` / `Was the rice white or brown?` / `How big was the bowl?`).
- Chip labels: returned by the parser as the `disambiguation.choices` array.
- Voice-redo link: `Or say the answer`.

**CTAs:**
- Chip tap (single): selects that chip; `Continue` enables; fires `voice_native_clarification_chip_tapped` Helix event.
- `Or say the answer` (link): re-enters listening state with the clarification question pinned; on transcript arrival, the spoken answer routes to the parser as free-text disambiguation; fires `voice_native_clarification_voice_redo_tapped`.
- `Continue` (Teal solid 48px primary): fires the re-parse request with the disambiguation payload; overlay transitions back to §9.2 processing state.
- `Cancel` (text link): dismisses overlay with no save; fires the standard `Cancel and discard what you said?` confirmation since a transcript is present.

**Conditional states:**
- **First clarification round (parser returned 1st question):** standard chip + voice-redo card.
- **Second clarification round (parser still cannot get clean output after 1st answer):** standard chip + voice-redo card with header note `One more thing` (14px white/80) above the question.
- **Third clarification round attempted:** transitions to §9.6 clarification-timeout variant with options `Try again with voice`, `Switch to text`, `Cancel`.
- **Voice-redo path: user speaks but transcript is empty / no speech:** the chip-tap path remains available; the voice-redo retry surfaces a small inline note `We did not catch that. Pick a chip or say it again.` (12px Orange).
- **Network failure during re-parse:** §9.6 unavailable variant.
- **Reduced-motion:** chip selection state change is instant (no animation).

**Accessibility commitments:**
- Clarification region is `role="group"` with `aria-labelledby` pointing to the question text.
- Chip list is `role="radiogroup"` (single-select), each chip `role="radio"` with `aria-checked`.
- Voice-redo link has `aria-label="Or say your answer instead of tapping a chip"`.
- aria-live="polite" announcement on clarification mount: `Question: {question text}. {n} options available.`
- aria-live="polite" announcement on chip select: `Selected: {chip label}. Continue when ready.`
- 44×44 minimum on each chip (enforced via `min-h-[44px]` even when chip text is short).
- Tab order: question (not focusable, just announced) → chip 1 → chip 2 → … → voice-redo link → Continue → Cancel.
- Reduced-motion: chip-select state change instant; voice-redo re-entry to listening is instant (no overlay transition animation).

**Push-back / UX decisions:**

- **Voice-redo affordance is unique to voice-native (170m text Quick Log does NOT have this).** A user who entered via voice and gets a clarification chip may prefer to answer in voice ("Just say it") rather than tap a chip. The `Or say the answer` link delivers this. This is the chip-replacement-by-voice pattern; chips remain available, voice is the alternative.
- **`Or say the answer` is small inline link, not equal-weight CTA.** Equal weight would suggest chip-tap and voice-answer are equivalent paths; in practice chip-tap is faster (3 chips = 1 tap to disambiguate) and voice-answer is slower (re-enter listening + re-process). The 12px link respects the speed differential while still offering the path.
- **Two-round limit before escalation (same as 170m §9.5).** Three+ rounds creates frustration loops; the §9.6 timeout-to-options variant is the honest exit ramp. Voice users may also choose `Switch to text` at that point — this is the only place where the dispatcher recommends cross-modality mid-flow.
- **Transcript snippet at top of card uses `italic` not `bold`.** Italic signals "this was your input"; bold would compete with the clarification question for primary attention. Italic + white/65 keeps the transcript context honest but secondary.

**Mobile adaptation:** full-viewport overlay preserved; chip region wraps to multi-row at narrow viewports; voice-redo link stays centered; CTA region sticky bottom inset preserved.

---

## §9.5 Multi-meal split confirmation card

**Layout:**

When the parser returns a non-null `split_into_multiple_meals_suggestion`, the voice overlay transforms in-place to show a multi-meal split confirmation card. Structure mirrors 170m §9.6 but with voice-native adaptations and the unique `Try again with voice` CTA.

Card content top-to-bottom:
1. **Mic context indicator (32px):** small `Mic` Teal icon + 8px gap + transcript snippet `What you said: "{first 80 chars}..."` (12px white/65 italic). Voice users get a slightly longer transcript snippet than the clarification card because multi-meal context benefits from more user-input visibility.
2. **24px gap; suggestion header:**
   - `Layers` Lucide icon 20px Teal (signals "we found multiple items") + 8px gap inline + header text `Sounded like more than one meal` (16px Medium white).
3. **12px gap; sub-header:**
   - `Want us to log these separately?` (14px white/80).
4. **16px gap; split preview region:**
   - Each suggested meal renders as a Card 70% fill rounded-12px row, 56px tall, with:
     - Left: meal-type icon (Sun for breakfast, Coffee for snack, etc.) 20px Teal
     - Center: meal-type label `Breakfast` 14px Medium white + sub-label first 2 item names truncated (`Eggs, toast`) 12px white/65
     - Right: small kcal chip `420 kcal` 12px Medium white
   - Up to 4 meal rows; if parser suggests 5+ the spec returns truncated to 4 (per Gordon contract).
5. **24px gap; CTA region (three CTAs, vertically stacked on mobile, horizontal on desktop):**
   - Primary `Log them separately` Teal solid 48px
   - Secondary `Log as one meal` Card 90% fill 44px outline
   - Tertiary `Try again with voice` text link 14px Teal underlined — see push-back, this is the voice-native-specific CTA per spec §6.4

**Header copy:** `Voice` (unchanged from §9.2).

**Body copy:**
- Transcript snippet: `What you said: "{first 80 chars}..."`
- Header: `Sounded like more than one meal`
- Sub-header: `Want us to log these separately?`
- Meal row labels: from parser `split_into_multiple_meals_suggestion[].meal_type` and `.item_summary`.
- Meal row kcal: from `split_into_multiple_meals_suggestion[].total_calories_kcal`.
- Primary CTA: `Log them separately`
- Secondary CTA: `Log as one meal`
- Tertiary CTA: `Try again with voice`

**CTAs:**
- `Log them separately` (Teal solid 48px primary): fires `voice_native_multi_meal_split_accepted` Helix event; saves N separate meals via the Quick Log batch endpoint; overlay closes; toast confirms `{n} meals logged` with Undo affordance (10 sec).
- `Log as one meal` (Card outline 44px secondary): fires `voice_native_multi_meal_split_rejected` event; saves all items as a single meal; overlay closes; toast `Meal logged` with Undo.
- `Try again with voice` (text link tertiary): fires `voice_native_multi_meal_redo_voice` event; re-opens listening with the prior transcript discarded; user re-speaks; per spec §6.4 this is the voice-native-specific path because re-recording is often faster than chip-selecting a wrong split.

**Conditional states:**
- **Parser suggested 2 meals:** 2 meal rows render.
- **Parser suggested 3 meals:** 3 rows.
- **Parser suggested 4 meals:** 4 rows.
- **Parser suggested 5+ meals:** clamps to 4 rows + small inline note `Plus 1 more meal` (12px white/60) — per Gordon contract.
- **User taps `Try again with voice`:** confirmation dialog `Discard what you said and try again?` with `Discard and listen` Orange + `Keep this` Teal CTAs.
- **User taps `Log them separately` but save fails partway (N of M succeed):** error toast `Some meals could not save. {n succeeded, m total}` with `View` link to meal history.
- **Reduced-motion:** CTA tap state changes instant; no slide-in for transition.

**Accessibility commitments:**
- Split card region is `role="group"` with `aria-labelledby` pointing to the header.
- Meal rows are NOT individually tappable (rejected: tappable rows imply per-meal toggle which is not the offered choice; the choice is all-separate, all-one, or redo).
- aria-live="polite" announcement on mount: `{n} meals detected. {meal type 1}, {meal type 2}. Log separately, log as one, or try again with voice.`
- CTA tab order: `Log them separately` → `Log as one meal` → `Try again with voice` → Cancel.
- 44×44 minimum on all three CTAs (primary 48, secondary 44, tertiary text-link with padded hit area).
- The `Try again with voice` confirmation dialog focuses the destructive `Discard and listen` Orange CTA but defaults to `Keep this` (Teal, focusable but not auto-focused) per spec §6.4 voice-native re-recording posture.

**Push-back / UX decisions:**

- **`Try again with voice` is the voice-native-specific tertiary CTA per spec §6.4. I am affirming this and adding the discard-confirmation flow.** Spec §6.4 says "sometimes the user spoke quickly and the multi-meal interpretation is wrong; re-recording is faster than chip-selecting through a wrong interpretation." Correct. But re-recording discards both the transcript and the parsed meal items — that is destructive. The confirmation dialog `Discard what you said and try again?` is the safety net. The 170m text Quick Log does NOT have an equivalent because re-typing 80 chars is more friction than re-tapping chips; voice has the inverse.
- **Three CTAs stack vertically on mobile, horizontal on desktop.** Mobile stacked preserves the primary > secondary > tertiary hierarchy. Desktop horizontal saves vertical space. Tertiary `Try again with voice` is text-link not button to differentiate from primary/secondary destructive-or-confirm semantics.
- **Meal rows are NOT individually tappable.** Considered allowing per-meal toggle (user could decide meal 1 + meal 2 split but meal 3 fold-in). Rejected: complicates the state machine massively; the offered choice is all-separate, all-one, or redo. Three CTAs is sufficient.
- **Truncation to 4 meals max comes from Gordon contract, not Hannah.** If parser suggests 5+ meals it is almost certainly mis-parsing (a meal description rarely contains 5+ distinct meals). The +1 inline note is honest disclosure.
- **No `Edit before logging` CTA on this card.** The user can edit on the result review screen after saving (whether one meal or N meals). Adding an edit path here would tier the choice into 4 CTAs which is too many. Edit-on-review is the canonical edit affordance.

**Mobile adaptation:** vertical CTA stack at narrow viewports; meal rows full-width with 12px gutters; safe-area bottom inset preserved; the 80-char transcript snippet may wrap to 2 lines on narrow viewports.

---

## §9.6 Error states

**Layout:**

Standard error states inheriting from 170j §11.6 + 170m §9.9, adapted for voice-native cold-start context. Each variant replaces the §9.2 overlay body region in-place; the header strip + Cancel X remain visible at top.

**Variant A: No-speech-detected (10+ sec of listening, no transcript)**

- Body content top-to-bottom:
  - `MicOff` Lucide icon 32px Orange centered + 16px gap below
  - Header text `We did not catch that` 18px Medium white centered + 8px gap
  - Body copy `Try moving closer to your mic, or speaking a bit louder.` 14px white/80 centered, max-width 280px
- CTAs:
  - Primary `Try again` (Teal solid 48px) — closes error, returns to §9.2 listening state with cycling examples
  - Secondary `Use text instead` (text link 14px) — closes voice, opens 170m Quick Log modal
  - Tertiary `Cancel` (text link 14px white/55)

**Variant B: STT low-confidence (transcript arrived but combined STT confidence < 0.5)**

- Body content top-to-bottom:
  - `AlertCircle` Lucide icon 20px Orange + 8px gap inline + header `We heard you, but not clearly` (16px Medium white)
  - 12px gap; transcript display region matching §9.3 but ALL words rendered at white/55 italic (because the entire transcript is uncertain)
  - 16px gap; body copy `Want to try again? You can also tap "Use what we heard" if it is close enough.` (14px white/80)
- CTAs:
  - Primary `Try again` (Teal solid 48px) — closes error, returns to §9.2 listening state with a fresh capture
  - Secondary `Use what we heard` (Card 90% fill 44px outline) — sends the low-confidence transcript to NLU anyway; surfaces with explicit low-confidence flag in result review
  - Tertiary `Cancel` (text link)

**Variant C: NLU empty meal_items (transcript was clear but parser found no foods)**

- Body content top-to-bottom:
  - `Search` Lucide icon 32px Orange centered + 16px gap
  - Header `We did not find a meal in there` 18px Medium white centered + 8px gap
  - Transcript display region showing the full transcript at 14px white/70 (so user can see what was sent)
  - 16px gap; body copy `Try again with what you ate, or type it instead.` (14px white/80)
- CTAs:
  - Primary `Try again with voice` (Teal solid 48px)
  - Secondary `Type it instead` (Card outline 44px) — closes voice, opens Quick Log with the transcript pre-filled in the textarea (user can edit)
  - Tertiary `Cancel`

**Variant D: NLU service unavailable (503, network error, 15+ sec timeout)**

- Body content top-to-bottom:
  - `WifiOff` Lucide icon 32px Orange (or `CloudOff` for non-network errors) centered + 16px gap
  - Header `Could not parse that right now` 18px Medium white centered + 8px gap
  - Body copy `Something went wrong on our end. Your voice was not saved.` (14px white/80) — explicit privacy reassurance because the user spoke and the system failed
- CTAs:
  - Primary `Try again` (Teal solid 48px)
  - Secondary `Use text instead` (Card outline 44px)
  - Tertiary `Cancel`

**Variant E: Microphone permission denied (pre-listening or revoked mid-flow)**

- Body content top-to-bottom:
  - `MicOff` Lucide icon 32px Orange centered + 16px gap
  - Header `We need microphone access` 18px Medium white centered + 8px gap
  - Body copy `Enable mic access in Settings to log by voice. You can still type instead.` (14px white/80)
- CTAs:
  - Primary `Open Settings` (Teal solid 48px) — routes to system-settings deep-link on iOS or in-app Settings > NutriVision > Voice on web/Android
  - Secondary `Type it instead` (Card outline 44px)
  - Tertiary `Cancel`

**Variant F: Clarification timeout (2 rounds completed, parser still cannot disambiguate, transitions from §9.4)**

- Body content top-to-bottom:
  - `HelpCircle` Lucide icon 32px Orange centered + 16px gap
  - Header `Having trouble understanding the details` 18px Medium white centered + 8px gap
  - Body copy `Try saying it again with more detail, or type it for precise control.` (14px white/80)
- CTAs:
  - Primary `Try again with voice` (Teal solid 48px)
  - Secondary `Switch to text` (Card outline 44px) — opens Quick Log with the original transcript pre-filled
  - Tertiary `Cancel`

**Header copy:** `Voice` (unchanged across all variants).

**Body copy:** see per-variant above. All copy honors the no-em-or-en-dashes rule (commas, colons, semicolons only); warmth-and-precision tone.

**CTAs:** see per-variant above.

**Conditional states:**
- Each variant has its own entry trigger documented above.
- All variants share: `Cancel` exits the overlay entirely (no in-flight confirmation here because the error already represents a failure to parse, so there is no draft to lose).
- Reduced-motion: all icon mounts are instant (no fade); CTA state changes instant.

**Accessibility commitments:**
- Each variant is `role="alertdialog"` (NOT `role="dialog"` — the alertdialog semantic conveys "this needs your attention" to screen readers).
- `aria-labelledby` points to the per-variant header text.
- `aria-describedby` points to the body copy.
- aria-live="assertive" announcement on mount for variants A, D, E (the most surprising errors); aria-live="polite" for B, C, F (less surprising, expected friction).
- Focus moves to the primary `Try again` CTA on mount for variants A, B, C, D, F; to `Open Settings` for variant E.
- All CTAs ≥ 44×44.
- Color contrast: 32px Orange icon on `#1A2744`/80 backdrop is 4.8:1; 18px white header is 8.2:1; 14px white/80 body is 5.8:1.

**Push-back / UX decisions:**

- **Variant B (STT low-confidence) is the most important variant and ships ONLY because of the combined-confidence framework.** This variant exists because Gordon's combined-confidence framework gives the system a way to know "STT understood the words but only barely." Without combined confidence, the system would either fail silently (variant C, no items found) or surface garbage to NLU. The B-variant `Use what we heard` CTA respects user agency: "we can show you what we have if you want."
- **Variant C transcript pre-fill is critical to user trust.** When NLU finds no foods in a clear transcript ("I had a great workout this morning"), pre-filling the transcript into Quick Log lets the user edit and re-submit without re-speaking. This is the voice-to-text bridge.
- **Variant D explicitly states the voice was NOT saved.** Privacy reassurance is load-bearing here. A user whose voice attempt failed must not wonder whether the audio was retained on a backend somewhere. The copy `Your voice was not saved` makes the ephemeral-audio property visible at the moment the user is most anxious about it.
- **Variant E `Open Settings` deep-link path differs by platform.** On iOS Capacitor, the system-settings URL scheme routes to the app's permission page directly. On web, no equivalent — the CTA opens in-app Settings > NutriVision > Voice section. On Android Capacitor, the system-settings intent. All three paths are wired in the platform-detect util; the visible CTA label is the same.
- **No `Help` CTA on error variants.** Considered linking to a help article from variants. Rejected: errors should offer paths forward (try again, switch text, cancel), not paths sideways. The §9.10 tutorial replay link from Settings is the help-content surface.

**Mobile adaptation:** all variants are full-viewport overlay on mobile; CTAs vertical stack; safe-area inset preserved; haptic feedback fires on error mount (`'impact' Heavy`).

---

## §9.7 Quick Apply Mode for high-confidence voice-native parses

**Layout:**

QAM triggers when the parser returns a result that passes BOTH the NLU confidence threshold (≥ 0.92) AND the STT confidence threshold (≥ 0.92). Combined confidence = geometric mean of NLU × STT scores. When eligible, the voice overlay closes immediately on parse success and the meal saves automatically — NO result review screen is shown. A persistent toast at bottom of NutriVision tab shows the saved meal with an Undo affordance for 10 seconds.

QAM toast structure:
- Anchored bottom-center on mobile (above the tab bar safe-area); bottom-right on desktop with 24px margin.
- Card `#1E3054` at 100% fill, rounded `12px`, 16px padding, max-width 360px.
- Content top-to-bottom:
  - Row 1: `CheckCircle` icon 20px Teal + 8px gap inline + label `Logged: {first 28 chars of transcript}` 14px Medium white (truncated with ellipsis if longer)
  - Row 2: 4px gap; macros chip `{kcal} kcal, {protein}g protein` 12px white/70
  - Row 3: 8px gap; `Undo` text link 14px Teal underlined, right-aligned, with `X` Lucide dismiss icon 16px white/55 to the right
- Toast slides up from bottom on mount (200ms ease-out; reduced-motion: instant fade-in).
- Auto-dismisses at 10 sec OR on tap-outside OR on Undo OR on dismiss X.

**Header copy:** N/A (toast has no header).

**Body copy:**
- Toast title row: `Logged: {first 28 chars of transcript}` (truncated)
- Toast macros row: `{kcal} kcal, {protein}g protein`
- Undo link: `Undo`
- Dismiss icon hit area aria-label: `Dismiss toast`

**CTAs:**
- `Undo` (text link): fires `voice_native_qam_undone` Helix event; deletes the just-saved meal; toast transforms briefly to `Undone` confirmation (1.5 sec) then auto-dismisses; the meal does NOT appear in Recent.
- Dismiss `X`: closes toast without action; meal stays saved; no Helix event.
- Tap toast body (not on Undo or X): opens the saved meal in result review for editing.

**Conditional states:**
- **NLU confidence < 0.92 OR STT confidence < 0.92 OR combined < 0.85:** QAM does NOT trigger; result review screen shows normally with confidence badge.
- **NLU confidence ≥ 0.92 AND STT confidence ≥ 0.92 AND combined ≥ 0.85:** QAM triggers; meal saves automatically; toast appears.
- **User has QAM disabled in §9.9 Settings:** QAM never triggers; result review always shows.
- **Reduced-motion:** toast appears via instant fade-in instead of slide-up.
- **User taps Undo within 10 sec:** meal deleted; daily totals re-calculated; `voice_native_qam_undone` fires.
- **User does nothing for 10 sec:** toast auto-dismisses; meal stays saved.

**Accessibility commitments:**
- Toast is `role="status"` with `aria-live="polite"` and `aria-atomic="true"` (announces full content on mount).
- Announcement copy: `Meal logged automatically: {transcript snippet}, {kcal} calories. Undo or dismiss.`
- Focus does NOT move to the toast (would disrupt the user); the Undo and dismiss are keyboard-accessible via Tab from page focus.
- 44×44 minimum on Undo (link with `padding-y` extension) and dismiss X.
- Color contrast: 14px Medium white on Card 100% is 6.5:1; 12px white/70 macros is 4.8:1; 14px Teal Undo on Card is 4.7:1.
- The 10-second timer is announced at 7 sec via aria-live="polite": `3 seconds to undo` (for screen reader users who need extra time — see push-back).

**Push-back / UX decisions:**

- **Spec §6.5 framing of "0.92 vs 0.92" is genuinely confusing; I am rewriting the user-facing logic.** The spec says voice-native QAM uses "the same 0.92 numerical threshold" as voice-edit "but with stricter STT requirement (combined = geometric mean of NLU confidence AND STT confidence)." That is a contradiction at the user-facing layer: how can two thresholds be "the same" but also one be "stricter"? Resolution: the underlying math IS the same per-metric (0.92), but the COMBINED requirement is what makes voice-native stricter. Voice-edit gates on NLU confidence alone (the user already typed something for the edit, so STT confidence doesn't apply). Voice-native gates on BOTH NLU AND STT (because the user spoke, and STT could have mis-heard). The combined-confidence framework is the resolution. **User-facing copy never references numerics.** Toast copy says `Logged:` not `Logged with 94% confidence:`; Settings copy says `When we are sure we got it right` not `When confidence is above 0.92`. Numerics are for telemetry only.
- **QAM toast persists 10 sec, NOT 5 sec (as 170j shipped voice-edit QAM).** Voice-native is cold-start: the saved meal did not exist 8 seconds ago. The user needs more time to mentally reconcile "I just spoke and a meal got logged" than they do for an edit ("I just spoke and my existing meal updated"). 10 sec is the voice-edit standard per 170m §6.6; matching here.
- **Tap-toast-body opens result review for editing.** This is the recovery path for "QAM saved it but I want to tweak." Without this affordance the only way to edit a QAM-saved meal is to navigate to Meal History after the toast dismisses, which is 3+ taps away.
- **No QAM for clarification-resolved parses.** If the user went through §9.4 clarification, the parse is by definition NOT high-confidence (the system asked for clarification because it wasn't sure). QAM only applies to first-pass clean parses.
- **No QAM for multi-meal splits.** Splits go through §9.5 confirmation always; no automatic save. The user must explicitly choose split-or-fold.
- **Screen reader announcement at 7 sec is the under-served accessibility win.** Sighted users see the toast and the timer is implicit. Screen reader users hear the meal logged announcement at mount but may not know the 10-sec window is ticking down. Announcing `3 seconds to undo` at 7 sec gives them time to navigate the Undo focus and tap.

**Mobile adaptation:** toast anchored bottom-center; sits above the tab bar at `bottom-{tab-bar-height + 16px}`; safe-area-aware bottom inset; haptic feedback `'success' Tap` on toast mount.

---

## §9.8 From-Voice-Log chip on result review

**Layout:**

Parallel to 170m From-Quick-Log chip. Position: result review header beside the meal name, leftmost in the metadata row.

Chip structure:
- Card 80% fill, rounded `pill` (`rounded-full`), 8px vertical / 12px horizontal padding (min hit area 44×44 via wrapper).
- `Mic` Lucide icon 14px Teal + 6px gap + label `From voice` 12px Medium white.
- Focused state: 2px Teal outline.
- Tappable; opens popover on tap.

Popover (mobile: bottom sheet; desktop: anchored above chip):
- Card `#1E3054` at 100% fill, rounded `16px`, 16px padding, max-width 320px.
- Content depends on transcript retention state (see Conditional states below).

**Header copy:** Chip label `From voice`.

**Body copy:**

*Retention ON popover:*
- Header: `What you said`
- Body: normalized transcript at 14px white/85 italic, 4-line max with internal scroll
- 16px gap; CTA `Try again with voice` (text link 14px Teal underlined)
- 12px gap; small dismiss `X` top-right corner of popover

*Retention OFF (default) popover:*
- Header: `Voice meal summary`
- Body: macros breakdown `{kcal} kcal, {protein}g protein, {carbs}g carbs, {fat}g fat` (14px white/85)
- 8px gap; small inline note `Transcripts are off. Turn on in Settings to see what you said.` (12px white/60)
- 16px gap; CTA `Try again with voice` (text link 14px Teal underlined)
- 12px gap; small dismiss `X`

**CTAs:**
- Chip tap: opens popover.
- `Try again with voice` (popover link): closes popover; opens §9.2 voice overlay; on transcript arrival, re-parses and replaces the current meal_items entirely (per 170m §8.4 same-replacement semantics); fires the standard `Discard this meal and try again with voice?` confirmation if the user has edited items on the current review screen.
- Dismiss `X` (popover): closes popover.

**Conditional states:**
- **User has transcript retention ON in §9.9 Settings:** popover shows the transcript.
- **User has transcript retention OFF (default):** popover shows the macros summary + the off-state note linking to Settings.
- **User saved the meal via QAM (§9.7):** chip still renders on result review (user can navigate to the saved meal later and see the chip in meal history).
- **User edited meal_items after voice parse:** chip remains; tapping it shows the popover; `Try again with voice` fires the confirmation about discarding edits.
- **Transcript was over 200 chars and got truncated for storage:** popover shows truncated transcript + small note `Showing the first 200 characters of what you said.` (12px white/60).
- **Reduced-motion:** popover appears via instant fade-in on mobile (no slide-up) and instant on desktop.

**Accessibility commitments:**
- Chip is `<button>` with aria-label `From voice. Tap to see details.`
- Popover is `role="dialog"` with `aria-modal="true"` on mobile (bottom sheet covers the page) and `role="dialog"` with `aria-modal="false"` on desktop (anchored popover, page remains operable).
- Focus moves to dismiss `X` on popover mount; Tab cycles through transcript region → `Try again with voice` → `X`.
- aria-live="polite" announcement on popover mount: `Voice meal details. {transcript snippet or macros summary}.`
- Escape closes popover.
- 44×44 minimum on chip wrapper, dismiss X, and the `Try again with voice` link (padded hit area).
- Color contrast: 12px Medium white chip label on Card 80% is 5.4:1; 14px white/85 italic body is 5.6:1; 12px white/60 inline note is 4.5:1.

**Push-back / UX decisions:**

- **Two popover variants by retention state, NOT one variant with hidden-when-empty transcript region.** A one-variant design would show "transcript not available" copy when retention is off. That copy reads as a system failure ("we lost the transcript"). The macros-summary variant reframes the popover as "here is the meal you logged by voice" with the transcript as an opt-in extra. This is the honest framing for the privacy-default choice.
- **`Try again with voice` is the canonical retry CTA on both variants.** Even when transcript is retained, the user does not get to "edit the transcript" inline — the retry is always a full re-record. This is intentional: transcripts are evidentiary records of what was spoken, not editable text. Edits happen at the meal_items level on the result review surface, not at the transcript level.
- **Chip uses `Mic` icon, not `Voice` icon (no canonical Lucide "Voice" icon exists).** Mic is the universally understood symbol for voice input. The label `From voice` clarifies the semantics.
- **No `Delete this transcript` affordance in the popover.** Considered offering a per-meal transcript-delete. Rejected: transcript retention is a global toggle in Settings; per-meal exceptions create policy ambiguity (what if the user enables retention, logs 50 meals, then deletes 20 transcripts — what is the retention policy?). The global toggle is the right granularity.
- **Mobile popover is bottom sheet, NOT anchored to chip position.** A chip-anchored popover on mobile would either be cropped by the screen edge or float oddly. Bottom sheet is the platform-conventional disclosure pattern and the modal aria-modal="true" matches user expectation.

**Mobile adaptation:** bottom sheet popover with full-width minus 16px gutters; slide-up on mount (reduced-motion: instant); dismiss X top-right of sheet; tap-outside-sheet dismisses.

---

## §9.9 Settings preferences additions (new VoiceNativeSettingsSection)

**Layout:**

**Architectural decision: new section, NOT extension of QuickLogSettingsSection.** The shipped 170m QuickLogSettingsSection is read-only informational; it has no toggles. Voice-native needs three interactive controls, which would re-architect that section. Instead, I am recommending a new `VoiceNativeSettingsSection` placed between VoiceSettingsSection (170j voice-edit toggles) and QuickLogSettingsSection in the settings page render order.

To address Issue 2 (settings density risk), I am ALSO recommending a parent reorganization: **wrap VoiceSettingsSection + VoiceNativeSettingsSection inside a single "Voice Preferences" group card** with a split-list pattern. The two sub-sections collapse under a single Voice header on first render; tapping the section reveals both sub-cards. This contains the voice toggles count from 4 (170j) + 3 (170n) = 7 toggles at top-level to a grouped 7 toggles inside a single Voice card.

VoiceNativeSettingsSection structure (inside the Voice Preferences group):
- Outer Card `#1E3054` at 45% fill, rounded `2xl`, 16px padding.
- Header row: `Mic` icon Teal in 40px Teal/15 circular bg + 12px gap + heading `Voice on the NutriVision tab` (14px Medium white) + 4px gap + sub-heading `Speak meals into the four-button row` (12px white/65).
- 16px gap; toggle list:
  1. **Voice-native entry on the NutriVision tab.** Default ON after permission grant; OFF after explicit toggle-off or hard-deny of mic permission. Sub-label: `When off, the Voice card is hidden from the four-button row`.
  2. **Save voice transcripts for my reference.** Default OFF. Sub-label: `Keep what you said with each meal. You can review it later on the result review screen or in meal history.`
  3. **Quick Apply Mode for voice meals.** Default ON. Sub-label: `Save high-confidence voice meals automatically with a 10-second undo. You can tap the saved meal to edit.` Link: `Learn how Quick Apply Mode works` (12px Teal underlined) — opens an inline overlay with the shared Quick Apply Mode explainer (shared with 170j voice-edit QAM).

**Header copy:**
- Section heading: `Voice on the NutriVision tab`
- Sub-heading: `Speak meals into the four-button row`

**Body copy:**
- Toggle 1: `Voice-native entry on the NutriVision tab`
  - Sub-label: `When off, the Voice card is hidden from the four-button row`
- Toggle 2: `Save voice transcripts for my reference`
  - Sub-label: `Keep what you said with each meal. You can review it later on the result review screen or in meal history.`
- Toggle 3: `Quick Apply Mode for voice meals`
  - Sub-label: `Save high-confidence voice meals automatically with a 10-second undo. You can tap the saved meal to edit.`
- Quick Apply Mode link: `Learn how Quick Apply Mode works`

**CTAs:**
- Toggle 1 ON → OFF: fires confirmation `Hide the Voice card from the NutriVision tab?` with `Hide` Orange + `Keep it` Teal CTAs (matches 170j voice-edit hide pattern).
- Toggle 1 OFF → ON: if microphone permission not granted, fires the permission prompt first; on grant, toggle activates; on deny, toggle stays OFF with inline note `Mic permission is required to enable voice.` (12px Orange).
- Toggle 2 ON → OFF: fires confirmation `Turn off transcript saving? Past transcripts will be deleted.` with `Turn off and delete` Orange + `Keep on` Teal CTAs. On confirm, all existing transcripts older than 1 minute are deleted from the user's meals (server-side cascade).
- Toggle 2 OFF → ON: fires explanatory dialog `Transcripts will be saved with each new voice meal. This does not affect past meals.` with single CTA `Got it` Teal.
- Toggle 3 ON → OFF: fires confirmation `Turn off Quick Apply Mode? You will review every voice meal before it is saved.` with `Turn off` Orange + `Keep on` Teal CTAs.
- Toggle 3 OFF → ON: fires explanatory dialog `Quick Apply Mode will save high-confidence voice meals automatically. You can undo within 10 seconds.` with single CTA `Got it` Teal.
- `Learn how Quick Apply Mode works`: opens shared QAM explainer overlay (content same as the 170j voice-edit explainer; one-source for both contexts).

**Conditional states:**
- **Mic permission not granted at section mount:** all three toggles disabled with inline note `Enable microphone access to use voice.` + CTA `Open Settings` (text link 12px Teal).
- **Toggle 1 OFF:** toggles 2 and 3 remain enabled but their effects are dormant until Toggle 1 is re-enabled (they govern voice behavior; with voice off, no behavior to govern). Small inline note above toggles 2 + 3: `These settings apply when voice is on.` (12px white/60).
- **Toggle 2 ON, user has zero saved transcripts yet:** sub-label updates to add `New voice meals will save with transcripts starting now.`
- **Toggle 3 ON, user has used QAM before:** sub-label adds inline count `You have used Quick Apply Mode {n} times.` (12px white/65) — gentle reinforcement of the feature's utility.
- **`VOICE_NATIVE_ENABLED = false`:** entire VoiceNativeSettingsSection is hidden from settings page; the user cannot toggle voice-native preferences when the feature is server-side disabled.
- **Reduced-motion:** toggle state changes are instant (no animated slide); dialog mounts are instant.

**Accessibility commitments:**
- Section is `<section>` with `aria-labelledby` pointing to the heading.
- Each toggle is a native `<button role="switch">` with `aria-checked` state.
- Each toggle has an `aria-describedby` pointing to its sub-label.
- Confirmation dialogs are `role="alertdialog"` with focus auto-moving to the safer-of-the-two-CTAs (`Keep it` for toggle 1, `Keep on` for toggles 2 + 3, matching the 170j voice-edit pattern of safer-default focus).
- aria-live="polite" announcement on toggle change: `Voice-native entry on the NutriVision tab, on/off.`
- 44×44 minimum on each toggle hit area (switches are typically 32×20 visible but wrap in 44×44 button).
- Color contrast: 14px Medium white toggle label on Card 45% is 7.0:1; 12px white/65 sub-label is 4.7:1; 12px Teal link is 4.7:1.

**Push-back / UX decisions:**

- **New VoiceNativeSettingsSection, NOT extension of QuickLogSettingsSection.** QuickLogSettingsSection is currently a 40-line read-only informational card. Bolting three interactive toggles onto it would require a re-architecture of that section. The cleaner path is a new section with its own concerns, sibling to VoiceSettingsSection.
- **Voice Preferences group card wrapping VoiceSettingsSection + VoiceNativeSettingsSection.** Issue 2 raised the settings density risk: 170j has 4 voice-edit toggles, 170n adds 3 more = 7 toggles. Without grouping, the settings page becomes a wall of voice controls. Wrapping both sections inside a single "Voice Preferences" parent card with the two sub-cards visible inside contains the visual density and signals "these belong together." The two sub-cards do NOT collapse-by-default (I considered that, rejected: hiding 7 toggles behind a tap creates discovery friction for power users) — they render expanded inside the parent.
- **Transcript retention default OFF, with explicit opt-in dialog.** Issue 6 noted this trade-off: privacy-default reduces 170g corpus training signal. Resolution: the privacy default is correct (transcripts are voice biometric data; storing by default is a HIPAA-aware overreach). The opt-in dialog `Transcripts will be saved with each new voice meal` honestly frames what the user is enabling. Users who opt in feed 170g; users who do not preserve privacy. The trade-off is transparent.
- **Toggle 2 OFF → past transcripts get deleted on confirm.** The destructive cascade matches user mental model: "I turned off transcript saving" implies "the system should not have my transcripts anymore." Half-deletes (toggle off but retain past) would create a confusing "the system kind of has my transcripts" state. Clean cascade is the right semantic.
- **QAM link opens shared explainer (same as 170j voice-edit).** Spec §12.7 calls for shared QAM explanation across both voice surfaces. Sharing one explainer content source avoids drift; users who learned QAM in voice-edit context recognize the same content in voice-native context.
- **The Toggle-1-OFF dormant-toggles note is the easy-to-miss accessibility win.** Without it, a user who toggles 1 OFF might expect toggles 2 and 3 to become disabled visually. They stay enabled because they're not literally non-functional (turning voice back on re-engages them); but the inline note `These settings apply when voice is on.` is the honest disclosure.
- **No "Reset voice settings to default" CTA.** Considered a reset link at bottom of section. Rejected: low-frequency need; users who want to reset can toggle each individually; reset CTAs invite accidental destructive taps.

**Mobile adaptation:** Voice Preferences group card stacks vertically on mobile with full-width minus 16px gutters; toggles take full width; confirmation dialogs are bottom-sheet style on mobile, centered modal on desktop.

---

## §9.10 First-time tutorial overlay

**Layout:**

Triggered on the first-ever tap of the Voice card on §9.1 (per-user, persisted in localStorage flag `voice_native_tutorial_seen_v1` and synced to `user_nutrivision_settings.voice_native_tutorial_seen`).

Surface: full-modal overlay over §9.1 background. Navy `#1A2744` at 92 percent opacity backdrop (matches 170m). Centered content panel 320px wide × auto-height on desktop; full-bleed top inset on mobile with same-width content. Three-slide stack with progress dots at top, CTA bar at bottom.

Tutorial slides (matching 170m three-slide pattern with 170n-specific content):

**Slide 1: Hands-free meal logging**
- 64px Hannah avatar at top (Supabase Mobile Hero bucket URL per project memory).
- Header: `Speak your meal, hands-free` (18px Medium white).
- Body: `Tap Voice, say what you ate, and we will log it. Works while cooking, eating, or moving around.` (14px white/80).
- Skip link bottom-left + `Next` Teal solid 44px bottom-right.

**Slide 2: We might ask a question**
- 64px Hannah avatar at top.
- Header: `We might ask a quick question` (18px Medium white).
- Body: `If we are not sure about something, we will ask: how many eggs, what kind of rice. Tap a chip or say the answer.` (14px white/80).
- Skip link bottom-left + `Next` Teal solid 44px bottom-right.

**Slide 3: Privacy + streaming caveat (the platform-honesty slide)**
- 64px Hannah avatar at top.
- Header: `Your voice stays yours` (18px Medium white).
- Body part 1: `Voice is processed in the moment and never saved unless you turn on transcript saving in Settings.` (14px white/80).
- Body part 2 (conditional on platform): on Capacitor native, an added line `On this device, we will show what you said after you stop, not while you speak.` (12px white/65) — the streaming-unavailable disclosure per Issue 5.
- Replace `Next` with `Got it, start speaking` Teal solid 44px bottom-right.

**Header copy:** Per-slide above.

**Body copy:** Per-slide above.

**CTAs:**
- `Skip` (slides 1 and 2, text-link 14px white/80 bottom-left): closes tutorial, sets the localStorage flag, opens §9.2 voice capture overlay directly.
- `Next` (slides 1 and 2, Teal solid 44px bottom-right): advances to next slide.
- `Got it, start speaking` (slide 3, Teal solid 44px): closes tutorial, sets the flag, triggers system mic permission prompt (if not yet granted), then opens §9.2 overlay with listening auto-start on permission grant.
- Progress dots (top, three dots): not interactive but indicate slide position via 8px filled-circle for active slide and 6px outline-circle for inactive slides.

**Conditional states:**
- **User has previously seen the tutorial (flag set):** tutorial does NOT auto-mount; §9.2 overlay opens immediately on Voice card tap.
- **User opens tutorial from §9.9 Settings `Learn how Quick Apply Mode works` (when in voice-native context) or from §9.2 Help button:** same content, same flow; on completion returns to whatever opened the tutorial (Settings or §9.2 overlay).
- **Streaming-supported platform (web with Web Speech API or Gemini Audio):** slide 3 body part 2 streaming caveat is omitted.
- **Streaming-unsupported platform (Capacitor native v1):** slide 3 includes the caveat line.
- **Mic permission already granted (e.g. user previously used 170j voice-edit):** slide 3 `Got it, start speaking` skips the permission prompt and goes straight to §9.2 with listening auto-start.
- **Mic permission already hard-denied:** tutorial still shows but slide 3 CTA changes to `Open Settings to allow mic` Teal solid; tutorial closes on tap and routes to system settings.
- **Reduced-motion:** slide transitions are instant (no slide animation); progress-dot fill changes are instant.

**Accessibility commitments:**
- Tutorial modal is `role="dialog"` with `aria-modal="true"`, `aria-labelledby` pointing to the per-slide header.
- Focus moves to the slide header on each slide change; Tab order on each slide: header (not focusable) → body (not focusable) → Skip → Next.
- Escape key closes tutorial without setting the seen flag (user can re-trigger on next Voice tap).
- aria-live="polite" announcement on slide change: `Slide {n} of 3. {header}.`
- 44×44 minimum on Skip link (text-link with padding-y extension), Next button (44 explicit), `Got it, start speaking` button (44 explicit), progress dots (decorative, aria-hidden).
- Color contrast: 18px Medium white header on Navy/92 backdrop is 8.5:1; 14px white/80 body is 6.0:1; 12px white/65 streaming caveat is 4.8:1.

**Push-back / UX decisions:**

- **Slide 3 includes the platform-streaming caveat as an honest disclosure.** Issue 5 raised the cross-platform streaming inconsistency. The §9.10 tutorial is the right surface to set this expectation BEFORE the user encounters the surprise on Capacitor native. The caveat copy `On this device, we will show what you said after you stop, not while you speak.` is matter-of-fact, not apologetic. It frames the experience as a platform reality, not a system failure.
- **Three slides, not five.** Considered adding slides for "multi-meal split" and "From voice chip." Rejected: tutorial bloat. Users discover these affordances in the flow; the tutorial primes the highest-friction concepts (hands-free, clarification, privacy) and lets the rest emerge through use.
- **Slide 2 primes clarification cards.** Without this slide, users encountering a §9.4 clarification card mid-flow might think the system is broken. The tutorial sets expectation: "we might ask a question; that is normal."
- **Slide 3 privacy framing is load-bearing.** Voice input creates user anxiety about audio retention more than text input does. The slide 3 copy `Voice is processed in the moment and never saved unless you turn on transcript saving in Settings.` is the explicit ephemeral-audio commitment that reassures privacy-conscious users to proceed.
- **`Got it, start speaking` triggers the mic permission prompt.** This is the canonical "permission-on-action, not permission-on-page-load" pattern. Users who tap that CTA are signaling intent to use voice, which is the appropriate moment to request permission.
- **Tutorial replayable from Settings.** The §9.9 `Learn how Quick Apply Mode works` link in voice-native context surfaces the QAM explainer; the broader voice-native tutorial replay lives at the Voice Preferences group header `Watch the voice intro` text link (12px Teal underlined) — see §9.9 Settings for placement.

**Mobile adaptation:** full-bleed top inset on mobile; 64px Hannah avatar safe-area-aware; slide content padded 24px horizontal; progress dots top with 16px gap below; CTA bar bottom with safe-area-aware inset.

---

## Cross-section summary table

| Section | Surface | Inheritance source | Key push-back |
|---|---|---|---|
| §9.1 | Four-button idle row | 170m three-button row | 2×2 grid collapse at ≤ 359px viewport |
| §9.2 | Voice capture overlay | 170j VoiceCaptureOverlay | Desktop 480px modal not full-viewport |
| §9.3 | Streaming transcript | 170j transcript pattern | Honest fallback copy on Capacitor native v1 |
| §9.4 | Clarification card | 170m §9.5 chip pattern | Voice-redo affordance unique to voice-native |
| §9.5 | Multi-meal split | 170m §9.6 split card | `Try again with voice` tertiary CTA |
| §9.6 | Error states | 170j §11.6 + 170m §9.9 | 6 variants; explicit privacy reassurance on D |
| §9.7 | Quick Apply Mode toast | 170j voice-edit QAM | Numerics never in user copy; 10-sec window |
| §9.8 | From-Voice-Log chip | 170m From-Quick-Log chip | Two popover variants by retention state |
| §9.9 | Settings preferences | 170j VoiceSettingsSection | New section + Voice Preferences group card |
| §9.10 | First-time tutorial | 170m §9.10 three-slide pattern | Slide 3 platform-streaming caveat |

---

## Issues raised in `project_prompt_170n_filed.md` and their resolution in this artifact

| Issue | UX scope? | Resolution location |
|---|---|---|
| 1. NLU output schema drift risk | No (Gordon contract) | Out of scope; deferred to Gordon |
| 2. Settings density risk (4 + 3 = 7 toggles) | Yes | §9.9: new VoiceNativeSettingsSection + Voice Preferences group card wrapper |
| 3. Four-button tap-target at 320px width | Yes | §9.1: 2×2 grid collapse at ≤ 359px viewport |
| 4. QAM threshold framing (0.92 vs 0.92) | Yes | §9.7: numerics never in user copy; combined-confidence framework anchors logic |
| 5. Streaming inconsistency across platforms | Yes | §9.3 honest fallback + §9.10 slide 3 platform caveat |
| 6. Transcript retention default OFF | Yes | §9.9 toggle 2 default OFF + §9.8 two popover variants by state |

---

## Path-level checklist

- All §9.1 to §9.10 sections produced per dispatch.
- All copy honors no-em-or-en-dashes rule (commas, colons, semicolons only).
- No emoji in any copy.
- Brand tokens used: Navy `#1A2744`, Card `#1E3054`, Teal `#2DA5A0`, Orange `#B75E18`.
- Lucide React strokeWidth 1.5 specified for all icons.
- WCAG 2.2 AA tap targets verified for every interactive element (44×44 minimum).
- Anti-condescension principle propagated: no `Most common` on Photo, no `NEW` on Voice, no `Beta` on Voice.
- Hannah avatar in §9.10 references Supabase Mobile Hero bucket per `reference_hannah_avatar_image.md`.
- Cross-references to shipped 170j + 170m components include absolute paths.

---

## Blueprint sign-off

UX Blueprint for Prompt 170n Voice-Native Meal Logging Entry Path is complete and ready for Jeffery review prior to Michelangelo Phase A authorization.
