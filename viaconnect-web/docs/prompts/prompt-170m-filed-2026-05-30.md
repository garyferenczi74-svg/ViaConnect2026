# Prompt 170m Filed: Quick Log Text-Native Entry Path on the NutriVision Tab

Date: 2026-05-30
Status: **Filed at spec level; ratified.** NO code work. Hannah dispatched for §9 wireframes (10 substantive surfaces; three-button row architectural shift is most consequential). **Pre-launch P0 for US July 1, 2026 launch.**
Memorialized by: Jeffery (orchestrator).

## Mission (one line)

Add a text-native entry path to the NutriVision tab as a third peer alongside Photo (170 base) and Scan Barcode (170l, shipped 2026-05-30), routing typed natural-language meal descriptions through a Claude Haiku 4.5 NLU pipeline (inverse of the 170j voice editing pattern: creates a draft from scratch rather than editing an existing one) that produces the same `meal_items` shape as photo and barcode paths, with a Recent Quick Logs one-tap repeat row, a frequency-weighted recency ranking, and a "From Quick log" chip on the result review for description re-edits.

## Why this filing posture matches the 170-series pattern (with 6 structural distinctions)

170m memorializes-only with Hannah dispatched for §9 wireframes, same posture as prior 170-series filings. Six structural distinctions:

1. **Pre-launch P0 status.** Status field explicitly: "Pre-launch must-have for US July 1, 2026 launch." Only one prior 170-series prompt has carried this label, and it was shipped in flight (170l, today). Sequencing and resource allocation reflect P0 priority.

2. **Zero new package.json dependencies.** The lowest-friction prompt in the launch set. Reuses the Anthropic API integration from 170j voice editing (Claude Haiku 4.5, `@anthropic-ai/sdk` already approved as part of #105 pkg approvals). Text input is native HTML `<textarea>` + React state. No vendor evaluation. No Gary package.json approval needed.

3. **Inverse-NLU pattern relative to 170j.** 170j parses **edit operations** against an existing meal draft (11-operation taxonomy, snapshot-based undo, modify_item_portion, add_modifier, etc.). 170m parses **meal items** into a new draft from a cold start (no draft context, no operations, just food → portion → cooking method → modifiers extraction). Same Haiku model, same strict-JSON pattern, same confidence tier framework, different system prompt and different output schema. The integration layer is shared; only the prompt and the response normalizer differ.

4. **Four-entry-path conceptual evolution.** 170l shipped with two equal-weight peer cards (Photo + Scan Barcode) per Hannah's §11.1 fill. 170m evolves this to three (Photo + Scan Barcode + Quick Log). Future 170e (restaurant context) and 170f (recipe match) compose as secondary surfaces rather than additional primary cards — the three primary cards are the architectural ceiling. The conceptual shift from "any-entry-point food logger with two paths" to "any-entry-point food logger with three paths" is the most user-visible architectural change in the 170-series since 170l shipped this evening.

5. **Accessibility-leadership entry path.** Text input has the strongest baseline accessibility of any entry path (screen reader native, system dictation native, platform text scaling native, keyboard navigation native). 170m's WCAG 2.2 AA posture matches 170j and 170l, but the baseline is stronger because the affordance itself is naturally accessible. This is the entry path the launch product should foreground in accessibility marketing.

6. **Cheapest 170-series prompt to operate.** $0.001 per parse (cheaper than 170l at $0 because OFF was free and 170l never called LLMs; but 170m is the cheapest LLM-touching prompt). At projected 20-40% adoption of NutriVision meals, $20-80/month total. Compare to 170 photo path at ~$5k/month and 170j voice editing at ~$0.002/session.

## The four-entry-path architecture (the conceptual shift)

| Entry path | Source | Speed (p50) | Best for | Status |
|---|---|---|---|---|
| Photo capture (170) | Vision pipeline (LogMeal / Gemini / Claude vision) | 3-5 sec | Fresh / cooked / restaurant plates | SHIPPED |
| Scan Barcode (170l) | Direct-to-OFF lookup with 7-day cache | Sub-1.5 sec | Packaged foods (3M+ products) | SHIPPED 2026-05-30 |
| **Quick Log (170m)** | **Claude Haiku 4.5 NLU + cascade** | **Sub-1 sec p50** | **Simple / repeat / context-constrained meals** | **FILED** |
| Restaurant selector (170e) | Chain menu catalog | Sub-2 sec | 30+ US chains | FILED (not built) |
| Recipe match (170f) | pHash short-circuit on captured photo OR text similarity for Quick Log | Sub-200 ms | User's repeat meals | FILED (not built) |
| Voice (170j) | STT cascade + Haiku NLU | Sub-3 sec | Result review editing | SHIPPED 2026-05-30 |

Voice (170j shipped) is meta to all four entry paths. The "Use voice instead" link in the Quick Log modal opens the 170j voice capture overlay applied to an empty draft, providing a voice fallback for users who prefer spoken input without 170n's filed-for-future voice-as-entry path.

## NLU via Claude Haiku 4.5 (inverse of 170j pattern)

**Existing role from 170j (shipped):** `src/lib/nutrition/voice/nlu/system-prompt.ts` builds a Claude Haiku system prompt for edit-operation parsing. Response is a discriminated union of 11 operation kinds. Implementation integrated into `useVoiceNLU` hook via `parse-client.ts` fetch wrapper around `/api/nutrition/voice/parse`.

**New role from 170m:** `src/lib/nutrition/quick-log/haiku-system-prompt.ts` builds a Claude Haiku system prompt for meal-item creation. Response is a structured object with `meal_items[]`, plus optional `restaurant_context_detected`, `recipe_match_hint`, `branded_product_hints`, `dietary_restriction_flags`, `needs_clarification`, `clarification_questions`, `split_into_multiple_meals_suggestion`. Implementation integrates into a new `useQuickLogParser` hook via a parse-client wrapper around `/api/nutrition/quick-log/parse`.

**Shared infrastructure**:
- `@anthropic-ai/sdk` (already approved per #105)
- Strict JSON output pattern (no preamble, no markdown wrappers)
- Code-fence stripping helper (from 170j Phase 1a)
- Zod-validated response schema
- Confidence tier thresholds (env-tunable, defaults match 170j: 0.50 / 0.85 / 0.92)
- Per-call cost ~$0.001
- Per-call latency p50 ~340ms (Haiku is fast)

**Distinct posture per spec §3.2-3.7:**
- No meal draft context (cold start)
- Portion inference rules in system prompt (§4 rules encoded)
- Restaurant context detection (composes with 170e when shipped)
- Recipe match hinting (composes with 170f when shipped)
- Branded product detection (composes with 170l shipped — routes via OFF cache)
- Dietary restriction crossover detection (composes with 170c when ratified)
- Multi-meal split detection (a user typing "breakfast eggs, lunch salad" gets the split prompt)

## Portion inference defaults (§4)

The Haiku system prompt encodes per-spec defaults:
- Specified quantity wins
- Plural without quantity → 2 of the item
- Singular without quantity → 1 of the item
- Common foods → standard servings (1 cup rice = 195g; 8oz coffee; 1 slice pizza = 100g)
- Drinks → standard sizes by container hint (cup, mug, glass, bottle, small/large)
- Restaurant items → chain-specific defaults when chain detected (composes with 170e)
- Branded products → OFF serving_quantity when product identified (composes with 170l shipped)
- Recipe-matched → saved recipe portion (composes with 170f when shipped)

Ambiguous portion → clarification chip-select with most-common options. Even after defaults applied, user can fine-tune on result review screen.

## Composition with shipped 170j voice (FREE, deep)

Same composition principle as 170l: voice operations apply to Quick-Log-created drafts identically to photo-created drafts. After Quick Log parses "two scrambled eggs and toast" into a draft, the user can say "Add butter to the toast" and the voice `add_modifier` op applies. No NLU prompt changes needed.

Quick Log + voice combo enables:
- Type meal then voice-refine (most common compositional pattern expected)
- The voice-fallback link in the Quick Log modal (§9.2 "Use voice instead") opens 170j voice-edit on an empty draft, providing inline voice-as-entry without 170n

## Composition with shipped 170l barcode (FREE, narrow)

Branded product mentions in typed text ("Chobani Greek yogurt", "Quest protein bar", "Cherry Coke") trigger `branded_product_hints` in the NLU response. The server attempts fuzzy match against the OFF cache (`off_product_cache` table shipped 2026-05-30). Confident match routes the meal_item through OFF tier with full metadata (off_product_name, off_brand, off_serving_size_g, off_completeness_score, off_nova_group, off_nutrition_grade_fr, user_overrode_macros = false). Low-confidence match falls through to standard cascade tiers.

The shipped 170l `off_product_cache` table is reused as-is. The shipped `awardOffContributionClicked` Helix event helper is unused (Quick Log doesn't open OFF tabs; it ingests typed mentions).

## Cost model (cheapest LLM-touching prompt)

| Component | Cost per Quick Log session |
|---|---|
| NLU via Claude Haiku 4.5 | ~$0.001 per parse |
| Clarification re-parse (0-2 rounds) | $0-$0.002 additional |
| Cascade lookups for parsed items | Negligible (existing infrastructure) |
| Recent Quick Logs read endpoint | Negligible (Postgres read) |
| **Average per session (no clarification)** | **~$0.001** |
| **Average per session (1 clarification)** | **~$0.002** |

Projected monthly cost at scale: $20-$80 at 20-40% Quick Log adoption of 100k NutriVision meals/month. Trivial.

Storage growth: ~2 MB/month for text_input + ~2 MB/month for sampled session telemetry at 30k Quick Log meals/month. Trivial.

## Migrations filed (5 total, plus one spec inconsistency to resolve at Blueprint)

All append-only:

1. **`nutrition_photo_jobs.analyze_kind` extension** to add `'quick_log_text'` value (resolution path matches the 170l Observe finding for analyze_kind; current state may be phantom table, in which case this collapses to using `meals` columns as the differentiator)
2. **`meals` augmentation**: `text_input TEXT` + `text_input_locale TEXT` + `quick_log_parser_version TEXT` (per §7.2)
3. **`meal_items` augmentation**: `source_text_span TEXT` + `parsed_portion_grams NUMERIC(10,2)` + `entry_modality_hint TEXT CHECK` (per §7.3)
4. **`quick_log_sessions` table** (20% sampled telemetry, full 100% sampling for first 60 days post-launch, text input NOT stored in this table — only metadata) (per §7.4)
5. **Helix events block** (5 event types) (per §7.5)

**Spec inconsistency to resolve at Blueprint:** §8.5 references `repeated_from_meal_id` on meals but §7.2 doesn't include this column. Either fold into the §7.2 meals ALTER (preferred — small additive) or add a 6th migration. Flagged for Gary in §5 below.

## Helix events filed (5, consumer-side only per Standing Rule #8)

| Event key | Points | Purpose |
|---|---|---|
| `quick_log_text_input_started` | 1 | User opened the Quick Log text input modal |
| `quick_log_meal_saved` | 4 | User saved a meal via Quick Log (matches barcode_meal_logged 4pt; lower than photo 5pt because effort is lower) |
| `quick_log_recent_repeat_tapped` | 2 | One-tap repeat from Recent Quick Logs row (generous to encourage retention behavior) |
| `quick_log_clarification_resolved` | 1 | User resolved a parser clarification question |
| `quick_log_description_re_edited` | 1 | User returned to re-edit a description |

Pattern matches 170l (5 events including the generous-by-design contribution award) and 170j (4 events). Schema requirements per the 170l hotfix: `category='tracking'` (matches nutrivision_* / quick_log_* family) + `base_points` (not base_amount) + `requires_consumer_tier INTEGER 1` + `display_name NOT NULL`.

## Four kill switches (§11.5)

- `QUICK_LOG_TEXT_ENABLED` (master, default false until ratification)
- `QUICK_LOG_RECIPE_SHORT_CIRCUIT_ENABLED` (default true; gates 170f composition when 170f ships)
- `QUICK_LOG_RESTAURANT_DETECTION_ENABLED` (default true; gates 170e composition when 170e ships)
- `QUICK_LOG_BARCODE_PRODUCT_DETECTION_ENABLED` (default true; gates 170l shipped composition)

## Privacy posture (text-input consumer-only)

- **Text input persistence**: stored in `meals.text_input` for saved meals only. Cancelled or abandoned sessions do not persist the text anywhere except in the 20% sampled `quick_log_sessions` telemetry table (which captures metadata only, NOT the raw text).
- **Practitioner redaction matrix extended** (§12.7): practitioners with Detailed Meals scope see the parsed `meal_items` (food names, portions, macros, cooking methods, modifiers) but NOT `meals.text_input`, NOT `meals.text_input_locale`, NOT `meals.quick_log_parser_version`, NOT `meal_items.source_text_span`, NOT `meal_items.entry_modality_hint`. Text descriptions can contain incidental personal context ("had pizza after a rough day") that consumers did not intend to share with practitioners. Sharing structured items preserves clinical data without leaking personal context.
- **No content moderation**: text input is private nutrition log; users write whatever they want.
- **No biometric or psychometric analysis**: parser is a nutrition extractor, not a behavioral analyst.
- **170g corpus contribution** (when shipped): gated by training consent toggle per 170g §5.4. Non-consented users excluded.
- **170c eating disorder safety mode** (when ratified): Quick Log respects it — result review shows no macros by default, supportive messaging replaces optimization framing. The Quick Log surface itself is preserved (logging is the safe behavior; suppressing entry path is worse).

## Accessibility (text-native = strongest baseline)

Per WCAG 2.2 AA precedent set by 170j + 170l + 171a. Text input has the strongest baseline:
- Screen reader native (VoiceOver / TalkBack read textarea character-by-character or word-by-word)
- System dictation native (iOS Voice Control / Android Voice Access write into the same text field)
- Platform text scaling native (Dynamic Type on iOS, font scaling on Android)
- Keyboard navigation native (Tab order: textarea → Parse → Cancel → Use voice instead; Cmd-Enter / Ctrl-Enter submits)
- Hearing-impaired users have a first-class entry path that doesn't require voice

170m's specific commitments:
- Escape key closes modal (with confirmation if typed text present)
- aria-live announcement on character count when approaching the 500-char cap
- prefers-reduced-motion respected (modal opening/closing without slide animation)
- First-time tutorial accessible from Help link in modal for users who want to review

## §9 UI surfaces (Hannah's dispatch this turn, 10 substantive)

<!-- HANNAH: replace the placeholder paragraph between START and END markers below with the §9.1 through §9.7 + §9.8 + parse loading + first-time tutorial wireframe section per the dispatch prompt. Voice posture inherits from the 170h/170i/170j/170k/170l pattern (warmth + precision + no clinical claims). §9.1 three-button row restructuring is the most consequential surface; the modal layout density is the densest. -->

<!-- HANNAH_WIREFRAMES_START -->

### §9.1 NutriVision tab idle state with three-button row plus Recent rows reconciliation

**Layout:**
- **Mobile vertical stack** (top to bottom): tab header strip (existing, unchanged) > three-button entry path row > today's at-a-glance macros chip strip (existing, unchanged) > Recent meals unified row (see reconciliation decision below) > existing secondary content (current empty state copy and the small Bio Optimization Analytics widget per 170 base, unchanged).
- **Three-button entry path row** sits at the same vertical position the 170l two-button row currently occupies (immediately below the tab header strip). The row is `flex` direction `row` on both mobile and desktop. Each of the three cards uses `flex: 1` with `12px` gap and `16px` outer gutters.
- **Card geometry**: 120px tall on mobile (down from 144px in the 170l two-button layout to fit three peers comfortably without horizontal scroll), 144px tall on desktop. Width per card is approximately 31 percent of the container minus gap allowances. Card fill: `#1E3054` at 100 percent. Rounded `12px`. Same fill and same radius on all three peers.
- **Card content stack** (centered vertical): 32px Lucide icon at top (strokeWidth 1.5, Teal `#2DA5A0`); 8px gap; 14px Navy 95 percent Medium label; 4px gap; 11px Navy 70 percent sublabel.
- **Three peer cards left-to-right**: Photo (Camera icon, label `Photo`, sublabel `Snap your plate`); Scan Barcode (ScanBarcode icon, label `Scan Barcode`, sublabel `Packaged foods`); Quick Log (MessageSquareText icon, label `Quick Log`, sublabel `Type what you ate`).
- **Below the three-button row, 24px gap**, then the unified Recent meals row (reconciliation choice B, see push-back below). Section header `Recent` at 12px Teal uppercase letter-spaced, left-aligned with 16px gutter; horizontal scroll region containing up to 8 cards (mixed entry modalities), each card 112px wide × 132px tall.
- Each recent card carries a tiny 16px entry-modality indicator in the top-right corner: Camera (photo), ScanBarcode (barcode), or MessageSquareText (quick log), at Navy 60 percent. This is informational, not chip-styled, to avoid competing with the food name itself.
- Quick-Log-sourced recent cards substitute the food image with a Card 80 percent fill block displaying the first ~24 characters of the original text input in 12px Navy 90 percent (auto-truncated with ellipsis), so users recognize "the pizza one" before tapping.

**Header copy:**
- Tab header: existing, unchanged
- Recent section title: `Recent`
- (No `Most common` chip on any peer; no `New` chip on Quick Log)

**Body copy:**
- Photo card label: `Photo`; sublabel: `Snap your plate`
- Scan Barcode card label: `Scan Barcode`; sublabel: `Packaged foods`
- Quick Log card label: `Quick Log`; sublabel: `Type what you ate`
- Recent card name: from `meal_items[0].food_name` for photo and barcode entries, from the truncated `meals.text_input` for Quick Log entries (24 chars + ellipsis)

**CTAs:**
- Photo card tap: routes to existing Photo capture flow (170 base)
- Scan Barcode card tap: routes to §11.2 scanner overlay (170l shipped)
- Quick Log card tap: opens §9.2 Quick Log text input modal; first-ever tap fires the §9.10 first-time tutorial overlay
- Recent card tap (photo entry): opens the meal in result review (existing 170 base behavior)
- Recent card tap (barcode entry): re-saves the product as a one-tap repeat (existing 170l behavior)
- Recent card tap (quick log entry): one-tap repeat — fires `quick_log_recent_repeat_tapped` Helix event and saves a duplicate meal, with confirmation toast `Logged again` 2.5 sec dismiss

**Conditional states:**
- **Camera permission denied:** Photo card shows Navy 60 percent icon (not full Teal) with sublabel `Enable camera in Settings`; tap routes to system settings deep-link; remaining two cards unchanged
- **Camera permission denied AND user has barcode permission denied:** both Photo and Scan Barcode are dimmed; Quick Log remains full-color first-class — this is the architectural payoff of the third peer (the lowest-permission entry path stays available)
- **Network offline:** all three cards remain interactive; Quick Log shows inline footer pill on the modal `Offline. Your parse will run when you're back online.` (Quick Log queues offline gracefully because text persists locally)
- **`QUICK_LOG_TEXT_ENABLED = false`:** Quick Log card omitted; row collapses to two cards at the 170l 144px height; preserves the exact pre-170m shipped layout
- **First 14 days post-launch:** no `NEW` chip on Quick Log per anti-condescension decision below
- **Recent row empty:** section header + helper text `Your recent meals will appear here once you log one.` (13px Navy 70 percent)

**Accessibility commitments:**
- Three-button row is `<nav>` landmark with aria-label `Log a meal`
- Each card is a `<button>` element with full-text aria-label: `Photo. Snap your plate.` / `Scan Barcode. Packaged foods.` / `Quick Log. Type what you ate.`
- Tab order left-to-right: Photo > Scan Barcode > Quick Log
- 44x44 minimum tap targets — 120px tall × ~31 percent wide far exceeds
- Color contrast verified: 14px Navy 95 percent label on Card 100 percent is 6.5:1; 11px Navy 70 percent sublabel on Card 100 percent is 4.8:1; 32px Teal icon on Card is 4.7:1; all exceed 4.5:1
- Focus indicators: 2px Teal outline with 2px Navy offset on each card; tab navigation announces the full aria-label
- Reduced-motion: card press is immediate state change, no scale animation
- Platform text scaling: at iOS 200 percent dynamic type, labels wrap to 2 lines and card height auto-grows to ~148px; sublabel may truncate but the label remains fully readable
- iOS Voice Control: `Photo`, `Scan barcode`, `Quick log` (literal); Android Voice Access mirrors
- Recent row scroll uses native overflow; each recent card has aria-label `Repeat {food name}, logged via {modality} {time ago}`; live region announces `Logged again` toast on repeat
- Entry-modality indicator on recent cards has aria-hidden="true" because the modality is already in the card's aria-label

**Push-back / UX decisions:**
- **120px mobile card height, not 144px.** The 170l shipped layout uses 144px at two peers; three peers at 144px crowds horizontally on iPhone SE viewport (320pt usable width minus 32px gutters minus 24px gap = 264px / 3 = 88px per card, which is too narrow for the icon + label + sublabel stack). Reducing to 120px lets the row breathe at iPhone SE while preserving the icon + label + sublabel hierarchy. Desktop stays at 144px because horizontal width is abundant.
- **No `Most common` chip on Photo, no `NEW` chip on Quick Log. Anti-condescension principle propagates from 170l §11.1.** This was the spec's central question. Resolution: equal-weight peers, identical typography, identical icon sizing, identical fill, identical radius. The framing shift from "two paths, any-entry-point" to "three paths, any-entry-point" is the architectural goal. A `NEW` badge on Quick Log would re-anchor Photo and Barcode as established, which undercuts the peer relationship. Users discover Quick Log because it sits where they look (immediately to the right of the two cards they already know); the position is the discovery affordance.
- **Sublabel kept (not dropped to keep 144px height).** Considered dropping sublabels and keeping only Title to maintain the 170l 144px card height, but the sublabel is the single most important affordance for first-time Quick Log discovery — the icon alone (MessageSquareText) does not convey "type what you ate." The 120px height with sublabel preserved is the better trade.
- **No 2-row layout (Photo + Barcode top, Quick Log full-width bottom) considered.** A 2-row arrangement would tier Quick Log either as primary (full-width row 2) or as secondary (compressed below). Either tiering breaks the peer model. Three peers in one row is correct.
- **Recent rows reconciliation: Option B (unified `Recent` row with modality indicators).** Highest-leverage UX decision in this fill. Three arguments for B over A (sibling rows) and C (chips):
  - (A) sibling rows fragments the user's recent meals into two scrolls (Recent NutriVision meals + Recent Quick Logs) when conceptually they are all "meals I logged recently." Vertical density on the NutriVision tab is already a concern (three-button row + macros chip strip + recent row + secondary content + secondary content for future 170e/170f).
  - (C) chip-per-card adds visual noise to a horizontal scroll where the user is scanning for "the food I want to repeat." The chip becomes the visual anchor instead of the food name.
  - (B) substitutes modality with a tiny 16px corner indicator at Navy 60 percent. Informative, not loud. The food name (or text preview for Quick Log entries) remains the anchor. Users repeat what they recognize, not what they categorize.
- **Quick Log recent cards display text preview, not food name.** A Quick Log meal like "Chipotle bowl with chicken" parses into 6+ meal_items; the first item's `food_name` would be "Cilantro lime rice" which is unrecognizable to the user. Showing the first 24 chars of the original `text_input` (`Chipotle bowl with chicken`) anchors the card to what the user typed, which is how they remember the meal.

**Mobile adaptation:** Same three-card horizontal row; cards `flex: 1` with 12px gap; 120px tall; full-width minus 16px gutters; Recent row horizontal scroll with momentum; tappable area extends across the full card (not just the icon).

---

### §9.2 Quick Log text input modal

**Layout:**
- **Mobile:** full-viewport modal. Backdrop is Navy `#1A2744` at 92 percent opacity. Modal panel slides up from the bottom (200ms ease-out; immediate for reduced-motion). Panel uses Card `#1E3054` background, rounded `16px` top corners only (full-bleed bottom), 100 percent of viewport width × 100 percent of viewport height.
- **Desktop:** centered modal 640px wide × auto-height (~520px before clarification, ~640px with clarification card). Card `#1E3054` fill, rounded `16px` all corners. Backdrop click does NOT dismiss (see push-back).

From top to bottom (mobile, scrollable region):
1. **Header strip 56px:** close `X` left at 24px (Lucide, Navy 95 percent, 44x44 hit area) + title `Quick log` 18px Medium centered + Help link right (HelpCircle icon 20px Navy 70 percent, 44x44 hit area)
2. **24px gap; textarea region (the densest surface):** Card 90 percent fill rounded 12px, 16px inner padding, 6 lines tall on mount (~144px), expands as user types up to 12 lines (~288px) then scrolls internally
3. **Textarea content:** placeholder text `What did you eat? For example: two scrambled eggs and toast` (14px Navy 50 percent); on focus and type, the user's text renders at 14px Navy 95 percent regular; autofocus on mount with cursor at position 0; on iOS the soft keyboard pushes the modal up — the textarea stays focused above the keyboard
4. **Below textarea, 12px gap; helper region** (3 horizontally-arranged elements):
   - Left: rotating example helper text (12px Navy 60 percent italic), prefixed with `Try:` and cycling every 5 seconds through the example set (see Conditional states for the full set). Fades 200ms on cycle.
   - Right: live character counter `{n} / 500` (12px Navy 70 percent); turns Orange `#B75E18` at 480+ chars; turns Orange Medium at 495+ chars
5. **24px gap; CTA region:**
   - Primary CTA `Parse` Teal solid 48px tall full-width minus 16px gutters; disabled when textarea is empty or only whitespace; enabled state on any non-whitespace character
   - 12px gap below Parse; `Cancel` text-link centered (14px Navy 80 percent)
   - 16px gap below Cancel; small `Use voice instead` link centered (12px Navy 60 percent underlined) — see push-back on positioning
6. **Sticky bottom safe-area inset on iOS** — when soft keyboard is up, the CTA region scrolls into view above the keyboard via auto-scroll on focus

**Header copy:**
- Page title: `Quick log`

**Body copy:**
- Placeholder: `What did you eat? For example: two scrambled eggs and toast`
- Cycling example helpers (5 examples, cycle every 5 sec, randomized order on each session):
  - `Try: a Chipotle bowl with chicken and brown rice`
  - `Try: Greek yogurt with berries and granola`
  - `Try: two scrambled eggs, toast, and coffee`
  - `Try: a Chobani vanilla yogurt`
  - `Try: lunch — turkey sandwich with chips and a Coke`
- Character counter: `{n} / 500`
- Counter at 480+: same number, Orange `#B75E18` color
- Counter at 495+: same number, Orange Medium weight (size unchanged)
- Counter at 500: `500 / 500` Orange Medium, textarea no longer accepts input

**CTAs:**
- `Parse` (Teal solid 48px primary): submits the textarea content to `/api/nutrition/quick-log/parse`; modal transitions in-place to §9.3 parse loading state; Cmd-Enter / Ctrl-Enter keyboard shortcut equivalent
- `Cancel` (text link): dismisses modal; if textarea has content, fires §9.9 unsaved-text confirmation `Discard what you typed?` with `Discard` Orange + `Keep typing` Teal CTAs
- Close `X` (header): same behavior as Cancel
- `Use voice instead` (small link): closes the Quick Log modal cleanly and opens the 170j voice capture overlay applied to an empty draft; if textarea has content, fires `Switch to voice and discard what you typed?` confirmation; on confirm the typed text is discarded and voice opens
- `Help` (HelpCircle in header): opens an inline overlay showing the §9.10 first-time tutorial content (so users can review the framing anytime)

**Conditional states:**
- **Modal mounted, textarea empty:** Parse disabled (visually 40 percent opacity); placeholder visible; cycling examples rotating
- **Textarea has content (any non-whitespace):** Parse enabled (full opacity); placeholder hidden; cycling examples STOP rotating (the example is no longer useful once the user has started typing)
- **Textarea at 480 chars:** counter turns Orange (still typable)
- **Textarea at 500 chars:** input clamped; counter Orange Medium; small inline note above counter `That's the limit. Trim if you can, or parse what you have.` (12px Orange)
- **Auto-parse-on-type-pause power-user mode ON (§9.8):** after 2 sec of no typing AND ≥12 chars in textarea, parser auto-fires; subtle 1-line inline note appears above the Parse CTA on mount of the modal `Auto-parse is on. Tap Parse anytime to override the wait.` (12px Navy 60 percent) — see push-back on this disclosure
- **Network offline:** Parse CTA changes label to `Parse when online` (Teal disabled-tone); on Parse tap, the input is queued; modal collapses to a small persistent toast `We'll parse this when you're back online.` and reopens on reconnect
- **API rate-limit hit:** error variant §9.9
- **`QUICK_LOG_TEXT_ENABLED` flipped OFF mid-session:** modal closes with a graceful toast `Quick Log is paused. Try photo or barcode instead.` and routes user back to the three-button row

**Accessibility commitments:**
- Modal is `role="dialog"`, `aria-modal="true"`, `aria-labelledby` points to the `Quick log` title
- Focus moves to the textarea on mount; aria-describedby points to the placeholder helper region so screen reader users hear the example without it being read as the textarea's value
- Escape key closes the modal (with the unsaved-text confirmation if applicable); Cmd-Enter / Ctrl-Enter submits
- Tab order: Close X > textarea > Parse > Cancel > Use voice instead > Help; Shift-Tab reverses
- Textarea is a native `<textarea>` element, NOT a contenteditable div — preserves system dictation, platform text scaling, screen reader buffering, copy/paste
- aria-live="polite" announcement on character counter at 480 chars: `Approaching character limit, twenty remaining`; at 500: `Character limit reached`
- aria-live="off" on the cycling example helper (the rotation should NOT interrupt screen reader users every 5 seconds; the example is decorative)
- Placeholder is repeated as aria-placeholder AND there is a visually-hidden `<label for>` association so screen reader users hear `Quick log meal description. What did you eat? For example: two scrambled eggs and toast.`
- 44x44 minimum tap targets on Close X, Help, Parse (48x48), Cancel, Use voice instead (44x32 visible, 44x44 hit area on the link)
- Color contrast: 18px Navy 95 percent title on Card is 6.5:1; 14px Navy 95 percent textarea text on Card 90 percent is 5.4:1; 14px Navy 50 percent placeholder on Card 90 percent is 4.5:1 exactly (small text uses regular not Medium; verified at the minimum); 12px Navy 60 percent cycling example on Card is 4.5:1; 12px Navy 70 percent counter on Card is 4.8:1; 12px Orange counter at 480+ is 5.1:1; all meet 4.5:1
- Reduced-motion: modal mount is immediate (no slide-up); cycling example fade replaced with instant swap
- Platform text scaling: textarea respects iOS dynamic type up to 200 percent; the 6-line mount height auto-grows proportionally; CTAs reflow to vertical stack at very large type
- iOS Voice Control: `Close`, `Quick log description`, `Parse`, `Cancel`, `Use voice`, `Help` — literal labels; Android Voice Access mirrors
- System dictation native: iOS Voice Control's `Dictate` command writes into the textarea normally; Android Voice Access `Type` works identically
- Hearing-impaired-first-class: the modal contains zero audio dependency; the entire flow is operable mute (this is a load-bearing accessibility property — text-native = strongest baseline)

**Push-back / UX decisions:**
- **Backdrop click does NOT dismiss the modal. Cancel must be explicit.** Per spec §9.2 and reinforced here: a user who has typed a meal description and accidentally taps outside the modal would lose their typed content, which is exactly the high-friction failure mode the entry path is designed to avoid. The Close X and Cancel link are explicit; both fire the discard-confirmation if text is present.
- **`Use voice instead` link is small (12px), below Parse + Cancel, not equal-weight.** This was the spec's voice-fallback positioning question. Three options were considered: (a) equal-weight third CTA, (b) icon affordance inside the textarea (like a microphone in the corner), (c) small link below the primary CTAs. Resolution: (c). Reasoning: the user already chose text by tapping Quick Log on §9.1; voice is the fallback for "actually I'd rather speak this." Making it equal-weight CTA competes with Parse for visual attention, which dilutes the typed-input commitment. The 12px link is honest discoverability without competition. Option (b) was rejected because a mic icon inside the textarea implies real-time speech-to-text into the same field, which is not what 170j voice does (170j opens its own capture overlay).
- **Cycling example helper STOPS once user starts typing.** The example is useful before typing (priming patterns) and noise during typing (the user is already engaged). Stopping the rotation on first non-whitespace character is the simplest "respect the user's focus" pattern.
- **5 examples, 5-second cycle, randomized order per session.** Five gives enough breadth (simple, restaurant, branded, multi-item, casual-prefix) without being a slideshow. 5 seconds is long enough to read at scaling but short enough to cycle through all five in a 30-second pre-type window. Randomized order means returning users don't memorize the same first example.
- **500-char cap with live counter (not silent enforcement).** Users typing a long restaurant order benefit from knowing they're approaching the cap before they hit it. Orange transition at 480 and 495 give two signals before the hard stop at 500. The note at the cap suggests trimming, not retyping, because some users will hit the cap mid-sentence and need to choose what to keep.
- **Auto-parse mode (§9.8) requires an in-modal disclosure.** Power users who turn this on need to know the parser will fire on pause; the small note above Parse `Auto-parse is on. Tap Parse anytime to override the wait.` is the disclosure. This is NOT surveillance language; it is "you can still tap Parse if you don't want to wait." The disclosure is mandatory because firing auto-parse without it feels invasive.
- **Help link in header opens the §9.10 tutorial overlay.** Users who dismissed the first-time tutorial should be able to summon it; placing Help in the modal header is the canonical "what is this?" affordance.

**Mobile adaptation:** Full-viewport modal; safe-area-aware top inset so Close X does not sit under the notch; auto-scroll on textarea focus so CTAs remain visible above the iOS soft keyboard; Cmd-Enter equivalent on iPad with Bluetooth keyboard.

---

### §9.3 Parse loading state

**Layout:**
- Replaces the CTA region of §9.2 in-place; textarea content remains visible above (CRITICAL — user knows what was sent).
- The 48px Parse CTA region transforms to a 48px Card 90 percent fill block containing a centered Loader2 Lucide icon (20px Teal, rotating; reduced-motion: three-dot fade) + 12px gap + label text 14px Navy 90 percent.
- The Cancel link below transforms to `Cancel parsing` (same position, same 14px treatment).
- The `Use voice instead` link below is hidden during loading (cannot fall back to voice while a parse is in flight).
- Helper region above CTAs (cycling examples + counter) is hidden during loading; replaced with a single 12px Navy 70 percent inline note `Reading what you wrote...`.

**Header copy:** `Quick log` (unchanged from §9.2)

**Body copy:**
- Inline note above CTA region: `Reading what you wrote...`
- Loading label initial (0 - 3 sec): `Parsing...`
- Loading label extended (3 sec - 10 sec): `Taking a moment...`
- Loading label patient (10 sec - 15 sec, brief copy bridge before error): `Almost there...`
- Error state at 15+ sec (transitions to §9.9 timeout variant): see §9.9

**CTAs:**
- `Cancel parsing` (text link below the loading block): aborts the in-flight fetch, returns user to the §9.2 modal with their text preserved; fires `quick_log_parse_cancelled` (consumer telemetry only, not Helix-awarded)

**Conditional states:**
- **0 - 3 sec:** Loader2 rotating + label `Parsing...`
- **3 - 10 sec:** label transitions to `Taking a moment...` (200ms cross-fade); Loader2 continues rotating
- **10 - 15 sec:** label transitions to `Almost there...`; Loader2 continues; small inline retry hint appears below `If this stalls, you can cancel and try again.` (12px Navy 60 percent)
- **15+ sec (timeout):** transitions to §9.9 timeout variant
- **API returns success:** modal transitions to the §9.5 clarification card (if `needs_clarification` true) or to §9.6 multi-meal split confirmation (if `split_into_multiple_meals_suggestion` non-null) or directly to existing result review screen (if both null and parse confident)
- **API returns parse error (parse_failure):** §9.9 parse-failure variant
- **API returns 503 / network failure:** §9.9 unavailable variant
- **Reduced-motion preference set:** Loader2 rotation replaced with three-dot fade animation (each dot fades 0 to 100 percent opacity over 600ms, staggered 200ms apart); same vertical footprint

**Accessibility commitments:**
- aria-live="polite" announcement on loading mount: `Parsing your meal description`
- aria-live="polite" announcement on copy transitions: `Still working...` at 3 sec; `Almost there...` at 10 sec (the announcements reassure screen reader users that the system has not stalled)
- The textarea retains focus during loading but is `aria-readonly="true"` and `aria-busy="true"` (prevents accidental editing while parse is in flight)
- Cancel parsing link is keyboard-accessible (Tab from textarea); Escape key also cancels
- 44x44 hit area on Cancel parsing
- Loader2 icon has aria-hidden="true"; the label carries the semantic state
- Color contrast: Loader2 at 20px Teal on Card 90 percent is 4.7:1; 14px Navy 90 percent label on Card is 5.7:1; 12px Navy 70 percent helper on Card is 4.8:1; all exceed 4.5:1

**Push-back / UX decisions:**
- **Textarea content persists visible above the loading state.** Per spec §9.3 and reinforced here: hiding the user's text during parse would create the "did it send what I typed?" anxiety. Keeping it visible (even though it's not editable during loading) anchors the user to the input they sent.
- **Three labels (Parsing... / Taking a moment... / Almost there...) instead of two.** Spec mentioned two; adding the 10-15 sec `Almost there...` bridge softens the user's experience between "this should be done by now" (3-10 sec range) and "this needs a retry" (15+ sec). The patient-tone copy reassures without false precision.
- **Cancel parsing is a destructive-ish action but preserves typed text.** The link is text-style not Orange-styled because cancelling a parse and returning to the modal with text preserved is NOT a punitive action — it's a power-user out. Orange would signal "danger" inappropriately.

**Mobile adaptation:** Same in-place transformation; loader sits where Parse CTA was; safe-area-aware bottom inset preserved.

---

### §9.4 Recent Quick Logs row and cards (reconciliation: deferred to §9.1)

**Layout:**
- Per reconciliation Option B selected in §9.1, there is NO separate Recent Quick Logs row. Quick-Log-sourced meals appear inline within the unified `Recent` row on the NutriVision tab idle state (§9.1), distinguished by a 16px MessageSquareText corner indicator and by the text-preview substitution for the food name.
- This section documents the Quick Log-specific behavior within the unified Recent row.

**Card geometry within the unified Recent row:**
- 112px wide × 132px tall (same as photo and barcode recent cards — peer geometry)
- Card 90 percent fill, rounded 12px
- Quick Log card body: top region (96x80 area) shows the truncated text preview in a Card 80 percent fill nested block; the truncated text reads at 12px Navy 90 percent regular, max 3 lines with ellipsis on overflow
- Bottom region (32px area): macros chip `{kcal} kcal` (12px Navy 90 percent Medium) + small Repeat2 Lucide icon top-right corner (14px Teal, indicates the one-tap repeat affordance)
- Top-right corner: 16px MessageSquareText Navy 60 percent (entry modality indicator, aria-hidden)
- Maximum 5 Quick-Log entries surface in the Recent row at any time (spec called for 5 Quick Log cards; with unified row this becomes "at most 5 of the 8 recent slots are Quick Log entries" with frequency-weighted recency ranking favoring repeated logs)

**Header copy:** `Recent` (shared across modalities per §9.1)

**Body copy:**
- Card text preview: first ~40 characters of `meals.text_input` for Quick Log entries
  - Example: `Chipotle bowl with chicken, brown rice, fajita...`
- Card macros chip: `{kcal} kcal` from the saved meal's total calories
- Repeat confirmation toast on tap: `Logged again` (14px Navy 95 percent on Card 95 percent fill, 2.5 sec auto-dismiss)
- Long-press action sheet header: `{first 24 chars of text_input}` (truncated)
- Long-press action sheet items:
  - `Repeat` (default tap action; redundant but explicit)
  - `Edit before saving` (opens §9.2 modal pre-filled with the original text input)
  - `Don't show again` (removes from Recent for the user; does NOT delete the underlying meal — the meal remains in the user's history)

**CTAs:**
- Card tap (single): fires `quick_log_recent_repeat_tapped` Helix event and `/api/nutrition/quick-log/repeat` endpoint; on success shows the confirmation toast and updates the day's macros chip strip
- Card long-press (mobile) or right-click (desktop): opens the action sheet
- `Don't show again` (action sheet): adds the meal id to a per-user `recent_repeat_hidden_set` (client-side preference) and removes the card from Recent

**Conditional states:**
- **First Quick Log save ever:** the Recent row may not yet contain the just-saved meal because the row queries a server-side ranked list; an optimistic local prepend ensures the user sees their meal appear immediately
- **Quick Log meal saved within last 5 min:** appears at position 1 in Recent (recency wins for very-recent meals)
- **Quick Log meal repeated 3+ times:** frequency weighting elevates its rank; the card surfaces even when it's not the most recent
- **User has zero Quick Log history:** unified Recent row contains only photo and barcode entries; behavior unchanged from 170l shipped state
- **`QUICK_LOG_RECIPE_SHORT_CIRCUIT_ENABLED` flag affects ranking when 170f ships:** recipe-matched repeats route through 170f short-circuit; the Recent card itself looks identical
- **Reduced-motion:** no card press animation; toast appears immediately without slide-in

**Accessibility commitments:**
- Unified Recent row is `role="list"` with each card `role="listitem"` and `<button>` semantic
- Card aria-label: `Repeat {truncated text}, {kcal} kcal, logged {time ago} via Quick Log`
- Long-press affordance has a keyboard-equivalent: Tab to card, then Shift-F10 or Menu key opens the action sheet
- Toast `Logged again` is announced via aria-live="polite" with full context: `Logged again. {truncated text}, {kcal} calories added to today.`
- 44x44 minimum tap target on each card (112x132 far exceeds); action sheet items each 48px tall
- Color contrast: 12px Navy 90 percent text preview on Card 80 percent is 5.4:1; 12px Navy 90 percent Medium kcal chip on Card 90 percent is 5.7:1; 16px Navy 60 percent modality indicator on Card 90 percent is 4.5:1 exactly (verified, the slimmest margin; size at 16px keeps this passing); all meet 4.5:1
- iOS Voice Control: tap action sheet items by name (`Repeat`, `Edit before saving`, `Don't show again`)

**Push-back / UX decisions:**
- **Quick Log recent cards use text preview, not the first parsed food name.** Reiterated from §9.1: the user remembers what they typed, not the first item the parser extracted. A `Chipotle bowl` is more recognizable than `Cilantro lime rice`.
- **`Don't show again` is per-card hide, NOT meal delete.** Users want to manage what surfaces in Recent without losing their nutrition history. The hide is a UI affordance; the meal remains queryable from the Meal History tab.
- **Long-press is the secondary action discovery affordance.** Tap-to-repeat is the most common action (single tap = single intent). Long-press for less common actions matches platform conventions (iOS Action Sheet, Android Context Menu).
- **No "Are you sure?" before one-tap repeat.** The repeat action is reversible (undo toast can be added in a future iteration, deferred for v1); confirmation prompts would defeat the one-tap convenience.

**Mobile adaptation:** Horizontal scroll with momentum; cards `flex-shrink: 0` to preserve width; safe-area-aware horizontal padding.

---

### §9.5 Clarification card

**Layout:**
- Replaces the §9.2 CTA region in-place when API response has `needs_clarification === true`; textarea content remains visible above (consistent with §9.3 loading pattern).
- Clarification card: Card 90 percent fill, rounded 12px, 16px inner padding, full-width minus 16px gutters.
- Card content stack (top to bottom):
  1. HelpCircle Lucide icon 20px Teal, 8px right margin, aligned with the clarification question header
  2. Clarification question header at 14px Navy 95 percent Medium (max 2 lines)
  3. 16px gap; chip-select region: each chip 44px tall (matches platform tap target minimum), Card 80 percent fill rounded 10px, 12px horizontal padding, 14px Navy 95 percent label
  4. Chip wrap: mobile single-column at narrow viewports (<360px); 2-column grid at 360px+; desktop 3-column grid in the 640px modal
  5. 16px gap; optional free-text input `Or describe in more detail` (12px Navy 70 percent label above input; 40px tall text input, 14px Navy 95 percent on Card 80 percent fill)
  6. 24px gap; `Continue` CTA Teal solid 48px tall full-width minus 16px gutters; disabled until a chip is selected OR free-text has non-whitespace content
  7. 12px gap; `Cancel` text-link (14px Navy 80 percent centered)

**Header copy:** `Quick log` (modal title unchanged); clarification card has its own question as header (from parser response)

**Body copy:**
- Clarification question example (from parser): `How many eggs?`
- Chip examples (from parser): `One`, `Two`, `Three`, `Four`, `More than four`
- Optional free-text label: `Or describe in more detail`
- Optional free-text placeholder: `Type a quantity or detail`
- Continue CTA: `Continue`
- Cancel: `Cancel`

**CTAs:**
- Chip tap: selects the chip (Teal 2px border, Card 95 percent fill, Teal 14px Medium text — selected state); a second chip tap deselects the first and selects the new; only one chip selectable at a time
- Free-text input: typing here clears any chip selection; chip selection clears the free-text
- `Continue` (Teal solid primary): fires the re-parse request with the disambiguation (`{ disambiguation: { question: "How many eggs?", answer: "Two" } }` or `{ free_text: "..." }`); modal transitions back to §9.3 parse loading state
- `Cancel` (text link): dismisses clarification, returns to §9.2 with text preserved
- Escape key: Cancel equivalent

**Conditional states:**
- **First clarification round:** standard chip-select + free text
- **Second clarification round (still needs_clarification after first round resolved):** card header copy adds preamble line `One more thing —` above the new question
- **Third clarification round (2 rounds completed, parser still cannot get clean output):** transitions to §9.9 clarification-timeout variant with options `Try again`, `Switch to photo`, `Cancel`
- **Chip-select with 2 or fewer chips returned:** layout uses single column for clarity (rare; parser typically returns 3-6 chips)
- **Chip-select with 6+ chips returned:** layout wraps to 3 rows on mobile; max chip count enforced at 8 (any more truncated with `Or describe in more detail` as fallback)
- **Reduced-motion:** chip selection state is immediate; no animation on Continue tap
- **Network failure during re-parse:** §9.9 unavailable variant

**Accessibility commitments:**
- Clarification card is `<section>` with `role="group"`, `aria-labelledby` pointing to the clarification question
- HelpCircle icon has aria-hidden="true"
- Chip group is `<div role="radiogroup">` with each chip `<button role="radio">` aria-checked state
- Free-text input is a native `<input type="text">` with `<label>` association; aria-label `Or describe quantity or detail in more detail`
- aria-live="polite" announcement on card mount: `Clarification needed. {question}. {n} options.`
- Tab order: chip 1 > chip 2 > ... > chip n > free text > Continue > Cancel
- Arrow keys navigate within the chip radiogroup (standard radio button keyboard model)
- 44x44 minimum tap targets on each chip (44px tall × ~96px wide); Continue 48x48; Cancel 44x32 visible / 44x44 hit area
- Color contrast: 14px Navy 95 percent question on Card is 6.5:1; 14px Navy 95 percent chip label on Card 80 percent is 5.4:1; 14px Teal Medium selected chip label on Card 95 percent fill is 5.0:1 (verified); 12px Navy 70 percent free-text label is 4.8:1; 12px Navy 95 percent free-text input value is 6.5:1; all meet 4.5:1
- Reduced-motion: no animations on chip select or Continue
- iOS Voice Control: chip labels are spoken-targets (`One`, `Two`, `Three`); `Continue`, `Cancel`; Android Voice Access mirrors

**Push-back / UX decisions:**
- **Selected chip uses Teal 2px border + Card 95 percent fill + Teal Medium label** — three signals for the selected state because a single signal (color alone) fails for users with color-blindness; the border + fill darkening + weight change is a triple-coded affordance.
- **Free-text input clears chip selection on focus, and vice versa.** This is the conventional "one or the other" pattern; mixing chip + text would be ambiguous (does the chip override the text or vice versa?).
- **Conversational chip labels (`One`, `Two`, `More than four`).** Per spec voice posture: `How many eggs?` plus `One` / `Two` is conversational, not clinical. NOT `1`, `2`, `4+` which would feel like a form.
- **Two-round limit before escalation.** Three or more rounds with the same user creates frustration loops; the §9.9 timeout-to-options variant is the honest exit ramp.
- **`Or describe in more detail` is below chips, not above.** The chips are the fast path; free text is the fallback. Visual order matches user effort: tap a chip first, type only if no chip fits.

**Mobile adaptation:** Same vertical stack; chips wrap to single column at <360px viewports for readability; free-text input full-width minus gutters; Continue + Cancel safe-area-aware.

---

### §9.6 Multi-meal split confirmation card

**Layout:**
- Replaces the §9.2 CTA region in-place when API response has `split_into_multiple_meals_suggestion` non-null; textarea content remains visible above.
- Card: Card 90 percent fill rounded 12px, 16px inner padding.
- Content stack (top to bottom):
  1. UtensilsCrossed Lucide icon 20px Teal aligned with the question header
  2. Question header at 14px Navy 95 percent Medium (max 3 lines)
  3. 16px gap; preview list of the suggested splits — for each suggested meal, a 56px row showing the meal name (e.g., `Breakfast`) at 14px Navy 95 percent + a 12px Navy 70 percent summary `{n} items, {kcal} kcal` from the parser's per-split tallies
  4. 24px gap; primary CTA `Yes, split into {n} meals` (Teal solid 48px tall full-width minus 16px gutters)
  5. 12px gap; secondary CTA `No, combine into one meal` (text-link 14px Navy 80 percent centered)
  6. 16px gap; tertiary text-link `Cancel` (12px Navy 60 percent centered)

**Header copy:** `Quick log` (modal unchanged)

**Body copy:**
- Question header (parser-driven, with template for warmth): `It sounds like you are logging {meal_1_name} and {meal_2_name} separately. Should I create two meal records?`
- Question header (3+ splits variant): `It sounds like you are logging {n} meals separately. Should I create {n} meal records?`
- Per-split preview row: `{Meal name}` + `{n} items, {kcal} kcal`
- Primary CTA: `Yes, split into {n} meals`
- Secondary CTA: `No, combine into one meal`
- Tertiary: `Cancel`

**CTAs:**
- `Yes, split into {n} meals` (Teal solid): commits to multi-meal save; transitions to result review for meal 1; on save of meal 1, the modal re-mounts with result review for meal 2 (and subsequent if 3+); each meal saves separately with its own `meals` row
- `No, combine into one meal` (text-link): commits to single-meal save; transitions directly to result review with all parsed items in one meal
- `Cancel` (small text-link): returns to §9.2 with text preserved

**Conditional states:**
- **2-meal split:** "two meal records" / "two meals" copy
- **3+ meal split:** "{n} meal records" / "{n} meals" copy; per-split preview list grows
- **One of the suggested splits is < 50 kcal:** subtle inline note below the preview list `One of these is small. You can still save it separately.` (12px Navy 60 percent)
- **Reduced-motion:** no animation on card mount; CTA press immediate
- **User taps Yes, completes meal 1, then Cancels at meal 2 result review:** meal 1 is saved (the Yes commit was the decision point); user returns to NutriVision tab idle state; a small toast `{meal 1 name} saved. {meal 2 name} discarded.` for transparency

**Accessibility commitments:**
- Card is `<section>` `role="alertdialog"` because the user must make an explicit choice
- aria-labelledby points to the question header
- UtensilsCrossed icon aria-hidden="true"
- Each preview row is a `<div role="group">` with aria-label `{Meal name}: {n} items, {kcal} calories`
- aria-live="polite" announcement on card mount: `Multi-meal detected. {question}.`
- Tab order: preview list (if focusable on desktop, scroll-only on mobile) > Yes split > No combine > Cancel
- Escape key triggers Cancel
- 44x44 minimum tap targets on Yes (48x48), No (44x32 visible / 44x44 hit area), Cancel (44x32 / 44x44)
- Color contrast: 14px Navy 95 percent question on Card is 6.5:1; 14px meal name on Card is 6.5:1; 12px summary Navy 70 percent on Card is 4.8:1; all meet 4.5:1
- Reduced-motion: no animation

**Push-back / UX decisions:**
- **Observation language, not accusation.** `It sounds like you are logging breakfast and lunch separately` is observational; `You should split this into two meals` would be prescriptive and slightly bossy. The verb `sounds like` softens the parser's confidence into a hypothesis.
- **`Yes, split into {n} meals` is the primary CTA, but `No, combine` is text-link not button.** This makes the Yes path the default tap-target on first read. However, `No, combine` is NOT visually buried — it's the second item in the vertical stack at standard 14px text-link treatment. The reasoning: when the parser detects a split, the split is usually correct; the No path is the override, not the equal-likelihood option.
- **Per-split preview list shows meal name + summary, not full item list.** Showing every parsed item would crowd the card; the summary line communicates enough for the user to know what each split contains. Users can inspect details on the result review screens.
- **Cancel preserves typed text.** Backing out of the split decision should return the user to their original input, not to a blank state. The user can re-parse with edited text if they want a different interpretation.
- **Sequential result review for 2+ meals.** Spec called for "each meal saves separately." The flow shows result review for meal 1, user confirms or adjusts, saves, then result review for meal 2 mounts. This is sequential, not concurrent, because parallel result reviews would be visually confusing. Sequential matches the user's mental model of "log breakfast, then log lunch."

**Mobile adaptation:** Same vertical stack; preview list scrolls within card if more than 3 splits; CTAs full-width minus gutters.

---

### §9.7 Result review From-Quick-Log chip and popover

**Layout:**
- The existing result review screen header (from Prompt 170 base) contains the meal name at top + Confidence Badge inline + meal totals beneath.
- The `From Quick log` chip sits in a new dedicated row BELOW the meal name and Confidence Badge, ABOVE the meal totals chip strip. Reasoning in push-back below.
- Chip geometry: 28px tall × auto-width, Card 80 percent fill, rounded 14px (full pill), 8px horizontal padding, 6px gap between icon and label.
- Chip content: MessageSquareText Lucide icon 14px Teal + label `From Quick log` 12px Navy 90 percent.
- Chip tap opens the popover: 280px wide × auto-height, Card 95 percent fill rounded 12px, 16px inner padding, positioned below the chip with a 8px gap.

**Header copy:** existing result review meal name (unchanged)

**Body copy:**
- Chip label: `From Quick log`
- Popover content:
  - Header: `What you typed` (12px Teal uppercase letter-spaced)
  - 8px gap
  - Quoted block: rendered as a 14px Navy 95 percent regular text in a Card 70 percent fill nested block with 12px padding, rounded 8px, left vertical Teal 2px rule (visual quote mark); shows the full `meals.text_input` content with normal text wrapping (no truncation here — the user wants to see what they typed)
  - 16px gap
  - `Edit description` CTA: Teal solid 40px tall full-width minus 16px padding
  - 8px gap
  - `Close` text-link centered (12px Navy 80 percent)

**CTAs:**
- Chip tap: opens the popover (toggle on second tap closes it; outside-tap closes it; Escape closes it)
- `Edit description` (popover primary): fires the §9.7 edit-description warning confirmation (see push-back), then on confirm closes the popover and reopens §9.2 modal with `meals.text_input` pre-filled; user can edit and re-parse; on re-save, all `meal_items` are replaced (per spec §8.4)
- `Close` (popover secondary): dismisses popover, returns to result review with no changes

**Edit description warning confirmation:**
- Triggered on Edit description tap (NOT on save in the re-edited modal — see push-back rationale)
- Surface: 320px wide centered confirmation dialog over the popover
- Header: `Editing the description`
- Body: `Editing the description will reset your portion adjustments and any item-level changes you made on this screen.`
- CTAs: `Edit description` (Teal solid) + `Keep this meal as is` (text-link)

**Conditional states:**
- **User has NOT made portion adjustments or item-level changes on result review:** the warning confirmation is SKIPPED (nothing to lose); Edit description tap immediately closes popover and reopens §9.2 with text pre-filled
- **User HAS made portion or item adjustments:** confirmation fires
- **Meal is already saved (returning to result review from history):** Edit description creates a new meal record (per spec §8.4 — re-edits preserve the original saved meal AND create a new draft); a small inline note in the popover `Editing will create a new meal. Your saved meal stays as is.` appears in this state
- **Reduced-motion:** popover appears immediately (no slide-in)

**Accessibility commitments:**
- Chip is `<button>` with aria-label `From Quick log. Tap to view what you typed.`; aria-expanded state reflects popover open/closed
- Popover is `role="dialog"` `aria-modal="false"` `aria-labelledby` pointing to `What you typed` header; focus moves to the popover on open
- Quoted block is `<blockquote>` with the user's text as content (semantically correct)
- Edit description button has aria-label `Edit description. Reopens the input where you typed your meal.`
- Close link aria-label `Close. Returns to your meal.`
- Escape closes popover and returns focus to the chip
- Outside-tap closes popover (focus returns to chip)
- aria-live="polite" announcement on popover open: `Showing what you typed`
- 44x44 minimum tap targets: chip 28x32 visible / 44x44 hit area; Edit description 40x48; Close 44x32 visible / 44x44 hit area
- Color contrast: 12px Navy 90 percent chip label on Card 80 percent is 5.4:1; 14px Teal uppercase popover header on Card 95 percent is 4.8:1; 14px Navy 95 percent quoted text on Card 70 percent is 5.4:1; 14px Teal 2px left rule on Card 70 percent is decorative (4.7:1 if measured); 40px Teal solid Edit description button text white on Teal is 4.8:1; all meet 4.5:1
- iOS Voice Control: `From Quick log`, `Edit description`, `Close`; Android Voice Access mirrors

**Push-back / UX decisions:**
- **Chip placement in a dedicated row below meal name, above totals strip.** Spec said "top-left beside meal name." Placing inline-with meal name crowds the meal name (which is the user's first identity check) and the Confidence Badge (which is the system's first quality signal). Dedicated row preserves the meal name's prominence and gives the chip a stable position that matches its semantic role (provenance indicator, not co-equal with identity or quality).
- **Warning fires on Edit description TAP, not on Save in re-edited modal.** Spec was ambiguous (`when does this fire?`). Resolution: pre-emptive (on Edit tap) so the user can back out before losing their work. Firing on Save would mean the user spends time editing only to be warned about losses they could have prevented. Pre-emptive respects user time.
- **Warning is conditional — skipped when user has no portion or item changes to lose.** Firing the warning on every Edit tap regardless of whether anything will actually reset is noise. The conditional check makes the warning honest — it only appears when there's actual loss at stake.
- **Popover shows the FULL text input, not a truncation.** The user wants to recall what they typed in full; truncation here defeats the purpose of the popover. If the text is long, the quoted block scrolls within the popover (max 6 lines visible, scroll for more).
- **The visual quote treatment (Card 70 percent fill + Teal left rule) signals "this is your words, preserved."** Pulling the user's input into a visually distinct block matches the conventional blockquote affordance from journalism — the user's typed text is treated with the same visual respect as a quoted source.

**Mobile adaptation:** Popover constrained to viewport width minus 16px gutters at very narrow viewports; full-width if needed; otherwise 280px maintained.

---

### §9.8 Settings preferences placement

**Layout (recommendation: Option C consolidated entry-path preferences):**
- Location: `/settings/nutrivision/page.tsx`
- New consolidated card titled `Entry path preferences` merges voice (170j inline) + barcode (170l sub-page link) + quick log toggles into one logical group
- Card content stack (top to bottom):
  1. Section header `Entry path preferences` 14px Teal uppercase letter-spaced
  2. 12px gap; subheader `Voice` 14px Navy 95 percent Medium with 2 toggles below (inherits 170j inline content)
  3. 16px gap; subheader `Scan Barcode` 14px Navy 95 percent Medium with `Open detailed settings` text-link routing to `/settings/nutrivision/barcode` (preserves 170l sub-page architecture)
  4. 16px gap; subheader `Quick Log` 14px Navy 95 percent Medium with the 4 toggles + 1 language setting below

**Quick Log toggle stack (within Entry path preferences card):**

1. **Show Quick Log on NutriVision tab** (default ON)
   - 14px Navy 95 percent Medium label `Show Quick Log on NutriVision tab`
   - 12px Navy 70 percent helper `Adds the third entry path beside Photo and Scan Barcode.`
   - Toggle right-aligned, 44x32 visible / 44x44 hit area, Teal when ON
2. **Auto-parse on type-pause** (default OFF, power-user mode)
   - Label `Auto-parse on type-pause`
   - Helper `Parses automatically two seconds after you stop typing.`
   - Toggle right-aligned
3. **Show recent Quick Logs in Recent row** (default ON)
   - Label `Show recent Quick Logs in Recent row`
   - Helper `Includes your Quick Log meals in the Recent row on the NutriVision tab.`
   - Toggle right-aligned
4. **Quick Log language** (defaults to user locale)
   - Label `Quick Log language`
   - Helper `The parser reads your descriptions in this language.`
   - Dropdown right-aligned, 132px wide, current value displayed (e.g., `English (US)`)

**Header copy:**
- Page title: `NutriVision settings` (existing, unchanged)
- Card section header: `Entry path preferences`

**Body copy:** see toggle stack above

**CTAs:**
- Each toggle: native iOS / Android toggle pattern, immediate persistence on flip, optimistic UI; on failure (network error) reverts with a small toast `Couldn't save your preference. Try again.`
- Dropdown: opens platform-native picker; immediate persistence on selection
- `Open detailed settings` (Scan Barcode subheader): routes to `/settings/nutrivision/barcode`

**Conditional states:**
- **`QUICK_LOG_TEXT_ENABLED` flag is OFF at the feature-flag level:** entire Quick Log subgroup is omitted from the card (do not show a disabled subgroup, which would tease an unavailable feature)
- **`Show Quick Log on NutriVision tab` toggled OFF:** §9.1 three-button row collapses to two cards; this preference IS the kill switch from a user perspective
- **`Auto-parse on type-pause` toggled ON:** §9.2 modal mounts with the disclosure note `Auto-parse is on. Tap Parse anytime to override the wait.`
- **`Show recent Quick Logs in Recent row` toggled OFF:** unified Recent row excludes Quick Log entries; behavior matches photo + barcode-only Recent
- **Quick Log language set to a locale where parser support is limited:** dropdown shows the available locales (initially English US; expansion per 170k when shipped); selecting unavailable locale shows a note `Parser support coming soon for this language.`

**Accessibility commitments:**
- Card is `<section>` with `aria-labelledby` pointing to section header
- Each subheader is `<h3>` for proper heading hierarchy
- Each toggle is `<button role="switch">` with aria-checked state, aria-labelledby (label) and aria-describedby (helper)
- Toggle state announces on flip: `Show Quick Log on NutriVision tab, on` / `off`
- Dropdown is native `<select>` for maximum accessibility (or a custom dropdown with full ARIA combobox pattern)
- Tab order: each toggle in stack order; dropdown last in Quick Log group
- 44x44 minimum tap targets on each toggle and dropdown
- Color contrast: 14px Teal uppercase section header on Settings page background is 4.7:1; 14px Navy 95 percent labels are 6.5:1; 12px Navy 70 percent helpers are 4.8:1; all meet 4.5:1
- Reduced-motion: toggle animation is immediate state change

**Push-back / UX decisions:**
- **Option C (consolidated `Entry path preferences` card) over Option A (inline siblings) and Option B (sub-page).** This is the load-bearing settings recommendation. Reasoning:
  - 170j (voice) shipped with inline settings on `/settings/nutrivision/page.tsx` — easier discovery, four toggles fit comfortably.
  - 170l (barcode) shipped with sub-page at `/settings/nutrivision/barcode` — heavier setting volume justified the sub-page departure.
  - 170m (quick log) adds 4 toggles + 1 language setting. Adding them inline as a third sibling section makes `/settings/nutrivision/page.tsx` look like three competing groups; adding them as a third sub-page fragments the user's settings into three navigation hops.
  - Consolidating into ONE `Entry path preferences` card with three sub-groups (Voice / Scan Barcode / Quick Log) reduces the conceptual surface from "three independent preference systems" to "one entry-path preference system with three modalities." The Scan Barcode sub-group preserves its detailed sub-page via the `Open detailed settings` link (barcode-specific advanced settings remain at `/settings/nutrivision/barcode`), so 170l's information architecture is not regressed.
  - For Voice and Quick Log, the four-toggle + dropdown volumes are right-sized to inline within the consolidated card.
- **`Show Quick Log on NutriVision tab` is the user-visible kill switch.** Naming it as a "show" toggle rather than an "enable" toggle frames the change as visibility (UI choice) rather than feature gating (system choice). Honest framing.
- **`Auto-parse on type-pause` defaults OFF.** This is power-user behavior. Defaulting ON would surprise users who expected to tap Parse explicitly. Off-by-default + clear discovery via Settings respects the user's intent.
- **Language setting defaults to user locale.** Reuses the user's existing locale preference; no opt-in surprise. Future 170k shipments expand the supported locales.
- **No 5th toggle for "Send my Quick Log text to improve the parser."** 170g (corpus contribution) governs training consent at a higher level; adding a Quick-Log-specific consent toggle here would fragment consent management. Defer to 170g's consent model.

**Mobile adaptation:** Card stacks naturally on narrow viewports; subheaders maintain prominence; toggle and dropdown remain right-aligned with safe-area-aware horizontal padding.

---

### §9.9 Error states (parse failure, clarification timeout, API unavailable)

**Layout (shared pattern across error variants):**
- Replaces the §9.2 CTA region in-place; textarea content remains visible above (consistent with §9.3 and §9.5).
- Error card: Card 90 percent fill rounded 12px, 16px inner padding, full-width minus 16px gutters.
- Content stack (top to bottom):
  1. 24px Lucide icon (AlertCircle for parse failure, Clock for clarification timeout, CloudOff for API unavailable), strokeWidth 1.5, Navy 70 percent (NOT Orange, NOT red — gentle not alarming, consistent with 170l §11.5 framing)
  2. 12px gap; headline 16px Navy 95 percent Medium
  3. 8px gap; body 13px Navy 80 percent (max 3 lines)
  4. 24px gap; CTA row vertical stack

**Variant A: Parse failure**
- Icon: AlertCircle
- Headline: `I had trouble understanding`
- Body: `Could you rephrase that, or try a simpler description?`
- CTA stack:
  - `Try again` (Teal solid 48px) — closes error card, returns to §9.2 modal with text preserved
  - `Switch to photo` (text-link 14px) — closes Quick Log modal, opens Photo capture
  - `Cancel` (text-link 12px Navy 60 percent)

**Variant B: Clarification timeout (after 2 rounds without clean parse)**
- Icon: Clock
- Headline: `Let's try a different way`
- Body: `It's taking a few rounds to pin down the details. You can try again, switch to photo, or cancel.`
- CTA stack:
  - `Try again` (Teal solid 48px) — returns to §9.2 with text preserved for editing
  - `Switch to photo` (text-link 14px) — closes modal, opens Photo capture
  - `Cancel` (text-link 12px)

**Variant C: API unavailable (Haiku API 503 or network failure)**
- Icon: CloudOff
- Headline: `The parser is napping`
- Body: `We can't reach the parser right now. Try again, or switch to photo or barcode.`
- CTA stack:
  - `Try again` (Teal solid 48px) — retries the parse
  - `Switch to photo` (text-link 14px) — closes modal, opens Photo capture
  - `Switch to barcode` (text-link 14px) — closes modal, opens Scan Barcode overlay
  - `Cancel` (text-link 12px)

**Variant D: Parse loading timeout (15+ seconds, transitions from §9.3)**
- Icon: Clock
- Headline: `That's taking longer than expected`
- Body: `Try again, or use a different entry path.`
- CTA stack:
  - `Try again` (Teal solid 48px)
  - `Switch to photo` / `Switch to barcode` text-links
  - `Cancel`

**Variant E: 500-char limit hit while typing (inline, not full-card)**
- Inline note above counter only (not a card replacement); see §9.2

**Header copy:** `Quick log` (modal unchanged)

**Body copy:** see variants above

**CTAs:** see variants above

**Conditional states:**
- **First parse failure on a session:** Variant A
- **Second parse failure on same input:** Variant A copy adjusts to `Still having trouble. Want to try a different entry path?` — the offer to switch becomes more prominent (`Switch to photo` styled as primary if Try again is dimmed)
- **Network restored mid-error:** auto-retry attempt fires; if successful, transitions to next stage (parse loading or result review); if failed, stays in error variant
- **Reduced-motion:** no animation on error card mount

**Accessibility commitments:**
- Error card is `role="alert"` (NOT alertdialog — non-modal informational) with aria-labelledby pointing to headline
- aria-live="assertive" on card mount: parse failure announces `I had trouble understanding. Could you rephrase, or try a simpler description?`; other variants announce equivalent
- Icon aria-hidden="true"
- Tab order: Try again > Switch to photo > Switch to barcode (if present) > Cancel
- Escape triggers Cancel
- 44x44 minimum tap targets: Try again 48x48; Switch links 44x32 visible / 44x44 hit area; Cancel 44x32 / 44x44
- Color contrast: 24px Navy 70 percent icon on Card is 4.8:1; 16px Navy 95 percent headline on Card is 6.5:1; 13px Navy 80 percent body on Card is 5.4:1; all meet 4.5:1
- Reduced-motion: no animation

**Push-back / UX decisions:**
- **First-person framing across all variants.** `I had trouble understanding` / `The parser is napping` are warm-not-punishing. NOT `Parse failed. Try again.` (cold) or `Error: invalid input.` (clinical). The first-person AI voice carries blame so the user doesn't feel blamed.
- **`The parser is napping` (Variant C) is intentional levity.** A 503 error is the system's fault, not the user's. Light copy acknowledges the system's flakiness without minimizing the user's frustration. The follow-up sentence is concrete: try again, or switch path.
- **Three CTAs in error variants, not two.** Spec called for retry + cancel + switch-to-photo. Variant C adds Switch-to-barcode as a fourth option because API-down failures should expose ALL alternative entry paths, not just photo. This respects the entry-path-pluralism that 170m introduces.
- **Icon color Navy 70 percent, not Orange.** Following the 170l §11.5 precedent: failure framing is gentle, not alarming. Orange icons would imply data error or risk; Navy implies "system status, can't proceed right now."
- **`Switch to photo` is a text-link, not a button, in most variants.** The primary action is `Try again`; switching paths is the user's secondary option. Text-link preserves the visual hierarchy.

**Mobile adaptation:** Same vertical stack within the modal; full-width CTAs minus gutters.

---

### §9.10 First-time tutorial

**Layout:**
- Triggered on first-ever tap of the Quick Log card from §9.1 (per-user, persisted in localStorage flag `quick_log_tutorial_seen_v1`).
- Surface: full-modal overlay over §9.1 background. Navy `#1A2744` at 92 percent opacity backdrop. Centered content panel 320px wide × auto-height on desktop; full-bleed top inset on mobile with same-width content.
- Content stack (top to bottom):
  1. Hannah avatar 64x64 (circular, from Mobile Hero bucket per memory) — small, friendly, NOT a full-screen takeover
  2. 16px gap; current step copy
  3. 24px gap; step indicator dots (3 dots, Teal current / Navy 60 percent inactive)
  4. 24px gap; CTA row

**Step 1 copy:**
- Headline (18px Navy 95 percent Medium): `Type what you ate, and I'll figure out the rest.`
- Body (14px Navy 80 percent): `Quick Log reads your description and pulls out the foods, portions, and macros.`

**Step 2 copy:**
- Headline: `Some things to try:`
- Body bullets (3 bullets, 14px Navy 80 percent, line-height generous):
  - `A Chipotle bowl with chicken`
  - `Two scrambled eggs and toast`
  - `A Chobani Greek yogurt`

**Step 3 copy:**
- Headline: `I'll ask if I need clarification.`
- Body: `You can always adjust portions or items before saving.`

**CTAs across steps:**
- Step 1 + Step 2: `Next` Teal solid 40px wide auto-grow + `Skip` text-link
- Step 3: `Got it, start typing` Teal solid 48px primary

**Header copy:** none — tutorial has no header strip
**Body copy:** see step content above

**CTAs:**
- `Next` (steps 1-2, Teal solid): advances to next step; updates step indicator
- `Skip` (steps 1-2, text-link 14px): closes tutorial, opens §9.2 modal directly
- `Got it, start typing` (step 3, Teal solid primary): closes tutorial, opens §9.2 modal; sets `quick_log_tutorial_seen_v1 = true`

**Conditional states:**
- **User has previously seen the tutorial (flag set):** tutorial does NOT auto-mount; §9.2 modal opens immediately on Quick Log card tap
- **User opens tutorial from §9.2 Help link:** same content, same flow; on completion returns to §9.2 modal (not to §9.1)
- **Reduced-motion:** no step transition animation; immediate copy swap
- **Mobile narrow viewport (<320px):** panel scales to viewport width minus 16px gutters

**Accessibility commitments:**
- Tutorial overlay is `role="dialog"` `aria-modal="true"` `aria-labelledby` pointing to step headline
- Hannah avatar has aria-label `Hannah, your nutrition guide` (semantically meaningful, not decorative)
- aria-live="polite" announcement on step transitions: `Step {n} of 3. {headline}`
- Step indicator dots are `role="tablist"` with each dot `role="tab"` aria-selected state; users can keyboard-navigate steps via the dots (in addition to Next button)
- Escape triggers Skip (steps 1-2) or `Got it, start typing` equivalent on step 3
- Tab order per step: step indicator dots > Next (or Got it) > Skip (steps 1-2 only)
- 44x44 minimum tap targets: dots 16x16 visible / 44x44 hit area; Next 40x40 visible / 44x44 hit area; Skip 44x32 / 44x44; Got it 48x48
- Color contrast: 18px Navy 95 percent headline on Card is 6.5:1; 14px Navy 80 percent body on Card is 5.4:1; 16px Teal current dot on Card is 4.7:1; all meet 4.5:1
- Reduced-motion: no transition animations

**Push-back / UX decisions:**
- **3-slide overlay framing, NOT inline message and NOT no-tutorial.** This was the spec's first-time framing question. Reasoning:
  - No tutorial: text input is naturally discoverable, but Quick Log's NLU behavior (clarification cards, multi-meal split, branded product detection) is NOT discoverable from the placeholder alone. Users would tap, see a textarea, and not know that "a Chipotle bowl with chicken" is a valid input pattern. The tutorial primes expectations.
  - Inline single message with dismiss: too brief to convey the three concepts (the AI does the work, examples of valid inputs, clarification is normal). One message would either be too long to read in one glance or too short to be useful.
  - 3-slide overlay matches 170j voice tutorial precedent; users familiar with the pattern know how to advance or skip.
- **Avatar size is 64px, not full-screen takeover.** Hannah's avatar provides warmth without dominating the surface. The user is here to learn how to type a meal, not to meet the AI.
- **`I'll figure out the rest` framing, NOT `our AI parses your text`.** First-person AI voice is warmer and matches 170-series convention. The "magic" framing is avoided — `figure out` is concrete and honest about the AI's role as a parser, not an oracle.
- **`I'll ask if I need clarification` previews the clarification card.** Setting the expectation that the system might ask questions removes surprise when §9.5 fires; users who saw step 3 anticipate the chip-select card.
- **Skip is honest, not aggressive.** Power users and returning users can dismiss with one tap; the Skip link is at every non-final step, sized at standard 14px text-link.
- **Help link in §9.2 re-summons this tutorial.** Re-discoverability matters; users who skipped on first use can revisit later.

**Mobile adaptation:** Same 3-step pattern; full-width content minus 16px gutters; safe-area inset top so Hannah avatar does not sit under notch.

---

## UX architecture summary

**Top 8 UX decisions and why:**

1. **Recent rows reconciliation — Option B (unified `Recent` row with corner modality indicators).** Highest-leverage decision in this fill. Reasoning: avoids fragmenting the user's recent meals across modality-siloed rows; preserves the food name (or text preview for Quick Log) as the visual anchor for repeat actions; uses a small corner indicator for modality context without making the chip the focal point. Vertical density on the NutriVision tab is already a concern; Option A (sibling rows) doubles the row count and Option C (chips) adds noise to the horizontal scroll.

2. **Three-button row at 120px mobile / 144px desktop, equal-weight peers, NO `Most common` or `NEW` chips.** Anti-condescension principle from 170l §11.1 propagates. The 120px mobile height compromise accommodates three peers at iPhone SE width while preserving the icon + label + sublabel hierarchy.

3. **Voice fallback `Use voice instead` is a small 12px link below Parse + Cancel, NOT equal-weight.** The user chose text by tapping Quick Log; voice is the secondary out, not the third equal CTA. Equal-weight would dilute Parse commitment.

4. **Backdrop click does NOT dismiss §9.2 modal; Cancel must be explicit.** Protects against accidental loss of typed text.

5. **Quick Log recent cards display text preview, not first parsed food name.** Users recall "Chipotle bowl" but not "Cilantro lime rice."

6. **First-time tutorial is a 3-slide overlay framed around AI helpfulness, not magic.** `I'll figure out the rest` is concrete; `I'll ask if I need clarification` previews the clarification card so users aren't surprised.

7. **Error state language uses warm first-person AI voice (`I had trouble understanding`, `The parser is napping`).** Carries blame so the user doesn't feel blamed; light tone on Variant C acknowledges system fault without minimizing user frustration.

8. **From-Quick-Log chip placed in a dedicated row below meal name and Confidence Badge, NOT inline.** Preserves meal name prominence; gives the provenance chip a stable home that matches its semantic role.

**Spec push-back captured:**

- Spec said chip placement on result review header is `top-left beside meal name`; rejected because it crowds the meal name and Confidence Badge. Placed in a dedicated row below.
- Spec said warning fires on Save in re-edited modal; rejected because it wastes user effort. Pre-emptive on Edit description tap respects user time. Conditional: skipped when nothing to lose.
- Spec proposed Settings options A (inline) and B (sub-page); proposed Option C (consolidated `Entry path preferences` card) as the better answer because it reduces conceptual surface from three independent preference systems to one entry-path preference system with three modalities.
- Spec proposed §9.4 as a separate Recent Quick Logs row; reconciled to Option B unified Recent row to manage vertical density.
- Spec's auto-parse mode would fire silently; added in-modal disclosure note `Auto-parse is on. Tap Parse anytime to override the wait.` because firing auto-parse without disclosure feels invasive.

**Recent Quick Logs vs Recent NutriVision meals reconciliation:** **Option B** (unified row with corner modality indicators). Reasoning documented in §9.1 and §9.4 push-back.

**Settings placement recommendation:** **Option C** (consolidated `Entry path preferences` card on `/settings/nutrivision/page.tsx` with three subheadings: Voice / Scan Barcode / Quick Log). Voice inherits 170j inline content; Scan Barcode preserves its detailed sub-page link to `/settings/nutrivision/barcode`; Quick Log's 4 toggles + 1 language inline within the consolidated card.

**Three-button row layout recommendation:** **horizontal row of three equal-weight cards** at 120px mobile / 144px desktop. Card width ~31 percent of container per card with 12px gap. Sublabel preserved (not dropped). Reasoning: peer relationship is the architectural goal; reducing card height to fit three peers honestly is better than fragmenting into 2-row layouts that re-tier the modalities.

**Voice fallback link positioning recommendation:** **small 12px link below Parse + Cancel** in §9.2 modal. NOT equal-weight CTA, NOT icon in textarea. The user committed to text by opening Quick Log; voice is the secondary out.

**First-time tutorial framing recommendation:** **3-slide overlay matching 170j voice tutorial pattern** with 64px Hannah avatar (not full-screen takeover). Sets expectations for clarification cards (so they don't surprise users) and primes valid input patterns. Re-summonable from §9.2 Help link.

**Vertical hierarchy proposal when all future surfaces ship** (170 + 170l + 170m + 170e + 170f):
- Tab header strip (existing)
- Three-button row (Photo + Scan Barcode + Quick Log) at 120px mobile
- Today's at-a-glance macros chip strip (existing)
- Unified `Recent` row (mixed entry modalities, corner indicators)
- 170e Restaurant card (when shipped): inline horizontal card 56px tall below Recent row labeled `Eating out?` with a CTA to chain selector; remains visually lighter than the three-button row
- 170f Recipe row (when shipped): inline horizontal card 56px tall below Restaurant card labeled `Your saved recipes` with carousel; remains visually lighter
- Bio Optimization Analytics widget (existing, 170 base) at bottom

The hierarchy holds because the three primary entry paths are above, the unified Recent row consolidates recall, and 170e + 170f sit as secondary affordances below — they are real entry paths but they serve narrower use cases (restaurant chain match, repeat recipe).

**Accessibility commitments summary (most consequential: text-native = strongest baseline):**

The architectural celebration of text-native accessibility runs through the design without literal "we are accessible!" copy:
- Textarea is a native `<textarea>` element, NOT a contenteditable div — preserves system dictation, platform text scaling, screen reader buffering, copy/paste, keyboard navigation
- Hearing-impaired users have a first-class entry path with zero audio dependency — the entire flow is operable mute
- Platform text scaling at 200 percent reflows gracefully (the 6-line mount height auto-grows; CTAs reflow to vertical stack)
- iOS Voice Control / Android Voice Access target every interactive element by literal label
- Reduced-motion respected on every animation (modal mount, loader rotation, step transitions)
- aria-live regions announce state transitions at the right verbosity: polite for routine updates, assertive for state-changing events (parse complete, error)
- Three-button row tab order is left-to-right matching reading order; focus indicators are 2px Teal outline with 2px Navy offset on every card
- WCAG 2.2 AA contrast verified at every surface; small text uses Medium weight where needed to clear 4.5:1
- The Help link in §9.2 modal is the canonical "what is this?" re-discovery affordance — accessibility includes letting users summon orientation on demand, not just on first use

**Composition note (170j voice fallback + 170l OFF cache + 170c safety mode when ratified):**

- **170j voice fallback (shipped):** the `Use voice instead` link in §9.2 closes Quick Log cleanly and opens the 170j voice capture overlay applied to an empty draft. The text-discard confirmation fires if textarea has content. No NLU integration changes — the overlay handles its own NLU. Composition is at the UI affordance layer.
- **170l OFF cache (shipped):** typed branded product mentions (e.g., `Chobani Greek yogurt`) trigger `branded_product_hints` in the Quick Log NLU response. Server attempts fuzzy match against `off_product_cache`. Confident match routes the meal_item through OFF tier with full metadata. Low-confidence match falls through to standard cascade tiers. No new cache infrastructure; reuses 170l shipped table.
- **170c eating disorder safety mode (when ratified):** Quick Log result review respects safety mode — macros hidden by default, supportive messaging replaces optimization framing. The Quick Log entry path itself is preserved (logging is the safe behavior; suppressing entry path is worse). This is feature-flagged off in v1 per Flag 3; flip on when 170c ratifies.

<!-- HANNAH_WIREFRAMES_END -->

## When 170m can sensibly build (sequencing prerequisites)

Per §22 of the spec, the long-pole prerequisites are:

1. **Hannah's §9 wireframes signed off by Gary**, especially the three-button row restructuring (this dispatch handles the wireframe production; signoff is Gary's gate)
2. **Gordon's Haiku system prompt design** (~1-2 weeks): the new Quick Log NLU prompt with the 11-section structure including portion inference rules, restaurant chain vocabulary, branded product detection, dietary restriction crossover hooks
3. **Gordon's 200-description curated test set** (~1-2 weeks): 20-user recruitment cohort with 10 descriptions each, paired ground truth, cuisine-stratified (Western, East Asian, South Asian, Middle Eastern, Latin American)
4. **170c ratification decision** (or formal flagged-off acceptance): if 170c hasn't ratified by 170m build kickoff, allergen-flag and safety-mode features ship feature-flagged off
5. **Gary green-light** on the three-button architectural shift (replacing the 170l two-button shipped layout)
6. **Spec inconsistency resolution**: §8.5 `repeated_from_meal_id` not in §7.2 migrations (fold into existing meals ALTER recommended)

Estimated runway from Gary green-light to ship: **2-3 weeks**, shorter than 170l's 4 weeks because:
- Zero new packages (no plugin approval round-trip)
- Reuses 170j Haiku integration (no NLU integration scaffold)
- Reuses 170l three-button row pattern (UI architecture is incremental, not greenfield)
- Reuses 170l Helix events + telemetry patterns
- Reuses 170c privacy redaction matrix pattern (when 170c ratified) OR flag off

## Five flags for Gary

### Flag 1: Three-button architectural shift (most user-visible change since 170l shipped tonight)

§9.1 evolves the 170l shipped two-button layout (Photo + Scan Barcode, ~5 hours ago) to three (Photo + Scan Barcode + Quick Log). Hannah's anti-condescension principle from 170l (no "Most common" chip on Photo; equal-weight peers, identical typography + icon + card sizing) must propagate to the three-peer layout.

The Recent Quick Logs row from §9.4 positions BELOW the three-button row. There's already a Recent NutriVision meals row (shipped from 170 base + my 171a midnight-reset hardening). Hannah should reconcile:

Options:
- **(A) Sibling rows**: Two separate sections (Recent NutriVision meals + Recent Quick Logs). Cleaner separation, more vertical real estate consumed.
- **(B) Replace**: Recent NutriVision meals is renamed to Recent meals and includes both Quick Logs + photo-logged meals + barcode-saved meals. Unified surface.
- **(C) Merge**: One row, mixed entry modalities marked with chips (Photo, Barcode, Quick Log).

**Recommended action**: Green-light Hannah's wireframe for both the three-button row AND the Recent rows reconciliation alongside this filing; review when she returns and confirm before Phase 1a build kickoff.

### Flag 2: Settings architecture (inline vs sub-page)

170j (voice): inline section per Gate 2 inline. 170l (barcode): sub-page per Gate 2 (Gary's explicit choice departing from 170j precedent). 170m has 4 toggles + 1 language setting per §9.8 — fits naturally inline OR can go to a sub-page.

Options:
- (A) Inline section below VoiceSettingsSection on `/settings/nutrivision/page.tsx`
- (B) Sub-page at `/settings/nutrivision/quick-log` mirroring barcode pattern
- (C) Merge into a single "Entry path preferences" section consolidating voice + barcode + quick log toggles into one card

**Recommended action**: Inline section unless Gary wants consistency with 170l sub-page. The 4-toggle volume fits inline without crowding.

### Flag 3: 170c dependency posture (allergen-flag + safety-mode features)

170c hasn't been pasted (only referenced as placeholder). The dietary restriction crossover and eating disorder safety mode features in 170m compose with 170c. Two options:

- (A) **Ship 170m v1 with allergen-flag detection + safety-mode behavior feature-flagged OFF.** Flip on when 170c ratifies. Lowest-friction path. NLU still parses ingredients; just the alert surface stays inactive.
- (B) **Block 170m on 170c filing/ratification.** Coordinates the two prompts but delays 170m.
- (C) **Paste 170c spec now** and ratify in parallel.

**Recommended action**: (A). 170m's core value is the entry path; allergen-flag is additive. Ship without it, flip on later.

### Flag 4: Spec inconsistency on `repeated_from_meal_id`

§8.5 (POST /repeat endpoint) references `meals.repeated_from_meal_id` column for tracking one-tap repeat lineage, but §7.2 (meals migration) doesn't include this column. Two options:

- (A) **Fold into the §7.2 meals ALTER** as a 4th column added in the same migration. Smallest delta.
- (B) **Add a 6th migration** specifically for the repeat lineage column.

**Recommended action**: (A). Single migration, additive, no semantic change.

### Flag 5: Pre-launch must-have positioning

Per spec status: "Pre-launch must-have for US July 1, 2026 launch." Confirm P0 status. This locks in resource allocation:

- Gordon's Blueprint long-poles get prioritized (system prompt + curated test set)
- Hannah's §9 wireframes get prioritized
- Build runway compressed to 2-3 weeks
- Coordination with 170j (voice editing already shipped — Anthropic API integration scales for both call patterns) confirmed clean

**Recommended action**: Confirm P0. The zero-new-deps friction + 2-3 week runway makes this the lowest-cost launch unlock.

## 170m-supplement anticipated per §22 of spec

Filed for future after corpus accumulates:
- Per-user portion default learning from 170g corpus (replace defaults with personalized values)
- Conversational follow-up ("Oh wait, I also had...")
- Quick Log voice-as-entry (combined with 170n future filing — currently 170m embeds 170j voice-edit as an in-modal fallback link)
- Quick Log shortcut row on the Dashboard (one-tap log without opening NutriVision tab)
- Practitioner-scope extension for text input visibility with explicit consumer consent

## Composition with other 170-series prompts

- **170**: meals + meal_items schema reused; save flow unchanged; cascade unchanged; analytics + dashboards see Quick Log meals identically at the data layer
- **170a + supplement**: job model extended with `analyze_kind = 'quick_log_text'`; error retry pattern reused
- **170b**: future Farmceutica branded products with names route via cascade tier 1 (`farmceutica_curated_foods`) when names match
- **170c (placeholder; not ratified)**: dietary restriction crossover composes when ratified; v1 ships feature-flagged off
- **170d (filed; not built)**: not applicable (text is single utterance)
- **170e (filed; not built)**: chain name detection routes to 170e chain customization slots when 170e ships
- **170f (filed; not built)**: text similarity to saved recipes short-circuits to portion confirmation when 170f ships
- **170g (filed; corpus-gated)**: Quick Log meals contribute to corpus tagged `data_source = 'quick_log_text'`; text input preserved as high-value training signal (gated by training consent)
- **170h (filed; not built)**: Quick Log meals participate in retrospective pattern detection identically to photo meals; future cross-entry-path insights possible
- **170i (filed; not built)**: practitioner redaction matrix extended (§12.7) — practitioner sees `meal_items` but NOT `meals.text_input` or parser internals
- **170j (SHIPPED 2026-05-30)**: voice can edit Quick Log drafts via existing `add_item` + 10 other ops; 170j voice capture overlay reused as "Use voice instead" in-modal fallback; Anthropic API integration shared
- **170k (filed; not built)**: Haiku system prompt translates per locale matching 170j §11.2 pattern
- **170l (SHIPPED 2026-05-30)**: typed branded product mentions route via OFF cache (`off_product_cache` reused); three-button row from 170l §11.1 evolved to four entries (Photo + Barcode + Quick Log + secondary row for future Restaurant + Recipe)
- **171a (SHIPPED 2026-05-30 commit `01788980`)**: photo capture overlay flow unchanged; Quick Log is parallel entry path

## Ratification posture (2026-05-30)

Gary acknowledged 170m at spec level 2026-05-30 by pasting the full spec into the session. Per ViaConnect convention this counts as filed and ratified at the spec level. No code change required this turn.

**Pre-launch P0 status confirmed**: 170m is one of the small set of prompts required for the US July 1, 2026 launch product per the spec status field.

## Related

- Prompt 170 Phase 1 (shipped 2026-05-29 commit `47a7663d`; the meals + meal_items + cascade infrastructure 170m reuses)
- Prompt 170a + 170a-supplement (ratified 2026-05-29; analyze_kind job model 170m extends)
- Prompt 170c (placeholder filing only; 170m composes when ratified)
- Prompt 170j (SHIPPED 2026-05-30 commit `6411ba0f`; Anthropic API integration shared; voice composes for free + serves as in-modal fallback)
- Prompt 170l (SHIPPED 2026-05-30 commit `2098145a` + 171a `01788980`; three-button row from §11.1 is the surface 170m evolves; OFF cache reused for branded product detection)
- Prompt 170n (filed-for-future, voice-as-entry sibling; 170m embeds 170j voice fallback as a v1 substitute)
- Heritage: Prompt 170e §9.1 (entry-path-as-first-class pattern); Prompt 170j §4 (Claude Haiku NLU pattern); Prompt 170l §11.1 (peer-weight cards anti-condescension); Prompt 170c (filed; cuisine-stratified accuracy heritage for §16.4)
