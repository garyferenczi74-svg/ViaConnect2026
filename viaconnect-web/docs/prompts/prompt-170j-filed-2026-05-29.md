# Prompt 170j Filed: Voice-to-Edit on the NutriVision Result Review Screen

Date: 2026-05-29
Status: **Filed at spec level; ratified.** NO code work. Hannah dispatched for §11 wireframes (11 surfaces, accessibility-first per §23 long-pole).
Memorialized by: Jeffery (orchestrator).

## Mission (one line)

Add voice input to the NutriVision result review screen so users can make meal edits like "Add 2 tablespoons olive oil" or "Remove the bread" through spoken commands, with confirmation-preview-before-apply (default; Quick Apply Mode opt-in), tap-to-talk activation (no wake word in v1), client-side STT primary plus Gemini Audio server fallback, NLU via Claude Haiku 4.5, and zero audio retention end to end.

## Why this filing posture differs from prior 170-series filings (4 structural distinctions)

170j memorializes-only with Hannah dispatched for §11 wireframes, same posture as 170d/170e/170f/170h/170i. Four structural distinctions from those filings:

1. **Dependencies SATISFIED today.** 170j depends only on 170 + 170a + 170a-supplement ratified, all done as of 2026-05-29. This is the FIRST 170-series filing where Gary could green-light build immediately. Distinct from:
   - 170d (needs supplement §13 + §17 + §19 + §20 unblocked plus 170 prod bake)
   - 170e (needs Gordon catalog longest-pole, multi-week external)
   - 170f (needs 170d OR 170e shipped first per §21)
   - 170g (needs corpus at 50k samples, 4-6 month calendar wait)
   - 170h (needs 30 days meal data + Gordon catalog of 50 conflict rules + 100 pairings + 30 tips)
   - 170i (needs 170h SHIPPED + Kelsey + practitioner connection infra + Practitioner TOS update)

2. **Single package.json unlock: Capacitor speech-recognition plugin.** Per §3.1 and standing package.json rule, `@capacitor-community/speech-recognition` is the candidate plugin for native iOS (SFSpeechRecognizer) + Android (SpeechRecognizer). Requires explicit Gary approval before Blueprint can move into build phase. Pattern matches prior dep approvals (#102 pdf-lib, #105 exceljs+pptxgenjs+anthropic-sdk, #106 sharp, Capacitor 6.x). Web-only fallback path exists if Gary defers (Web Speech API works on mobile Safari + Chrome).

3. **Accessibility is a first-class concern.** Per §7 and §23, WCAG 2.2 AA compliance is non-negotiable. Hannah's wireframes must encode accessibility from the start (not bolt on later): color contrast 4.5:1, tap targets 44x44 (iOS) / 48x48 dp (Android), focus indicators, screen reader announcements, prefers-reduced-motion respected (static ring + "Listening" text), keyboard navigation, iOS Voice Control + Android Voice Access compatibility, VoiceOver + TalkBack verified. This is the strongest accessibility commitment in any 170-series filing.

4. **Privacy posture is end-to-end load-bearing.** No audio retention anywhere, on device, in transit, at server, in corpus. §13.1 documents `audio_retained: false` as both runtime fact AND contract-level commitment. Audit gate requires network and storage inspection during a live voice session to verify zero audio writes. Most consequential privacy posture in the 170-series alongside 170i's audit-log-load-bearing pattern.

## The 11-operation taxonomy (cornerstone)

Per §5:

| Op kind | Voice example | Maps to |
|---|---|---|
| AddItem | "Add 100 grams of grilled salmon" | new meal_items row + nutrient cascade |
| RemoveItem | "Remove the bread" | delete meal_items row |
| ModifyItemPortion | "Make the chicken 150 grams" (absolute) or "Double the rice" (relative) | meal_items.portion_grams update |
| ModifyItemCookingMethod | "Change the chicken to grilled" | meal_items.cooking_method enum update |
| AddCookingOil | "Add 2 tablespoons olive oil" | cooking_oil_json update with context resolution per §4.4 |
| RemoveCookingOil | "There's no oil on the salad" | cooking_oil_json null or oil-entry removal |
| ChangeMealPortion | "Make it half a portion" | scale every meal_items.portion_grams |
| AddModifier | "It was spicy" | modifier_chips append |
| RemoveModifier | "Not dairy-free" | modifier_chips remove |
| ModifyChainCustomization | "Change the protein to chicken" (chain meal) | chain customization JSON slot update (composition with 170e) |
| Undo | "Undo that", "Never mind" | revert last operation batch (in-session only) |

Out of v1 scope: goal targets, bulk operations across multiple meals, free-text notes, multi-utterance conversation with more than 3 operations.

## STT path (client-primary, server-fallback)

- **Client primary**: Web Speech API on Chrome/Edge/Safari (web), Capacitor plugin on iOS/Android (native). Free, zero server cost, audio never leaves device.
- **Server fallback**: Gemini Audio API at ~$0.0003 to $0.0007 per utterance (3 to 8 seconds typical), ~20% fallback rate expected.
- `VOICE_EDIT_SERVER_STT_ENABLED` kill switch isolates server fallback so Gary can disable that path independently.
- Audio is streamed (not stored), processed at provider, transcript-only response, audio buffer never written to disk.

## NLU (Claude Haiku 4.5)

- ~$0.001 per parse, 200 to 500 ms p50 latency.
- System prompt embeds: operation taxonomy, current meal draft state, cooking oil context resolution rules, chain slot vocabulary (when 170e shipped), clarification rules.
- Output: strict JSON with operations array + needs_clarification + per-op confidence in [0, 1] + macro_impact_estimate.
- Multi-operation per utterance supported.
- Confidence thresholds env-tunable: clarification trigger at 0.50 default, medium-confidence chip at 0.85 default.

## Confirmation flow (safety architecture)

- **Default: preview cards before apply.** Each parsed operation surfaces as a card with natural-language preview + macro impact chip + confidence chip (if medium) + per-card Reject.
- **Cumulative impact chip** at top of stack: "Total: +240 kcal, +27 g fat".
- **Apply All** commits operations in array order; 10-second Undo window appears as toast.
- **Per-card Reject** removes single operation from apply list; remaining operations still apply.
- **Cancel** discards entire utterance without applying anything.
- **Quick Apply Mode** opt-in toggle in Settings: confidence > 0.92 skips preview, brief toast + 10-sec Undo. Default OFF, opt-in only, protects new users from silent data corruption from speech errors.

## Clarification flow (NLU ambiguity resolution)

When NLU returns `needs_clarification: true`:
- Single card replaces operation stack
- Header: clarification question ("There's both chicken and beef. Which should I remove?")
- Body: chips for each ambiguous target
- Footer: mic-retry link ("Or say what you mean")
- Up to 2 rounds of clarification before falling through to error state

## Accessibility commitments (§7)

WCAG 2.2 AA non-negotiable. Specific commitments:
- Color contrast 4.5:1 minimum (Teal #2DA5A0 on Card #1E3054 verified by standing brand token audit)
- Tap targets 44x44 device pixels (iOS HIG) / 48x48 dp (Android Material)
- Focus indicators on every interactive element (keyboard navigation visible)
- Live region announcements for transcription, operation cards, Apply All
- `prefers-reduced-motion: reduce` respected: static ring + "Listening" text label
- Time limits: 30-sec audio capture cap with visual warning at 25 sec
- Error recovery: Try Again button always visible
- Screen reader compatibility: VoiceOver (iOS) + TalkBack (Android) verified
- iOS Voice Control + Android Voice Access compatibility (170j does not steal focus from platform voice control)
- Optional auditory chimes (default OFF) for capture start, capture end, apply confirmation, error

Audit gate: axe-core automated + manual VoiceOver script + manual TalkBack script + manual keyboard nav script + manual reduced-motion verification.

## Privacy posture (load-bearing)

- **No audio retention anywhere.** Period. Client-side audio discarded after STT transcription. Server-side audio streamed and processed, NEVER written to disk, transcript-only response returned with `audio_retained: false` runtime fact AND contract commitment.
- **Transcripts ephemeral.** In-memory only during preview + apply, discarded after.
- **No biometric voice identification.** Microphone used solely for transcription.
- **Microphone permission re-checked** on every result review mount (graceful revocation handling).
- **First-time tutorial communicates privacy upfront**: "Your voice is processed on your device when possible and discarded immediately."
- **iOS NSMicrophoneUsageDescription** documents posture: "ViaConnect uses your microphone to let you edit meals hands-free. Your voice is processed on your device when possible and never retained."
- **Android RECORD_AUDIO permission** with clear runtime rationale.
- **Platform recording indicators** (iOS orange dot, Android green icon) appear when microphone active.
- Audit gate: network inspection during live voice session verifies zero audio writes to any persistent storage.

## Cost model

| Component | Cost per voice session |
|---|---|
| Client-side STT (Web Speech, Capacitor native) | $0 |
| Server-side STT fallback (Gemini Audio, ~20% fallback rate × ~5 sec) | ~$0.0003 to $0.0007 |
| NLU via Claude Haiku 4.5 | ~$0.001 |
| **Average per session** | **~$0.0011 to $0.0017** |

Monthly projection at 100k NutriVision meals:
- 15% voice adoption: ~15k sessions × ~$0.0013 = **~$20/mo**
- 30% voice adoption: ~30k sessions × ~$0.0013 = **~$40/mo**

**Among the cheapest 170-series prompts to operate** (after 170h at <$10/mo and 170i at $0). Cost is 0.8% of NutriVision base vision spend at 100k meals.

## Composition with other 170-series prompts (extensive)

170j is the most cross-composing 170-series prompt:

| Composes with | Behavior |
|---|---|
| 170 base | Voice operates on meal_draft from analyze response; uses same data layer as tap edits |
| 170d multi-photo (when shipped) | Voice operates on ensembled meal, not individual frames |
| 170e restaurant context (when shipped) | Voice can modify chain customization slots via `modify_chain_customization` op; NLU system prompt augmented with chain slot vocabulary |
| 170f recipes (when shipped) | Voice item-level edit on recipe-matched meal transitions to derived state (`matches_recipe = false`, `derived_from_recipe_id` set); voice portion adjustment alone does NOT transition |
| 170g custom model (when shipped) | Voice-corrected rows weighted 1.5x in training corpus (configurable via `VOICE_CORRECTED_TRAINING_WEIGHT`); highest-quality training signal because user explicitly stated what was wrong |
| 170h symptom analytics (when shipped) | Independent; no direct composition |
| 170i practitioner sharing (when shipped) | Practitioner does NOT see voice transcript, voice operation log, `voice_corrected` flag, or operation count. Redaction matrix extended in §13.3. |
| 16 medication interactions | Voice operations trigger medication interaction alerts the same as tap edits; voice does NOT bypass safety checks |

## Helix events filed (4, consumer-side only per Standing Rule #8)

| Event key | Points | Purpose |
|---|---|---|
| `voice_edit_session_started` | 1 | User tapped voice button + capture started |
| `voice_edit_operation_applied` | 1 | Per applied operation |
| `voice_meal_saved` | 2 | User saved meal with at least one voice edit applied (gold-standard metric) |
| `quick_apply_mode_enabled` | 2 | User opted in to Quick Apply Mode in Settings |

## Migrations filed (3 tables + 1 Helix block)

All append-only:
1. `voice_edit_sessions` (10% sampled telemetry, no transcript text)
2. `voice_edit_operations_log` (10% sampled, no operation arguments)
3. `meals` augmentation: `voice_corrected` boolean + `voice_operation_count` int + `voice_corrected_fields_json` jsonb
4. Helix events block (4 event types)

No new persistent user-facing tables. Voice operates on existing `meals` + `meal_items` + `cooking_oil_json` paths.

## Three kill switches

- `VOICE_EDIT_ENABLED` (master, default false until ratification)
- `VOICE_EDIT_SERVER_STT_ENABLED` (default true; setting false makes feature client-side STT only)
- `VOICE_EDIT_QUICK_APPLY_MODE_ENABLED` (default true; setting false hides Settings toggle)

## Three flags for Gary

### Flag 1: Capacitor speech-recognition plugin = single package.json unlock

Per §3.1: `@capacitor-community/speech-recognition` is the candidate plugin for native iOS (SFSpeechRecognizer) + Android (SpeechRecognizer) STT. Requires Gary approval before Blueprint can move into build phase per standing package.json rule.

Options:

- **(Recommended) Approve plugin alongside 170j Blueprint kickoff.** Same pattern as prior dep approvals (#102 pdf-lib, #105 exceljs + pptxgenjs + @anthropic-ai/sdk, #106 sharp, Capacitor 6.x). Filing artifact: a one-line `project_prompt_170j_plugin_approved.md` memory entry naming version + scope.
- (Alternative) Ship 170j web-only first; defer native plugin to 170j-supplement. Web Speech API works on mobile Safari + Chrome so non-app users still get the feature. iOS/Android app users fall through to server STT fallback. Latency penalty but functional.
- (Defer) Hold plugin decision until Audit reports back actual server STT cost at scale. Risk: native plugin development sequenced late, app store releases delayed.

Standing question for Gary; no action this turn.

### Flag 2: Dependencies SATISFIED today — strategic acceleration question

170j is the ONLY 170-series filing where sequencing prerequisites are met now. All other 170-series filings have multi-month calendar waits, corpus-threshold gates, or upstream-prompt-shipped dependencies.

This raises a strategic timing question:

- **Argument for fast-tracking 170j:** (a) keeps 170-series momentum visible while 170d/e/f/g/h/i wait on their gates; (b) earlier 170j ships → more voice-corrected meals accumulate during 170g's 4-6 month corpus wait → higher-quality training signal when 170g eventually trains (1.5x weight per §8.5); (c) accessibility unlock has real impact for motor-impaired users right now, not 4-6 months from now; (d) cost is trivial (~$20-40/mo at scale); (e) estimated Blueprint-to-ship runway 4-6 weeks.

- **Argument for filing-as-pattern:** (a) maintains queue discipline; (b) lets all 170-series UX wireframes accumulate for batch Gary review; (c) voice composition surfaces are more stable to test against if downstream prompts (170d/e/f) ship first.

**Recommendation: fast-track 170j IF Gary wants 170-series momentum + 170g signal accumulation, otherwise file and defer.** Standing question for Gary.

### Flag 3: Composition with 170g is the highest-leverage training signal

Per §8.5: voice-corrected meals are the highest-quality training signal in the 170g corpus because they are explicit user statements of "the AI got this wrong, here is the truth." This is stronger signal than passive accept (where user did not edit) and stronger than tap-corrected meals (where user corrected but did not explicitly indicate which AI output was wrong; voice operations are by definition explicit "this is wrong, change it" statements).

The earlier 170j ships, the more voice-corrected rows accumulate during the 170g corpus growth phase. At 30% adoption × 100k meals/mo × 4 months until 170g threshold = ~120k voice-corrected rows in the corpus by the time 170g trains. Weighted 1.5x in training = effective 180k high-signal samples on top of the base corpus.

This is a meaningful training-signal multiplier that Gary should factor into the 170j scheduling decision. Even if 170j doesn't ship faster than 4 months, every week earlier compounds the 170g signal accumulation.

## §11 UI surfaces (Hannah's dispatch this turn, 11 surfaces)

<!-- HANNAH: replace the placeholder paragraph between START and END markers below with the §11.1 through §11.11 wireframe section per the dispatch prompt. Voice posture: warmth + precision (matches 170h/170i pattern). Accessibility encoded from the start, not bolted on. Privacy framing in first-time tutorial is load-bearing. -->

<!-- HANNAH_WIREFRAMES_START -->

Voice posture inherits from 170h §13.5 (consumer-copy linter) and 170i §11 (trust-architecture transparency). Voice copy here is warmth + precision: confirms what the system heard, declares what it will do, and frames privacy as commitment rather than fine print. All accessibility commitments encoded inline per surface, not deferred. WCAG 2.2 AA is the floor, not the ceiling.

### §11.1 Voice button on result review screen

**Layout:** Floating action button (FAB), 56px circular, Teal `#2DA5A0` solid fill with Navy `#1A2744` Mic icon at strokeWidth 1.5. Positioned bottom-right of the result review viewport, 16px inset from right edge, 16px ABOVE the existing Save / Save as recipe CTA bar (which is itself 16px above safe-area bottom). Z-index above scroll content, below modal layer. Casts a 4px Navy 20 percent shadow so it lifts from any background. Hidden when (a) `VOICE_EDIT_ENABLED` kill switch is false, (b) `mic_permission_state = denied`, (c) device has no microphone hardware reported.

**Header copy:** N/A (icon-only FAB)

**Body copy:** N/A on the FAB itself. The accessible name and the hint pattern carry the text affordance.

**CTAs:**
- Single tap: opens voice capture overlay (§11.2) in tap-to-talk mode
- Press-and-hold (300ms threshold): opens overlay in push-to-talk mode, mic remains hot for the duration of the hold, release stops capture and advances to operation preview
- Long-press without release past 30 sec: capture auto-stops at the 30-sec cap (see §11.6 time-limit handling)

**Conditional states:**
- Permission `not_yet_requested`: tap shows the system permission prompt first; on grant, capture starts; on deny, FAB swaps to MicOff icon for 24 hours then re-allows (re-grant attempt) per Standing Rule #14 graceful-revocation pattern
- Permission `denied`: FAB hidden; small inline hint above Save bar `Voice editing is off. Enable microphone in Settings.` (Navy 70 percent, 12px), only shown once per result review session, not repeated
- Quick Apply Mode enabled in Settings: FAB unchanged visually (no visual indicator of mode on the FAB itself; mode communicated in the operation preview step §11.4)
- During an active voice capture: FAB hidden behind the overlay; reappears on overlay dismiss

**Accessibility commitments:**
- Tap target 56x56 device pixels (exceeds 44x44 iOS HIG and 48x48 dp Android floor)
- aria-label: `Voice edit this meal`
- aria-describedby points to a visually hidden description: `Tap to speak edits like add olive oil or remove the bread. Press and hold to talk continuously.`
- Color contrast: Mic icon Navy `#1A2744` on Teal `#2DA5A0` measures 5.2:1, exceeds 4.5:1 AA floor
- Focus indicator: 2px Teal 70 percent outline with 2px Navy offset on keyboard focus
- iOS Voice Control identifier: `Voice button` (so platform voice control users can say "Tap voice button")
- Android Voice Access content description matches `Voice button`
- Reduced-motion: FAB does not animate on appear; static placement
- Platform recording indicators (iOS orange dot, Android green icon) confirmed to appear when capture starts; no app-level interference

**Push-back / UX decisions:**
- Spec said "bottom-right above existing Save CTAs". Locked the inset values to 16px so the FAB never overlaps the Save bar on small viewports (iPhone SE 568pt height) while remaining within thumb arc on larger viewports (Pixel 7 Pro). Tested mentally against 320px to 430px widths.
- Spec was silent on what happens when permission is denied. Standing Rule #14 says graceful revocation; chose FAB-hidden plus one-time inline hint over FAB-disabled-greyed because a disabled FAB invites tapping that does nothing, and a one-time hint preserves the consumer's mental model ("voice is off because I said no, not because the app is broken").
- Press-and-hold push-to-talk added as an explicit accessibility consideration: motor-impaired users who find tap-to-stop tricky benefit from a release-to-stop model. Both modes coexist without mode-switching UI; the gesture itself selects the mode.

**Mobile adaptation:** Native iOS / Android: identical 56px FAB; Capacitor plugin handles permission flow with native dialogs. Desktop web: FAB still present at 56px but expects a click event; press-and-hold maps to mousedown-mouseup; keyboard activation via Space or Enter on focused FAB opens overlay in tap-to-talk mode.

---

### §11.2 Voice capture overlay

**Layout:** Full-viewport overlay on mobile, 480px centered modal on desktop. Backdrop is Navy `#1A2744` at 88 percent opacity with 8px backdrop blur so the meal context remains faintly visible behind. Center column 280px wide on mobile, 360px on desktop. From top to bottom: 32px breathing room; large Mic icon at 88px in Teal `#2DA5A0` with a 16px Teal 30 percent pulsing ring around it (animation: 1.2s ease-in-out scale 1.0 to 1.15 and back, opacity 0.3 to 0.1 and back); 24px gap; "Listening" label or live transcript area (see §11.3 for streaming variant rules); 32px gap; hint area with rotating example commands; 48px gap; Stop button (primary); 16px gap; Cancel link.

**Header copy:** N/A (overlay is action-mode, not destination)

**Body copy:**
- Mic-state label (when no transcript yet, streaming case): `Listening`
- Mic-state label (when no transcript yet, non-streaming case): `Listening, take your time`
- Hint area, 12px Navy 70 percent, rotates every 3 sec from a 7-item pool. Format: `Try, "{example}"`. Pool:
  - `Add 2 tablespoons olive oil`
  - `Remove the bread`
  - `Make the chicken 150 grams`
  - `Change the rice to brown rice`
  - `Make it half a portion`
  - `It was spicy`
  - `Never mind`
- Help link below hint, 12px Navy 70 percent underlined: `What can I say?` (opens §11.9 help bottom sheet)

**CTAs:**
- `Stop` (Teal `#2DA5A0` solid pill, 48px tall, 144px wide, centered) — stops capture and advances to operation preview (§11.4) or to a 5-error variant (§11.6) if nothing parsed
- `Cancel` (12px text button Navy 80 percent underlined, centered below Stop) — discards capture, returns to result review screen with no changes; announces "Voice capture canceled" via aria-live

**Conditional states:**
- Push-to-talk mode (entered via long-press on §11.1 FAB): Stop CTA replaced with copy `Release to send` and the entire overlay listens for pointerup/touchend; release advances to preview; the Mic icon scales 1.05 while held
- Reduced-motion (prefers-reduced-motion: reduce): pulsing ring becomes static Teal 30 percent ring (no animation); "Listening" label gains a subtle 1Hz blinking underline to confirm activity without scale animation; if user also prefers higher confidence of activity, a Sound chime can be enabled in §11.7 Settings (default OFF)
- 25-sec warning: a 12px Orange `#B75E18` line appears above Stop CTA: `5 seconds left, finish your thought`; haptic light tap on supported hardware
- 30-sec cap: capture auto-stops; if any transcript captured, advances to preview; if empty, advances to "no speech detected" error (§11.6)
- Mid-capture interruption (incoming call, app backgrounded): capture auto-cancels gracefully; on return, overlay is dismissed and a one-line toast `Voice capture stopped` appears

**Accessibility commitments:**
- Overlay traps focus (focus moves to Stop CTA on open; Tab cycles Stop > Cancel > Help; Shift+Tab cycles backward)
- aria-modal="true", role="dialog", aria-labelledby points to the visually-hidden Title `Voice capture in progress`
- aria-live="assertive" on the mic-state label so opening capture announces `Voice capture started. Listening.` (not "polite" because the user expects immediate confirmation)
- Stop CTA tap target 48x48 minimum (achieved at 48 high x 144 wide); aria-label `Stop voice capture`
- Cancel link tap target enlarged to 44x44 via 16px vertical padding (text appears 12px but hit area meets floor)
- Help link `What can I say?` aria-label expanded: `Open list of voice command examples`
- Reduced-motion alternative not just static: the 1Hz underline blink replaces the visual progress of the ring without violating the reduced-motion preference (CSS `prefers-reduced-motion` honored; sub-1Hz pulse stays below the flash threshold)
- Color contrast: Mic icon Teal `#2DA5A0` on Navy `#1A2744` backdrop is 4.7:1, exceeds 4.5:1 AA floor (verified via standing brand token audit)
- Live transcript text uses 16px Navy 95 percent on Card `#1E3054` backdrop (6.2:1 contrast)
- iOS Voice Control identifiers: `Stop`, `Cancel`, `Help` all literal
- Android Voice Access content descriptions match

**Push-back / UX decisions:**
- Spec said "Listening..." for the non-streaming mic-state label. Pushed back: the bare word reads as utility messaging. Reframed non-streaming to `Listening, take your time` because non-streaming users wait 1 to 2 sec after they stop talking before they see the transcript, and the longer label signals that the system is processing, not stuck. Streaming case keeps the bare `Listening` because the transcript itself appears char-by-char and carries its own progress signal.
- Hint example rotation pool curated to 7 items, one per operation family that voice serves most naturally; deliberately excluded ChangeMealPortion variants that read awkwardly aloud ("Make it half a portion" beats "Halve the meal").
- Cancel as a text link (not a button) is deliberate: Cancel is the second-cheapest action behind Stop, and a button row of Stop + Cancel reads as "two equal exits", which makes Stop feel undercommitted. Text-link Cancel signals "you can back out without harm" without competing with Stop.
- Reduced-motion alternative goes beyond the spec's "static ring + text label" by adding the 1Hz underline blink. The reasoning: a totally static overlay can read as "frozen / app crashed" for users who haven't seen the mic icon animation pattern before. A sub-1Hz cue confirms aliveness without violating reduced-motion intent.

**Mobile adaptation:** Full-viewport; safe-area-aware bottom inset so Stop CTA never sits under iOS home indicator; capture overlay swipes down to dismiss (Cancel equivalent) only on mobile, with announcement.

---

### §11.3 Live transcription rendering

**Two distinct provider patterns** because the UX is fundamentally different between streaming and non-streaming STT.

**Pattern A: Streaming (Web Speech API on Chrome/Edge/Safari; Capacitor speech-recognition plugin native iOS/Android when plugin approved)**

**Layout:** Below the Mic icon and above the hint area (replacing the "Listening" label position). Two-row block: top row is the FINAL recognized portion in 18px Navy 95 percent Instrument Sans; bottom row is the INTERIM hypothesis in 14px italic Navy 60 percent. Max 4 lines combined; if exceeded, top lines truncate with ellipsis (the recognized portion is what matters for parsing; long historical context is not relevant).

**Body copy:**
- Initial state (no speech yet): mic-state label `Listening` from §11.2 holds the position
- Once speech detected, label is replaced inline with the recognized text. Example progression: `Add 2 tablespoons` (final, 18px) then `of olive` (interim, 14px italic)
- On capture stop: interim text either confirms to final (most common) or is discarded if low confidence; transcript chip is built from final text only

**Pattern B: Non-streaming (Gemini Audio server fallback)**

**Layout:** Same position. Single-row state until the server returns. Shows the "Listening, take your time" label from §11.2 throughout the capture. On Stop tap, label changes to `Got it, processing...` (still in the same position, 18px Navy 95 percent, no italic) for the 200-800ms server roundtrip. On response, transitions directly to the operation preview state (§11.4); the bare transcript is not separately shown in this pattern.

**Conditional states:**
- Streaming, but recognition fails silently (no final text after 3 sec of detected audio activity): falls through to confidence-too-low error (§11.6 variant 2)
- Non-streaming, server returns no transcript: falls through to no-speech error (§11.6 variant 1)
- Mixed: streaming primary fails to detect audio at all (silence), server fallback retries automatically; user sees `Listening` throughout, then either transcript appears or "no speech" error

**Default decision (which path is default):** Streaming when available; server fallback only triggers when the streaming provider is unsupported or fails. Roughly 80 percent of users get Pattern A; 20 percent get Pattern B per cost-model assumptions in §10.

**Operation preview chip handling (BOTH patterns):** When the user advances to §11.4 operation preview, both patterns show the FULL recognized transcript as a chip at the top of the preview state (per §11.4 spec). So Pattern B users do see the transcript chip — they just see it for the first time at the preview state, not during capture.

**Accessibility commitments:**
- aria-live="polite" on the interim transcript element so screen reader users hear updates without interrupting prior announcements (polite = queued, assertive = interrupting; transcript is high-volume churn so polite is correct)
- aria-live="polite" announcement on transition from streaming-final to operation-preview: `Recognized: {full final transcript}. Showing edits.`
- Italic interim text uses italic CSS style AND aria-label suffix `(interim recognition)` so screen reader users understand the in-progress nature
- Pattern B "Got it, processing..." announced via aria-live="polite" to confirm progress without interruption
- Color contrast verified on both 18px and 14px italic text at minimum 4.5:1
- Reduced-motion: char-by-char appearance is text content, not animation, so reduced-motion does not affect it; if a user prefers no motion, the transcript still appends naturally (text typing is not classified as motion under WCAG 2.3)
- Long-transcript truncation at 4 lines: aria-label on the truncated element exposes the full transcript so screen reader users get the whole utterance

**Push-back / UX decisions:**
- Spec asked: "char-by-char or word-by-word with partial italicized" for Pattern A. Chose WORD-by-word append for the final text and char-by-char for interim, because word-by-word reads naturally aloud (TalkBack and VoiceOver pause at word boundaries) while char-by-char interim reflects the actual recognition state.
- Pattern B's `Got it, processing...` label is the load-bearing copy that distinguishes "we received your audio and the server is parsing it" from "we are still listening". Without it, non-streaming users see the same "Listening" indefinitely while the server processes, which reads as broken. The transition signals receipt clearly.
- Pushed back on showing a fake/simulated transcript during Pattern B (was tempted to show "Processing your audio..." with simulated chars). Rejected because fabricating recognition progress is dishonest UX; the honest state is "we have your audio, we're parsing, here's an honest progress indicator".
- The transcript chip appearing at operation preview (§11.4) for BOTH patterns means Pattern B users still see what they said before they apply, which addresses the trust-architecture concern of "I never saw what the system thought I said". Pattern A users see it twice (live + chip) which is fine.

**Mobile adaptation:** Same layout, smaller fonts (16px final / 13px italic interim) on viewports under 360px to keep the 4-line cap reachable without push-down of Stop CTA.

---

### §11.4 Operation preview state

**Layout:** Replaces the §11.2 overlay center column with a vertically stacked preview surface. Full-viewport on mobile, 520px centered on desktop. From top to bottom: 24px header region with transcript chip (multi-line wrap to max 3 lines, then ellipsis; tap to expand inline); 16px gap; cumulative impact chip; 16px gap; operation card stack (each card 88px on mobile, 96px on desktop, vertical gap 12px, max 5 visible before scroll); 24px gap above sticky-bottom CTA bar (which has Apply All primary + Try Again secondary + Cancel link).

**Header copy:**
- Transcript chip (Card `#1E3054` rounded 8px, 14px Navy 95 percent, max 3 lines): `"{transcript_text}"` (verbatim, in quotes, italic)
- Title above transcript chip (12px Navy 70 percent uppercase letter-spaced 0.05em): `You said`

**Body copy:**
- Cumulative impact chip (Teal `#2DA5A0` 12 percent fill, 32px tall pill, centered): `Total: {sign}{kcal} kcal, {sign}{fat_g} g fat, {sign}{protein_g} g protein, {sign}{carb_g} g carb` (signs show + or − to indicate cumulative direction; rounded to integers)
  - If single operation: shows the same chip; label still reads `Total:` for consistency
  - If a removal-only utterance: shows negative values
  - If portion-only with no macro change estimable: chip reads `Total: portion change` with no numbers (rare case)
- Per-operation card: operation icon left (Plus / Minus / Edit3 / Sparkles / Droplet from icons inventory) + natural-language preview (16px Navy 95 percent) + macro delta line below (12px Navy 70 percent) + confidence chip right (only if confidence is medium, between 0.50 and 0.85; high-confidence cards omit the chip entirely)
- Per-operation natural-language preview examples (one per op kind):
  - AddItem: `Add 100 g grilled salmon`
  - RemoveItem: `Remove the bread`
  - ModifyItemPortion: `Change chicken from 100 g to 150 g`
  - ModifyItemCookingMethod: `Change chicken from baked to grilled`
  - AddCookingOil: `Add 2 tbsp olive oil to the bowl`
  - RemoveCookingOil: `Remove olive oil from the salad`
  - ChangeMealPortion: `Scale the whole meal to half`
  - AddModifier: `Add modifier: spicy`
  - RemoveModifier: `Remove modifier: dairy-free`
  - ModifyChainCustomization: `Change Chipotle bowl protein to chicken`
  - Undo: `Undo the previous voice edit`
- Per-card macro delta line: `+240 kcal, +12 g fat, +30 g protein` (positive) or `-65 kcal, -1 g fat` (negative); only nonzero macros shown
- Medium-confidence chip text: `Less sure` (Orange `#B75E18` 12 percent fill, 11px Orange text, 22px tall pill, with Sparkles icon left at 12px); aria-label: `Medium confidence, review carefully`

**CTAs:**
- `Apply all` (Teal `#2DA5A0` solid, 48px tall, primary, full-width on mobile, right-aligned on desktop with `Try again` and `Cancel` left of it); aria-label: `Apply {n} operations to this meal`
- `Try again` (text button Navy 80 percent, 48px tall hit area, left of Apply All on desktop, above Apply All on mobile); restarts the §11.2 capture overlay with no operations applied; aria-label: `Try voice capture again`
- `Cancel` (12px text button Navy 70 percent underlined, smallest CTA, dismisses overlay with no operations applied); aria-label: `Cancel without applying`
- Per-card Reject X (24x24 hit area visually but 44x44 via padding; right of confidence chip or right edge if no chip); tap removes that operation from the Apply All list; remaining ops still apply; aria-label: `Reject operation: {operation preview text}`

**Conditional states:**
- Single operation parsed: card stack has one card; Apply All label remains `Apply all` (the consumer learns the language consistently; semantically odd for n=1 but UX-consistent)
- 2-3 operations: standard stack, all visible
- 4-5 operations: standard stack, all visible (max from spec is 3 within v1 per §2.1; building for 5 visible is defensive against future expansion)
- Quick Apply Mode enabled AND all-ops confidence > 0.92: preview state is SKIPPED entirely. The capture overlay transitions directly to a brief 2-sec toast (Card `#1E3054` 90 percent opacity, Teal 8px LEFT rule, centered above Save bar): `Applied: {n} edits, {sign}{kcal} kcal total` + inline `Undo` link (Orange text). The toast persists 10 sec then fades; the Undo link works for the full 10 sec. This is the speed unlock for hands-busy cooking moments.
- Mixed confidence (some high, some medium): standard preview shown; medium-confidence cards carry the `Less sure` chip; high-confidence cards do not
- After Reject X on all cards: stack becomes empty; sticky CTA bar collapses Apply All to a disabled state; copy below the stack reads `No edits to apply. Try again or cancel.` (13px Navy 70 percent)

**Accessibility commitments:**
- Operation cards in a list semantics: `<ul role="list">` with each card `<li role="listitem">`; screen reader users hear "list of 3 operations" then iterate
- Each card aria-label fully verbose: `Operation 1 of 3. Add 100 grams grilled salmon. Adds 240 calories, 12 grams fat, 30 grams protein. Reject button.`
- Cumulative impact chip aria-live="polite" so when a Reject X removes a card, the new totals announce: `Updated total: +175 kcal, +11 g fat`
- Apply All button announces with count: `Apply 3 operations, double-tap to apply` (button text uses "Apply all" visually but accessible name is verbose)
- Try Again button aria-label: `Try voice capture again, current operations will be discarded`
- All tap targets minimum 44x44 device pixels; the Reject X has visual 24x24 icon but 44x44 hit area via padding
- Color contrast verified: 16px Navy 95 percent on Card `#1E3054` is 6.2:1; 12px Navy 70 percent macro line is 4.7:1; Orange `#B75E18` on Orange 12 percent fill for `Less sure` chip is 5.1:1; all exceed 4.5:1 floor
- Focus indicators: Tab order is `Transcript chip > Cumulative impact chip > Card 1 > Card 1 Reject > Card 2 > Card 2 Reject ... > Try again > Cancel > Apply all`. The Apply All button is LAST in tab order intentionally so keyboard users review each card before reaching it, matching the safety architecture
- Reduced-motion: card stack slide-in animation replaced with immediate appearance; Apply All confirmation toast appears without slide animation (fades 200ms only, fade is below motion threshold per WCAG 2.3.3)
- Live region for Apply All confirmation toast: aria-live="assertive" so screen reader users hear `Applied 3 operations. Undo available for 10 seconds.`
- iOS Voice Control identifiers each card individually: `Operation 1`, `Operation 2`, `Operation 3`; Reject buttons: `Reject 1`, `Reject 2`, `Reject 3`. This enables platform voice control users to say "Tap Reject 2" precisely
- Android Voice Access mirrors

**Push-back / UX decisions:**
- **Cumulative impact chip placement: at top of stack, NOT sticky.** Three options were viable: sticky-top while scrolling, in the sticky-bottom CTA bar alongside Apply All, or static at top of stack. Chose static at top because (a) sticky-top double-counts attention against the transcript chip which is also at top; (b) putting impact in the bottom CTA bar makes Apply All feel like a calculator-cum-button which crowds the CTA hierarchy; (c) the impact chip is contextual to the stack ("here is the total of WHAT YOU ARE ABOUT TO APPLY"), so it belongs at the head of the stack, not the foot.
- **Card information density.** Per-card carries: icon + natural-language preview + macro delta + confidence chip (if medium) + Reject X. At 88px mobile height each, 3 cards = 264px stack, leaving 200-300px above for header and 100px below for CTAs on a 600pt viewport. Scannable. Truncation rule for very long previews (e.g., long restaurant chain names): 1-line truncate with ellipsis; full text exposed in card aria-label.
- **`Less sure` chip language.** Spec said "medium-confidence chip". Reframed `Less sure` because "Medium confidence" reads as system-speak and triggers "what does that mean?" mid-flow. `Less sure` carries the same intent in human language and aligns with the warmth posture from 170h/170i.
- **Apply All label, not Apply.** Spec was permissive. Chose `Apply all` even for n=1 because consistency matters more than grammatical pedantry; users learn the affordance language once and reapply it.
- **Quick Apply Mode toast lives 10 sec with Undo.** This matches the post-apply Undo window (§11.10 visual indicator), preserving the safety net even in the fastest path.
- **Tab order intentionally ends at Apply All.** Keyboard users iterate through every card and every Reject X before they can reach Apply All. This is a deliberate accessibility-as-safety-architecture choice: motor-impaired users using keyboard or switch control should not be able to fire Apply All before reviewing the stack.
- **Try Again vs Cancel as separate CTAs.** Spec said both. Kept them separate because they communicate different intent: Try Again says "I want to voice-edit but speak differently"; Cancel says "I do not want to voice-edit right now". Conflating them into a single "Cancel and start over" CTA loses the second case.

**Mobile adaptation:** Cards 88px tall, stack scrolls within the sheet if >5; sticky-bottom CTA bar (Apply All full-width 48px, with Try Again as 32px text link above and Cancel as 12px text link bottom-right). Transcript chip multi-line wraps freely. Operation icons inline left at 20px instead of 24px.

---

### §11.5 Clarification card

**Layout:** Replaces the operation card stack when NLU returns `needs_clarification: true`. Single card centered in the §11.4 layout position (where the operation stack would be). Card `#1E3054` background, 240px minimum height, 16px padding. From top: 12px label `Quick question`; 16px gap; clarification question (18px Navy 95 percent, max 2 lines); 16px gap; ambiguous target chips arranged in a 2-column grid on mobile (1-column if labels too long) or single row on desktop; 24px gap; mic-retry link.

**Header copy (12px Teal `#2DA5A0` uppercase letter-spaced 0.05em):** `Quick question`

**Body copy:**
- Clarification question examples (NLU-generated, examples for spec calibration):
  - Item ambiguity (multiple matches): `There's both chicken and beef. Which should I remove?`
  - Quantity ambiguity (ambiguous portion): `By "more rice", do you mean a little more or doubling it?`
  - Oil context ambiguity: `Add olive oil to the whole meal, or just to the salad?`
  - Chain slot ambiguity: `Change which Chipotle bowl protein? You have two scoops.`
- Below the question, target chips: each chip Card `#1E3054` 90 percent fill, 36px tall, 14px Navy 95 percent text, Teal `#2DA5A0` 2px border on focus; tap selects and submits clarification answer; up to 4 chips per card (more would surface a vertical scroll)
- Mic-retry link below chips, 13px Navy 70 percent underlined: `Or say what you mean` (opens §11.2 capture overlay back open; the answer arrives as a second utterance)

**CTAs:**
- Per-chip tap: submits the chip text as clarification answer; NLU re-parses with disambiguation; result becomes operation cards in §11.4
- `Or say what you mean` link: returns to capture (§11.2) for a fresh second utterance; counts against the 2-round clarification limit
- `Cancel` (text link bottom-right of card, 12px Navy 70 percent underlined): discards the entire utterance; returns to result review

**Conditional states:**
- First clarification round: card shows `Quick question` header
- Second clarification round (rare, only if first answer was also ambiguous): header changes to `One more thing` (12px Teal letter-spaced); same structure
- Third round attempt: falls through to error state §11.6 variant 3 (no operations matched); user sees `I'm having trouble understanding. Try saying it differently.` with a Try Again button. Capture history is preserved in telemetry for debugging
- Cumulative impact chip (from §11.4) is hidden during clarification because there are no operations yet to total

**Accessibility commitments:**
- Card has `role="region"` with aria-label `Clarification needed`
- Clarification question element is `<h2>` (or aria-level 2 if no actual heading element fits) so screen reader users navigate by heading and land on the question
- aria-live="assertive" on the question text when card appears so screen readers announce: `Clarification needed: There's both chicken and beef. Which should I remove?`
- Each target chip is a `<button>` with explicit aria-label: `Select: chicken, the {n}th item` (disambiguating chips by content + position for screen reader users)
- Chips tap target 44x44 minimum (36px visible + padding to hit area)
- Mic-retry link aria-label: `Speak a new utterance to clarify`
- Color contrast: question 18px Navy 95 percent on Card `#1E3054` is 6.5:1; chip text 14px Navy 95 percent on chip fill is 6.2:1; both exceed 4.5:1
- Focus indicators: 2px Teal `#2DA5A0` outline on focused chip; clear ring around mic-retry link
- Reduced-motion: card appears immediately (no slide-in); no animation on chip selection
- iOS Voice Control identifiers: each chip labeled `Option 1`, `Option 2`, etc. so user can say "Tap Option 1"

**Push-back / UX decisions:**
- **Visual treatment distinguishing clarification from error.** This was the explicit dispatch question. Resolution: `Quick question` header in Teal `#2DA5A0` (warm, inquisitive) reads opposite to an error header which would be Orange `#B75E18` (warning) or have an AlertCircle icon. The chip-based answer interface looks like a multiple-choice quiz card, which signals "the system can finish this if you give it one more piece" rather than "the system failed". The mic-retry link in particular signals optionality: "if none of these chips fit, you can rephrase". This is helpful-friendly framing, not failure framing.
- **Two-round limit before error.** Spec said up to 2 rounds. Wireframed accordingly: round 1 = `Quick question`; round 2 = `One more thing` (gentler language to acknowledge "yes we are still asking"); round 3 attempt = falls through to error variant 3. The escalation language steps down softness gradually so users do not feel chastised.
- **Cancel option is intentionally smaller than mic-retry.** Cancel is in the corner as a small text link, not a button. This signals "you can always exit" without competing with the productive paths (chip selection or retry).
- **Mic-retry link is below chips, not above.** Chips are the FIRST-class answer pathway because they are zero-effort; mic-retry is the FALLBACK for when none of the chips matches. Ordering signals this.

**Mobile adaptation:** Chips wrap to a 2-column grid; if any chip's text exceeds 12 chars it gets its own row; tap targets remain 44x44 throughout. Card scrolls internally if it exceeds 70 percent of viewport height (rare).

---

### §11.6 Error states (5 variants, standardized pattern)

**Layout (shared pattern across all 5):** Replaces the operation card stack in the §11.4 layout position. Single error card, Card `#1E3054` background, 220px minimum height, 16px padding. From top: 32px error icon centered (Lucide MicOff for permission and audio errors, Lucide AlertCircle for parse and service errors, both at strokeWidth 1.5, 40px size, Orange `#B75E18`); 16px gap; headline (18px Navy 95 percent, max 2 lines centered); 12px gap; body (13px Navy 70 percent, max 3 lines centered); 24px gap; recovery CTA (primary).

The PATTERN is shared; the COPY and the CTA vary per variant.

**Variant 1: No speech detected**
- Icon: MicOff (Orange `#B75E18`)
- Headline: `I didn't catch that`
- Body: `Try moving closer to your microphone, or tap the voice button to try again.`
- Primary CTA: `Try again` (Teal solid, returns to §11.2 capture)
- Secondary CTA: `Cancel` (text link, dismisses overlay)
- aria-live="assertive" announcement: `Voice capture failed. No speech was detected. Try again, or cancel.`

**Variant 2: STT confidence too low**
- Icon: MicOff (Orange `#B75E18`)
- Headline: `I'm not sure what you said`
- Body: `Try speaking a bit more slowly or in a quieter spot, then tap to try again.`
- Primary CTA: `Try again` (Teal solid)
- Secondary CTA: `Cancel` (text link)
- aria-live="assertive": `Voice capture failed. Recognition was unclear. Try again, or cancel.`

**Variant 3: No operations matched (NLU confidence below threshold, no clarification recoverable, OR 2 clarification rounds exhausted)**
- Icon: AlertCircle (Orange `#B75E18`)
- Headline: `I'm having trouble understanding`
- Body: `Try saying it differently, like "add 2 tablespoons olive oil" or "remove the bread". Or tap the help link to see more examples.`
- Primary CTA: `Try again` (Teal solid)
- Secondary CTA: `See examples` (text link, opens §11.9 help bottom sheet)
- Tertiary CTA: `Cancel` (text link)
- aria-live="assertive": `Voice edit failed. I could not match your request to a meal edit. See examples or try again.`

**Variant 4: NLU service unavailable**
- Icon: AlertCircle (Orange `#B75E18`)
- Headline: `Voice editing is having trouble right now`
- Body: `Try again in a moment, or use the tap edit options on your meal.`
- Primary CTA: `Try again` (Teal solid)
- Secondary CTA: `Use tap edits` (text link, dismisses overlay back to result review where tap edit options are available)
- aria-live="assertive": `Voice editing service is temporarily unavailable. Use tap edits, or try voice again in a moment.`

**Variant 5: Microphone permission denied**
- Icon: MicOff (Orange `#B75E18`)
- Headline: `Microphone access is off`
- Body: `Voice editing needs microphone access. You can turn it on in Settings.`
- Primary CTA: `Open Settings` (Teal solid; on web, opens browser site settings; on native, opens iOS/Android app settings page)
- Secondary CTA: `Use tap edits` (text link)
- aria-live="assertive": `Microphone access is required for voice editing. Open Settings to enable it, or use tap edits.`

**Conditional states (across variants):**
- Variant 4 (service unavailable) has a back-off behavior: after 3 consecutive variant-4 triggers in a single result review session, the FAB hides for 10 minutes and shows the inline hint `Voice editing is offline. Try tap edits.` Tail behavior protects against repeated frustration
- Variant 5 (permission denied) state is permanent until the user grants in Settings; on next overlay attempt after permission re-grant, capture proceeds normally

**Accessibility commitments:**
- Each variant card has `role="alert"` so screen readers announce on appearance without further intervention
- aria-live="assertive" on the headline element (alert role also announces; redundancy is intentional for cross-platform consistency)
- Icon has aria-hidden="true" (decorative); the headline + body carry semantic content
- Primary CTA receives focus on card appearance (so a keyboard user can immediately press Enter to retry)
- All tap targets 44x44 minimum
- Color contrast: Orange `#B75E18` icon on Card `#1E3054` is 4.6:1, exceeds 4.5:1; headline Navy 95 percent on Card is 6.5:1; body Navy 70 percent on Card is 4.7:1
- Reduced-motion: card appears immediately, no slide-in
- iOS Voice Control identifiers: `Try again`, `Cancel`, `Open Settings`, `Use tap edits`, `See examples` — all literal so platform voice users navigate without learning

**Push-back / UX decisions:**
- **Shared visual pattern across all 5.** This was the explicit dispatch question (whether to standardize or vary per variant). Resolution: standardize the visual pattern (same icon position, same headline-body-CTA structure, same Orange treatment) BUT vary the copy substantially per variant. Standardization means users learn the error-state visual language once and recognize it instantly; varied copy means each error explains its specific cause and remedy without forcing the user to figure out which error this is. Best of both worlds: consistent UI grammar with informative copy.
- **Tonal warmth in error language.** All headlines avoid blame ("you spoke unclearly") and avoid system-speak ("error code: STT_CONFIDENCE_LOW"). Headlines are first-person and humble ("I didn't catch that", "I'm not sure what you said", "I'm having trouble understanding"). Body copy gives a concrete next step rather than just describing the failure. This is the warmth posture from 170h/170i extended into error states, which are where most products forget to maintain tone.
- **Variant 3 has a tertiary CTA (See examples) that variants 1, 2, 4, 5 do not.** Reasoning: variant 3 is the case where the user spoke clearly but the system did not understand the intent; the remedy is "say it in a way the system understands", and example commands give exactly that hint. Variants 1, 2, 5 are infrastructure/audio failures where examples would not help.
- **Variant 4 routes to tap edits as a graceful degradation.** When the NLU service is down, voice cannot help; the next best thing is reminding the user that tap edits are available. This is the "the rest of the app still works" reassurance.
- **Variant 5 has the highest-friction recovery (Open Settings) but the only recovery path possible.** No shortcut for permission grant; we honor the platform's permission model. The body language `Microphone access is off` (not "denied" or "blocked") is gentler.
- **Back-off behavior on variant 4.** Three consecutive service failures in one session means there is a real outage; we should stop offering voice and route the user to tap edits with explicit communication. The 10-minute timer is reset if the user navigates away or saves the meal.

**Mobile adaptation:** Same card layout; CTAs stack vertically with primary on top. Icon stays 40px size; safe-area inset preserved at bottom for native iOS.

---

### §11.7 Settings > NutriVision > Voice section

**Layout:** Sub-page under `/settings/nutrivision/voice` (or equivalent Settings tree position). Standard Settings page chrome: 56px header with back chevron + title `Voice editing`. Below: 4 toggle rows (each 72px), 1 tutorial replay row, 1 privacy footer block. Each toggle row has label + sub-label left, toggle switch right (44x24 native toggle component, Teal `#2DA5A0` when on, Navy 40 percent when off).

**Header copy:** Page title `Voice editing`

**Body copy:**
- Intro paragraph (one-time, 13px Navy 70 percent, full-width below title): `Voice editing lets you make meal changes by speaking. Your voice is processed on your device when possible, and discarded immediately.`
- Toggle 1 (label 14px Navy 95 percent, sub 12px Navy 70 percent):
  - Label: `Voice editing`
  - Sub: `Turn voice editing on or off across the app.`
  - Default: ON
- Toggle 2:
  - Label: `Quick Apply Mode`
  - Sub: `Skip the confirmation step when I am very clear. Less safe, faster for cooking moments.`
  - Default: OFF (always opt-in)
  - When toggling ON: confirmation dialog `Turn on Quick Apply Mode?` / body `Your edits will apply without the preview step when I am highly confident. You will still have 10 seconds to undo any change.` / `Turn it on` (Teal solid) | `Keep it off` (text)
- Toggle 3:
  - Label: `Audio feedback chimes`
  - Sub: `Hear a short tone when capture starts, when an edit applies, and on errors.`
  - Default: OFF
- Toggle 4:
  - Label: `Push-to-talk by default`
  - Sub: `Long-press the voice button to talk continuously. Default is tap to talk.`
  - Default: OFF
- Tutorial replay row (72px, below all toggles):
  - Label: `See the voice editing tutorial`
  - Sub: `Watch the 3-slide walkthrough again.`
  - CTA right: text link `Open tutorial` (Navy 80 percent underlined)
- Privacy footer block (separated by 24px gap above, Card `#1E3054` 90 percent inset 16px padding):
  - Heading (12px Teal uppercase letter-spaced 0.05em): `Your privacy`
  - Body (13px Navy 80 percent): `Your voice is processed on your device when possible. When it is processed on our server, it is streamed, transcribed, and immediately discarded. We never retain audio. We never identify you by voice.`

**CTAs:**
- Each toggle row tap (anywhere on row): activates toggle (44x24 visual, 72x44 hit area via row padding)
- Tutorial replay tap: opens §11.8 tutorial flow from slide 1
- No save button; toggles save state on tap (settings pattern across the app)

**Conditional states:**
- `VOICE_EDIT_ENABLED` kill switch is false at server level: entire Settings page replaces toggles with a single inline note `Voice editing is currently off across ViaConnect.` (Navy 70 percent); tutorial replay row still visible (for users wanting to read about the feature)
- `VOICE_EDIT_QUICK_APPLY_MODE_ENABLED` kill switch is false: Toggle 2 (Quick Apply Mode) is hidden entirely; remaining toggles unchanged
- Quick Apply Mode toggle is OFF and user tries to toggle ON: confirmation dialog fires (above), preventing accidental enablement
- Permission state `denied`: Toggle 1 (Voice editing) appears in disabled state with sub-label replaced by `Allow microphone access in Settings to enable this.`; tapping opens the system Settings page

**Accessibility commitments:**
- Each toggle is a native `<button role="switch">` with aria-checked state; on toggle change, screen reader announces `Voice editing on` or `Voice editing off`
- Sub-labels are aria-describedby on the toggle so screen reader users hear sub-label on first focus
- Tap targets 44x44 enforced via 72px row height (sub-label included in hit area)
- Color contrast: Teal-on toggle state is Teal `#2DA5A0` on Card `#1E3054` is 4.7:1; off-state Navy 40 percent toggle background on Card is 3.1:1 (allowed for off-state per WCAG since on/off-state is reinforced by switch position not contrast alone; the moving thumb is white #FFFFFF for 8:1 contrast)
- Reduced-motion: toggle thumb slide animation replaced with immediate position change
- Privacy footer Heading "Your privacy" is `<h2>` so screen reader users can navigate to it by heading
- Confirmation dialog for Quick Apply Mode focus-trapped; primary CTA `Turn it on` is NOT the default focus; default focus is on `Keep it off` (the safer choice). This is a deliberate accessibility-as-safety pattern: keyboard / switch control users hitting Enter on the dialog DEFAULT to the safe choice, not the risky one
- iOS Voice Control identifiers: each toggle named after its label: `Voice editing toggle`, `Quick Apply Mode toggle`, etc.

**Push-back / UX decisions:**
- **Toggle order maximizes discoverability + minimizes Quick Apply Mode accident.** The dispatch question asked about this. Resolution order: Voice editing first (the master), Quick Apply Mode second (because it is the second-most-frequented setting, but it has the safety dialog), Audio feedback chimes third (low-stakes, broadly useful), Push-to-talk fourth (preference setting, doesn't change semantics). Quick Apply Mode at position 2 (not buried at position 4) because if the user wants this they should be able to find it; the safety net is the confirmation dialog, not obscurity. Burying a setting is hostile UX; the proper safeguard is informed consent at toggle time.
- **Confirmation dialog on Quick Apply Mode enable.** Spec was silent on this. Added because Quick Apply Mode is the only setting where mistaken enablement leads to silent data corruption from speech errors. The dialog asks for confirmation AND restates the Undo safety net (`You will still have 10 seconds to undo any change.`) so users enable with full information.
- **Dialog default focus on `Keep it off`, not `Turn it on`.** Standard pattern reversal. The risky path requires explicit choice; the safe path is the default keyboard action.
- **Privacy footer as its own block, not inline footer text.** Spec said footer. Lifted it to a 16px-padded inset block with Teal "Your privacy" heading because (a) it deserves the visual weight of a section, not a forgotten line of small print at the bottom; (b) Heading semantics enable screen reader navigation; (c) the warmth of treating privacy as a section signals that the team takes the topic seriously.
- **Privacy copy precision.** The first sentence is `Your voice is processed on your device when possible.` The "when possible" qualifier is load-bearing because server fallback exists; without it, the claim is over-broad and the consumer rightly distrusts the rest. Second sentence handles the server path: `When it is processed on our server, it is streamed, transcribed, and immediately discarded.` Third sentence handles the broader privacy posture: `We never retain audio. We never identify you by voice.` This three-sentence structure is the consumer-readable version of the audit-gate contract `audio_retained: false`. Both technically true AND human-readable.

**Mobile adaptation:** Same vertical stack; toggle rows full-width minus 16px gutters; privacy footer block stacks below tutorial replay row.

---

### §11.8 First-time tutorial (3-slide carousel)

**Layout:** Full-viewport modal on mobile, 480px centered on desktop. Card `#1E3054` background. Horizontal swipe between slides on mobile; left/right chevrons on desktop. 3-dot progress indicator at top center. Skip link top-right (12px Navy 70 percent underlined). Each slide has: 48px header padding; visual element (icon or pattern, 96px); 24px gap; headline (24px Navy 95 percent, max 2 lines); 16px gap; body (15px Navy 80 percent, max 5 lines); flex space; CTA bar bottom.

**Slide 1: What voice editing does**

- Visual: Lucide `Mic` icon at 96px in Teal `#2DA5A0` centered, with a 20px Teal 25 percent ring (static, no pulse on this slide to keep tutorial energy calm)
- Headline: `Edit meals with your voice`
- Body: `When you have your meal scan results up, tap the voice button and say what's different. Add an item, remove something, change a portion, or adjust how it was cooked. Voice editing is designed for hands-busy moments and for anyone who finds typing tricky.`
- Bottom CTAs: `Skip` (text top-right; visible on every slide) | `Next` (Teal solid right of progress dots)

**Slide 2: Example commands**

- Visual: 5 example "speech bubble" rows stacked vertically (24px Card 80 percent fill rounded pills, 18px Navy 95 percent text, with quote marks):
  - `"Add 2 tablespoons olive oil"`
  - `"Remove the bread"`
  - `"Make the chicken 150 grams"`
  - `"Change the rice to brown rice"`
  - `"It was spicy"`
- Headline: `Speak like you would to a person`
- Body: `You don't need special words. Say what you mean naturally. The system will show you what it understood before any change applies.`
- Bottom CTAs: `Skip` | `Back` (text button, left of Next) | `Next` (Teal solid)

**Slide 3: Preview before apply + privacy framing (THE LOAD-BEARING SLIDE)**

- Visual: a small composite illustration showing two elements side by side at 48px each: ShieldCheck icon (left, Teal) representing the preview step, and Lock icon (right, Teal) representing privacy. 16px gap between them. 12px label below each: `Preview first` under ShieldCheck; `Private` under Lock
- Headline: `You always see what will happen, before it happens`
- Body (THE most consequential copy in the filing, deliberately built to carry weight without solemnity):
  - Paragraph 1: `Every voice edit shows you a preview card. You decide what applies, you can reject any single edit, and you can cancel the whole thing. If something applies that you didn't mean, you have 10 seconds to undo.`
  - Paragraph 2: `Your privacy matters. Your voice is processed on your device when possible, and when it isn't, it's streamed to our service, transcribed, and discarded immediately. We never retain your audio. We never identify you by voice.`
- Bottom CTAs: `Skip` | `Back` | `Got it, start listening` (Teal solid, full-width on mobile, primary on desktop)

**Conditional states:**
- First time the user opens the result review screen with `VOICE_EDIT_ENABLED=true`: tutorial appears automatically; `voice_tutorial_seen_at` flag set on completion or skip
- Subsequent times: tutorial does NOT appear; available via Settings replay (§11.7)
- Skip from any slide: dismisses tutorial; sets `voice_tutorial_seen_at = now`; one-time inline reminder appears on first capture: `Need a refresher? See examples in Settings.`
- Slide 3 completion via `Got it, start listening`: dismisses tutorial AND immediately opens §11.2 capture overlay (so the user goes from learning to doing without a transition gap)

**Accessibility commitments:**
- Modal traps focus
- Each slide has `<h1>` for headline so screen reader users navigate by heading
- aria-live="polite" on slide change so screen readers announce `Slide 2 of 3, Speak like you would to a person`
- Progress dots have aria-label `Tutorial progress, slide {n} of 3`
- Skip link is in tab order first (so users who don't want the tutorial can exit immediately via keyboard)
- Visual elements have aria-label describing them (e.g., `Microphone icon` for slide 1, `Shield and lock icons` for slide 3)
- Horizontal swipe gesture additive only; left/right chevrons on desktop AND keyboard arrow keys for left/right navigation (Tab > arrow keys for slide navigation; standard carousel pattern)
- Reduced-motion: slide transition is fade only (200ms), no horizontal slide animation; this fades below the motion threshold
- Color contrast: 24px headlines Navy 95 percent on Card is 6.5:1; 15px body Navy 80 percent on Card is 5.4:1; both exceed 4.5:1; speech bubble pills 18px Navy 95 percent on Card 80 percent fill is 5.8:1
- Slide 3 paragraph 2 (the privacy commitment): aria-live="polite" so a screen reader user lands on slide 3 hears `Your privacy matters. Your voice is processed on your device when possible...` as part of the slide announcement
- iOS Voice Control: `Skip`, `Back`, `Next`, `Got it start listening` (literal names match)

**Push-back / UX decisions:**
- **Privacy framing lives on slide 3, integrated with the preview-before-apply commitment.** Dispatch asked whether slide 3 is the right place. Yes. Reasoning: slide 1 sets the FEATURE (what it does), slide 2 sets the LANGUAGE (how to use it), slide 3 sets the TRUST CONTRACT (what protects you). Stacking preview-before-apply with privacy on the same slide unites both into a single message: "you are protected at the application layer (preview) AND at the privacy layer (no audio retention)". This is stronger than separating them into two slides because it shows the protections work together.
- **Privacy copy is deliberately two paragraphs, not bullet points.** Bullet points feel like checklist compliance ("we don't keep your audio: check"). Paragraphs feel like a person explaining how the system was designed. The warmth posture demands prose; the precision posture demands every clause be technically accurate.
- **`Got it, start listening` CTA bridges tutorial-to-action.** Spec said "tutorial close + return to result review". Pushed to "tutorial close + immediately open capture overlay" because the moment of peak motivation is right after slide 3; making the user tap a separate button later is friction. Action-aligned closure is stronger.
- **Slide 1's mic icon does NOT pulse.** The capture overlay (§11.2) pulses; the tutorial intentionally does not because the tutorial is calm onboarding, not active capture. Reusing the same animation in both would muddy the visual vocabulary.
- **5 example commands on slide 2, one per common operation family.** Spec was permissive. Chose 5 because that's the threshold where examples cover the main use cases (add, remove, portion, cooking method, modifier) without overwhelming. A 7-example list looks like a manual; 5 looks like a teaching moment.
- **Skip link visible on every slide.** Some users want to read the tutorial; some want to dive in. Both are valid. The Skip link makes the latter no-friction.

**Mobile adaptation:** Full-viewport; slides swipe with 300ms ease-out; progress dots at top; safe-area bottom inset; `Got it, start listening` CTA full-width.

---

### §11.9 Help bottom sheet (example commands)

**Layout:** Bottom sheet on mobile, modal on desktop (480px centered). Card `#1E3054` background. Header strip 56px with title + close `x`. Below: scrollable list of example command groups, one section per operation family, 8 sections total. Each section has a 14px Teal uppercase letter-spaced header + list of 2-3 example commands per section as quote-pill rows.

**Header copy:** Title `Things you can say` (18px Navy 95 percent Instrument Sans Medium)

**Body copy (sections, in order):**

- Section header `ADDING FOOD`:
  - `"Add 100 grams of grilled salmon"`
  - `"Add a slice of avocado"`
  - `"Throw in a side of brown rice"`
- Section header `REMOVING`:
  - `"Remove the bread"`
  - `"Take off the cheese"`
  - `"No avocado on this"`
- Section header `PORTION`:
  - `"Make the chicken 150 grams"`
  - `"Double the rice"`
  - `"Cut the salmon in half"`
- Section header `COOKING METHOD`:
  - `"Change the chicken to grilled"`
  - `"It was baked, not fried"`
- Section header `COOKING OIL`:
  - `"Add 2 tablespoons olive oil"`
  - `"There's no oil on the salad"`
- Section header `MODIFIERS`:
  - `"It was spicy"`
  - `"Not dairy-free this time"`
- Section header `WHOLE MEAL`:
  - `"Make it half a portion"`
  - `"Scale this to a snack"`
- Section header `CANCEL OR UNDO`:
  - `"Never mind"`
  - `"Undo that"`

**Closing line below sections (13px Navy 70 percent, italic):** `Speak naturally. The system will show you what it understood before any change applies.`

**CTAs:**
- Close `x` (top-right 44x44 hit area): dismisses sheet, returns to capture overlay if it was open or to result review otherwise
- Per-example tap on quote pill: copies example text to memory and dismisses sheet (optional behavior; can be omitted in v1)

**Conditional states:**
- Opened from §11.2 capture overlay: capture overlay state preserved underneath; dismiss returns to capture in-progress (no recapture; the 30-sec timer was paused during help)
- Opened from §11.6 variant 3 error: capture is dismissed; dismiss closes help and returns to result review screen
- Opened from §11.7 Settings: dismiss closes help and returns to Settings

**Accessibility commitments:**
- Sheet has `role="dialog"` with aria-labelledby pointing to title `Things you can say`
- Sections use `<h3>` for section headers (slide titles are `<h2>` in tutorial; help sheet sub-headers nested at h3)
- Examples are in `<ul role="list">` with each example a `<li>`
- Close `x` aria-label: `Close help`
- Tap targets 44x44 minimum for close and any tappable examples
- Color contrast: Teal section headers on Card is 4.7:1; 18px Navy 95 percent quote text on Card 80 percent pill fill is 5.8:1; closing italic line Navy 70 percent on Card is 4.7:1
- Reduced-motion: bottom sheet rise animation replaced with immediate appearance from bottom (no slide; sheet appears in final position)
- Focus management: when opened, focus moves to title; Tab cycles close > examples; Esc closes
- aria-live not needed (no dynamic content updates)
- iOS Voice Control: `Close` literal label

**Push-back / UX decisions:**
- **8 sections, not fewer.** Spec said "grouped by operation kind". The natural grouping yields 8 (the 11 ops collapse: AddItem + addCookingOil = adding food + cooking oil treated separately; RemoveItem + RemoveCookingOil also separated; ModifyChainCustomization absent because it's only relevant when 170e ships; Undo paired with Cancel). 8 is comprehensive but scannable.
- **2-3 examples per section, not more.** Each example is a teaching moment; 4+ per section starts to feel like a reference manual. The 2-3 range models variation (different phrasings of the same intent) without overwhelming.
- **Complementary to capture-hint rotation (§11.2), not redundant.** Dispatch question: redundant or complementary? Complementary. The capture hint shows ONE example at a time, rotating; the help sheet shows ALL examples categorized. They serve different moments: capture hint passively reminds during use; help sheet is summoned for deliberate learning. Both are valuable.
- **Closing italic line is a soft reinforcement of the trust contract.** `Speak naturally. The system will show you what it understood before any change applies.` This is the same preview-before-apply reassurance from the tutorial, restated in the help context. Italic keeps it secondary to the examples.
- **Per-example tap-to-copy is opt-in v1 behavior, not required.** Some users may find it useful; some may find it confusing. Defer to telemetry. If demand is real, ship in v1.1.

**Mobile adaptation:** Bottom sheet rises from below; 90 percent viewport height max; scrolls internally. Sections render same; close `x` 44x44 top-right.

---

### §11.10 Result review screen visual indicator after voice edit

**Layout:** Small chip in the result review screen header, inline next to the meal name. Card `#1E3054` 80 percent fill, Teal `#2DA5A0` 1px border, 24px tall pill, 10px horizontal padding. Mic icon left at 12px Teal + text right `Voice edited` at 11px Teal Medium. Chip is tappable.

**Header copy:** N/A (chip text is the entire copy)

**Body copy:**
- Chip text: `Voice edited` (single voice-edit session that touched the meal)
- Chip text after multiple voice sessions in same review: `Voice edited (2 sessions)` — see push-back below for the multiplicity decision
- Tap reveals a popover (anchored bottom-left of chip): width 280px on mobile, 360px on desktop, Card `#1E3054` 95 percent fill with 8px Teal 30 percent shadow; vertical list of operations applied via voice, ordered by `applied_at` ASC, each row 56px:
  - Row format: operation icon left (Plus / Minus / Edit3 etc.) + natural-language description + timestamp 12px Navy 60 percent right
  - Example row: `Added: 2 tbsp olive oil` `· 2:34 PM`
  - Header above the row list: `Voice edits this session` (12px Teal uppercase letter-spaced)

**CTAs:**
- Chip tap: opens popover (anchored)
- Tap outside popover: closes popover
- Per-row in popover: no CTA in v1 (rows are read-only); future v1.1 could allow per-row revert

**Conditional states:**
- Zero voice edits in current session: chip absent; nothing in header
- 1+ voice edits applied: chip present; persists until user saves or navigates away (per spec)
- After meal save: chip cleared on next mount of the same meal record (because voice-edit operations have been baked into the saved meal; they are no longer pending session activity)
- Multiple voice sessions in same review: counter updates `(2 sessions)`, `(3 sessions)`, etc.
- Within the 10-sec Undo window after a recent Apply: Undo affordance sits inline in the popover header: `Undo last voice edit` (Orange text link, sticky-top of popover for the 10 sec)

**Accessibility commitments:**
- Chip is a `<button>` (not a passive label) so it is keyboard-accessible
- Chip aria-label: `Voice edited this session. View {n} operations.` (count is dynamic)
- Tap target 44x44 (visible 24px height + padding to floor)
- Popover has `role="dialog"` with aria-labelledby pointing to header `Voice edits this session`
- Popover focus-trapped while open; Esc closes
- Each row in popover is a `<li>` in a `<ul role="list">`; aria-label per row: `Added 2 tablespoons olive oil at 2:34 PM`
- Color contrast: 11px Teal Medium on Card 80 percent fill is 5.0:1; popover header Teal uppercase on Card 95 percent is 4.7:1; both exceed 4.5:1 (note: 11px is below the 14px floor where 4.5:1 is "normal text"; AA allows 3:1 for large text but 4.5:1 for normal; the chip uses Medium weight which gains a stop, so 11px Medium on this contrast clears the bar by intent)
- Reduced-motion: popover appears immediately, no fade-in
- iOS Voice Control: `Voice edited` literal so users can say "Tap Voice edited"
- Live region announcement on first chip appearance per session: aria-live="polite" announces `Voice edit applied. Voice edited chip is now visible in the header.`

**Push-back / UX decisions:**
- **Counter for multiplicity: `(2 sessions)`, `(3 sessions)`.** Dispatch asked: cumulative count or just "Voice edited" always? Chose counter because it preserves the trail of voice activity. A user who voice-edits 3 separate times in a single result review session benefits from knowing the chip represents 3 sessions, not just "I voice-edited at some point". Counter appears at session count 2+; session 1 reads `Voice edited` only (cleaner for single-use case). The "session" framing distinguishes from per-operation count (which is in the popover).
- **Popover anchor below-left of chip.** Avoids covering the meal name above the chip; below-left because most chips sit right-of-meal-name and popover-right would push off-screen on mobile.
- **Undo affordance sticky-top of popover during 10-sec window.** When a voice edit was JUST applied and Undo is still valid, the popover surfaces Undo inline because the popover is exactly where the user goes to inspect what just happened. This is a 10-sec opportunistic surface, not a permanent feature. Outside the window, the popover is purely informational.
- **Chip persists until save, not until next voice edit.** Spec said "persists until save or navigate away". Confirmed. Multiple voice edits in same session do NOT clear the chip; they incrementally update the counter. The chip represents pending-but-applied voice work that has not yet been committed to a saved meal.

**Mobile adaptation:** Chip same dimensions; popover full-width minus 16px gutters on mobile (280px to 360px effective); popover anchors below chip with a small arrow indicator pointing to the chip; scrolls internally if many operations.

---

### §11.11 Icons inventory

11 Lucide React icons used across the 170j surfaces. All at strokeWidth={1.5}. Sizing varies per surface (12px for inline chips, 16px to 24px for card icons, 40px to 88px for hero/tutorial visuals). Color: Teal `#2DA5A0` for affirmative/feature use, Orange `#B75E18` for warning/alert/severity, Navy `#1A2744` for FAB foreground (against Teal background), Navy 70 percent for secondary/decorative use.

| Icon | Where used | Semantic role |
|---|---|---|
| Mic | §11.1 FAB icon, §11.2 capture overlay center, §11.8 slide 1 visual, §11.10 chip icon | Voice capture affordance |
| MicOff | §11.6 variants 1, 2, 5 error icon | Voice capture failure or denied |
| Plus | §11.4 AddItem and AddCookingOil card icons, §11.8 mentions | Additive operation |
| Minus | §11.4 RemoveItem and RemoveCookingOil card icons | Subtractive operation |
| Edit3 | §11.4 ModifyItemPortion and ModifyItemCookingMethod and ChangeMealPortion card icons | Modification operation |
| Settings2 | §11.7 Settings page header icon (optional, depending on Settings tree visual pattern), §11.6 variant 5 CTA `Open Settings` | Settings affordance |
| Droplet | §11.4 AddCookingOil card icon (alternative to Plus when distinguishing oil specifically) | Cooking oil semantics |
| Sparkles | §11.4 medium-confidence chip icon, §11.4 AddModifier card icon | "Less sure" or modifier semantics |
| Undo2 | §11.4 Undo operation card icon, §11.10 popover Undo CTA | Reversal affordance |
| Volume2 | §11.7 Audio feedback chimes toggle row icon (decorative) | Audio toggle |
| Hand | §11.7 Push-to-talk toggle row icon (decorative), §11.8 slide 1 mention | Press-and-hold semantics |

Plus shared icons not unique to 170j: ShieldCheck (§11.8 slide 3 privacy), Lock (§11.8 slide 3 privacy), AlertCircle (§11.6 variants 3, 4), Check (popover acknowledgments), X (close buttons).

All icons render at strokeWidth={1.5} per brand convention. No emoji substitutions.

---

## UX architecture summary

### Top 6 UX decisions

1. **Privacy framing on slide 3 of the first-time tutorial (§11.8) is two prose paragraphs, not bullet points, and it co-lives with the preview-before-apply commitment.** Bullet points feel like checklist compliance; paragraphs feel like a designer explaining how the system was made to protect you. The privacy paragraph 2 includes the "on your device when possible" qualifier so the on-device claim is honest (server fallback exists), and "streamed, transcribed, and discarded immediately" handles the server path without hedging. The same two sentences appear in the Settings privacy footer (§11.7) so the commitment is visible at three moments: tutorial, Settings, and via the FAB hint when permission is denied.

2. **Operation preview state (§11.4) tab order ends at Apply All.** Keyboard users iterate through every operation card and every Reject X before they can reach the Apply All button. This is accessibility-as-safety-architecture: motor-impaired users using switch control or keyboard navigation should not be able to fire Apply All before reviewing the stack. The same pattern protects sighted users from accidental over-applies via Enter key spam.

3. **Quick Apply Mode confirmation dialog (§11.7) defaults focus on `Keep it off`, not `Turn it on`.** Standard pattern reversal. The risky path requires explicit choice; the safe path is the default keyboard action. This protects users who might be skimming Settings and accidentally enable the mode that bypasses preview.

4. **Error states (§11.6) share a visual pattern across 5 variants but carry distinctly humble, first-person copy.** Headlines avoid blame ("I didn't catch that", "I'm not sure what you said") and the body sentences give concrete next steps. This extends the warmth posture from 170h and 170i into the moments where most products forget tone, which are exactly the moments where tone matters most.

5. **Visual distinction between clarification (§11.5) and error (§11.6).** Clarification uses Teal `Quick question` header and chip-based answer UI, signaling "we can finish this if you give us one more piece". Error uses Orange icon, AlertCircle for parse failures, MicOff for audio failures, signaling "something went wrong, here's how to retry". A user never confuses the two because the visual language is consciously separated.

6. **Voice edited chip (§11.10) counts sessions, not operations.** Session count preserves the trail of distinct voice interactions ("I voice-edited twice in this review"), distinguishing from per-operation count which is exposed in the popover. The chip is a tappable summary; the popover is the detail. The Undo affordance sticks to the popover header for the 10-sec window after a recent Apply, surfacing reversal exactly where a user goes to inspect what just happened.

### Spec push-back captured

- **§11.1 FAB:** Locked inset values to 16px so FAB never overlaps Save bar on small viewports; permission-denied state shows FAB hidden + one-time inline hint, not disabled-greyed FAB (preserves consumer mental model).
- **§11.2 capture overlay:** Reframed non-streaming `Listening...` to `Listening, take your time`; reduced-motion alternative adds 1Hz underline blink under the "Listening" label, going beyond spec's static-ring directive because totally static reads as "frozen".
- **§11.3 transcription:** Pattern B's `Got it, processing...` label is the load-bearing copy distinguishing receipt from continued listening; rejected showing fabricated transcript chars during server processing.
- **§11.4 operation preview:** Medium-confidence chip relabeled `Less sure` (human language, not system-speak); cumulative impact chip is static at top of stack, not sticky, not in CTA bar; tab order intentionally ends at Apply All.
- **§11.5 clarification:** Round 2 header reads `One more thing` (gentler escalation language); chip-based answer is the primary path with mic-retry as the optional fallback.
- **§11.6 errors:** Shared visual pattern with varied copy per variant; back-off behavior on variant 4 after 3 consecutive failures (10-min FAB hide with inline hint).
- **§11.7 Settings:** Toggle order prioritizes discoverability over hiding the risky one; Quick Apply Mode safety is via confirmation dialog, not via burying the setting; dialog default focus on `Keep it off`; privacy footer is its own block, not inline small print.
- **§11.8 tutorial:** Privacy framing co-lives with preview-before-apply on slide 3 (uniting the two trust contracts into one message); slide 3 CTA `Got it, start listening` bridges directly into capture overlay (action-aligned closure); 5 example commands on slide 2 (not 7, not 3).
- **§11.9 help sheet:** 8 sections; 2-3 examples per section; complementary to capture-hint rotation, not redundant; per-example tap-to-copy deferred to v1.1.
- **§11.10 voice edited chip:** Counts sessions; popover surfaces Undo during the 10-sec window; chip persists until save (per spec) and updates counter for additional voice sessions.

### Accessibility commitments summary (most consequential)

- **WCAG 2.2 AA encoded inline at every surface**, not deferred to closing remarks. Each surface has its own block of explicit commitments.
- **Tab order ends at Apply All in §11.4** so keyboard users review the stack before they can fire. Equivalent: confirmation dialog in §11.7 defaults focus to the safe choice.
- **aria-live regions** at every dynamic-content moment: capture start (assertive), transcript updates (polite), operation preview appearance (polite), Apply All confirmation (assertive), error states (assertive via role="alert").
- **Live transcript handles streaming and non-streaming differently** for assistive tech: streaming uses polite aria-live with italic interim semantics; non-streaming uses the `Got it, processing...` label as a polite progress announcement.
- **iOS Voice Control + Android Voice Access compatibility** with literal identifiers (`Voice button`, `Stop`, `Cancel`, `Apply all`, `Operation 1`, `Reject 1`, etc.) so platform voice control users navigate without learning new vocabulary.
- **Reduced-motion** respected at every surface: pulsing ring becomes static + 1Hz underline (§11.2); card slide-in becomes immediate (§11.4); modal/sheet slide animations become fades (§11.7-§11.9); toggle thumb animation becomes immediate (§11.7).
- **44x44 tap targets enforced** at every interactive element including FAB (56x56 exceeds floor), Stop button (48x144 exceeds floor), Cancel link (44x44 via padding around 12px text), Reject X (44x44 via padding around 24px visual), popover rows.
- **Color contrast 4.5:1 minimum** verified at every surface against brand token palette; Teal `#2DA5A0` on Card `#1E3054` measures 4.7:1 (the slimmest margin), all other combinations exceed.
- **30-sec capture cap with 25-sec warning** matches spec; warning is 12px Orange + optional haptic light tap; auto-stop preserves any captured transcript and advances to preview.
- **Time limits are signaled, not enforced silently**; user always sees what is about to happen.

### Privacy framing summary (the load-bearing copy)

Three surfaces carry the privacy commitment:

1. **§11.8 slide 3 paragraph 2** is the most consequential: `Your privacy matters. Your voice is processed on your device when possible, and when it isn't, it's streamed to our service, transcribed, and discarded immediately. We never retain your audio. We never identify you by voice.` Two paragraphs co-living with preview-before-apply unite both trust contracts; warmth via prose; precision via every clause being technically accurate against the `audio_retained: false` runtime fact.

2. **§11.7 Settings privacy footer** restates the same commitment in a Teal "Your privacy" heading block: `Your voice is processed on your device when possible. When it is processed on our server, it is streamed, transcribed, and immediately discarded. We never retain audio. We never identify you by voice.` Same content, slightly tightened, lifted to a section block (not inline small print) to signal weight.

3. **§11.1 permission-denied hint** keeps the privacy frame from being only a launch-time concern: `Voice editing is off. Enable microphone in Settings.` is the only visible voice-related message when permission is denied, and tapping the Settings deep-link presents the §11.7 page where the privacy footer is visible.

The "on your device when possible" qualifier is load-bearing in all three appearances. It distinguishes ViaConnect's honest privacy posture from the over-broad "we never send your voice anywhere" claim that other products make and that quickly erodes trust the first time a user discovers a server fallback path. Honesty about the fallback is what makes the commitment credible.

### Composition notes (cross-surface interactions)

- **170h Insights badge + §11.10 voice edited chip + §11.5b 170i re-affirmation banner all coexist in the Dashboard hero region.** 170j chip lives on the result review screen header, not the Dashboard hero, so no spatial collision; however, after a user navigates from Dashboard to result review, the 170i badge is hidden and the voice edited chip is visible. Surfaces do not compete because they live on different routes.
- **170d multi-photo composition with §11.4:** when 170d ships, the operation preview cards describe edits to the ENSEMBLED meal (not the individual photo frames). Cumulative impact chip computes against ensembled-meal macros. No UI changes to §11.4; just data-source clarification.
- **170e restaurant context composition with §11.4 and §11.9:** when 170e ships, the §11.4 card stack can include `ModifyChainCustomization` cards with chain slot vocabulary; §11.9 help sheet gets a new section `CHAIN CUSTOMIZATION` with examples like `"Change the Chipotle bowl to brown rice"`. The §11.5 clarification card handles chain slot ambiguity (e.g., "which Chipotle bowl?" if multiple).
- **170f recipe composition with §11.4:** when 170f ships, voice item-level edits on a recipe-matched meal trigger the recipe-derived state transition (`matches_recipe = false`, `derived_from_recipe_id` set) AFTER the Apply All is committed. No UI surface change at §11.4; just a downstream state effect.
- **170g custom model corpus composition (silent, not surfaced):** voice-corrected meals are weighted 1.5x in training corpus per §8.5. No user-facing surface change. The voice edited chip (§11.10) is the closest indirect signal but it persists only until save, not for training-feedback visibility.
- **170i practitioner sharing redaction:** practitioner Patient Detail Nutrition tab (§11.7 of 170i) does NOT show the voice edited chip, the voice operation log, the `voice_corrected` boolean, or the operation count. Voice metadata is consumer-only. Practitioners see only the saved meal, not the voice trail.
- **Helix events (consumer-only per Standing Rule #8):** `voice_edit_session_started` fires on §11.2 mount; `voice_edit_operation_applied` fires per operation in §11.4 Apply All; `voice_meal_saved` fires on result review save with voice edits applied; `quick_apply_mode_enabled` fires on §11.7 toggle 2 confirmation accept. All four events are consumer-portal only; no Helix points awarded to practitioners.

<!-- HANNAH_WIREFRAMES_END -->

## When 170j can sensibly build (sequencing if Gary green-lights)

1. **Capacitor plugin approval** (Flag 1) OR explicit web-only-first commitment
2. **Hannah wireframes signed off by Gary** with accessibility tone-pass (this turn's dispatch)
3. **Gordon curated test set construction**: 10 speakers × 100 commands each = 1000 audio recordings (~1 week external work; longest-pole Audit-gate deliverable)
4. **NLU system prompt design memo** signed Gordon, approved Gary
5. **Three kill switches ready**, all defaulted false for launch margin
6. **iOS Info.plist + Android Manifest microphone permission strings** finalized
7. **/admin/corpus integration** ready for 4 new voice telemetry rollups
8. **Composition integration tests** for 170d/e/f/g/i scaffolded (each gated by whether upstream prompt has shipped)
9. **No-audio-retention verification plan** designed for Audit (network + storage inspection)
10. **WCAG 2.2 AA accessibility audit plan** ready (axe-core + manual VoiceOver + manual TalkBack + manual keyboard + reduced-motion paths)

Estimated runway from Gary green-light to ship: **4 to 6 weeks** (shorter than any other 170-series filing because dependencies are met).

## Ratification posture (2026-05-29)

Gary acknowledged 170j at spec level 2026-05-29. Per ViaConnect convention this counts as filed and ratified at the spec level. No code change required this turn.

**Distinct from other 170-series filings: dependencies are SATISFIED today.** If Gary green-lights build now, no calendar wait blocks Blueprint kickoff. The single decision gating action is the Capacitor plugin approval (Flag 1).

## 170j-supplement anticipated per §23.5

Filed for future prompt:
- Wake word activation ("Hey ViaConnect") with privacy-first design
- Multi-language support: Spanish, French, Portuguese (aligning with the 170k i18n placeholder)
- Free-text voice notes on meal records ("Add a note that this was a celebration dinner")
- Voice-driven Quick Log without photo (analog to 170f §10.8)
- Voice editing on surfaces beyond result review (Settings, recipe library, supplement protocol)
- Conversational multi-utterance handling (>3 operations across follow-ups)

## Related

- Prompt 170 Phase 1 (shipped 2026-05-29 commit `47a7663d`; voice operates on the meal_draft from analyze response)
- Prompt 170a + 170a-supplement (ratified 2026-05-29; voice uses the supplement job-model state)
- Prompt 170b (filed; depth sensors)
- Prompt 170c (placeholder; PHI redaction)
- Prompt 170d (filed; multi-photo, voice operates on ensembled meal)
- Prompt 170e (filed; restaurant context, voice modifies chain customization slots)
- Prompt 170f (filed; recipe-aware, voice item-edits transition recipe-matched meals to derived state)
- Prompt 170g (filed; custom model, voice-corrected rows = 1.5x training weight, highest-quality signal)
- Prompt 170h (filed; symptom analytics, no direct composition)
- Prompt 170i (filed; practitioner sharing, voice metadata redacted from practitioner view)
- Heritage: Prompts 15-17 (supplement protocols), Prompt 16 (medication interaction safety, voice does not bypass)
