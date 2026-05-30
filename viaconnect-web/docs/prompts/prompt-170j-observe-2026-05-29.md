# Prompt 170j Observe Report

Date: 2026-05-29
Owner: Jeffery (orchestrator) / Plan agent
Status: OBRA Observe phase complete (read-only, dispatched 2026-05-29 by Gary directive "fast-track 170j, approve the plugin").

## Summary

The 170j voice-to-edit feature lands on a freshly shipped 170 Phase 1 codebase (commit `47a7663d` 2026-05-29) where the meal_draft shape, the result review screen orchestrator (`AnalysisResult.tsx` + `useMealItemEdits.ts`), the Settings > NutriVision page, and the analyze pipeline are all in production.

Two notable pre-existing assets reduce risk materially:
1. `src/types/speech-recognition.d.ts` is already shipped from Prompt #160 with the exact ambient declarations 170j needs for the Web Speech API.
2. `src/components/caq/VoiceInput.tsx` is a working web Speech Recognition implementation already in the consumer portal that 170j can mirror or extend.

The Capacitor plugin `@capacitor-community/speech-recognition ^6.0.0` was added to `package.json` 2026-05-29 but is NOT registered in any Capacitor config, NOT declared in iOS `Info.plist`, and NOT declared in `AndroidManifest.xml` (which today contains only `INTERNET` permission, no `RECORD_AUDIO`, no camera, no media).

The settings page at `src/app/(app)/(consumer)/settings/nutrivision/page.tsx` exists but currently hosts only the Privacy section with two toggles; the §11.7 Voice section is a clean insertion.

WebSearch and WebFetch (for npm/GitHub maturity research) were blocked by sandbox permission; external-dependency assessments below are knowledge-based and explicitly flagged as requiring a 5-minute re-verification before Blueprint kickoff. The implementation runway estimate of 4 to 6 weeks holds; the longest pole is Gordon's 1000-recording curated test set (per §16.1 outside this report).

## 1. Web Speech API Browser Compatibility

### Browser support matrix (knowledge-based, last verified ~Q4 2025)

| Browser | Desktop | Mobile | Prefix required | Continuous mode | interimResults | Notes |
|---|---|---|---|---|---|---|
| Chrome | Supported v25+ | Supported (Android) | `webkitSpeechRecognition` | Yes | Yes | Sends audio to Google STT cloud; requires HTTPS; permission UX is per-origin |
| Edge (Chromium) | Supported | Supported | `webkitSpeechRecognition` | Yes | Yes | Same as Chrome (Chromium engine) |
| Safari (macOS + iOS) | Supported 14.1+ | Supported iOS 14.5+ | `webkitSpeechRecognition` | Yes | Yes | Apple on-device STT (SFSpeechRecognizer for native, server-side for web); permission UX per-origin; iOS Safari respects `prefers-reduced-motion` |
| Firefox | NOT supported by default | NOT supported | n/a | n/a | n/a | `dom.webaudio.speechrecognition.enabled` flag exists but is OFF by default. Effectively zero coverage. |
| Samsung Internet | Supported | Supported | `webkitSpeechRecognition` | Yes | Yes | Mobile Android-only, Chromium-based |
| Opera | Supported | Supported | `webkitSpeechRecognition` | Yes | Yes | Chromium-based |

### Key API differences

- Constructor probe: `window.SpeechRecognition ?? window.webkitSpeechRecognition`. The existing `src/components/caq/VoiceInput.tsx` line 37 already uses the correct probe.
- `continuous = true` keeps the recognizer hot across pauses; `continuous = false` auto-stops on first silence. The §11.2 spec uses `continuous = false` for tap-to-talk and `continuous = true` for press-and-hold push-to-talk.
- `interimResults = true` yields the streaming Pattern A rendering described in §11.3 (final + interim italic). Required for the WCAG-friendly live-transcription announcement.
- `lang` defaults to the page locale; 170j must explicitly set `recog.lang = 'en-US'` to avoid surprising matches.
- No native browser API for "30-sec cap"; the §11.2 cap must be enforced by a JS `setTimeout(recog.stop, 30000)` in the capture hook.

### Mobile browser behavior

- **Mobile Safari iOS**: works in-browser when the user grants microphone permission. The platform recording indicator (orange dot in iOS status bar) appears, satisfying the §11 visibility commitment.
- **Mobile Chrome Android**: works similarly. Background tab interruption auto-aborts the recognizer (which §11.2 mid-capture interruption branch must catch via `onerror` + `onend`).
- **Capacitor WebView on iOS**: the WebView inherits Safari's WebKit so `webkitSpeechRecognition` is present, BUT iOS WebView restricts microphone access to apps that declare `NSMicrophoneUsageDescription` in `Info.plist`. Today our `Info.plist` (verified at `ios/App/App/Info.plist` lines 1-49) declares zero usage strings, so mobile-Safari-as-WebView would silently reject `getUserMedia` calls and the recognizer would fail on first start. **This is the single most important Phase 1 native gate.**
- **Capacitor WebView on Android**: similarly requires `RECORD_AUDIO` in `AndroidManifest.xml`. Today the manifest (verified at `android/app/src/main/AndroidManifest.xml` lines 1-35) declares only `INTERNET`.

### Firefox limitation flag

Firefox users (desktop AND any mobile browser using Gecko) get zero Web Speech API by default. The §11.1 conditional "device has no microphone hardware reported" does NOT catch this case. The FAB should probe `window.SpeechRecognition ?? window.webkitSpeechRecognition` at mount and treat missing-constructor as the same hidden-FAB + inline-hint state. Blueprint decision (Gate 3): extend the inline hint to a 2-variant pattern, or accept the spec's single-message degradation.

## 2. Capacitor Plugin Assessment

WebFetch / WebSearch was denied this turn (sandbox); the items below are knowledge-based (cutoff January 2026) and explicitly tagged for re-verification.

### Version pin

- Declared in `package.json` line 23: `"@capacitor-community/speech-recognition": "^6.0.0"`.
- Caret range allows any 6.x release. The plugin's 6.x line is Capacitor-6-compatible. The pin shape matches our existing precedent: `@capacitor/camera ^6.1.2`, `@capacitor/core ^6.2.0`, `@capacitor/android ^6.2.0`, `@capacitor/ios ^6.2.0`, `@capacitor/app ^6.0.2`.
- For comparison the rest of `@capacitor/*` packages are pinned `^6.0.x` to `^6.2.x`, none on `^6.0.0` exactly. **REQUIRES_RE_VERIFICATION** at Blueprint kickoff: confirm latest 6.x patch tag and tighten the pin precisely.

### License

The `@capacitor-community/*` org publishes under MIT by convention. **REQUIRES_RE_VERIFICATION**: read the LICENSE file in the repo at Blueprint kickoff.

### Maintenance signals

The plugin is one of the more-used `@capacitor-community/*` plugins. Last major release was the 6.x line aligned to Capacitor 6. **REQUIRES_RE_VERIFICATION**: open issues count, last release date, contributor activity.

### Native iOS surface

- Wraps Apple's `Speech` framework: `SFSpeechRecognizer` for transcription and `AVAudioEngine` for audio capture.
- **Required `Info.plist` keys**:
  - `NSSpeechRecognitionUsageDescription`
  - `NSMicrophoneUsageDescription`
- Neither key is currently in `ios/App/App/Info.plist`.
- Plugin API: `available()`, `start({ language, maxResults, prompt, partialResults, popup })`, `stop()`, `getSupportedLanguages()`, `hasPermission()`, `requestPermission()`, listener registration for `partialResults`.
- Streaming (partial results) supported via `partialResults: true`. Matches §11.3 Pattern A streaming requirement.
- iOS limitation: Apple caps SFSpeechRecognizer at ~1 minute per recognition request when on-device. Our 30-sec cap is well within both limits.

### Native Android surface

- Wraps `android.speech.SpeechRecognizer` with `RecognizerIntent.ACTION_RECOGNIZE_SPEECH`.
- **Required `AndroidManifest.xml` permissions**:
  - `<uses-permission android:name="android.permission.RECORD_AUDIO" />`
  - `<queries><intent><action android:name="android.speech.RecognitionService" /></intent></queries>` (Android 11+ package visibility)
- Neither is currently in the manifest.
- Streaming (partial results) supported via `partialResults: true`.

### Capacitor + Next.js + hosted-web compatibility

- Our Capacitor strategy is the **hosted-web shell** pattern: the native app loads `https://viaconnectapp.com` in a WebView (verified at `capacitor.config.ts` lines 17-29).
- The plugin can be dynamically imported the same way `camera-capture.ts` dynamically imports `@capacitor/camera` (verified at `src/lib/capacitor/camera-capture.ts` lines 150-160). Following that precedent ensures web-only builds where the plugin is absent from `node_modules` don't fail at typecheck.

### Known compatibility issues

- No known blocking issues at the time of the 6.x release for Capacitor 6.
- One Capacitor-6-era issue worth flagging: on iOS, the Speech framework requires the app to be in foreground; backgrounding the app mid-capture throws an error the plugin surfaces as `onError`. §11.2 mid-capture interruption branch handles this.

## 3. Gemini Audio API (server-side STT fallback)

WebSearch / WebFetch denied; items below are knowledge-based and explicitly tagged **REQUIRES_RE_VERIFICATION**.

### Streaming vs batch transcription support

- Gemini 2.0 Flash and 2.5 Flash both accept audio input as a `Part` of type `audio/wav`, `audio/mp3`, `audio/aiff`, `audio/aac`, `audio/ogg`, or `audio/flac`.
- For Voice-to-Edit, single-request batch transcription with audio embedded inline as base64 is the right pattern. True bidirectional streaming exists via the Gemini Live API but is overkill for ~5-second utterances.
- Network call shape would match our existing `src/lib/nutrition/gemini-client.ts` POST against `generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`.

### English-language accuracy expectations

- Gemini 2.0 Flash audio understanding is comparable to other top-tier STT services for English. Domain-specific accuracy on food vocabulary is well-supported.
- The 170j scenario is short-utterance (3-8 sec), command-shaped speech in a quiet environment. The §11.2 hint-rotation pool curates exemplar utterances so users naturally calibrate their phrasing.

### Pricing per minute of audio

- The spec assumes ~$0.005/min in the cost model. Gemini 2.0 Flash pricing (knowledge-based late 2025): audio input is charged per second, approximately $0.00125/min on the Flash tier. **REQUIRES_RE_VERIFICATION** at Blueprint kickoff via the official Google AI Studio pricing page.
- If actual cost is $0.00125/min, the spec's $0.005/min is **4x conservative** (correct direction). The cost model's ~$20-40/mo at 100k meals could revise downward to ~$5-10/mo.
- Gemini Audio billing shares the same per-token billing as Gemini Vision (used in Prompt 170). No new API credential needed: `process.env.GEMINI_API_KEY` already exists at `src/lib/nutrition/gemini-client.ts` line 41.

### Rate limits at our org tier

- Pay-as-You-Go tier (which 170 Phase 1 already uses): 2000 requests/min, 4M tokens/min for Gemini 2.0 Flash.
- At 15% adoption × 100k meals/mo × ~20% STT fallback rate = ~3000 server STT calls per month, averaging under 1 per minute. Rate limits non-binding at projected volume.

### Integration shape via existing gemini-client

- Today's `src/lib/nutrition/gemini-client.ts` (lines 1-80) wraps `generateContent` REST endpoint with three call sites: `parseImageWithGemini`, `estimateItemWithGemini`, text-only parse. It enforces 10-second timeouts via `withAbortTimeout`, uses a circuit breaker (`getCircuitBreaker('gemini-api', ...)`), and classifies errors via `classifyGeminiResponse`.
- 170j adds a fourth call site: `transcribeAudioWithGemini(audioBase64, mime)`. The function returns `{ transcript: string; usage: Usage }`, uses the same `callGemini(body)` helper with audio as a Part. No new client file is needed; gemini-client.ts can be extended in-place.

### Shared billing line with Gemini Vision

Yes, fully shared. Both use the same `GEMINI_API_KEY`, same REST endpoint, same `usageMetadata.promptTokenCount` reporting, same monthly billing rollup. The existing `src/lib/observability/ai-pricing.ts` cost estimator can be extended with an `audioSecondsToTokens` lookup (audio is billed at ~32 tokens per second on Gemini 2.0 Flash, knowledge-based).

## 4. Analyze Pipeline Integration Point

### Job-model state machine

- Lives in `src/app/(app)/(consumer)/nutrition/components/NutriVisionTab/index.tsx` (verified at lines 56-217). The `Phase` type at `types.ts` lines 25-36 declares: `'idle' | 'capturing' | 'analyzing' | 'reviewing' | 'saving' | 'confirmed' | 'error'`.
- The `reviewing` phase is where 170j slots: voice operates on `draft: MealDraft` while user is in reviewing phase. The FAB renders inside `<ReviewingSurface>` JSX (line 301-313).
- Voice does NOT need a separate state machine because it operates within the `reviewing` phase of the existing meal job.

### meal_draft shape

Declared at `src/app/(app)/(consumer)/nutrition/components/NutriVisionTab/types.ts` lines 129-146. Key fields voice operations mutate:
- `items: MealItemDraft[]` (the 11-op taxonomy targets this array)
- `totals: MealTotals` (computed via `aggregate()` in `useMealItemEdits.ts` line 77)
- `meal_confidence: number` (read by §11.1 conditional state, not mutated)

Each `MealItemDraft` (types.ts lines 73-111) has: `id`, `food_name`, `cuisine_tag`, `portion_grams`, `per_100g`, `calories_kcal`, `protein_g`, `carbs_g`, `fat_g`, `cooking_method`, `cooking_oil`, `user_modified`, `confidence_band`.

Voice operation to mutator mapping:
- `AddItem` = `addItem()` + `swapFood(itemId, replacement)` in sequence
- `RemoveItem` = `removeItem(itemId)`
- `ModifyItemPortion` = `setPortion(itemId, grams)`
- `ModifyItemCookingMethod` = `applyChip(itemId, 'grilled' | 'baked' | 'raw')` (note: 3 cooking methods today; voice may need more — **Blueprint extension**)
- `AddCookingOil` / `RemoveCookingOil` = `setCookingOil(itemId, selection)`
- `ChangeMealPortion` = iterate `items` and `setPortion(item.id, item.portion_grams * scale)`
- `AddModifier` = `applyChip(itemId | 'meal', chip)` for additive chips
- `RemoveModifier` = requires a new `removeChip` mutator that doesn't currently exist — **Blueprint gap**

### How tap-driven edits commit

- The `useMealItemEdits` hook at `src/app/(app)/(consumer)/nutrition/components/NutriVisionTab/hooks/useMealItemEdits.ts` (verified, 376 lines) holds the live items array and exposes mutators that update the array AND increment an `EditDiff` counter (lines 181-298).
- The hook exposes `buildSavePayload(mealType)` (lines 300-360) that produces the `NutriVisionMealInsertPayload` shape validated by `NutriVisionMealInsertSchema` in `src/lib/nutrition/meals-insert-schema.ts`.
- 170j voice operations should reuse these exact mutators. The diff tracking automatically captures voice work without new wiring.
- The §11.4 cumulative impact chip computes `aggregate(itemsAfterAllOps) - aggregate(itemsCurrent)`. Pure recompute against existing `aggregate()` function.
- The §11.10 voice edited chip reads from new `voice_corrected: boolean` and `voice_operation_count: number` that the hook must track. Two additional useState calls.

## 5. Result Review Screen Integration Point

- `src/app/(app)/(consumer)/nutrition/components/NutriVisionTab/AnalysisResult.tsx` (verified, 194 lines).
- Save bar at lines 153-176: `Cancel` (line 156-164) and `Save to log` (line 165-174). NO `Save as recipe` button today; that's 170f.
- The Save bar is `fixed bottom-0 left-0 right-0 z-30` on mobile and `static` on desktop (line 154). FAB renders at a different fixed position on mobile and follows inline layout on desktop.
- No FAB component exists today. 170j builds the first FAB. Hannah's §11.1 design (56px circular, Teal solid fill, Navy Mic icon, strokeWidth 1.5) is the spec.
- z-index stacking: FAB at `z-40`, save bar at `z-30`, overlay/modal at `z-50` (Blueprint decision).

## 6. Settings > NutriVision Integration Point

- `src/app/(app)/(consumer)/settings/nutrivision/page.tsx` (verified, 192 lines).
- Current state: one Privacy section (lines 107-153) with two SettingToggle rows. Both default OFF, write to `user_nutrivision_settings` via Supabase upsert.
- The existing `SettingToggle` component (lines 160-191) is the canonical reusable pattern. Uses Teal `#2DA5A0` (line 180) when ON and `bg-white/15` when OFF.
- Section wrapper pattern (lines 107-154) uses `rounded-2xl border border-white/[0.08] bg-[#1E3054]/55 p-5 backdrop-blur-md`.

### Sub-page vs inline section decision (Blueprint Gate 2)

- Hannah's §11.7 wireframe describes `/settings/nutrivision/voice` as a sub-page.
- (a) Separate page file at `src/app/(app)/(consumer)/settings/nutrivision/voice/page.tsx` mirroring existing page chrome.
- (b) Inline section added below Privacy section on the same `/settings/nutrivision` page.
- (a) matches wireframe and is more scalable; (b) is faster. Blueprint asks Gary.

## 7. iOS Info.plist + Android Manifest Permission Declarations

### iOS Info.plist

- Path: `ios/App/App/Info.plist` (verified, 49 lines).
- **Existing usage description strings**: ZERO.
- 170 Phase 1 camera flow on iOS may already have an Info.plist gap. Flag for parent.
- **Target strings to add for 170j**:
  - `NSMicrophoneUsageDescription`: "ViaConnect uses your microphone to let you edit meals hands-free. Your voice is processed on your device when possible and never retained."
  - `NSSpeechRecognitionUsageDescription`: "ViaConnect uses speech recognition to turn your spoken meal edits into text. Speech is transcribed on your device when possible; transcripts are used only to apply edits you confirm."
- Phase 1 native build step: edit `Info.plist` to add both keys, then `npx cap sync ios`.

### Android AndroidManifest.xml

- Path: `android/app/src/main/AndroidManifest.xml` (verified, 35 lines).
- **Existing permissions**: only `<uses-permission android:name="android.permission.INTERNET" />` (line 34).
- **Target permissions to add for 170j**:
  - `<uses-permission android:name="android.permission.RECORD_AUDIO" />`
  - `<queries><intent><action android:name="android.speech.RecognitionService" /></intent></queries>`
- Phase 1 native build step: edit `AndroidManifest.xml`, then `npx cap sync android`.

## 8. Capacitor Plugin Configuration

- Source: `capacitor.config.ts` (verified, 62 lines, TypeScript source of truth).
- iOS compiled copy: `ios/App/App/capacitor.config.json` (synced by `npx cap sync`).
- Android compiled copy: `android/app/src/main/assets/capacitor.config.json` (verified, 41 lines).
- Existing plugin registrations (lines 39-58): `SplashScreen`, `StatusBar`, `App`.
- `@capacitor/camera` is installed in `package.json` but has NO entry in `capacitor.config.ts` plugins block — it reads options at call time. This is the precedent 170j follows.
- The speech-recognition plugin reads options at call time same way. **No explicit config block needed**.
- iOS SFSpeechRecognizer instantiates per-request; framework lifecycle is plugin-internal.
- Android SpeechRecognizer binds per-`start()` call; plugin manages binding.
- The plugin's `available()` method should be called once at FAB-mount time to determine FAB visibility.

## Blueprint Gate Decisions

Seven decisions Gary faces at Blueprint kickoff:

### Gate 1: Tighten plugin pin?

Current pin `^6.0.0` allows any 6.x. House style across `@capacitor/*` is to pin latest known-good minor. Recommend tightening at Blueprint kickoff after verifying latest 6.x release tag on npm/GitHub.

### Gate 2: Sub-page vs inline section for Settings > NutriVision > Voice?

Hannah's wireframe says sub-page at `/settings/nutrivision/voice`. Existing `/settings/nutrivision` page is a single Privacy section.
- (a) New `voice/page.tsx` sub-page; inline link from parent.
- (b) Inline §11.7 Voice section below Privacy on parent page; no new route.

### Gate 3: Firefox / unsupported-browser inline-hint copy variant?

Spec §11.1 has one "voice off, enable in Settings" inline hint. Firefox users (zero Web Speech API by default) see same copy as permission-denied users, which is misleading because Settings won't help.
- (a) Single message, accept imprecision.
- (b) Two-variant copy: permission-denied keeps current; unsupported-browser gets distinct "Voice editing is not available in this browser."

### Gate 4: removeChip mutator OR scope down RemoveModifier?

170j `RemoveModifier` op requires removing a previously-applied modifier chip. Today's `applyChip` only adds; there's no inverse.
- (a) Extend `useMealItemEdits` with `removeChip(itemId, chip)` mutator.
- (b) Mark `RemoveModifier` as stretch goal; scope v1 to add-only modifiers.

(a) is more correct; minor schema churn.

### Gate 5: FAB visibility during `analyzing` and `error` phases?

Spec §11.1 says FAB lives on result review screen; voice fundamentally needs meal_draft which exists only in `reviewing`, `saving`, `confirmed`. Recommend `reviewing` only. Blueprint may consider extending to `error` for voice-rebuild use case (defer to 170j-supplement).

### Gate 6: Confidence threshold defaults 0.50 / 0.85?

Spec §3 declares these env-tunable with defaults 0.50 (clarification) and 0.85 (medium chip). Confirm defaults before kickoff, or accept as drafted.

### Gate 7: Quick Apply Mode confidence threshold at >0.92?

Spec §6.3 declares 0.92. Confirm.

## Build Gap List

### Native gating (BLOCKS native ship if missing)

1. `ios/App/App/Info.plist`: add `NSMicrophoneUsageDescription` + `NSSpeechRecognitionUsageDescription` strings.
2. `android/app/src/main/AndroidManifest.xml`: add `RECORD_AUDIO` permission + `<queries>` block for `android.speech.RecognitionService`.
3. `npx cap sync ios && npx cap sync android`.

### Libs (TypeScript)

4. `src/lib/nutrition/voice/types.ts`: operation taxonomy enum (11 ops), `VoiceOperation` type, NLU output schema types, capture state types.
5. `src/lib/nutrition/voice/stt/web-speech.ts`: Web Speech API wrapper with streaming partial results. Reuses ambient `src/types/speech-recognition.d.ts`.
6. `src/lib/nutrition/voice/stt/capacitor.ts`: `@capacitor-community/speech-recognition` wrapper, dynamic-imported per `camera-capture.ts` pattern.
7. `src/lib/nutrition/voice/stt/gemini-audio.ts`: extends `gemini-client.ts` with `transcribeAudioWithGemini`.
8. `src/lib/nutrition/voice/stt/orchestrator.ts`: STT path selector with kill-switch `VOICE_EDIT_SERVER_STT_ENABLED`.
9. `src/lib/nutrition/voice/nlu/parse-operations.ts`: Claude Haiku 4.5 wrapper.
10. `src/lib/nutrition/voice/nlu/operation-schema.ts`: Zod schema for the NLU output.
11. `src/lib/nutrition/voice/nlu/system-prompt.ts`: NLU system prompt builder.
12. `src/lib/nutrition/voice/apply/operation-applicator.ts`: maps `VoiceOperation[]` to `useMealItemEdits` mutator calls.
13. `src/lib/nutrition/voice/apply/macro-impact.ts`: cumulative impact computation.
14. `src/lib/nutrition/voice/apply/undo-stack.ts`: in-session undo.
15. `src/lib/nutrition/voice/feature-flags.ts`: three kill switches.
16. `src/lib/nutrition/voice/telemetry.ts`: 10% sampled writes to `voice_edit_sessions` + `voice_edit_operations_log`.

### API routes

17. `src/app/api/nutrition/voice/transcribe/route.ts`: server-fallback STT endpoint; asserts `audio_retained: false`.
18. `src/app/api/nutrition/voice/parse/route.ts`: NLU endpoint.

### Hooks

19. `voice/hooks/useVoiceCapture.ts`: wraps STT orchestrator.
20. `voice/hooks/useVoiceNLU.ts`: wraps NLU parse.
21. `voice/hooks/useVoiceApply.ts`: wraps operation-applicator + undo-stack.
22. `voice/hooks/useVoiceSession.ts`: session-level state (tutorial-seen flag, voice_corrected boolean, voice_operation_count).

### UI components

23. `voice/VoiceFAB.tsx`: §11.1 FAB.
24. `voice/VoiceCaptureOverlay.tsx`: §11.2 overlay + pulsing mic ring + reduced-motion variant.
25. `voice/LiveTranscript.tsx`: §11.3 streaming (Pattern A) and non-streaming (Pattern B) variants.
26. `voice/OperationPreview.tsx`: §11.4 card stack + cumulative impact chip + CTAs.
27. `voice/OperationCard.tsx`: single-operation card.
28. `voice/QuickApplyToast.tsx`: §11.4 conditional state with 10-sec Undo.
29. `voice/ClarificationCard.tsx`: §11.5 clarification UI.
30. `voice/ErrorCard.tsx`: §11.6 with 5 variants.
31. `voice/VoiceTutorial.tsx`: §11.8 3-slide carousel with privacy-on-slide-3.
32. `voice/VoiceHelpSheet.tsx`: §11.9 bottom sheet with 8 sections.
33. `voice/VoiceEditedChip.tsx`: §11.10 result review header chip with popover.
34. `voice/VoiceAccessibilityProvider.tsx`: aria-live region utilities, reduced-motion observer, iOS Voice Control / Android Voice Access identifier injection.

### Settings page

35. Either sub-page (Gate 2 (a)) OR inline section (Gate 2 (b)).
36. Either way: 4 toggles (Voice editing, Quick Apply Mode with confirmation dialog, Audio feedback chimes, Push-to-talk by default), Tutorial Replay row, Privacy footer.

### Database migrations

37. `voice_edit_sessions` table (append-only, 10% sampled, no transcript text).
38. `voice_edit_operations_log` table (10% sampled, no operation arguments).
39. `meals` augmentation: `voice_corrected boolean`, `voice_operation_count int`, `voice_corrected_fields_json jsonb`.
40. 4 Helix event types: `voice_edit_session_started` (1pt), `voice_edit_operation_applied` (1pt), `voice_meal_saved` (2pt), `quick_apply_mode_enabled` (2pt).

### NutriVisionTab integration

41. Edit `NutriVisionTab/index.tsx` to render `<VoiceFAB>` inside `<ReviewingSurface>`.
42. Edit `AnalysisResult.tsx` to host §11.10 `<VoiceEditedChip>` inline with meal name header.
43. Edit `useMealItemEdits.ts` to add `removeChip(itemId, chip)` mutator (Gate 4) and `voice_corrected` + `voice_operation_count` state.
44. Edit `meals-insert-schema.ts` to include new voice fields in `NutriVisionMealInsertSchema`.

### POST route schema extension

45. Edit `src/app/api/nutrition/meals/route.ts` to accept new voice fields and persist to augmented `meals` columns.

### /admin/corpus integration

46. Surface 4 new voice telemetry rollups: voice adoption rate, voice operation distribution, voice clarification rate, voice error breakdown.

### Tests

47. `operation-applicator.test.ts`: unit tests for each of the 11 ops.
48. `stt-orchestrator.test.ts`: primary/fallback path selection + kill-switch behavior.
49. `nlu-parse.test.ts`: schema validation + confidence threshold behavior.
50. `transcribe/route.test.ts`: server-fallback STT endpoint contract.
51. `parse/route.test.ts`: NLU endpoint contract.
52. `VoiceFAB.test.tsx`: RTL component tests + accessibility assertions.
53. Playwright `e2e/nutrivision-voice-edit.spec.ts`: full happy path + reduced-motion + permission-denied.
54. Manual VoiceOver + manual TalkBack + manual keyboard nav scripts + axe-core CI integration.

## Composition Cross-References

### 170 base composition (shipped)

- `NutriVisionTab/types.ts` lines 129-146: `MealDraft` shape is the contract.
- `useMealItemEdits.ts` lines 197-298: canonical mutators.
- `NutriVisionTab/index.tsx` line 432: `<ReviewingSurface>` is the FAB host.
- `meals-insert-schema.ts` lines 58-100: persistence contract.
- `src/app/api/nutrition/meals/route.ts`: POST handler.

### 170d multi-photo (not yet shipped)

When 170d ships, voice continues to operate on the same `MealDraft` shape. The cumulative impact chip is computed against the ensembled meal totals. Future call site to flag: when 170d's multi-photo flag exists on `MealDraft`, the §11.4 transcript chip's "preview against ensembled meal" copy may want a hint.

### 170e restaurant context (not yet shipped)

When 170e ships, the `ModifyChainCustomization` op becomes active. NLU system prompt must include chain-slot vocabulary conditionally on whether the meal is chain-matched. Integration point: `MealDraft.chain_match` gates whether voice's chain customization is possible.

### 170f recipe (not yet shipped)

When 170f ships, voice item-level edits on recipe-matched meal trigger `matches_recipe = false` + set `derived_from_recipe_id`. Voice portion-only edits do NOT transition. Integration point: operation-applicator checks if meal came from a recipe and post-commit triggers recipe-derived state.

### 170g custom model corpus (corpus wait, not yet shipped)

When 170g trains, voice-corrected rows in `user_meal_corpus` are weighted 1.5x. Today's corpus writer at `src/lib/nutrition/corpus/writer.ts` is the integration point; must learn to set `voice_corrected = true` on corpus row when meal had voice operations applied. 5-line edit when 170g's training-time consumer is wired up.

### 170i practitioner sharing redaction (not yet shipped)

When 170i ships, practitioner Patient Detail Nutrition tab MUST hide: voice transcript, voice operation log, `voice_corrected` boolean, `voice_operation_count`. The §13.3 redaction matrix adds these as redacted fields.

### Helix events composition

4 new event types fired from voice surfaces (consumer-only). Existing helix-bridge at `src/lib/nutrition/helix-bridge.ts` is the canonical award path.

### 16 medication interactions composition

Voice operations trigger the same medication-interaction safety check as tap edits via `src/lib/nutrition/checkFoodInteractions.ts`. The operation-applicator calls into this after each apply.

## Risk Log

### Risk 1: Plugin maturity not verified before Blueprint kickoff (HIGH probability, MEDIUM severity)

WebFetch/WebSearch denied this turn. **Mitigation**: Blueprint kickoff must include a 5-minute orchestrator-level web check before any build work begins.

### Risk 2: iOS Info.plist + Android Manifest changes block native build (MEDIUM probability, HIGH severity)

Two new iOS keys and Android `RECORD_AUDIO` + `<queries>` additions REQUIRE native rebuild + App Store / Play Store resubmission. Web fallback works without them. **Mitigation**: ship Info.plist + Manifest changes as the FIRST PR after Blueprint signoff, before any UI code, so native binaries can be built and TestFlight / internal track distribution happens in parallel with the rest of build.

### Risk 3: Zero-audio-retention claim depends on Gemini Audio not buffering on Google's side (LOW probability, HIGH severity)

The claim "audio_retained: false" is true at ViaConnect application boundary but Google's Gemini Audio infrastructure DOES process audio in memory. **Mitigation**: §11.7 privacy footer wording is technically accurate ("We never retain audio" = ViaConnect never retains). If precision becomes an audit concern, Blueprint may add: "Audio sent to our STT service is processed in memory and not stored."

### Risk 4: NLU latency budget (200-500 ms p50) may be tight for Claude Haiku 4.5 (MEDIUM probability, LOW severity)

System prompt embedding full operation taxonomy + meal draft state + chain slot vocabulary may push input tokens to 500-1000, adding latency. **Mitigation**: Blueprint should benchmark a representative prompt against Anthropic API early. If p50 exceeds 500 ms, switch to streaming response from NLU.

### Risk 5: WCAG 2.2 AA audit on dynamic voice surfaces (HIGH probability, MEDIUM severity)

Voice surfaces are dynamic: aria-live regions firing for transcript updates, focus management, reduced-motion variants. Getting it right end-to-end is non-trivial. **Mitigation**: include a parallel-track accessibility deliverable in Blueprint: a single `VoiceAccessibilityProvider` wraps all voice UI and centralizes aria-live management. Allocate Week 4-5 of the 4-6 week runway specifically for accessibility audit pass.

## Critical Files for Implementation

- `src/app/(app)/(consumer)/nutrition/components/NutriVisionTab/AnalysisResult.tsx`
- `src/app/(app)/(consumer)/nutrition/components/NutriVisionTab/hooks/useMealItemEdits.ts`
- `src/app/(app)/(consumer)/nutrition/components/NutriVisionTab/index.tsx`
- `src/app/(app)/(consumer)/settings/nutrivision/page.tsx`
- `ios/App/App/Info.plist`
- `android/app/src/main/AndroidManifest.xml`
- `capacitor.config.ts`

High-value precedent files to copy patterns from:
- `src/types/speech-recognition.d.ts` (existing Web Speech ambient declarations, fully reusable)
- `src/components/caq/VoiceInput.tsx` (working web Speech Recognition implementation precedent)
- `src/lib/capacitor/camera-capture.ts` (dynamic-import pattern for optional native plugin)
- `src/lib/nutrition/gemini-client.ts` (REST + circuit-breaker + timeout pattern for audio call)
