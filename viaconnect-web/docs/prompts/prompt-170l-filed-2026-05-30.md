# Prompt 170l Filed: Barcode Scan as First-Class Entry Path on the NutriVision Tab

Date: 2026-05-30
Status: **Filed at spec level; ratified.** NO code work. Hannah dispatched for §11 wireframes (8 substantive surfaces; three-entry-path tab redesign is most consequential).
Memorialized by: Jeffery (orchestrator).

## Mission (one line)

Add a deliberate Scan Barcode entry path as a visual peer to Photo capture on the NutriVision tab, routing scanned EAN-13/UPC-A/EAN-8/ITF-14 barcodes through a direct Open Food Facts lookup (bypassing the existing cascade since the user provided a hard identifier the upper tiers do not index against), and producing a sub-1.5-second p50 end-to-end save for packaged foods that the vision pipeline handles poorly.

## Why this filing posture follows the 170d/e/f/h/i/j/k pattern (with 5 structural distinctions)

170l memorializes-only with Hannah dispatched for §11 wireframes, same posture as prior 170-series filings. Five structural distinctions:

1. **Second 170-series filing with dependencies fully satisfied.** Spec §0: "Sequenced after Prompts 170 + 170a + 170a-supplement ratify. Independent of 170b/170c/170d/170e/170f/170g/170h/170i/170j/170k." All upstream gates are met today. The only other 170-series filing with this property was 170j (now shipped). 170l is fast-trackable on the same trajectory.

2. **Two package.json approvals needed, mirroring 170j's pattern.** Per §4.4 + §22.2: `@capacitor-mlkit/barcode-scanning` (native, Apache 2.0, ~5 MB bundle impact) AND `@zxing/library` (web fallback, Apache 2.0, ~300 KB compressed). Same Gary-approval gate that 170j had with `@capacitor-community/speech-recognition`. Web-only fallback exists if Gary defers the native plugin (ZXing on Capacitor's web bridge).

3. **Open Food Facts is already integrated** as tier 3 in the Prompt 170 nutrient cascade (§2.2 step 6: `farmceutica_curated > usda_fdc > open_food_facts > vision_provider`). 170l does NOT modify the cascade. It adds a *direct-to-OFF* endpoint at `/api/nutrition/barcode/lookup` that bypasses tiers 1 and 2 for the specific case of barcode-keyed lookups (USDA FDC and `farmceutica_curated_foods` don't index against barcodes, so consulting them is wasted latency).

4. **Conceptual shift in NutriVision tab framing.** Today the idle state has Photo capture as the primary CTA with Restaurant selector (170e) and Recipe row (170f) as secondary. 170l elevates Scan Barcode to peer status with Photo — two equal-weight buttons side by side. This is the most user-visible architectural shift in the 170-series since the original 170 launch: NutriVision becomes "any-entry-point food logger" instead of "photo recognition app." Hannah's §11.1 wireframe is the focal UX deliverable.

5. **Cost is effectively $0 per scan**, the cheapest 170-series prompt to operate at scale. Both libraries are one-time install costs; OFF API is free with no key required; cache hits dominate. Compare to 170 base at ~$5k/mo at 100k meals; 170l makes packaged food logging essentially free.

## The three-entry-path architecture

| Entry path | Source | Speed (p50) | Coverage strength |
|---|---|---|---|
| **Photo capture** (Prompt 170) | Vision pipeline (LogMeal → Gemini → Claude tertiary) | 3-5 sec | Fresh / cooked / restaurant plates |
| **Scan Barcode** (170l) | Direct-to-OFF lookup with cache | **Sub-1.5 sec** | Packaged foods (3M+ products globally) |
| **Restaurant selector** (170e, filed) | Chain menu catalog | Sub-2 sec | 30+ US chains, expanding per 170k |
| **Recipe match** (170f, filed) | pHash short-circuit on captured photo | Sub-200 ms | User's repeat meals |

Voice (170j, shipped) is meta to all four — voice operates on the result review screen produced by any entry path. Per §8.8 the existing `add_item` operation works for barcode-scanned items without modification (items have names from OFF; the NLU already targets by name).

## Open Food Facts integration deep-dive

**Existing role (Prompt 170 §2.2 step 6):** OFF is tier 3 fallback for food-name-keyed cascade lookups. 170l does NOT modify this.

**New direct-to-OFF endpoint (170l §5.4):** `/api/nutrition/barcode/lookup` checks the 7-day Supabase cache, falls through to the OFF REST v2 API (`https://world.openfoodfacts.org/api/v2/product/{barcode}.json` with `fields` parameter to reduce payload) on miss, stores response in `off_product_cache`, returns to client. Cache hit p50 <50ms; cache miss p50 <600ms.

**Cache strategy (§3.4):**
- Client-side `sessionStorage` 1-hour TTL (intra-session dedup)
- Server-side `off_product_cache` table 7-day TTL with stale-while-revalidate
- Nightly Edge Function `off-cache-nightly-purge` removes entries 90+ days unrefreshed
- Expected production hit rate >60% (long tail of single-scan barcodes + head of popular products)

**Rate limit etiquette (§3.5):** User-Agent identifies ViaConnect (`ViaConnect-NutriVision/1.0 (contact@farmceutica.com)`), 200 lookups/user/day sanity cap, `fields` parameter minimizes payload.

**License (ODbL):** Attribution required in Settings → About → Attributions per §3.6. Kelsey-reviewable copy. Non-negotiable per ODbL.

## Composition with shipped 170j voice

Already-handled (no NLU prompt changes needed for v1):
- "Add another one of those yogurts" → existing `add_item` op targets the most-recent barcode-scanned item by name
- "Make it two servings instead of one" → existing `modify_item_portion` op with multiplier

Future NLU enhancement (filed for 170l-supplement, not v1):
- "the yogurt I just scanned" referent resolution by recency
- Barcode-driven duplicate detection across voice utterances

Existing `meal_items.off_barcode` column from Prompt 170 §6.1 (specified but never populated until now) becomes active. The Phase 1c-3 `appendItem` mutator on `useMealItemEdits` handles voice add_item; the same mutator pattern handles barcode add-item.

## Library approval requirements (matches 170j pattern)

| Library | Purpose | License | Bundle impact | Approval |
|---|---|---|---|---|
| `@capacitor-mlkit/barcode-scanning` | Native iOS + Android barcode detection (ML Kit) | Apache 2.0 | ~5 MB on each native binary | Required from Gary at Blueprint kickoff |
| `@zxing/library` | Web fallback for browsers + Capacitor web bridge | Apache 2.0 | ~300 KB compressed | Required from Gary at Blueprint kickoff |

Pattern matches prior dep approvals (#102 pdf-lib, #105 exceljs+pptxgenjs+sdk, #106 sharp, Capacitor 6.x, #170j @capacitor-community/speech-recognition). Filing artifact when approved: a one-line `project_prompt_170l_libraries_approved.md` memory entry naming both packages + versions.

If Gary defers the native plugin, web-only path ships first using ZXing on the Capacitor web bridge. Bundle size impact then drops to 300 KB total; native plugin lands in a follow-on release. Same pattern 170j followed before the speech-recognition plugin was approved.

## Cost model

| Component | Cost per scan |
|---|---|
| Barcode library (client-side, one-time install) | $0 |
| OFF API call (cache miss) | $0 |
| OFF cache storage | Negligible |
| Server compute per request | Negligible |
| **Total** | **~$0** |

| Component | Storage growth at scale |
|---|---|
| `off_product_cache` | ~100 KB per cached product; ~10 GB at full saturation of ~100k unique products |
| `barcode_scan_sessions` (20% sampled) | ~500 bytes/row × 100k scans/month = ~10 MB/month |
| `meal_items` augmentations | Negligible (extra columns on existing rows) |

**Cheapest 170-series prompt to operate.** Cost reduction strategic angle: at high packaged-food adoption, 170l displaces a meaningful share of vision pipeline calls (which run ~$0.04-0.06/meal); each barcode scan that would have been a photo is a near-pure savings.

## Helix events filed (5, consumer-side only per Standing Rule #8)

| Event key | Points | Purpose |
|---|---|---|
| `barcode_scan_started` | 1 | User opened the scanner |
| `barcode_meal_logged` | 4 | Saved a meal via barcode (lower than 5pt photo because effort is lower) |
| `barcode_off_not_found_fallback` | 0 | Logged for catalog improvement, no point award |
| `barcode_macros_overridden` | 1 | User overrode OFF macros (catalog signal) |
| `barcode_off_contribution_clicked` | 3 | Intentionally generous to encourage community contribution |

## Migrations filed (5 total)

All append-only with one documented exception (analyze_kind enum extension):
1. `nutrition_photo_jobs.analyze_kind` extension to add `'barcode'` (Postgres enum ADD VALUE OR CHECK reconstitution depending on schema; Observe selects cleaner path)
2. `barcode_scan_sessions` (10% sampled in prod, no transcript text equivalent — barcode_value stored service-role-only)
3. `meal_items` augmentation: `off_product_name`, `off_brand`, `off_serving_size_g`, `off_completeness_score`, `off_nova_group`, `off_nutrition_grade_fr`, `user_overrode_macros`
4. `off_product_cache` (7-day TTL stale-while-revalidate, nightly Edge Function purges 90-day-cold entries)
5. Helix events block (5 event types)

Plus Edge Function: `off-cache-nightly-purge`

## Three nested kill switches (§13.4)

- `BARCODE_SCAN_ENABLED` (master, default false until ratification)
- `BARCODE_OFF_API_FALLBACK_TO_PHOTO_ENABLED` (default true; setting false removes the photo fallback option on OFF not-found)
- `BARCODE_MULTI_PRODUCT_MEAL_ENABLED` (default true; setting false caps a meal at one barcode)

## Privacy posture (§14)

- **Barcode is not PHI**: just a public product identifier. No retention beyond the scan session unless the user saves a meal.
- **Scanned-but-not-saved barcodes are ephemeral**: the scanner does not log them.
- **OFF receives only the barcode value**: no user identity, no contextual data. User-Agent header identifies ViaConnect but not the specific user.
- **Practitioner redaction matrix extended** (§14.3): practitioners with Detailed Meals scope see brand + product name + Nova group + NutriScore (clinically meaningful), but NOT the raw barcode digits (technical, not clinically relevant) and NOT the OFF completeness score (data quality metadata).
- **No consumer-facing brand recommendations**: aggregate brand telemetry informs platform decisions only, never surfaces to consumers as "other users who scan this also scan X."

## Accessibility (§12)

Per WCAG 2.2 AA per the Prompt 170j precedent. Specific accessibility highlights:
- **Low-vision use case is a real unlock**: barcode scanning eliminates the need to read tiny nutrition panels by eye. Design should celebrate this, not just enable it.
- Screen reader announcements for scanner state ("Scanner active. Point camera at a barcode" → "Barcode detected. Looking up product." → "Product found: [Name] by [Brand]")
- Audio chime opt-in (default OFF; §11.9 toggle), haptic feedback default ON for mobile
- 44×44 tap targets on all interactive elements per iOS HIG / 48×48dp Android Material
- prefers-reduced-motion respected (viewfinder pulse degrades to static)
- iOS Voice Control + Android Voice Access compatibility verified at Audit

## §11 UI surfaces (Hannah's dispatch this turn, 8 substantive)

<!-- HANNAH: replace the placeholder paragraph between START and END markers below with the §11.1 through §11.9 wireframe section per the dispatch prompt. Voice posture inherits from the 170h/170i/170j/170k pattern (warmth + precision). §11.1 three-entry-path tab redesign is the most consequential surface; §11.4 product confirmation is the densest. -->

<!-- HANNAH_WIREFRAMES_START -->

Voice posture inherits from 170h §13.5 (consumer-copy linter) and the 170j fill (warmth + precision). 170l adds one posture-specific challenge: quality indicator chips (Nova, NutriScore, Eco-Score) and allergen highlights must inform without judging. ViaConnect is a tool for the user's goals, not a values referee. All accessibility commitments encoded inline per surface, not deferred. WCAG 2.2 AA is the floor, not the ceiling. Low-vision celebration architected, not declared.

### §11.1 NutriVision tab idle state with three-entry-path row

**Layout:** Top region of the NutriVision tab, immediately below the standard tab header. Vertical stack on mobile, same vertical stack on desktop (this is the SAME structure on both, so the architectural framing is identical regardless of viewport).

From top to bottom:
1. **Primary entry-path row** (the load-bearing region): 16px horizontal gutters; flex row with two equal-weight cards side by side, 12px gap between them. Each card is `flex: 1` (50/50 split on mobile, also 50/50 on desktop up to a max card width of 240px each, then centered).
2. **Card dimensions:** 144px tall on mobile, 168px tall on desktop. Card `#1E3054` fill, 16px rounded corners, no border (the equal-fill is the equality signal). 16px internal padding.
3. **Card contents (identical structure both cards):** centered vertical layout, 36px icon top, 12px gap, 14px Medium label, 4px gap, 12px Navy 70 percent sublabel. Tapping anywhere on the card activates it.
4. **Photo card:** Camera icon (Lucide, strokeWidth 1.5, 36px, Teal `#2DA5A0`) + label `Take photo` + sublabel `Fresh, cooked, or plated meals`.
5. **Scan Barcode card:** ScanBarcode icon (Lucide, strokeWidth 1.5, 36px, Teal `#2DA5A0`) + label `Scan barcode` + sublabel `Packaged foods and drinks`.
6. **20px gap below the entry-path row.**
7. **Secondary entry-paths row:** existing Restaurant selector (170e) + Recipe row (170f) remain unchanged in their current treatment. These render as a single horizontal row of two pill-style options, 40px tall, Card `#1E3054` 60 percent fill (visually lighter than the primary cards above to signal secondary status). 16px gutters, 8px gap between pills. Each pill: icon left at 16px + label at 13px Navy 95 percent.
8. **Below: existing recently-logged meals scroll region, untouched.**

**Header copy:** N/A (tab header is owned by NutriVision tab chrome, not the entry-path row)

**Body copy:**
- Photo card label: `Take photo`
- Photo card sublabel: `Fresh, cooked, or plated meals`
- Scan Barcode card label: `Scan barcode`
- Scan Barcode card sublabel: `Packaged foods and drinks`
- Restaurant pill label: `Restaurant menu` (unchanged from 170e)
- Recipe pill label: `Recipe match` (unchanged from 170f)

**CTAs:**
- Photo card tap: opens existing camera capture flow (the Prompt 170 vision pipeline)
- Scan Barcode card tap: opens scanner overlay §11.2
- Restaurant pill tap: opens existing chain selector (170e, unchanged)
- Recipe pill tap: opens existing recipe browser (170f, unchanged)

**Conditional states:**
- `BARCODE_SCAN_ENABLED` kill switch is false: Scan Barcode card is hidden; Photo card returns to full-width primary CTA (existing behavior, no regression)
- Camera permission denied on the device: Photo card disabled-greyed with sublabel replaced by `Enable camera in Settings`; Scan Barcode card unaffected
- Both Photo and Scan Barcode unavailable (no camera hardware): both cards hidden; the secondary row is promoted to primary placement with their sizes unchanged (graceful degradation)
- First-time user (has never used Scan Barcode): a small one-time `NEW` chip (12px, Orange `#B75E18` 16 percent fill, 8px Orange text Medium) anchors top-right of the Scan Barcode card for the first 7 days; dismisses on first scan. Photo card does NOT get a `NEW` chip; it has always been there.

**Accessibility commitments:**
- Each card is a `<button>` (not a wrapper around an icon); aria-label fully verbose: `Take photo. Photograph fresh, cooked, or plated meals.` and `Scan barcode. Photograph the barcode on packaged foods and drinks.`
- Tab order: Photo card > Scan Barcode card > Restaurant pill > Recipe pill > recent meals
- Tap targets 144x144 on mobile (far exceeds 44x44 floor); 168x240 on desktop
- Color contrast: 36px Teal icon on Card is 4.7:1; 14px Medium label Navy 95 percent on Card is 6.5:1; 12px sublabel Navy 70 percent on Card is 4.7:1; all exceed 4.5:1
- Focus indicators: 2px Teal `#2DA5A0` outline with 2px Navy `#1A2744` offset on keyboard focus; visible at high contrast
- iOS Voice Control identifiers: `Take photo`, `Scan barcode` (literal labels)
- Android Voice Access content descriptions match the visible labels
- Reduced-motion: cards do not animate on tap; tap state uses 200ms color brighten (below motion threshold)
- Screen reader announcement for `NEW` chip: aria-label suffix on Scan Barcode card becomes `Scan barcode. New feature. Photograph the barcode on packaged foods and drinks.`

**Push-back / UX decisions:**
- **Both cards visually identical, no `Most common` chip on Photo.** This was the consequential question the dispatch flagged. Resolution: equal-weight peers, identical typography, identical icon sizing, identical card fill, identical card height. Reasoning: the framing shift from "photo app" to "any-entry-point food logger" is exactly the conceptual goal. Putting a `Most common` differentiator chip on Photo would re-anchor Photo as primary, which undercuts the spec's intent. The peer relationship is established at the visual level, not narrated. Users who have built muscle memory for Photo will continue using it because it is in the same position (left card) at the same prominence; users who would benefit from Scan Barcode now SEE it as a real first-class option rather than discovering it buried in a menu.
- **Photo on the left, Scan Barcode on the right.** Left-to-right reading order in en-US plus existing muscle memory: Photo retains its established position. This is a peer pairing, not a swap. The visual hierarchy is not "Photo is primary, Scan Barcode is also there"; it is "two equal options, one of which is where Photo has always been".
- **No mode toggle.** A mode toggle ("Photo mode" vs "Scan mode") was considered and rejected. Mode toggles add a step (toggle first, then act) and they imply that the modes are mutually exclusive, which they are not (a user could photograph one item and scan another in the same meal via §11.7 multi-product flow). Two equal cards on the same screen model the truth: both are always available.
- **`NEW` chip on first 7 days, dismisses on first use.** Spec was silent on first-time discovery. Added a quiet, time-bounded affordance because the framing shift only works if users notice the new option. A persistent `NEW` chip is hostile (clutters forever); a 7-day window with dismiss-on-first-use is honest discovery. The chip is small (12px) so it does not become the visual anchor of the card; the card itself is the anchor.
- **Secondary row visually lighter to preserve hierarchy.** Restaurant and Recipe are real entry paths but they serve narrower use cases (chains, repeat meals). The Card 60 percent fill plus 40px pill height signals "also available" without competing with the primary cards above. Pre-170l these were below Photo; post-170l they are below the Photo + Scan Barcode pair. No regression to their access path.
- **Card height 144px mobile, 168px desktop.** Larger than typical CTAs because the conceptual shift deserves visual weight; small enough that the secondary row plus recent-meals scroll region remain above the fold on iPhone SE (568pt) and Pixel 7 Pro (852pt) viewports.

**Mobile adaptation:** Same vertical stack; cards `flex: 1` with 12px gap, full-width minus 16px gutters; 144px tall; secondary row pills full-width minus gutters. The architectural restructure is identical between mobile and desktop because the conceptual shift is identical between mobile and desktop.

---

### §11.2 Scanner overlay (with §11.3 inline loading mid-state)

**Layout:**
- **Mobile:** Full-viewport overlay. Backdrop is Navy `#1A2744` at 92 percent opacity over the entire viewport. The center region is a transparent rectangular viewfinder cutout (3:1 aspect ratio: 280px wide × 96px tall on mobile), positioned approximately 40 percent down from the top of the viewport (above center to leave room for camera feed below the cutout to remain visible as context). The webcam feed renders behind the entire overlay; the viewfinder cutout shows the un-tinted feed; the backdrop tints everything outside the cutout to focus attention.
- **Desktop:** Centered modal, 560px wide × 480px tall, Card `#1E3054` 95 percent fill with the same viewfinder cutout proportions scaled to 360px × 120px positioned in the upper portion of the modal. Webcam feed renders inside the modal frame, not full-viewport.
- **Viewfinder treatment:** Four Teal `#2DA5A0` corner brackets at each corner of the cutout (16px each leg, 3px stroke). A faint horizontal Teal centerline runs through the middle of the cutout at 1px stroke 40 percent opacity. The brackets pulse on detection (see Conditional states).
- **Above the viewfinder (mobile):** Top bar 56px tall with safe-area inset; close `X` left at 24px (Lucide, Navy 95 percent on transparent), flashlight toggle right at 24px (Lucide Flashlight, mobile only — hidden on desktop).
- **Below the viewfinder:** 32px gap; helper text centered at 14px Navy 95 percent on the tinted backdrop; 24px gap; manual entry link centered at 13px Navy 80 percent underlined.
- **§11.3 loading mid-state:** When a barcode is detected, the helper text region transforms in place (same vertical position) to a small Card `#1E3054` 90 percent fill pill 220px wide × 36px tall containing a 14px Spinner icon (Lucide Loader2 rotating, animation honors reduced-motion preference) + text `Looking up product...`. This persists 50ms to 600ms depending on cache hit/miss, then transitions to §11.4 product confirmation.

**Header copy:** N/A (overlay is action-mode)

**Body copy:**
- Helper text (initial state, no barcode detected yet): `Point your camera at the barcode`
- Helper text (no barcode detected after 15 sec): `Try moving closer, or hold the barcode flat`
- Helper text (no barcode detected after 30 sec): `Having trouble? Enter the barcode manually below.`
- Manual entry link (persistent below helper text): `Can't scan? Enter barcode manually`
- §11.3 loading state pill: `Looking up product...`

**CTAs:**
- Close `X` (top-left mobile, 44x44 hit area around 24px visual): dismisses overlay, returns to NutriVision tab idle state; announces `Scanner closed` via aria-live
- Flashlight toggle (top-right mobile, 44x44 hit area around 24px visual): toggles device flashlight; visual state changes between Flashlight (off) and Flashlight with Teal background fill (on); hidden on desktop
- Manual entry link tap: opens §11.6 manual barcode entry modal; scanner overlay state preserved underneath, dismissed on modal close

**Conditional states:**
- **Initial mount (auto-detect armed):** corner brackets static Teal at full opacity; helper text `Point your camera at the barcode`
- **Camera permission not yet granted:** the system permission prompt fires before the overlay renders; on grant, overlay mounts; on deny, fallback inline message in the idle state §11.1 `Camera access is off. Enable it in Settings to scan barcodes.` with a Settings deep-link
- **Camera permission denied:** overlay does NOT mount; Scan Barcode card on §11.1 disabled-greyed with sublabel `Enable camera in Settings`
- **Barcode detected:** corner brackets pulse twice (1.0 to 1.15 scale, 300ms total, honors reduced-motion: when reduced-motion is set, brackets flash to 70 percent opacity and back instead of scaling); haptic light tap on supported hardware; audio chime if `Audio chime` toggle is ON (default OFF per §11.9); helper text region transitions to §11.3 loading pill `Looking up product...`
- **OFF cache hit:** loading pill resolves in p50 <50ms; transition to §11.4 product confirmation
- **OFF cache miss:** loading pill resolves in p50 <600ms; transition to §11.4 product confirmation
- **OFF not found (404 or null response):** transition to §11.5 not-found fallback
- **Network failure during lookup:** transition to error variant — `Connection trouble. Check your network and try again.` with Try again CTA and Enter manually fallback
- **15-sec no-detection coaching:** helper text updates to `Try moving closer, or hold the barcode flat`
- **30-sec no-detection escalation:** helper text updates to `Having trouble? Enter the barcode manually below.` (more direct nudge to manual entry)
- **Reduced-motion preference set:** corner brackets do not pulse; detection feedback is a single 200ms opacity flash (10 percent down then back) plus the helper-text-to-loading-pill transition
- **`Audio chime` toggle ON (§11.9):** short 80ms 880Hz tone on detection
- **`Haptic feedback` toggle ON (§11.9, default ON):** light haptic tap on detection
- **`BARCODE_OFF_API_FALLBACK_TO_PHOTO_ENABLED` false:** §11.5 not-found fallback omits the Photograph card; remaining two cards unchanged

**Accessibility commitments:**
- Overlay traps focus; on mount, focus moves to the manual entry link (so keyboard users can tab to the controls without having to navigate the camera affordance which is gesture-only)
- aria-modal="true", role="dialog", aria-labelledby points to visually-hidden title `Barcode scanner`
- aria-live="polite" on the helper text region so updates announce: `Point your camera at the barcode` → `Try moving closer, or hold the barcode flat` → `Barcode detected. Looking up product.` → product confirmation transition
- aria-live="assertive" on detection event so screen reader users hear `Barcode detected. Looking up product.` immediately (this is high-confidence state change, assertive is correct)
- Camera viewfinder itself has aria-hidden="true" because the camera feed is decorative; the helper text carries semantic content
- Close `X` aria-label: `Close scanner`
- Flashlight toggle aria-label: `Toggle flashlight` with aria-pressed state (true/false); announces `Flashlight on` / `Flashlight off` on toggle
- Manual entry link aria-label: `Enter barcode manually`
- 44x44 tap targets on close `X`, flashlight toggle, manual entry link
- Color contrast: 14px Navy 95 percent helper text on Navy 92 percent backdrop is 5.0:1 (verified, the slimmest margin in this surface); manual entry link 13px Navy 80 percent on the same backdrop is 4.7:1; both exceed 4.5:1
- Focus indicators: 2px Teal outline with 2px Navy offset on all interactive elements
- Reduced-motion: corner bracket pulse becomes opacity flash (300ms below motion threshold); Loader2 spinner becomes a 3-dot pulse animation that fades opacity rather than rotating (per WCAG 2.3.3 the rotating spinner respects prefers-reduced-motion via three-dot fade)
- iOS Voice Control: `Close`, `Flashlight`, `Enter manually` (literal labels)
- Android Voice Access mirrors
- Live region announcement on §11.3 loading pill appearance: `Looking up product`
- Live region announcement on §11.3 cache hit p50: `Product found` (fires immediately before §11.4 announces full product name)
- **Auto-detect screen reader pattern:** because there is no shutter button, screen reader users rely on the aria-live announcement chain to know what is happening. The sequence is explicit: scanner mount → helper text announce → detection event announce → looking up announce → product found announce. Every state transition is announced; the user is never wondering what happened.

**Push-back / UX decisions:**
- **Auto-detect feedback combines bracket pulse + haptic + optional chime + aria-live assertive announcement.** The dispatch flagged this as a question: is the bracket pulse plus haptic enough? Resolution: the bracket pulse plus haptic carries 95 percent of users; the 5 percent who need explicit confirmation (low-vision users, hearing-only users, users in noisy environments) are covered by the aria-live assertive announcement and the optional audio chime (opt-in via §11.9). The full stack of feedback channels means every user category has a confirmation signal. The chime defaults OFF because most users find chimes intrusive; users who want the audio confirmation can turn it on once and it stays on.
- **No brief overlay flash on detection.** A full-screen flash was considered and rejected: it is visually loud, it competes with the haptic + bracket pulse + aria-live triad, and it triggers photosensitive seizure concerns. The corner-bracket pulse is the visual signal; the helper-text-to-loading-pill transition is the immediate next visual state change.
- **Manual entry link persistent throughout the scan session.** Spec said "bottom link". Confirmed: persistent because users who know up-front that their barcode is damaged or unscanned (e.g., very small text, glossy package surface) should not have to wait 30 seconds for the escalation copy to tell them about the option. The link is small (13px) so it does not compete with the primary scan affordance.
- **Helper text escalation language steps down gradually.** Initial copy is action-oriented (`Point your camera at the barcode`); 15-sec coaching is technique-oriented (`Try moving closer, or hold the barcode flat`); 30-sec escalation is fallback-oriented (`Having trouble? Enter the barcode manually below.`). The language softens at each step so users do not feel rushed or chided. The 30-sec copy nudges to manual entry without being condescending about the failure to scan.
- **§11.3 loading pill is the same vertical position as the helper text.** Position consistency means the user's eye does not have to relocate to track the state change. The pill replaces the helper text inline; the transition is opacity fade (200ms) of the helper text out and pill in. This is a single visual region that carries the system's current "what I am doing" state.
- **Webcam feed remains visible behind the loading pill.** During the 50ms to 600ms lookup, the camera is still showing the barcode the user just scanned, which reinforces "the system has your scan; it is processing it" rather than going blank.

**Mobile adaptation:** Full-viewport overlay; safe-area-aware top inset so close `X` does not sit under the notch; safe-area-aware bottom inset so manual entry link does not sit under the home indicator. Flashlight toggle appears mobile-only (desktop webcam typically does not expose flashlight API).

---

### §11.4 Product confirmation screen

**Layout:** Full-viewport surface on mobile, 640px centered modal on desktop. Card `#1E3054` background. Sticky bottom CTA bar 80px tall with safe-area inset. Body content scrolls within the surface.

From top to bottom (mobile, scrollable region):
1. **Header strip 56px:** back chevron left (returns to scanner overlay §11.2 to scan a different product) + title `Confirm product` 16px Medium centered + close `X` right
2. **Hero card region 16px padding:** 96x96 product image left (Card 90 percent fill, rounded 8px, fallback Package icon if no image); right column 14px gap with product name (18px Navy 95 percent Medium, max 2 lines), brand chip below (Card 90 percent fill, 24px pill, 11px Navy 80 percent Medium, 8px padding, max 1 line), barcode digits at the bottom (11px Navy 60 percent monospace, e.g., `0 12345 67890 5`)
3. **24px gap; data completeness notice region (conditional, shown only when score below 0.5)** — see Conditional states
4. **Macros region:** title `Nutrition` 12px Teal uppercase letter-spaced + per-serving / per-100g toggle pill right-aligned (32px tall, two-segment pill); macro chips in a 4-column grid (2-column on viewports under 360px): kcal, protein, carbs, fat each in 64px tall Card 80 percent fill blocks with value top (18px Navy 95 percent Medium) + label below (11px Navy 70 percent uppercase); secondary row with fiber, sugar, sodium each in 48px tall blocks (smaller treatment because secondary nutrients)
5. **24px gap; portion adjustment region:** title `Portion` 12px Teal uppercase + current serving size text (14px Navy 95 percent, e.g., `1 serving (170 g)`); 16px gap; ring chart 80px diameter on left (Teal `#2DA5A0` arc on Card 60 percent fill, shows portion multiplier as a sweep); right column with quick-chip row (0.5×, 0.75×, 1×, 1.5×, 2× as 36px tall pills, current selection has Teal border); below chips: continuous slider 0.25× to 5× range with current value labeled; below slider: link `Use custom grams` (13px Navy 80 percent underlined) that swaps the chips+slider for a numeric input
6. **24px gap; quality indicator chips region:** title `Product information` 12px Teal uppercase; three chips in a single row (wrap to two rows on viewports under 380px): Nova chip + NutriScore chip + Eco-Score chip; each chip 56px tall × ~104px wide, Card 70 percent fill, left vertical color bar (4px wide) + label/value stacked right
7. **24px gap; ingredients collapsible:** title `Ingredients` 12px Teal uppercase + chevron right; collapsed by default; expanded shows the OFF ingredients_text wrapped at 14px Navy 90 percent with allergens hyperlinked inline to the allergens section
8. **16px gap; allergens collapsible:** title `Allergens` 12px Teal uppercase + chevron right; collapsed by default UNLESS a user-flagged allergen matches (then expanded automatically with Orange `#B75E18` 2px border around the section header); allergen list with each allergen as a 32px chip; user-flagged matches highlighted Orange
9. **16px gap; macros override affordance:** link `Macros wrong? Edit` (13px Navy 80 percent underlined, left-aligned); tap opens §11.8 per-item macro override panel
10. **48px breathing room before sticky bottom bar**

**Sticky bottom CTA bar (80px tall):**
- Mobile: vertical stack with `Save to meal` primary at top (Teal solid, 48px tall, full-width minus 16px gutters); below: text-link row centered with `Scan another product` + `Cancel` separated by a small dot
- Desktop: horizontal layout with `Cancel` left text-link, `Scan another product` center text-link, `Save to meal` primary right

**Header copy:** `Confirm product` (page title)

**Body copy:**

- **Hero card region:**
  - Product name (from `off_product_name`, fallback to barcode if name missing)
  - Brand chip (from `off_brand`, fallback chip text `Brand unknown`)
  - Barcode digits (formatted with single space groupings for readability; full digits remain copyable)

- **Macros region:**
  - Section title: `Nutrition`
  - Toggle pill segments: `Per serving` (left, default) | `Per 100g` (right)
  - Primary chip labels: `KCAL`, `PROTEIN`, `CARBS`, `FAT`
  - Secondary chip labels: `FIBER`, `SUGAR`, `SODIUM`
  - Values in grams (g) or milligrams (mg) per nutrient convention; kcal as integer

- **Portion region:**
  - Section title: `Portion`
  - Current serving text: `{n} serving{s} ({grams} g)` (singular/plural agreement; grams shown only when serving size is known from OFF)
  - Quick chips: `0.5×`, `0.75×`, `1×`, `1.5×`, `2×`
  - Custom link: `Use custom grams`

- **Quality indicators region:**
  - Section title: `Product information`
  - Nova chip: left bar color graded green-to-orange-to-red by group; label `PROCESSING` (10px uppercase) above value `Group 1` / `Group 2` / `Group 3` / `Group 4` (14px Medium)
  - NutriScore chip: left bar color by grade letter (A green, B light green, C yellow, D orange, E red); label `NUTRITION SCORE` above value `A` / `B` / `C` / `D` / `E`
  - Eco-Score chip: left bar color by grade letter; label `ENVIRONMENT` above value `A` / `B` / `C` / `D` / `E`
  - Long-press / tap-hold on any quality chip opens a small popover with 1-sentence plain-language explanation (see Conditional states below)

- **Ingredients region:**
  - Section title: `Ingredients`
  - Body (when expanded): OFF `ingredients_text` rendered as-is (no translation in v1 per en-US scope); long ingredient lists scroll within the section
  - Empty-state copy (when OFF has no ingredients data): `Ingredients not yet available in Open Food Facts for this product.`

- **Allergens region:**
  - Section title: `Allergens`
  - Body (when expanded): list of allergens from `off_allergens_tags`; each as a 32px chip Card 80 percent fill
  - User-flagged match treatment: matching chip rendered Orange `#B75E18` 16 percent fill with Orange 14px Medium text; section header gains an inline note above the chips `You flagged this allergen in your profile.` (13px Navy 90 percent)
  - Empty-state copy (no allergens in OFF data): `No allergens listed for this product.`

- **Data completeness notice (conditional):**
  - Score 0.5 to 1.0: no notice rendered
  - Score 0.3 to 0.5 (quiet notice): inline 36px Card 80 percent fill pill above the macros section, Info icon (Lucide, 14px Navy 70 percent) + text `Limited nutrition data available` (13px Navy 80 percent)
  - Score below 0.3 (more prominent notice): 64px tall card above macros, Card 90 percent fill, Orange 2px LEFT rule (2px wide Orange band on the left edge only), Info icon 16px + heading `Limited data for this product` (14px Navy 95 percent Medium) + body `Some nutrition details may be missing. You can save it anyway, or help by adding details to Open Food Facts.` (12px Navy 80 percent) + inline link `Contribute` (12px Teal underlined) that routes through §11.5's contribution flow

- **Macros override link:** `Macros wrong? Edit`

**CTAs:**
- `Save to meal` (Teal solid, 48px primary): commits the product as a `meal_items` row with `off_barcode` populated, `off_product_name`, `off_brand`, `off_serving_size_g`, `off_completeness_score`, `off_nova_group`, `off_nutrition_grade_fr` all set; user-applied portion multiplier stored on the row; if §11.7 multi-product flow is active, this advances to the result review with the new item appended; otherwise advances to standard result review
- `Scan another product` (text link or button per viewport): dismisses confirmation, opens §11.2 scanner overlay with the in-progress meal preserved; the second scan will be added to the same meal (see §11.7)
- `Cancel` (text link): dismisses confirmation, returns to NutriVision tab idle state; in-progress meal preserved if §11.7 multi-product flow is active
- Back chevron (top-left): returns to scanner overlay §11.2 to re-scan the same or different barcode; the current product is NOT saved
- Per-serving / Per-100g toggle: re-renders macro chips with the chosen denominator; portion adjustment retains its multiplier
- Quick chip tap (0.5× to 2×): sets portion multiplier; ring chart and slider sync; macro chips update inline
- Slider drag: continuous adjustment 0.25× to 5×; ring chart sweeps accordingly; macro chips update inline (debounced 100ms)
- `Use custom grams` link: replaces the quick chips + slider with a numeric input field (3-digit) + unit suffix `g`; the user can type a custom gram value
- Ingredients section header tap: toggles expanded / collapsed state
- Allergens section header tap: toggles expanded / collapsed state
- Quality chip long-press (mobile) or hover (desktop): opens an explanatory popover (200px wide, Card 95 percent, 12px Navy 90 percent text)
- `Macros wrong? Edit` link: opens §11.8 per-item macro override panel
- `Contribute` link (data completeness notice when score below 0.3): opens an OFF deep-link in a new browser tab to the product contribution page on Open Food Facts

**Conditional states:**
- **OFF response has image_url:** hero card uses the image
- **OFF response has no image:** hero card uses a 96x96 Card 90 percent fill block with Lucide Package icon centered at 40px Navy 60 percent
- **Single-serving product (e.g., a yogurt cup):** portion region defaults to `1×` and current serving text reads `1 cup (170 g)`; quick chips still available for explicit override
- **Bulk product (e.g., a bag of rice):** portion region defaults to `1 serving` with the per-serving grams from OFF
- **Per-100g toggle active:** macro chips show per-100g values; portion ring/slider greyed (portion adjustment is implicitly 100g); a small note appears below the toggle: `Switch to Per serving to adjust portion`
- **User-flagged allergen match:** allergens section auto-expanded; Orange section border; inline note above chips; matched chip Orange-treated; saving the meal does NOT block (user has agency); the matched-allergen state is recorded in `meal_items` for downstream practitioner visibility (170i scope) and for personalized Bio Optimization Analytics
- **Allergens section but no user-flagged allergens:** section collapsed by default; tap to expand to see all allergens
- **Data completeness score 0.5 to 1.0:** no notice
- **Data completeness score 0.3 to 0.5:** quiet notice pill above macros
- **Data completeness score below 0.3:** prominent notice card above macros with `Contribute` link
- **Reduced-motion preference set:** ring chart sweep replaced with immediate angular position change; macro chip value transitions are immediate, not animated
- **§11.7 multi-product flow active (this is the second or later scan in the same meal):** sticky bottom bar adds `Add to meal` instead of `Save to meal` (subtle copy change to signal continuity); the result review screen will reflect both items
- **OFF allergens_tags missing for this product:** allergens section shows the empty-state copy
- **OFF ingredients_text missing:** ingredients section shows the empty-state copy
- **OFF nova_group missing (n/a):** Nova chip rendered with `—` value and Navy 60 percent text (not red, not alarming); long-press popover reads `Processing classification not available for this product.`
- **OFF nutrition_grade_fr missing (n/a):** NutriScore chip similarly rendered with `—` value
- **OFF ecoscore_grade missing:** Eco-Score chip similarly rendered with `—`

**Accessibility commitments:**
- Hero card region is a `<header>` landmark; product name is `<h1>` so screen reader users navigate to it first
- Brand chip is a `<span>` with aria-label `Brand: {brand}`
- Barcode digits aria-label: `Barcode: {digits with spoken pacing}` (read digit-by-digit, not as a single large number)
- Macros section is `<section>` with aria-labelledby pointing to the `Nutrition` heading
- Each macro chip is a `<div role="group">` with aria-labelledby pointing to the label so screen reader users hear `Calories: 240 kcal`, `Protein: 12 grams`, etc.
- Per-serving / Per-100g toggle is a native `<button role="switch">` with aria-checked state; announces `Showing per serving` / `Showing per 100 grams`
- Portion section is `<section>` with aria-labelledby pointing to the `Portion` heading
- Ring chart has aria-label `Portion multiplier: {n} times`
- Quick chips are `<button>` elements with aria-pressed state; current selection announces `Selected: 1 times multiplier`
- Slider is `<input type="range">` (or equivalent ARIA slider) with aria-valuemin, aria-valuemax, aria-valuenow, aria-valuetext (`1.5 times`)
- Quality chips are each `<button>` with aria-label fully verbose: `Processing classification, Group 3. Tap for explanation.` `Nutrition score, B. Tap for explanation.` `Environment score, C. Tap for explanation.`
- Quality chip popover has aria-live="polite" announcement of the explanation copy on open
- Ingredients section header is `<button aria-expanded="false/true">` controlling the ingredients body region; on toggle announces `Ingredients expanded` / `Ingredients collapsed`
- Allergens section header same pattern; aria-expanded state
- User-flagged allergen match aria-live="polite" announcement on screen mount: `Contains {allergen}, flagged in your profile.` (announces ONCE per mount, not on every state change)
- Data completeness notice aria-live="polite" announcement on screen mount: `Limited nutrition data available for this product.` (quiet variant) or the longer body copy (prominent variant)
- Sticky bottom bar `Save to meal` aria-label: `Save {product name} to meal with {n} times portion`
- `Macros wrong? Edit` aria-label: `Edit macro values for this product`
- 44x44 tap targets enforced at every interactive element including the small per-serving toggle (44x32 visible, 44x44 hit area), quick chips (36x36 visible, 44x44 hit area), chevrons on collapsibles (24x24 visual, 44x44 hit area)
- Color contrast verified: 18px Navy 95 percent product name on Card is 6.5:1; 14px Medium chip values on Card 80 percent is 6.2:1; 11px label text Navy 70 percent on Card 80 percent is 4.7:1; Orange `#B75E18` matched-allergen chip text on Orange 16 percent fill is 5.1:1; Teal section headers on Card is 4.7:1; all exceed 4.5:1 (small text uses Medium weight where needed to clear the bar)
- Focus indicators: 2px Teal outline with 2px Navy offset on all interactive elements
- Tab order: back chevron > close > product name (not focusable, but landmark) > brand chip (not focusable, landmark only) > per-serving toggle > quick chips left-to-right > slider > custom grams link > quality chip 1 > 2 > 3 > ingredients section header > allergens section header > macros override link > cancel > scan another > save to meal
- Tab order intentionally ends at Save to meal: matches the §11.4 pattern from 170j — keyboard users review the product before they can commit
- Reduced-motion: ring chart sweep immediate; macro chip transitions immediate; collapsibles expand/collapse without slide animation
- iOS Voice Control: `Back`, `Close`, `Per serving`, `Per 100g`, `Half x`, `Three quarter x` / use platform pronunciation, `1 x`, `1.5 x`, `2 x`, `Custom grams`, `Processing`, `Nutrition score`, `Environment`, `Ingredients`, `Allergens`, `Edit macros`, `Cancel`, `Scan another`, `Save to meal`
- Android Voice Access mirrors

**Push-back / UX decisions:**
- **Quality indicators below the portion adjust region, not in the hero card.** This was the explicit dispatch question on hierarchy. Resolution: quality chips sit below portion adjustment in a dedicated `Product information` region. Reasoning: the user's first decision is identity (right product?), second decision is quantity (how much?), THIRD decision is context (what is this product like?). Putting Nova group or NutriScore in the hero card would make the user's first impression of a Nova 4 product be a value judgment, which is exactly the moralistic shaming risk the dispatch flagged. Below portion adjust, the chips are informative context, not gatekeeping criteria. Users can save anyway; the chips inform without blocking.
- **Quality chips use color-coded LEFT vertical bars, not full-fill color treatment.** A red Nova 4 chip with full red fill reads as a stop sign. A 4px left bar in the appropriate color provides the same coded information without the visual weight of judgment. The neutral chip body keeps the moral neutrality intact; the bar is the data signal.
- **Long-press / tap-hold for plain-language explanation.** Each quality chip's value alone is opaque (`Group 4`, `E`, `C` mean nothing to most users). The plain-language explanation popover translates: Group 4 popover reads `Ultra-processed food, typical of packaged snacks and ready-to-eat meals.` NutriScore E reads `Lower nutrition profile, typical of foods high in sugar, salt, or saturated fat.` The framing is descriptive (`typical of...`) not prescriptive (`you should avoid...`). Plain description; no shame.
- **`Limited nutrition data available` framing is honesty, not deficiency.** Spec said "transparency moment". Confirmed. The two-tier notice (quiet vs prominent) lets the system signal weakness in proportion to actual missing data: a 0.4 score gets a one-line pill; a 0.2 score gets a heading + body + Contribute link. Neither undermines the meal save: both versions tell the user `you can save it anyway`. Honesty is a feature; deficiency is a tone.
- **Allergen warning is auto-expanded with Orange border, not blocking.** The spec called for "non-blocking warning". Confirmed. The matched-allergen treatment is salient (Orange border around the section, Orange chip fill, inline note above) but the Save to meal CTA remains fully active. User has agency. The warning informs; it doesn't restrict.
- **Allergen note copy is matter-of-fact, not alarming.** `You flagged this allergen in your profile.` is the inline note above the allergens chips. It does not say `WARNING` or `ALLERGEN ALERT`. It says: you told us this is a concern; this product contains it; the decision is yours. The Orange treatment is the visual signal; the copy is the explanation.
- **Per-100g toggle disables portion adjustment, with explanatory note.** A user who switches to per-100g views the data on a normalized basis; the portion ring becomes semantically meaningless on a per-100g view. Greying it with the explanatory note `Switch to Per serving to adjust portion` keeps the affordance visible (for re-entry) while signaling that the action is currently inapplicable.
- **`Use custom grams` as a link, not a default mode.** Most users use the quick chips. The custom-grams affordance is for the user who weighed the product on a kitchen scale and wants precision. Surfacing it as a link below the chips/slider keeps the simple path simple while letting precision-users have their precision.
- **`Macros wrong? Edit` is below allergens, before the sticky CTA bar.** This positions it as a "before you save, you can edit" affordance, which is exactly when an attentive user would notice a discrepancy. The 13px treatment keeps it from competing with the save CTA.
- **Sticky bottom bar copy `Save to meal`, not `Save`.** Specifies the target (the meal in progress) which matches the multi-product flow (§11.7) where a user is building a meal across scans. The verb-noun phrasing is consistent across both single and multi-scan flows.
- **Density management via collapsibles.** Hero + macros + portion + quality + ingredients + allergens + macros-override is 7 vertical regions. The ingredients and allergens collapsibles compress two of the 7 to single-line headers by default (300px to 50px each when collapsed). The result on first paint: hero (200px) + macros (200px) + portion (220px) + quality (88px) + ingredients header (50px) + allergens header (50px) + override link (24px) + breathing room (48px) = ~880px total which fits within typical mobile viewport scroll comfortably. Allergens auto-expanded for matched-flag users adds ~120px, still within scroll.
- **Eye-landing order:** the user's eye lands first on the hero card (product identity confirmation, the user's primary question), then sweeps down to macros (the user's second question), then to portion adjust (the user's third). Quality indicators are deliberately below this primary information flow so they are encountered as context, not as gatekeeping.

**Mobile adaptation:** Full-viewport scrollable surface; sticky bottom bar with safe-area inset; macro grid degrades from 4-column to 2-column at viewports under 360px; quick chips wrap to two rows if needed at narrow viewports.

---

### §11.5 Not found / error fallback

**Layout:** Replaces the §11.4 product confirmation surface when the OFF lookup returns no product (404 or empty data). Full-viewport on mobile, 560px centered modal on desktop. Card `#1E3054` background.

From top to bottom:
1. **Header strip 56px:** back chevron left (returns to scanner overlay §11.2) + title `Product not found` 16px Medium centered + close `X` right
2. **24px gap; visual element:** 64px Package icon centered, Navy 60 percent (not Orange, not red — failure framing is gentle, not alarming)
3. **16px gap; headline (24px Navy 95 percent Medium centered, max 2 lines):** `We didn't find this product`
4. **12px gap; body (14px Navy 80 percent centered, max 3 lines):** `The barcode {digits} isn't in Open Food Facts yet. Here are some ways to log it.`
5. **24px gap; three action cards stacked vertically on mobile, single horizontal row on desktop (3-column equal-width):** each card 96px tall × full-width on mobile (~200px wide each on desktop)
6. **24px gap before sticky bottom bar:** `Cancel` text-link centered

**Action cards (each 96px tall, Card 90 percent fill, rounded 12px, 16px padding):**

- **Card 1: Photograph the product**
  - Icon left at 32px: Camera (Lucide, Teal `#2DA5A0`, strokeWidth 1.5)
  - Title (14px Navy 95 percent Medium): `Photograph the product`
  - Subtitle (12px Navy 70 percent): `Let our scan recognize the food.`
  - Tap action: opens the existing Photo capture flow (Prompt 170 vision pipeline); the scanner is dismissed; the meal-in-progress (if §11.7 multi-product) is preserved
- **Card 2: Enter macros manually**
  - Icon left at 32px: Edit3 (Lucide, Teal, strokeWidth 1.5)
  - Title: `Enter macros manually`
  - Subtitle: `Type the calories and macros from the nutrition label.`
  - Tap action: opens §11.8 per-item macro override panel in a blank-slate state (no OFF values to pre-fill); on save the item is added to the meal with `meal_items.off_barcode = null` and `user_overrode_macros = true`
- **Card 3: Contribute to Open Food Facts**
  - Icon left at 32px: ExternalLink (Lucide, Teal, strokeWidth 1.5)
  - Title: `Help everyone find this product`
  - Subtitle: `Add it to Open Food Facts, the free community catalog. Your next scan of this product will be instant.`
  - Tap action: opens a new browser tab to the OFF contribution page deep-linked with the barcode; the scanner overlay is dismissed; a small inline toast at the next NutriVision tab mount thanks the user (`Thanks for contributing. We'll find this product next time.`)

**Header copy:** `Product not found`

**Body copy:**
- Headline: `We didn't find this product`
- Body: `The barcode {digits} isn't in Open Food Facts yet. Here are some ways to log it.`
- Card 1 title + sub: `Photograph the product` / `Let our scan recognize the food.`
- Card 2 title + sub: `Enter macros manually` / `Type the calories and macros from the nutrition label.`
- Card 3 title + sub: `Help everyone find this product` / `Add it to Open Food Facts, the free community catalog. Your next scan of this product will be instant.`

**CTAs:**
- Card 1 tap: routes to Photo flow
- Card 2 tap: opens §11.8 panel blank
- Card 3 tap: opens OFF browser deep-link
- Back chevron: returns to scanner overlay §11.2
- Close `X`: dismisses fallback, returns to NutriVision tab idle state
- `Cancel` (bottom text-link): dismisses fallback, returns to NutriVision tab idle state

**Conditional states:**
- **`BARCODE_OFF_API_FALLBACK_TO_PHOTO_ENABLED = false`:** Card 1 (Photograph) is hidden; the remaining two cards expand to occupy the available vertical space; body copy updates to `The barcode {digits} isn't in Open Food Facts yet. You can enter macros manually, or help by adding it to the catalog.`
- **Network failure (not 404, but connection failure):** copy updates to `We couldn't reach Open Food Facts right now. Try again, or use one of these options.` and a `Try again` CTA appears below the body copy above the action cards
- **User has previously contributed to OFF via Card 3:** the next time they encounter this surface, a small inline `Last time you contributed: thank you!` note appears (12px Teal centered, just above the action cards) to reinforce the community-contribution loop

**Accessibility commitments:**
- Surface is `<main>` landmark with aria-labelledby pointing to the headline
- Headline is `<h1>`
- Each action card is a `<button>` (not `<a>`, even Card 3 which opens a tab — keyboard users should hear it as a button that opens an external page) with aria-label fully verbose: `Photograph the product. Let our scan recognize the food.` `Enter macros manually. Type the calories and macros from the nutrition label.` `Help everyone find this product. Add it to Open Food Facts, the free community catalog. Opens in a new tab.`
- Card 3 has aria-haspopup="dialog" semantic AND `target="_blank"` rel="noopener noreferrer"; the announcement includes `Opens in a new tab` so screen reader users are not surprised
- aria-live="polite" announcement on screen mount: `Product not found. The barcode {digits} isn't in Open Food Facts yet. Three options to log it.`
- 44x44 tap targets enforced on each card (96x full-width far exceeds)
- Color contrast: 24px Navy 95 percent headline on Card is 6.5:1; 14px body Navy 80 percent on Card is 5.4:1; 32px Teal icon on Card 90 percent fill is 4.7:1; all exceed 4.5:1
- Focus indicators on each card; tab order: back chevron > close > card 1 > card 2 > card 3 > cancel
- Reduced-motion: surface appears immediately (no slide-in)
- iOS Voice Control: `Back`, `Close`, `Photograph`, `Enter macros`, `Contribute`, `Cancel` (literal labels)
- Android Voice Access mirrors

**Push-back / UX decisions:**
- **Header tone is gentle, not punishing.** `Product not found` is the title; `We didn't find this product` is the headline. The dispatch flagged this: warmth, not shaming. The framing is "the catalog doesn't have this yet" not "your scan failed". The 64px Package icon in Navy 60 percent (not Orange, not red) reinforces the gentleness — this is not an error state, it is a "we don't have this data point yet" state.
- **Three cards, equal weight on mobile.** Vertical stack means each option is read individually; no option is buried below a fold. Order is intentional: Photograph first because it is the immediate workable alternative (you have the product in hand; you can photograph it now); Enter macros manually second because it is the precise-but-tedious option; Contribute to OFF third because it is the community-good option.
- **Card 3 framing positions community contribution as a benefit to the user, not a chore.** The dispatch question: how do you make contribution feel meaningful? Resolution: the title `Help everyone find this product` opens with community framing (everyone), and the subtitle closes with self-interest framing (`Your next scan of this product will be instant.`). Community + personal benefit in one card. The user understands they are helping the catalog AND themselves; the catalog benefit accrues globally on first contribution; the personal benefit accrues on next scan of the same product.
- **No `Skip` or `Add basics` card.** Considered offering a "log this barcode with minimal data" option (e.g., `meal_items.off_barcode` populated but no name/macros). Rejected: this creates an item in the meal with no nutritional content, which is dishonest data and would cascade into broken Bio Optimization Analytics rollups. The three valid options preserve data integrity.
- **Card 3 opens in a new tab, not in-app.** Open Food Facts contribution flow is a multi-step form on their site. Embedding it in-app via webview would create a UX dead-end (the user finishes the form, returns to ViaConnect, but their just-contributed product is not yet in the OFF cache). A new tab signals "you are temporarily on the OFF site; return when you are done"; the next NutriVision tab mount thanks the user for contributing.
- **Body copy includes the barcode digits.** Users sometimes need to identify which barcode they scanned (especially in §11.7 multi-product flow). Surfacing the digits anchors the failure to a specific scan.

**Mobile adaptation:** Three cards stack vertically (full-width minus 16px gutters); 96px tall each; vertical scroll if needed (rare); sticky-bottom cancel link.

---

### §11.6 Manual barcode entry modal

**Layout:** Modal on both mobile and desktop. Mobile: full-viewport. Desktop: 440px centered modal. Card `#1E3054` background.

From top to bottom:
1. **Header strip 56px:** close `X` left + title `Enter barcode` 16px Medium centered + (no right action)
2. **24px gap; instruction body (14px Navy 80 percent centered):** `Type the digits below the barcode on the package.`
3. **24px gap; barcode input region:**
   - Mobile: large numeric input field 56px tall × full-width minus 16px gutters; large 24px Navy 95 percent text monospace; 8-character minimum, 14-character maximum; numeric keypad bound; placeholder copy `Enter 8 to 14 digits`
   - Desktop: same input affordance with standard text input + numeric pattern validation
4. **12px gap; checksum validation feedback (inline below input, 12px text):**
   - Empty / typing: no feedback
   - Valid checksum (EAN-13, UPC-A, EAN-8, ITF-14): `Looks like a valid barcode` (12px Teal `#2DA5A0`)
   - Invalid checksum at full length: `Check the digits, the last digit doesn't match` (12px Orange `#B75E18`)
5. **32px gap; CTA region:**
   - Mobile: vertical stack with `Look up` primary at top (Teal solid, 48px tall, full-width minus 16px gutters, disabled state when input length below 8 or above 14 or checksum invalid); below: `Cancel` text-link centered
   - Desktop: horizontal with `Cancel` text-link left + `Look up` primary right
6. **Below CTA region: format hints panel (collapsible, optional):**
   - Header (14px Navy 95 percent Medium tap-to-toggle): `Where is the barcode?`
   - Body when expanded (13px Navy 80 percent): `Look for the rectangle of black bars on the back or side of the package. The digits below the bars are what you'll type here. Common formats are 8, 12, 13, or 14 digits.`

**Header copy:** `Enter barcode`

**Body copy:**
- Instruction: `Type the digits below the barcode on the package.`
- Placeholder: `Enter 8 to 14 digits`
- Valid feedback: `Looks like a valid barcode`
- Invalid feedback: `Check the digits, the last digit doesn't match`
- Format hints header: `Where is the barcode?`
- Format hints body: `Look for the rectangle of black bars on the back or side of the package. The digits below the bars are what you'll type here. Common formats are 8, 12, 13, or 14 digits.`

**CTAs:**
- `Look up` (Teal solid primary, disabled until valid): routes the entered barcode through `/api/nutrition/barcode/lookup`; on success advances to §11.4 product confirmation; on not-found advances to §11.5 fallback
- `Cancel` (text link): dismisses modal; if scanner overlay was open underneath (this was a fallback path from §11.2), returns to scanner; if opened directly from NutriVision tab idle state (rare, future affordance), returns to idle
- Close `X`: same as Cancel
- Format hints header tap: toggles expanded state

**Conditional states:**
- **Input empty:** Look up disabled
- **Input 1-7 digits:** Look up disabled; no checksum feedback yet (premature feedback at typing stage)
- **Input 8 digits (EAN-8) with valid checksum:** Look up enabled; Teal feedback shown
- **Input 8 digits with invalid checksum:** Look up disabled; Orange feedback shown
- **Input 9-11 digits:** Look up disabled (no valid format at this length); no feedback (still typing)
- **Input 12 digits (UPC-A) with valid checksum:** Look up enabled; Teal feedback
- **Input 12 digits invalid checksum:** Look up disabled; Orange feedback
- **Input 13 digits (EAN-13) with valid checksum:** Look up enabled; Teal feedback
- **Input 14 digits (ITF-14) with valid checksum:** Look up enabled; Teal feedback
- **Input 15+ digits:** Look up disabled; input prevents further typing past 14
- **Look up tapped, network failure:** modal stays open; below the CTA region, an inline error appears `Connection trouble. Check your network and try again.` (13px Orange); Look up re-enabled for retry
- **Look up tapped, OFF returns product:** modal dismisses; advances to §11.4
- **Look up tapped, OFF not found:** modal dismisses; advances to §11.5 fallback
- **Format hints collapsed by default:** the affordance is visible (header line); user expands if needed

**Accessibility commitments:**
- Modal has `role="dialog"`, aria-modal="true", aria-labelledby pointing to `Enter barcode`
- Focus moves to the input field on mount (so screen reader and keyboard users can immediately type)
- Input is `<input type="text" inputmode="numeric" pattern="[0-9]*">` so mobile shows numeric keypad while accepting only digits; aria-label `Enter barcode digits, 8 to 14 numbers`
- Checksum feedback element has aria-live="polite" so screen reader users hear `Looks like a valid barcode` or `Check the digits, the last digit doesn't match` as they type
- Look up button has aria-disabled state matching the disabled visual; aria-label `Look up barcode {digits if entered}`
- Format hints header is `<button aria-expanded="false/true">` controlling the format hints body region
- Tab order: close > input > checksum feedback (not focusable, but announced) > Look up > Cancel > format hints header
- 44x44 tap targets on all interactive elements
- Color contrast: 24px Navy 95 percent input text on Card is 6.5:1; 14px instruction Navy 80 percent on Card is 5.4:1; Teal feedback on Card is 4.7:1; Orange feedback on Card is 4.6:1
- Reduced-motion: modal appears immediately (no slide-in)
- iOS Voice Control: `Close`, `Look up`, `Cancel`, `Where is the barcode` (literal labels)
- Android Voice Access mirrors
- iOS / Android numeric keypad bound; supports paste from clipboard for users who copied a barcode from a website

**Push-back / UX decisions:**
- **Checksum validation inline at typing time, not on submit.** Spec said "accepts 8/12/13/14 with checksum validation". The validation could happen on Look up tap or inline as the user types. Chose inline because (a) it gives immediate feedback ("am I typing the right digits?") which catches typos as they happen, not after a wasted network round-trip; (b) it teaches the user that barcode format matters, which they may not know; (c) the Teal feedback at valid-length is a small win that reinforces correct entry.
- **Inline feedback only at full valid lengths (8, 12, 13, 14), not at intermediate lengths.** Premature feedback at 9 or 10 digits would be noisy and confusing. The feedback fires only when the user reaches a length that COULD be valid; from there they get either Teal (proceed) or Orange (re-check).
- **Format hints panel collapsed by default.** Most users know what a barcode is. The format hints exist for users who don't, but surfacing them in the primary path adds noise. The header line `Where is the barcode?` is a soft invitation: users who need it tap; users who don't ignore it.
- **No `Skip and use photo` shortcut from this modal.** Considered; rejected. The user got here either because they tapped manual entry from the scanner overlay (they already declined photo) or they came directly. Adding a `Skip and use photo` here muddies the modal's purpose, which is barcode entry. If they want photo, they cancel.
- **Numeric keypad mobile, not full keyboard.** `inputmode="numeric"` ensures mobile users get the numeric pad; this saves the step of finding number keys on the standard keyboard. Some barcodes contain only digits (8/12/13/14 of them); no need for letters.

**Mobile adaptation:** Full-viewport; safe-area inset bottom; numeric keypad opens immediately on input focus; modal swipes down to dismiss (same as Cancel).

---

### §11.7 Multi-product scan flow on result review screen

**Layout:** Augments the existing result review screen (the screen that displays after a meal is saved, whether from Photo, Scan Barcode, Restaurant, or Recipe entry path). 170l does not redesign the result review screen; it adds the multi-product affordances at specific anchor positions.

After a barcode-scanned product is saved to a meal:
1. **Existing result review header chrome remains:** meal name, meal time, edit affordances (including the 170j voice edit chip when applicable)
2. **Existing meal item card stack:** each scanned product appears as a meal item card; cards in stack order by scan time; the BARCODE-SOURCED cards have a small `Scanned` chip top-right (12px, Card 80 percent fill, 8px Navy 70 percent text Medium, ScanBarcode icon left at 10px Teal) to distinguish from photo-sourced items
3. **NEW: Multi-product affordance row 56px tall, anchored above the existing Save Meal CTA:** Card `#1E3054` 90 percent fill, 16px padding, two side-by-side CTAs
   - Left CTA (50 percent width): `Scan another product` (Teal solid, 40px tall, ScanBarcode icon left at 16px + label 14px Medium right)
   - Right CTA (50 percent width): `Add item manually` (Card 70 percent fill, 40px tall, Plus icon left + label 14px Medium right)
4. **Existing Save Meal CTA remains sticky-bottom:** unchanged

**Meal-in-progress indicator (top-of-screen during multi-product flow):**

If the user is in the middle of building a multi-product meal (defined: at least one barcode-scanned item is in the cart AND they tapped `Scan another product` returning to scanner), the scanner overlay §11.2 gains a small indicator strip at the top of the overlay (below the close `X` row):

- 36px tall Card `#1E3054` 95 percent fill bar, full-width minus 16px gutters
- Left content: ChefHat icon at 14px Teal + text `Meal in progress: {n} item{s}` (13px Navy 95 percent)
- Right content: `View meal` text-link (12px Teal underlined) that dismisses scanner and returns to result review

**Header copy:** N/A (result review screen header is owned by existing surface)

**Body copy:**
- Saved barcode-sourced meal item card: existing card chrome + small `Scanned` chip top-right
- `Scanned` chip text: `Scanned`
- Multi-product CTA row: `Scan another product` + `Add item manually`
- Meal-in-progress indicator: `Meal in progress: {n} item{s}` (singular/plural agreement)
- View meal link: `View meal`

**CTAs:**
- `Scan another product` (primary in multi-product row): opens scanner overlay §11.2; the meal-in-progress is preserved; the scanner overlay shows the meal-in-progress indicator
- `Add item manually` (secondary in multi-product row): opens a manual food entry flow (existing affordance from Prompt 170; the entry is added to the same meal)
- `View meal` (in meal-in-progress indicator on scanner): dismisses scanner without scanning, returns to result review
- `Save Meal` (existing sticky-bottom CTA): commits all items in the cart as a single saved meal record

**Conditional states:**
- **First barcode item just saved (transition from §11.4 to result review):** result review mounts; the multi-product CTA row appears with a brief 200ms fade-in; aria-live="polite" announces `Saved {product name} to meal. Scan another product, or save the meal.`
- **Multi-product CTA row position:** anchors directly above the existing sticky-bottom Save Meal CTA, NOT at the top of the meal item card stack; this keeps the action language ("scan more, or save") adjacent to the final commit action
- **`BARCODE_MULTI_PRODUCT_MEAL_ENABLED = false`:** the multi-product CTA row is hidden; after the first scan, the result review shows only the standard Save Meal flow (single-barcode meal); user can't add additional barcode items to the same meal
- **Mixed-source meal (one photo item + one barcode item):** photo item card shows existing chrome (no `Scanned` chip); barcode item card shows `Scanned` chip; multi-product CTA row available for adding more (either source)
- **`Scan another product` tapped, but user dismisses scanner without scanning:** result review remains intact, no changes to meal-in-progress
- **`Scan another product` tapped, OFF not found:** §11.5 fallback shows; if user picks Card 1 (Photograph) the photo flow opens with the meal-in-progress preserved (so the photographed item is added alongside the existing items)
- **More than 8 items in a single meal:** the multi-product CTA row remains active but a soft notice appears above it `This is a big meal. Save before adding more?` (12px Navy 70 percent centered); does not block adding more

**Accessibility commitments:**
- Multi-product CTA row is a `<div role="group">` with aria-label `Multi-product actions`
- `Scan another product` button aria-label: `Scan another product, add to this meal`
- `Add item manually` button aria-label: `Add an item manually to this meal`
- `Scanned` chip on meal item cards aria-label: `Item added by barcode scan`
- Meal-in-progress indicator on scanner aria-live="polite" announces on mount: `Meal in progress, {n} items. Scan to add more, or view meal.`
- `View meal` link aria-label: `View meal in progress`
- 44x44 tap targets on both multi-product CTAs (40x full-width / 2 each, so 50 percent width far exceeds)
- Color contrast: 14px Medium label on Teal Solid is 5.2:1; 14px Medium label on Card 70 percent fill is 6.2:1; 13px Navy 95 percent on Card 95 percent fill is 6.5:1; all exceed 4.5:1
- Reduced-motion: multi-product CTA row appears immediately on screen mount (no fade-in); meal-in-progress indicator on scanner appears immediately
- iOS Voice Control: `Scan another`, `Add manually`, `View meal` (literal labels)

**Push-back / UX decisions:**
- **`Scanned` chip on barcode-sourced items distinguishes source without judgment.** A meal item card from photo and a meal item card from barcode look identical except for the small chip. The chip is informational (you can see WHICH items came from a scan) without implying anything about quality. This becomes valuable when the user reviews the meal later and wants to remember which items were precise (barcode-sourced) vs. approximate (photo-recognized).
- **Multi-product CTA row anchored above Save Meal, not at top of stack.** Dispatch question: signal "you're building a meal across barcodes" vs "you just scanned a barcode". Resolution: the CTA row sits right above the Save Meal CTA, which is the spot the user's thumb is heading anyway. This makes the choice explicit at the moment of commitment: "save this meal, or add more first?" Anchoring at top of stack would push down the meal item cards and force scrolling, which hurts the meal-review use case.
- **Meal-in-progress indicator on scanner is small + dismissable.** The user's primary attention on the scanner is the viewfinder. A small 36px bar at the top with the item count + `View meal` link tells them "you're in a multi-scan flow" without taking visual prominence away from the scan. Compare to a large persistent banner: that would be hostile to single-scan users who happen to scan twice in a row.
- **`View meal` link on scanner dismisses scanner, returns to review.** Important: tapping `View meal` does NOT save the meal; it returns to review where the user can see what they have so far. From there, Save Meal commits, or they tap `Scan another product` to return to scanner. Two-direction navigation.
- **8-item soft notice is a transparency moment, not a block.** Some users genuinely scan 10+ items (a grocery haul, a multi-course meal). The notice at 8+ suggests "you might want to save before adding more" without blocking the flow. Reasoning: a saved meal can always be edited later; an unsaved meal lost to a network blip is a real frustration. The notice nudges toward safety.
- **Mixed-source meals are first-class.** A user can photograph a grilled chicken plate and then scan a packaged side dish in the same meal. The cards display side by side; the meal aggregates macros across both sources. No artificial barrier between entry paths.

**Mobile adaptation:** Multi-product CTA row sits inside the sticky-bottom region of the result review screen; on small viewports the Save Meal CTA + multi-product row combine into a 136px sticky-bottom band (40px multi-product + 48px Save Meal + 48px safe-area). Meal-in-progress indicator on scanner uses full-width with 16px gutters.

---

### §11.8 Per-item macro override panel

**Layout:** Modal on both mobile and desktop. Mobile: full-viewport. Desktop: 520px centered modal. Card `#1E3054` background.

From top to bottom:
1. **Header strip 56px:** close `X` left + title `Edit macros` 16px Medium centered + (no right action)
2. **16px gap; context strip (when opened from §11.4 product confirmation):** small Card 90 percent fill bar 48px tall with 48x48 product image left + product name (14px Navy 95 percent Medium) + barcode digits below (11px Navy 60 percent monospace); when opened from a meal item card on result review: same context strip with item name and barcode
3. **16px gap; explanatory note (13px Navy 80 percent):** `Edit the macros below if the values from Open Food Facts don't match the label. Your edits apply to this meal only. They don't update Open Food Facts.`
4. **24px gap; macro input grid (2-column on mobile, 3-column on desktop):** each input cell 80px tall × full-width / column count; label top (11px Navy 70 percent uppercase) + 14px Navy 95 percent input field below with unit suffix
5. **Fields:** Calories (kcal), Protein (g), Carbs (g), Fat (g), Fiber (g), Sugar (g), Sodium (mg)
6. **24px gap; reset link:** `Reset to Open Food Facts values` (13px Navy 80 percent underlined) — visible when at least one field has been edited and there are OFF values to reset to (blank-slate mode from §11.5 Card 2 hides this link)
7. **32px gap; CTA region:**
   - Mobile: vertical stack with `Save edits` primary at top (Teal solid, 48px tall, full-width minus 16px gutters); below: `Cancel` text-link centered
   - Desktop: horizontal with `Cancel` text-link left + `Save edits` primary right

**Header copy:** `Edit macros`

**Body copy:**
- Context strip: product name + barcode digits (no extra labels needed; the strip is contextual reminder)
- Explanatory note: `Edit the macros below if the values from Open Food Facts don't match the label. Your edits apply to this meal only. They don't update Open Food Facts.`
- Input cell labels: `CALORIES`, `PROTEIN`, `CARBS`, `FAT`, `FIBER`, `SUGAR`, `SODIUM`
- Unit suffixes: `kcal`, `g`, `g`, `g`, `g`, `g`, `mg` (inline right of each value)
- Reset link: `Reset to Open Food Facts values`
- Blank-slate mode (from §11.5 Card 2) explanatory note replacement: `Type the macros from the nutrition label. We'll add this item to your meal with these values.`

**CTAs:**
- `Save edits` (Teal solid primary): commits edited values to the meal_items row; sets `user_overrode_macros = true`; in blank-slate mode (from §11.5 Card 2) creates the meal_items row with `off_barcode = null` and the entered macros; returns to whichever surface opened the panel (§11.4 product confirmation, or §11.7 result review)
- `Cancel` (text link): discards edits; returns to caller surface
- Close `X`: same as Cancel
- `Reset to Open Food Facts values`: restores all fields to the OFF values; the link disappears once all fields match OFF again

**Conditional states:**
- **Opened from §11.4 product confirmation `Macros wrong? Edit` link:** input fields pre-fill with OFF values; reset link visible after any edit; on save, returns to §11.4 with the updated values surfaced on the macro chips
- **Opened from §11.5 Card 2 (Enter macros manually for not-found product):** input fields are empty placeholders; reset link is hidden (no OFF values to reset to); explanatory note replaced with the blank-slate version; on save, the item is added to the meal with `off_barcode = null` (because there's no product), `user_overrode_macros = true`, and a name that defaults to `Manual entry` (or a user-provided name if a name field is included in blank-slate mode)
- **Opened from a meal item card on result review (`Macros wrong? Edit` on the card):** input fields pre-fill with current `meal_items` values (which may already include prior overrides); reset link restores OFF values if `off_completeness_score IS NOT NULL` (i.e., there was an OFF product); on save, returns to result review with the card values updated
- **Sodium converted from grams to milligrams:** OFF returns `salt_100g` in grams; the panel displays sodium in mg per consumer convention (1 g salt = ~400 mg sodium); the conversion is silent in the panel but reflected accurately
- **Field validation:** all fields accept non-negative numeric input; kcal max 5000 per item (defensive cap); macros max 500g (defensive cap); sodium max 30000 mg (defensive cap); over-cap input shows inline 12px Orange validation message `Value seems unusually high. Check the label.` (does NOT block save; user has agency)
- **`Save edits` tapped with no changes:** save is enabled regardless; treating "I confirm the OFF values" as a valid action; in this case `user_overrode_macros = false` is preserved (no override flag fires)

**Accessibility commitments:**
- Modal has `role="dialog"`, aria-modal="true", aria-labelledby pointing to `Edit macros`
- Focus moves to the first input field (Calories) on mount
- Each input is an `<input type="number" inputmode="decimal" step="0.1">` (allowing decimals for protein/carbs/fat; kcal integer-only with `step="1"`)
- Each input has aria-label fully verbose: `Calories in kilocalories`, `Protein in grams`, `Carbs in grams`, `Fat in grams`, `Fiber in grams`, `Sugar in grams`, `Sodium in milligrams`
- Validation message has aria-live="polite" so screen reader users hear over-cap warnings without interruption
- Reset link aria-label: `Reset all values to Open Food Facts defaults`
- Explanatory note is a `<p>` with aria-describedby relationship to the input grid
- Tab order: close > input 1 (Calories) > 2 (Protein) > 3 (Carbs) > 4 (Fat) > 5 (Fiber) > 6 (Sugar) > 7 (Sodium) > Reset link (if visible) > Cancel > Save edits
- 44x44 tap targets enforced on inputs (80x full-width / column count) and CTAs
- Color contrast: 11px label uppercase Navy 70 percent on Card is 4.7:1 (Medium weight + uppercase letter-spacing clears the small-text bar); 14px input text Navy 95 percent on Card 80 percent input fill is 6.2:1; Teal Save CTA on Card is 4.7:1
- Reduced-motion: modal appears immediately
- iOS Voice Control: `Calories`, `Protein`, `Carbs`, `Fat`, `Fiber`, `Sugar`, `Sodium`, `Reset`, `Cancel`, `Save edits`
- Android Voice Access mirrors
- Numeric keypad bound on mobile inputs; supports paste

**Push-back / UX decisions:**
- **Explanatory note distinguishes meal-local edits from OFF catalog edits.** Spec said "your edits apply to this meal only. They don't update Open Food Facts." This is load-bearing copy because users may assume editing here also "fixes" the catalog. The note is matter-of-fact, not apologetic; just clear separation of scope.
- **Blank-slate mode (from §11.5 Card 2) is a real alternate state, not a hack.** When OFF doesn't have the product, the panel opens with empty fields and a different explanatory note (`Type the macros from the nutrition label.`). The same panel serves both "edit existing OFF values" and "enter values from scratch", with copy and reset-link visibility adapting.
- **Reset link only when at least one field is edited AND there are OFF values to reset to.** Showing the link permanently is noise (most users save without editing); hiding it permanently is hostile (users who edited can't go back). The conditional visibility is the right balance.
- **Validation caps are defensive but not blocking.** A user who enters 6000 kcal for a single item is probably wrong, but the system should not refuse the save — they might have a legitimate reason (custom protocol, edge-case food). The orange inline message says "this seems high" without blocking. User has agency.
- **Sodium unit is milligrams, consumer convention.** OFF returns salt in grams; the conversion in this panel surfaces sodium in mg because consumer nutrition labels in the US use mg sodium. The conversion is silent; the panel respects consumer convention.
- **Field order matches consumer nutrition label order.** Most US nutrition labels show: Calories, Total Fat, Sodium, Carbs, Fiber, Sugar, Protein. ViaConnect uses Calories, Protein, Carbs, Fat, Fiber, Sugar, Sodium because Protein-first is the convention across the meal item card surfaces (set in Prompt 170 §11.X). Consistency with sibling surfaces beats label-format conformance for this specific input pattern.

**Mobile adaptation:** Full-viewport; safe-area inset; numeric keypad opens immediately on first input focus; 2-column input grid; sticky-bottom CTA region.

---

### §11.9 Settings preferences additions

**Layout:** Sub-page under `/settings/nutrivision/barcode-scan` (or equivalent Settings tree position; mirrors the 170j voice editing settings pattern). Standard Settings page chrome: 56px header with back chevron + title `Barcode scanning`. Below: intro paragraph + 3 toggle rows (each 72px) + 1 attributions row + 1 privacy footer block.

Each toggle row has label + sub-label left, toggle switch right (44x24 native toggle component, Teal `#2DA5A0` when on, Navy 40 percent when off).

**Header copy:** Page title `Barcode scanning`

**Body copy:**
- Intro paragraph (one-time, 13px Navy 70 percent, full-width below title): `Scan barcodes on packaged foods to log them quickly. The first scan of a product can take a moment; later scans of the same product are nearly instant.`
- Toggle 1 (label 14px Navy 95 percent, sub 12px Navy 70 percent):
  - Label: `Quality indicators`
  - Sub: `Show processing, nutrition, and environment scores on scanned products. These are informational, not recommendations.`
  - Default: ON
- Toggle 2:
  - Label: `Audio chime on scan`
  - Sub: `Hear a short tone when a barcode is detected.`
  - Default: OFF
- Toggle 3:
  - Label: `Haptic feedback on scan`
  - Sub: `Feel a small vibration when a barcode is detected.`
  - Default: ON
- **Attributions row (72px, below all toggles):**
  - Label: `Open Food Facts attribution`
  - Sub: `Packaged food data is provided by Open Food Facts, licensed under the Open Database License.`
  - CTA right: text link `Open license details` (Navy 80 percent underlined) — routes to Settings > About > Attributions where the full attribution copy lives
- **Privacy footer block (separated by 24px gap above, Card `#1E3054` 90 percent inset 16px padding):**
  - Heading (12px Teal uppercase letter-spaced 0.05em): `Your privacy`
  - Body (13px Navy 80 percent): `Barcodes are public product identifiers; they don't say anything about you. We only send the barcode digits to Open Food Facts. We never share your identity or your meal data with them.`

**CTAs:**
- Each toggle row tap (anywhere on row): activates toggle (44x24 visual, 72x44 hit area via row padding)
- Attributions row text link tap: routes to Settings > About > Attributions
- No save button; toggles save state on tap (settings pattern across the app)

**Conditional states:**
- `BARCODE_SCAN_ENABLED` kill switch is false at server level: entire Settings page replaces toggles with a single inline note `Barcode scanning is currently off across ViaConnect.` (Navy 70 percent); attributions row still visible (the OFF attribution is licensing-mandated regardless of feature state)
- Toggle 1 (Quality indicators) OFF: the three quality chips in §11.4 are hidden entirely; the data completeness notice (§11.4) remains because it is about data quality, not value judgment
- Toggle 2 (Audio chime) OFF: detection in §11.2 has no audio feedback
- Toggle 3 (Haptic feedback) OFF: detection in §11.2 has no haptic feedback
- All three toggles OFF simultaneously: scanner still works (visual bracket pulse + aria-live announcements remain); the toggles control optional enhancements, not core functionality

**Accessibility commitments:**
- Each toggle is a native `<button role="switch">` with aria-checked state; on toggle change, screen reader announces `Quality indicators on` / `Quality indicators off`, etc.
- Sub-labels are aria-describedby on the toggle so screen reader users hear sub-label on first focus
- Attributions row link aria-label: `Open Food Facts attribution and license details, opens about page`
- Tap targets 44x44 enforced via 72px row height
- Color contrast: Teal-on toggle state on Card is 4.7:1; off-state Navy 40 percent on Card is 3.1:1 (allowed for off-state per WCAG since on/off state is reinforced by switch position not contrast alone; the moving thumb is white #FFFFFF for 8:1 contrast)
- Reduced-motion: toggle thumb slide animation replaced with immediate position change
- Privacy footer Heading `Your privacy` is `<h2>` so screen reader users can navigate to it by heading
- iOS Voice Control: each toggle named after its label: `Quality indicators toggle`, `Audio chime toggle`, `Haptic feedback toggle`
- Android Voice Access mirrors

**Push-back / UX decisions:**
- **Quality indicators toggle exists and defaults ON.** Dispatch did not explicitly request a toggle; spec did. Confirmed the design because some users find Nova / NutriScore / Eco-Score genuinely useful, and others find them moralistic noise. Defaulting ON exposes the feature; the toggle lets users who don't want them disable them. The sub-label is the key copy: `These are informational, not recommendations.` — this primes users to interpret the chips as data, not advice.
- **Audio chime defaults OFF; haptic defaults ON.** The dispatch question on auto-detect feedback resolves here too: haptic is on by default because it is unobtrusive and accessibility-positive (low-vision users get a confirmation signal); audio chime is off by default because chimes in public spaces (grocery store, restaurant) feel intrusive. Users who want audio confirmation can turn it on once.
- **Attributions row is a dedicated row, not buried in About.** ODbL requires attribution; the attribution lives in Settings > About > Attributions per spec §3.6. The Settings > Barcode scanning page has a dedicated row pointing to that location because users who interact with barcode scanning should be able to see the attribution chain easily. This is honesty + license compliance + UX clarity.
- **Privacy footer is its own block, mirroring 170j Settings pattern.** Same architectural pattern: Card-inset block with Teal "Your privacy" heading. Privacy as a section, not as fine print. The copy is short and direct: barcodes are not PHI; we send only the barcode to OFF; no identity, no meal data. This is the consumer-readable version of the audit-gate contracts.
- **Quality indicators sub-label is the load-bearing copy.** `These are informational, not recommendations.` This is the explicit anti-moralism framing. ViaConnect doesn't tell users a Nova 4 product is "bad"; it tells them what the classification says. The user decides what to do with the information.

**Mobile adaptation:** Same vertical stack; toggle rows full-width minus 16px gutters; privacy footer block stacks below attributions row.

---

## UX architecture summary

### Top 6 UX decisions

1. **§11.1 three-entry-path row: Photo and Scan Barcode are visually identical peers.** No `Most common` chip on Photo. No mode toggle. Same icon size, same card height, same label typography. The conceptual shift from "photo app" to "any-entry-point food logger" lands at the visual level: the user opens NutriVision and sees TWO equal entry options, not "Photo (the primary thing) plus a secondary scan button". Photo retains its left position to preserve muscle memory; Scan Barcode gains a 7-day `NEW` chip that dismisses on first use, providing discovery without permanent visual clutter. This is the most consequential decision in the filing because it determines whether the framing shift succeeds.

2. **§11.4 quality indicator chips below portion adjust with color-coded left bars, not full-fill treatment.** Nova 4 and NutriScore E feel moralistic when treated with full-color chips that scream judgment. Putting them below portion adjustment de-emphasizes them in the user's decision flow (identity > quantity > context, in that order). The 4px left bar carries the data signal without the visual weight of a stop sign. Long-press popovers translate opaque values into plain-language description (`Ultra-processed food, typical of packaged snacks and ready-to-eat meals.`) — descriptive, never prescriptive. The §11.9 toggle defaulting ON exposes the feature; the sub-label `These are informational, not recommendations.` primes correct interpretation. Users who find the chips noise can turn them off entirely.

3. **§11.4 allergen warning is salient + non-blocking, with matter-of-fact copy.** When a scanned product contains a CAQ Phase 6 flagged allergen, the allergens section auto-expands with Orange `#B75E18` 2px border, the matched chip gets Orange fill, and an inline note above reads `You flagged this allergen in your profile.` The Save to meal CTA remains fully active. User has agency: they can save the meal anyway. The warning informs; it does not restrict. The phrasing is not `WARNING` or `ALLERGEN ALERT` (alarming); it is `You flagged this allergen in your profile.` (factual).

4. **§11.4 data completeness notice is two-tier transparency, not deficiency.** Score 0.5 to 1.0: no notice. Score 0.3 to 0.5: quiet inline pill `Limited nutrition data available`. Score below 0.3: prominent card with `Contribute` link. The framing across both tiers is honest signaling, not "your meal is suspect". Both tiers say `you can save it anyway`. The prominent variant routes to the OFF contribution flow, turning a data-weakness moment into a community-benefit opportunity.

5. **§11.5 not-found fallback frames OFF contribution as community + personal benefit.** Card 3 (`Help everyone find this product`) opens with community framing in the title; closes with personal framing in the subtitle (`Your next scan of this product will be instant.`). The user understands they're helping AND benefiting. This converts what could feel like a chore into a meaningful contribution loop. The 64px Package icon in Navy 60 percent (not Orange, not red) signals the fallback as gentle, not as failure.

6. **§11.7 multi-product flow uses a `Scanned` chip + bottom-anchored CTA row + small scanner top-strip indicator.** The barcode-sourced item cards display a small `Scanned` chip to distinguish source without judgment. The multi-product CTA row anchors above Save Meal (not at top of stack) so the choice is explicit at the moment of commitment. The scanner overlay adds a small `Meal in progress: {n} items` strip at the top with a `View meal` link so users in multi-scan mode can navigate back without scanning. Mixed-source meals (photo + barcode in same meal) are first-class.

### Spec push-back captured

- **§11.1 three-entry-path:** Equal-weight peers with no `Most common` differentiator on Photo (spec was permissive; resolved on the side of fully equalizing the framing shift). `NEW` chip on Scan Barcode dismissable after first use.
- **§11.2 scanner overlay:** Helper text escalates in three steps (initial → 15-sec coaching → 30-sec manual-entry nudge) rather than static copy. Webcam feed remains visible behind the §11.3 loading pill so users see "the scan you just did is processing".
- **§11.3 loading mid-state:** Inline position match with the helper text region; no separate full-screen flash on detection.
- **§11.4 product confirmation:** Quality indicators below portion adjust (not in hero), color-coded left bars (not full fill), long-press popovers for plain-language explanations. Per-100g toggle disables portion adjustment with an explanatory note (`Switch to Per serving to adjust portion`). `Macros wrong? Edit` link below allergens, before sticky CTA. `Save to meal` label specifies the target. Tab order ends at Save to meal.
- **§11.5 not-found fallback:** Three cards equal weight; ordered Photograph → Manual → Contribute (immediate workable → precise → community); body copy includes barcode digits for identification; Contribute opens in new tab not in-app.
- **§11.6 manual entry:** Checksum validation inline at typing time (not on submit); feedback fires only at full valid lengths (8, 12, 13, 14); format hints panel collapsed by default.
- **§11.7 multi-product:** `Scanned` chip distinguishes source; multi-product CTA row anchors above Save Meal not at top of stack; meal-in-progress indicator on scanner is small + dismissable; 8-item soft notice is transparency not block.
- **§11.8 macro override panel:** Blank-slate mode for §11.5 Card 2 is a real alternate state; reset link conditional on edits + OFF values present; validation caps defensive but non-blocking; explanatory note distinguishes meal-local edits from OFF catalog edits.
- **§11.9 Settings:** Quality indicators toggle ON default with informational-not-recommendation sub-label; audio chime OFF default (intrusive in public spaces); haptic ON default (unobtrusive, accessibility-positive); attributions row dedicated, not buried in About.

### Accessibility commitments summary (most consequential)

- **WCAG 2.2 AA encoded inline at every surface**, never deferred to closing remarks. Every surface block has its own commitments section.
- **Auto-detect screen reader pattern in §11.2** is explicit: scanner mount → helper text announce → detection event announce (assertive) → loading pill announce → product found announce. Every state transition is announced; users never wonder what happened despite the absence of a shutter button.
- **Tab order ends at the primary commit action at every gated surface:** §11.4 ends at Save to meal; §11.6 ends at Look up; §11.8 ends at Save edits. Keyboard / switch-control users review before they commit, matching the safety architecture from 170j.
- **aria-live regions at every dynamic-content moment:** helper text updates (polite), detection event (assertive), loading state (polite), product found (polite), allergen match on screen mount (polite), data completeness notice on screen mount (polite), error states (assertive via role="alert").
- **iOS Voice Control + Android Voice Access compatibility** with literal identifiers at every interactive element (`Take photo`, `Scan barcode`, `Close`, `Flashlight`, `Enter manually`, `Look up`, `Save to meal`, `Scan another`, `Edit macros`, etc.) so platform voice control users navigate without learning new vocabulary.
- **Reduced-motion respected at every surface:** corner brackets become opacity flash (§11.2); ring chart sweep becomes immediate position change (§11.4); modals appear without slide animations (§11.5/§11.6/§11.8); toggle thumbs become immediate position change (§11.9).
- **44x44 tap targets enforced at every interactive element**, including small visual elements like quick chips (36px visual + padding to 44x44 hit area), section chevrons (24px visual + padding), and the `NEW` chip on Scan Barcode card (12px decorative; tap target is the parent card).
- **Color contrast 4.5:1 minimum verified at every surface** against brand token palette. Teal `#2DA5A0` on Card `#1E3054` measures 4.7:1 (the slimmest margin); all other combinations exceed. Small text uses Medium weight where needed to clear the bar.
- **Numeric keypad bound on §11.6 + §11.8 inputs** via `inputmode="numeric"` and `inputmode="decimal"` so mobile users get the correct keypad without finding number keys on the standard keyboard.

### Low-vision celebration approach (architectural, not literal)

Barcode scanning is a real accessibility unlock for low-vision users: they no longer need to read tiny nutrition panels by eye. The dispatch flagged that the design should celebrate this, not just enable it, AND that literal celebration copy (`Accessible!`) would be condescending. Resolution: the celebration is in the architecture, not the copy.

- **Visual contrast of the viewfinder cutout (§11.2):** the Navy 92 percent backdrop with the un-tinted cutout in the middle is a high-contrast visual frame that low-vision users with residual vision can use. The corner brackets are 3px stroke Teal (high contrast against both the un-tinted feed inside the cutout and the tinted backdrop outside).
- **Aria-live announcement chain is the primary path, not the fallback path:** the screen reader user's experience IS the announcement chain (mount → helper text → detection → looking up → product found → name + brand + macros). This is not "screen readers also work"; this is "the screen reader path is the architectural backbone". The visual treatment is the alternate path for sighted users.
- **Larger typography on the §11.4 product confirmation:** product name at 18px, macro values at 18px Medium, headlines at 24px on §11.5. Type sizing larger than typical chrome (which uses 14px / 13px) so low-vision users with magnification can read at lower zoom levels.
- **96x96 product hero image with fallback 40px Package icon:** the product image is large enough to be identifiable to low-vision users; the fallback icon is centered and prominent rather than hidden.
- **High-contrast `Scanned` chip in §11.7 mixed-source meals:** the chip distinguishes barcode items from photo items for low-vision users sorting through their meal history.
- **Audio chime opt-in (§11.9 toggle 2):** for users who prefer audio confirmation, the chime exists. Default OFF respects the silent-public-spaces majority; opt-in serves the user who wants the signal.
- **Haptic feedback default ON (§11.9 toggle 3):** confirmation by vibration is unobtrusive and effective for low-vision and Deaf users.

The celebration is the architectural backbone, the typography, the announcement chain, the high-contrast visual treatments, and the opt-in audio. It is not literal copy. Low-vision users feel celebrated because the product works as well for them as for fully-sighted users.

### Three-entry-path conceptual framing (the §11.1 anchor decision)

NutriVision pre-170l is a photo recognition app with secondary entry paths buried below. NutriVision post-170l is an any-entry-point food logger with two co-equal primary paths and two secondary paths. The framing shift is conveyed entirely through §11.1 visual treatment:

- Photo and Scan Barcode are identical cards (icon, label, sublabel, fill, height, typography weight). The equality is the framing.
- Photo retains the left position for muscle-memory continuity. Scan Barcode is on the right.
- Restaurant and Recipe are visually lighter (Card 60 percent fill, 40px pill height vs 144px card) and below the primary row, signaling "also available" without competing.
- The `NEW` chip on Scan Barcode is the only acknowledgment of newness; it dismisses after first use.
- No copy on the screen says "any-entry-point food logger" or "now with barcode scanning!". The framing shift is shown, not told.

This is intentional restraint. Telling users "we redesigned NutriVision" would be self-congratulatory product marketing inside the app. Showing them two equal cards lets them discover the new framing organically. The conceptual shift is the user's, not the product's announcement.

### Voice composition note (170j is shipped; voice on barcode-scanned items is free)

Per §8.8 + the architecture: voice editing (Prompt 170j, shipped) operates on the result review screen and works without modification on barcode-scanned items. The existing `add_item` operation on `useMealItemEdits` (the Phase 1c-3 `appendItem` mutator) targets items by name; barcode-scanned items have names from `off_product_name`, so voice utterances like "Add another one of those yogurts" target correctly.

No UI changes to the §11.10 voice edited chip (170j) are required. The chip continues to live on the result review screen header and counts voice sessions independent of how the meal was assembled.

Future NLU enhancements filed for 170l-supplement (not v1):
- `"the yogurt I just scanned"` referent resolution by scan recency
- Barcode-driven duplicate detection across voice utterances ("Did you mean another one of the Greek yogurt you scanned?")

These are nice-to-haves; the current free composition is meaningful immediately on 170l ship.

### Composition notes (cross-surface interactions)

- **§11.4 product confirmation does not collide with 170h Insights badge or 170i practitioner re-affirmation banner** because they live on different surfaces (Dashboard hero vs result review header vs in-flow confirmation).
- **§11.7 multi-product meals are compatible with 170d multi-photo composition (when 170d ships):** a meal could include 3 photographed plates AND 2 barcode-scanned items. The meal aggregates macros across all sources.
- **§11.4 + 170e restaurant context (when 170e ships):** chains generally don't have barcodes on prepared menu items; barcode scanning is for retail packaged foods. The two flows are non-overlapping.
- **§11.4 + 170f recipe match (when 170f ships):** if a user scans a barcode for an ingredient they often log in a recipe, the recipe-derived flow could trigger if pHash matches against a recipe-template's signature image; in v1 this composition is not active.
- **§11.4 + 170i practitioner sharing (when 170i ships):** the practitioner sees product name + brand + Nova group + NutriScore on shared meals; the raw barcode digits and the OFF completeness score are redacted per §14.3.
- **§11.4 + 170j voice editing (shipped):** voice ops apply identically to barcode-scanned items; the existing `useMealItemEdits` mutator handles both photo-sourced and barcode-sourced items by name.
- **Helix events (consumer-only per Standing Rule #8):** `barcode_scan_started` fires on §11.2 mount; `barcode_meal_logged` fires on §11.4 Save to meal; `barcode_off_not_found_fallback` fires on §11.5 mount; `barcode_macros_overridden` fires on §11.8 Save edits when `user_overrode_macros = true`; `barcode_off_contribution_clicked` fires on §11.5 Card 3 tap.

### Icons inventory (§11.11)

11 Lucide React icons used across the 170l surfaces. All at strokeWidth={1.5}. Sizing varies per surface (10px to 12px for inline chips, 14px to 24px for in-card icons, 32px to 96px for hero / action-card visuals). Color: Teal `#2DA5A0` for affirmative / feature use, Orange `#B75E18` for warning / matched-allergen / over-cap, Navy `#1A2744` for FAB foreground or hero icon when contrast demands, Navy 60 to 70 percent for secondary / decorative use.

| Icon | Where used | Semantic role |
|---|---|---|
| Camera | §11.1 Photo card icon, §11.5 Card 1 icon | Photo capture affordance |
| ScanBarcode | §11.1 Scan Barcode card icon, §11.7 `Scanned` chip icon, §11.7 multi-product row icon | Barcode scan affordance |
| Package | §11.4 hero image fallback, §11.5 visual element | Packaged product semantics |
| Flashlight | §11.2 top-right toggle (mobile) | Camera flashlight toggle |
| X | §11.2/§11.4/§11.5/§11.6/§11.8 close affordance | Close / dismiss |
| Loader2 | §11.3 loading pill spinner | Processing state |
| Info | §11.4 data completeness notice | Informational, non-alarming |
| Edit3 | §11.4 macros override link, §11.5 Card 2, §11.8 panel header | Edit / modify |
| ExternalLink | §11.5 Card 3, §11.9 attributions row | Opens external resource |
| AlertCircle | §11.2 network-failure error state | Warning / retry |
| ChefHat | §11.7 meal-in-progress indicator on scanner | Meal context |

Plus shared icons not unique to 170l: Plus (§11.7 add item manually), Mic (§11.10 from 170j, persists on result review), ChevronDown (collapsibles), ChevronLeft (back navigation), Settings2 (Settings page chrome).

All icons render at strokeWidth={1.5} per brand convention. No emoji substitutions.

<!-- HANNAH_WIREFRAMES_END -->

## When 170l can sensibly build (sequencing prerequisites)

1. Two library approvals from Gary (`@capacitor-mlkit/barcode-scanning` + `@zxing/library`) OR explicit web-only-first commitment
2. Hannah wireframes signed off by Gary with explicit approval on the three-entry-path tab restructuring
3. Gordon curated barcode test set (100 clear + 50 stressed barcodes, ~2 days at Blueprint kickoff)
4. Kelsey OFF attribution copy reviewed per ODbL terms
5. Three kill switches ready, all defaulted false at launch
6. iOS Info.plist NSCameraUsageDescription verified or added (likely already present from Prompt 170 photo capture path; verify at Observe)
7. /admin/corpus integration ready for 4 new barcode rollups (adoption rate, OFF coverage, processing-grade distribution, top brands — Arnold scope)
8. Composition integration test scaffolded for 170j voice path (already shipped) and 170i practitioner redaction (when shipped)

Estimated runway from Gary green-light to ship: **3-5 weeks** (shorter than 170j's 4-6 because Open Food Facts is already integrated and no new STT/NLU complexity).

## Four flags for Gary

### Flag 1: Two library approvals (mirrors 170j)

Per §4.4: `@capacitor-mlkit/barcode-scanning` (native) + `@zxing/library` (web). Both Apache 2.0, both well-maintained. Same pattern as 170j's `@capacitor-community/speech-recognition` approval.

Options:
- **(Recommended) Approve both alongside Blueprint kickoff**. Matches 170j pattern. Filing artifact: one-line `project_prompt_170l_libraries_approved.md` naming both packages.
- (Alternative) Ship web-only first using ZXing on Capacitor's web bridge; native plugin in follow-on. Bundle size impact then drops to 300 KB total. Native iOS/Android UX is less smooth (web Speech Recognition pattern, not platform-native).
- (Defer) Hold both decisions until production OFF coverage and scan accuracy data accumulates. Risk: blocks Blueprint kickoff entirely.

### Flag 2: NutriVision tab idle-state restructuring (most user-visible change)

§11.1 elevates Scan Barcode to peer status with Photo capture. Today's idle state has Photo as primary CTA with Restaurant selector + Recipe row as secondary. Two equal-weight buttons side-by-side conveys "both are first-class options" — but this is the most visible architectural shift in the 170-series since the original 170 launch.

**Recommended action**: green-light Hannah's wireframe for the three-entry-path row alongside this filing; review when she returns and confirm before Phase 1 build kickoff. Conceptually: NutriVision becomes "any-entry-point food logger" instead of "photo recognition app." Worth the framing call before code lands.

### Flag 3: Open Food Facts attribution (recurring Kelsey gap)

ODbL license MANDATES attribution in Settings → About → Attributions. The copy itself is not contentious (template per §3.6: "Packaged food data is provided by Open Food Facts (https://world.openfoodfacts.org/), licensed under the Open Database License (ODbL). Attribution maintained per license terms.") but copy review is Kelsey scope per spec.

This is the **third** prompt this session that names Kelsey as compliance owner (170i HIPAA-adjacent + Practitioner TOS; 170k per-jurisdiction food disclaimer + database licensing; 170l OFF attribution). The role is now load-bearing across the entire 170-series. Recurring recommendation: add Kelsey to the agent fleet.

If Gary doesn't add Kelsey, security-advisor can substitute for read-only review (drafts the copy, can't review compliance posture independently).

### Flag 4: Voice composition is free (170j shipped already handles it)

§8.8 mentions voice composition is "small but meaningful" but the practical reality after shipping 170j: barcode-scanned items have names from OFF, and the existing `add_item` operation on `useMealItemEdits` (Phase 1c-3 `appendItem` mutator) already handles "add another one." No NLU prompt augmentation needed for v1.

Future refinement (filed for 170l-supplement): "the yogurt I just scanned" referent resolution by scan recency. Not blocking v1.

**Recommended action**: noted, no decision needed. Just confirming the 170j-170l composition is essentially free.

## 170l-supplement anticipated per §24.7

Filed for future:
- Continuous-scan mode for multi-item grocery scanning (no pause between scans)
- Barcode-driven recipe matching ("the user scanned these same 3 barcodes last week; offer to log the same template")
- Store-loyalty-account linking for purchase history import (separate prompt due to scope + privacy implications)
- Brand-paid verified product entries (revenue feature, filed separately)
- Packaged-food-specific insights tuning (Nova 4 percentage trends, ultra-processed share over time)
- Voice referent resolution by scan recency ("the yogurt I just scanned")

## Composition with other 170-series prompts

- **170**: cascade pattern preserved; `meal_items.off_barcode` column from §6.1 actively populated for the first time; vision pipeline reused for the OFF-not-found photo fallback flow
- **170a + supplement**: `nutrition_photo_jobs.analyze_kind` extended with `'barcode'` value; error retry UX pattern reused
- **170b**: future Farmceutica products with barcodes route through `farmceutica_curated_foods` first per cascade priority (v1 has zero such products; reserved for future)
- **170c (PHI placeholder)**: barcode is not PHI; allergen alerts on scanned products reuse the Prompt 16 medication interaction pattern when matched against CAQ Phase 6 allergies
- **170d (multi-photo, filed)**: not applicable to barcodes (one barcode = one product)
- **170e (restaurant context, filed)**: non-overlapping (chains don't have barcodes on serve items)
- **170f (recipes, filed)**: barcode-scanned products can be saved as recipe templates; recipe matching is pHash-based and bypasses barcode scans
- **170g (custom model, corpus-gated)**: barcode-scanned meals tagged `data_source = 'barcode_scan'` for training data stratification; user macro overrides flagged for OFF data quality signal
- **170h (symptom analytics, filed)**: Nova 4 percentage + NutriScore signals enrich the Retrospective Pattern Engine for packaged food insights
- **170i (practitioner sharing, filed)**: redaction matrix extended in §14.3; practitioner sees brand + product name + Nova + NutriScore, not raw barcode + completeness
- **170j (voice, SHIPPED)**: composes for free via existing `add_item` operation; `appendItem` mutator pattern handles barcode-added items
- **170k (locale, filed)**: OFF coverage is global; product names render in product's native language; UI chrome localizes via Prompt 173 when 173 ships

## Ratification posture (2026-05-30)

Gary acknowledged 170l at spec level 2026-05-30 by pasting the full spec into the session. Per ViaConnect convention this counts as filed and ratified at the spec level. No code change required this turn.

**Distinct from 170k (deeply blocked) and matches 170j (fully unblocked)**: 170l dependencies are satisfied today. If Gary green-lights build now, no calendar wait blocks Blueprint kickoff. The single decision gating action is library approvals (Flag 1).

## Related

- Prompt 170 Phase 1 (shipped 2026-05-29 commit `47a7663d`; the cascade and `meal_items.off_barcode` column 170l activates)
- Prompt 170a + 170a-supplement (ratified 2026-05-29; `nutrition_photo_jobs.analyze_kind` enum 170l extends)
- Prompt 170b (filed; depth sensors, curated foods seed pattern)
- Prompt 170c (placeholder; PHI redaction)
- Prompt 170d (filed; multi-photo, not applicable)
- Prompt 170e (filed; restaurant context, non-overlapping)
- Prompt 170f (filed; recipe-aware, future barcode→recipe enhancement)
- Prompt 170g (filed; custom model, barcode corpus stratification)
- Prompt 170h (filed; symptom analytics, Nova + NutriScore signals)
- Prompt 170i (filed; practitioner sharing, redaction matrix extension)
- Prompt 170j (SHIPPED 2026-05-30; voice composes for free)
- Prompt 170k (filed; locale-aware, blocks on 173 which is unpasted)
- Heritage: Prompt 170e §9.1 (entry-path-as-first-class pattern); Prompt 170j §3.1 (library approval pattern); Prompt 170k §9.6 (license attribution discipline)
