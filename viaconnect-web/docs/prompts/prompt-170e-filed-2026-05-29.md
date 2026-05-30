# Prompt 170e Filed: Restaurant-Meal Recognition with Chain Menu Constraint

Date: 2026-05-29
Status: **Filed at spec level; ratified.** No code work in this turn.
Memorialized by: Jeffery (orchestrator) per Gary's "Memorialize + Hannah UX dispatch" directive.
Wireframe author: Hannah (UX), filling Section 9 below.

## Mission (one line)

Add a restaurant context layer to NutriVision so meals captured at known chains use the chain's official nutrition disclosure data instead of open-domain vision inference, with 95 percent within plus or minus 5 percent macro accuracy at lower per-meal cost ($0.02 chain vs $0.05 open-domain).

## Activation posture

Restaurant context is OPT-IN per capture. Three entry paths: geolocation auto-suggest (opt-in via Settings toggle), search modal ("I'm at..." button), recents and favorites chip row. User can always "Capture without a restaurant" for standard Prompt 170 flow.

Geolocation is opt-in via separate Settings toggle. Position is queried one-time per capture, used only for catalog query within 500m, never stored beyond request lifetime.

## Three meal classes

| Class | Trigger | Pipeline | Accuracy target | Per-meal cost |
|---|---|---|---|---|
| Chain meal (full constraint) | `restaurant.chain_type='chain'` | Claude Vision constrained against menu | 95 percent within +/- 5 percent | $0.02 |
| Independent restaurant (tagged) | `restaurant.chain_type='independent_user_added'` | Standard Prompt 170 pipeline + tag | Phase 1 baseline | $0.05 |
| No restaurant context | `restaurant_id` null | Standard Prompt 170 pipeline | Phase 1 baseline | $0.05 |

## Why this is filed, not built

170e prerequisites:

### Hard structural blockers

| Blocker | Status | Resolution path |
|---|---|---|
| Gordon catalog: 30 chains + ~3,000-5,000 menu items + citation files | Not started | Multi-week human-led data sourcing project (chain official nutrition APIs + PDFs + USDA Branded cross-validation). Gordon agent is read-only with Read/Grep/Glob; cannot WebFetch external chain disclosures. **Gary sources or assigns externally.** |
| `@capacitor/geolocation` runtime dep | Not installed | Standing rule §18: needs Gary approval before geolocation code lands |
| `CLAUDE_CHAIN_VISION_MONTHLY_CAP_USD` env var | Not set | §10.4: default $3,000; needs operational decision before chain Vision spend uncapped |
| `nutrient_source` CHECK reconstitution | Documented exception to append-only | §7.8: DROP CONSTRAINT + ADD CONSTRAINT; low-risk one-shot when migration lands |
| `pg_trgm` extension availability | Not verified on live | §13.1 Observe step before search endpoint can be built |

### Soft blockers

- **Production bake of 170**: Pushed 2026-05-29 commit `47a7663d`. Independent restaurant accuracy targets (§11.2) reference Phase 1 baseline we haven't measured.
- **Cost claim assumes LogMeal primary**: §10.1 says chain meals are 60 percent cheaper than open-domain. Our current state is Gemini-as-primary (no LOGMEAL_API_KEY). Cost comparison needs adjustment against actual baseline.
- **Resolver cascade insertion**: §7.8 adds `restaurant_menu` as nutrient_source value but the Phase 1d resolver currently goes Curated -> USDA -> OFF -> vision. restaurant_menu would jump ahead of all of them on chain meals; the resolver branch needs spec-locked behavior.

## Independence notes

- **170b (depth sensors): orthogonal.** Per §6.5, depth tile feeds optional portion-confirmation surface on chain meals when 170b is shipped. Each ships independently.
- **170c (dietary restrictions + ED safety): composes.** A Chipotle bowl with dairy when the user is flagged dairy-sensitive in CAQ Phase 6 triggers the standard alert from 170c before save.
- **170d (multi-photo): composes.** Each frame is recognized against the chain menu; ensemble runs the same way. Disagreement detection remains valuable (one frame called "Bowl" another called "Burrito").

## Cost model (filed reference)

| Chain meals per month | Per-meal cost | Monthly Claude Vision cost |
|---|---|---|
| 1k | $0.02 | $20 |
| 10k | $0.02 | $200 |
| 100k | $0.02 | $2,000 |

Compare to baseline open-domain at 100k meals/mo: $4,000-$6,000 (per 170a §4.6). Chain meals are simultaneously the most accurate and the cheapest path.

Cap pattern from 170a §4.6 applies: 80 percent soft warn, 100 percent hard stop falls back to standard open-domain pipeline tagged with the restaurant for the remainder of the month.

## Helix events (filed for 170e build phase)

To be inserted into `helix_earning_event_types` when 170e builds:
- `restaurant_meal_logged` (6 pt — higher than nutrivision_meal_logged 5pt because restaurant context requires an extra deliberate step)
- `chain_meal_high_match` (2 pt when restaurant_meal_match >= 0.85)
- `restaurant_favorite_added` (1 pt)
- `restaurant_user_added` (2 pt — incentivizes catalog growth)
- `chain_customization_fully_confirmed` (1 pt)

## Migrations filed (7)

To be applied when 170e builds:
- `20260615_restaurants.sql` (new table + pg_trgm extension if not present)
- `20260615_restaurant_menu_items.sql` (new table; UNIQUE (restaurant_id, slug, menu_version))
- `20260615_restaurant_visits.sql` (new table; RLS user-scoped)
- `20260615_meal_items_restaurant_cols.sql` (4 new columns + index)
- `20260615_meals_restaurant_cols.sql` (2 new columns)
- `20260615_helix_restaurant_events.sql` (5 new event rows)
- `20260615_meal_items_nutrient_source_restaurant.sql` (CHECK reconstitution — documented exception)

The CHECK reconstitution is the only non-trivial migration in 170e. DROP + ADD CONSTRAINT in one atomic statement preserves data integrity.

## Kill switch

`RESTAURANT_RECOGNITION_ENABLED` env var. Defaults false at first launch for 24h smoke margin, then flipped true after monitoring confirms stability. When false: selector card hidden, geolocation queries suppressed, analyze rejects `restaurant_id` set with 400.

## Section 9: Wireframes (Hannah)

Hannah fills the wireframes for each surface below. These are the second longest-pole Blueprint deliverable per spec §20.4 (Gordon's catalog is the longest-pole; Hannah's wireframes run in parallel).

### 9.1 NutriVision tab idle state restaurant selector card

**Placement.** Sits in the NutriVision tab idle state between the tab header and the capture CTA. Below the existing capture preview thumbnail row when present. Above any CorpusOptInBanner already shown in Phase 1l.

**Tone reference.** Matches CorpusOptInBanner warmth: opt-in, helpful, never pushy. Selector card is dismissible per session but reappears each new NutriVision session unless the "Always show the restaurant selector" toggle is off (see §9.7).

**Mobile 375 portrait, expanded state (no restaurant selected):**

```
+---------------------------------------------+   <- viewport 375
|  NutriVision                                |
|  Bio Optimization                           |
+---------------------------------------------+
|                                             |
|  [ capture preview / hero region ]          |
|                                             |
+---------------------------------------------+
| +-----------------------------------------+ |   <- selector card
| |  Eating out?                            | |   16px Instrument Sans Medium, Navy text
| |  Tag your restaurant for a sharper      | |   13px Instrument Sans Regular, Navy 70%
| |  read on your meal.                     | |
| |                                         | |
| |  [MapPin] At Chipotle?  [Sweetgreen?]  >| |   <- §9.3 chips, scrollable
| |                                         | |
| |  Recents                                | |   12px Instrument Sans Medium, Navy 60%
| |  [Star] Chipotle  [Cava]  [Sweetgreen] >| |   <- favorites + recents row, scrollable
| |                                         | |
| |  +-----------------------------------+  | |
| |  | [Search]  I'm at...               |  | |   <- primary CTA, Teal #2DA5A0 bg, white text
| |  +-----------------------------------+  | |   <- 48px tall, 16px radius
| |                                         | |
| |  Capture without a restaurant           | |   <- text link, Teal underline, 14px
| +-----------------------------------------+ |
|                                             |
+---------------------------------------------+
|  [ capture CTA button: large Teal ]         |
+---------------------------------------------+
```

**Mobile 375 portrait, collapsed state (restaurant selected):**

```
+---------------------------------------------+
|  NutriVision                                |
|  Bio Optimization                           |
+---------------------------------------------+
|                                             |
|  [ capture preview / hero region ]          |
|                                             |
+---------------------------------------------+
| +-----------------------------------------+ |
| | [logo 32] Chipotle      [Pencil] Change | |   <- 56px tall card, Card bg #1E3054
| +-----------------------------------------+ |   <- logo OR Utensils fallback in Teal circle
|                                             |
+---------------------------------------------+
|  [ capture CTA button: large Teal ]         |
+---------------------------------------------+
```

**Desktop responsive (>=md breakpoint).** Card max-width clamped to 480px, centered above capture CTA. Chip rows preserve horizontal scroll behavior; they don't expand into wrap-grids on desktop because that breaks the "scan recent options fast" affordance.

**Interaction notes.**

- Card mounts with fade + 4px translateY-down to up over 200ms. Respects `prefers-reduced-motion` (no translateY, opacity only).
- Geolocation chip row only renders when (a) the Settings toggle in §9.7 is on AND (b) at least one chain in the catalog is within 500m of the queried position. Otherwise the row is omitted; no skeleton, no empty state.
- Recents row shows the last 5 distinct restaurants from `restaurant_visits` ordered by most recent first, with favorites pinned to the front when the user has any. Tap a chip to set the restaurant and collapse the card immediately.
- "I'm at..." CTA is 48px tall, full width, Teal background, Instrument Sans Medium. Tap opens §9.2 search modal.
- "Capture without a restaurant" text link is 14px Teal underline, 44px tap target via vertical padding. Tap collapses the card and routes directly into capture with `restaurant_id` null.
- Collapsed pencil affordance: tap anywhere on the card to reopen expanded state. Pencil icon is decorative; whole card is tappable.
- Collapse animation is 240ms ease-out; height transitions from auto to 56px.

**Copy strings.**

- Header: "Eating out?"
- Subhead: "Tag your restaurant for a sharper read on your meal."
- Recents label: "Recents"
- Favorites pin indicator: filled Star icon, Teal, 14px before name
- Primary CTA: "I'm at..."
- Skip link: "Capture without a restaurant"
- Collapsed change action: "Change"

**Brand tokens.**

- Card background: Card #1E3054
- Card border: 1px Card, but with 8% white inner shadow for elevation
- Header text: white at 95% opacity
- Subhead text: white at 70% opacity
- Chip background (recents): Navy #1A2744 with 12% white border
- Chip background (geolocation): Card #1E3054 with Teal MapPin
- Primary CTA: Teal #2DA5A0 background, white text, 16px radius
- Skip link: Teal #2DA5A0 text
- Lucide icons at strokeWidth 1.5: MapPin, Search, Star, Pencil

**Accessibility notes.**

- Selector card root: `role="region"`, `aria-label="Restaurant selector"`.
- Geolocation chips: each `<button>` with `aria-label="Tag this meal as Chipotle, nearby"`.
- Recents row: scroll container is `role="list"`; each chip is `role="listitem"` with `<button>` inside.
- Primary CTA: `aria-label="Search for the restaurant you're at"`.
- Skip link is announced first in focus order after the search CTA, so keyboard users hit it without scrolling.
- When the card collapses, focus returns to the CTA below it (capture button) so screen readers don't get stranded.
- Screen-reader-only text on collapsed card chevron: "Change selected restaurant".
- All tap targets minimum 44x44 per WCAG 2.5.5; chips have additional 8px vertical padding around the visible chip pill for motor-impairment forgiveness.

### 9.2 Restaurant search modal

**Placement.** Full-screen sheet on mobile slides up from bottom over 280ms. Desktop centered card 560px wide, 640px tall maximum, backdrop blur over the NutriVision tab.

**Empty-input ordering decision.** When the search input is empty, results render in this order:

1. Favorites (starred restaurants), most recently used first
2. Recents (last 5 distinct from `restaurant_visits` minus anything in favorites already shown), most recent first
3. Top-coverage chains in the user's region, ordered by `restaurant.coverage_tier` descending

Rationale: favorites first respects deliberate user choice; recents next is the strongest signal of intent; coverage tier last gives new users something useful to tap without forcing them to type. Avoids the cold-start problem where the modal opens with a blank list.

**Mobile 375 portrait, empty input state:**

```
+---------------------------------------------+
| [X]  Where are you eating?                  |   <- 56px header, Card #1E3054
+---------------------------------------------+
| +-----------------------------------------+ |
| | [Search]  Search restaurants            | |   <- input, Navy bg, 48px tall, autofocused
| +-----------------------------------------+ |
+---------------------------------------------+
| Favorites                                   |   12px Instrument Sans Medium, Navy 60%
|                                             |
| +-----------------------------------------+ |
| | [logo48]  Chipotle              [Star]  | |   <- 72px row, tap to select
| |            47 menu items                | |
| |                                       > | |
| +-----------------------------------------+ |
| +-----------------------------------------+ |
| | [logo48]  Cava                  [Star]  | |
| |            38 menu items                | |
| |                                       > | |
| +-----------------------------------------+ |
|                                             |
| Recents                                     |
|                                             |
| +-----------------------------------------+ |
| | [logo48]  Sweetgreen                    | |
| |            52 menu items                | |
| |                                       > | |
| +-----------------------------------------+ |
| +-----------------------------------------+ |
| | [Utensils]  Joe's Pizza                 | |   <- independent fallback
| |              Independent restaurant     | |
| |                                       > | |
| +-----------------------------------------+ |
|                                             |
| Suggested chains                            |
|                                             |
| +-----------------------------------------+ |
| | [logo48]  Chick-fil-A                   | |
| |            34 menu items                | |
| |                                       > | |
| +-----------------------------------------+ |
|  ...                                        |
|                                             |
+---------------------------------------------+
|  Can't find your restaurant? Add it.        |   <- sticky bottom, Teal underline
+---------------------------------------------+
```

**Mobile 375 portrait, with input typed ("chip"):**

```
+---------------------------------------------+
| [X]  Where are you eating?                  |
+---------------------------------------------+
| +-----------------------------------------+ |
| | [Search]  chip               [X clear]  | |
| +-----------------------------------------+ |
+---------------------------------------------+
| +-----------------------------------------+ |
| | [logo48]  Chipotle              [Star]  | |   <- exact + favorite badge
| |            47 menu items                | |
| |                                       > | |
| +-----------------------------------------+ |
| +-----------------------------------------+ |
| | [logo48]  Chick-fil-A                   | |   <- fuzzy match
| |            34 menu items                | |
| |                                       > | |
| +-----------------------------------------+ |
|                                             |
+---------------------------------------------+
|  Can't find your restaurant? Add it.        |
+---------------------------------------------+
```

**Mobile 375 portrait, no results:**

```
+---------------------------------------------+
| [X]  Where are you eating?                  |
+---------------------------------------------+
| +-----------------------------------------+ |
| | [Search]  xyz                [X clear]  | |
| +-----------------------------------------+ |
+---------------------------------------------+
|                                             |
|                                             |
|              [Utensils 48]                  |   <- decorative, Navy 30%
|                                             |
|         No restaurants match "xyz"          |   16px, Navy 80%, centered
|                                             |
|        Try a shorter search term,           |   14px, Navy 60%, centered
|        or add this restaurant yourself.     |
|                                             |
|     +-------------------------------+       |
|     |  [PlusCircle]  Add a restaurant       |   <- secondary, Card bg, Teal text
|     +-------------------------------+       |
|                                             |
|                                             |
+---------------------------------------------+
```

**Desktop responsive (>=md).** Modal is a 560x640 card with backdrop. Same content, same ordering. Result rows compress to 64px tall (vs 72px mobile) to fit more density.

**Interaction notes.**

- Search input autofocused on mount; keyboard appears immediately on mobile.
- Debounce 150ms before query fires. Empty input shows favorites + recents + suggested chains immediately (cached client-side).
- Each result row is a 72px tap target on mobile (64px desktop). Tap anywhere on row selects and dismisses modal.
- Logo is 48x48 on mobile inside an 8px-radius rounded square. When `chain_logo_url` is null, render Lucide Utensils strokeWidth 1.5 in a Card-colored circle.
- Star icon on the right side of favorited rows is informational only, not a toggle in the search modal (favorite toggling lives on the result review screen and idle selector chip long-press).
- Chevron right indicates tap affordance; not interactive on its own.
- "Can't find your restaurant?" link sticks to the bottom safe area, always visible while scrolling. Tap opens §9.6 add-manually modal.
- Modal dismiss: tap X (top-left), swipe down on mobile, ESC on desktop, backdrop tap on desktop.

**Copy strings.**

- Header: "Where are you eating?"
- Search placeholder: "Search restaurants"
- Section headers: "Favorites" "Recents" "Suggested chains"
- Subtitle for chain rows: "{n} menu items" (singular: "1 menu item")
- Subtitle for independent rows: "Independent restaurant"
- Empty result heading: "No restaurants match \"{query}\""
- Empty result hint: "Try a shorter search term, or add this restaurant yourself."
- Empty result CTA: "Add a restaurant"
- Bottom link: "Can't find your restaurant? Add it."
- Clear input button: aria-label "Clear search"
- Close button: aria-label "Close restaurant search"

**Brand tokens.**

- Modal background: Card #1E3054
- Header background: Card with 1px Navy divider
- Input background: Navy #1A2744 with 12% white border
- Row background: transparent; on hover/press Navy #1A2744 with 200ms ease
- Section header text: white 60%
- Restaurant name: white 95%, Instrument Sans Medium 16px
- Subtitle: white 60%, Instrument Sans Regular 12px
- Favorite Star: Teal #2DA5A0
- Sticky bottom link: Teal #2DA5A0 underlined
- Lucide icons at strokeWidth 1.5: Search, X, Utensils, Star, PlusCircle, ChevronRight

**Accessibility notes.**

- Modal: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="restaurant-search-title"`.
- Initial focus lands on the search input. ESC closes the modal and returns focus to the "I'm at..." CTA in §9.1.
- Each result row is a `<button>` with composite aria-label: "Chipotle, 47 menu items, favorited" (or "Independent restaurant" for indies).
- Section headers use `<h2>` semantically, visually styled small.
- Result rows announced as a list (`role="list"` / `role="listitem"`).
- Sticky bottom link is in focus order after the last result row, never trapped.
- Live region announces result count change on search: "12 restaurants found" / "No restaurants found".
- Touch targets 72px tall on mobile satisfy motor-impairment guidance; entire row is tappable, not just the chevron.

### 9.3 Geolocation suggestion chip row + Settings toggle behavior

**Voice for geolocation framing.** Conversational and second-person, never surveilling. We never say "we detected you are at" because that implies passive tracking. We say "Are you at Chipotle?" as a friendly check-in. The OS permission prompt is always preceded by an in-app tooltip explaining why and what happens to the position data.

**Chip row placement.** Inside the §9.1 selector card, immediately above the recents row. Horizontal scroll with overflow hidden and right-edge fade mask to hint additional chips offscreen.

**Mobile 375 portrait, geolocation chip row (with chips populated):**

```
| +-----------------------------------------+ |
| |  Nearby                                 | |   12px Instrument Sans Medium, Navy 60%
| |                                         | |
| | +-----+ +------------+ +-------+ ----- > |   <- chip row, scroll right
| | |[Pin]| |[Pin]       | |[Pin]  |       | |
| | |Chip-| |Sweet-      | |Cava   |       | |
| | |otle?| |green?      | |?      |       | |
| | +-----+ +------------+ +-------+       | |
| |                                         | |
```

Each chip: 40px tall, 12px horizontal padding, Card #1E3054 background, Teal MapPin icon (strokeWidth 1.5, 16px), white 90% text, 20px border radius. Question-mark in the chip label is deliberate, signaling a check rather than a fact.

**Tooltip before OS permission prompt (first time only per session).** When the geolocation Settings toggle is enabled but no position has been queried yet this session, the chip row area shows a one-time tooltip immediately on first NutriVision tab visit:

```
| +-----------------------------------------+ |
| |  Nearby                                 | |
| |                                         | |
| |  +-----------------------------------+  | |   <- tooltip card
| |  | [MapPin]  Check nearby restaurants?| |   16px Medium, white
| |  |                                    | |
| |  | We'll ask your device for your    | |   13px Regular, white 75%
| |  | position one time, just for this  | |
| |  | check. Nothing is stored.         | |
| |  |                                    | |
| |  | +-----------+  +----------------+ | |
| |  | | Not now   |  | Yes, check    | | |   <- Teal primary, Navy secondary
| |  | +-----------+  +----------------+ | |
| |  +-----------------------------------+  | |
| |                                         | |
```

Tapping "Yes, check" triggers the OS-level Capacitor geolocation prompt. Tapping "Not now" suppresses geolocation for the session and the chip row collapses cleanly (see below).

**Chip row collapse states (no gap left when collapsed).**

- Toggle off in Settings: chip row label "Nearby" and its container omitted entirely. Recents header moves to the top slot of the card body. Card height shrinks accordingly. No empty space.
- Toggle on but OS permission denied: chip row omitted, no re-prompt for the rest of session. Recents header takes the top slot.
- Toggle on but no chains within 500m: chip row omitted silently. Recents header takes the top slot.
- Toggle on and chains found: chip row renders as wireframed above.

The collapse uses `display: none` on the entire "Nearby" block (label + row + spacer) rather than `visibility: hidden`, so no reserved space. Height transition 240ms when the card first mounts; no transition on subsequent state changes (no jitter).

**Interaction notes.**

- Position query timing: only after the user taps "Yes, check" in the first-time tooltip. On subsequent session visits within the same app session, no re-prompt; position is requested silently with `maximumAge: 300000` (5min cache) and request lifetime treated as one-shot per the spec §4.2.
- Chip tap selects the restaurant, sets it as context, and collapses the §9.1 card to the chip+name confirmation state (see §9.1 collapsed wireframe). Chip row disappears from the now-collapsed card.
- Chip row dismiss without selecting: tapping "Not now" in the tooltip suppresses chips for the session. There is no separate "X" on the chip row itself because chips are individually selectable rather than collectively dismissable.
- If position query fails (OS denial, network), chip row collapses silently with no error toast. The user already has search and recents.
- Position payload: never persisted. Spec §4.2 mandates request-lifetime only. UX honors by querying inside the same async call that fetches catalog matches; result is held in component state only, never written to Supabase.

**Copy strings.**

- Chip row label: "Nearby"
- Chip format: "{ChainName}?" (question mark included for tone)
- Tooltip heading: "Check nearby restaurants?"
- Tooltip body: "We'll ask your device for your position one time, just for this check. Nothing is stored."
- Tooltip primary CTA: "Yes, check"
- Tooltip secondary: "Not now"
- Settings toggle label: "Suggest nearby restaurants when I open NutriVision"
- Settings toggle subtitle: "We'll ask your device for your position when you open NutriVision. Position is used only for that check, never saved."
- OS permission system prompt: handled by Capacitor/OS; cannot customize beyond `NSLocationWhenInUseUsageDescription` plist string. Suggested plist value: "ViaConnect uses your position to suggest nearby restaurants in NutriVision. Position is never saved."

**Brand tokens.**

- Chip background: Card #1E3054 with 12% white border, 20px radius
- Chip text: white 90%, Instrument Sans Medium 14px
- Chip MapPin: Teal #2DA5A0 strokeWidth 1.5
- Tooltip background: Card #1E3054 with 1px Teal border at 20% opacity for warmth
- Tooltip heading: white 95%
- Tooltip body: white 75%
- Primary CTA "Yes, check": Teal #2DA5A0 background, white text
- Secondary CTA "Not now": Navy #1A2744 background, white 80% text
- Right-edge scroll fade: linear gradient Card to transparent, 24px wide

**Accessibility notes.**

- Chip row: `role="list"` with each chip as `role="listitem"` containing a `<button>`.
- Chip aria-label: "Tag this meal as Chipotle, nearby. Select to set restaurant context."
- Tooltip: `role="dialog"`, `aria-labelledby` and `aria-describedby` for heading + body.
- Tooltip primary CTA receives initial focus. ESC equals "Not now".
- Live region announces position request status when query is in flight: "Checking for nearby restaurants" / "No nearby restaurants found" / "Found 3 nearby restaurants".
- The phrasing "ask your device for your position" rather than "ask for your location" is deliberate; it makes clear the OS is the intermediary and gives the user agency over the system prompt that follows. For screen readers this also avoids confusion with the abstract concept of "location" in nutrition (e.g., calorie location on a label).
- Motor-impairment: chips are 40px tall with 8px outer padding on each side, giving effective 56px vertical tap target.
- Color-only signal avoided: the "?" character in chip label conveys the check-in nature beyond just the MapPin icon.

### 9.4 Result review screen with chain context

**Placement.** The result review screen retains its Phase 1 layout (photo thumbnail, totals header, item list, save CTA). 170e injects:

1. Restaurant header chip above the photo thumbnail
2. A second confidence dot in the totals header
3. The customization confirmation card from §9.5 just above the item list

**Mobile 375 portrait, full result review screen with chain context:**

```
+---------------------------------------------+
| [<] Review meal                       [...] |
+---------------------------------------------+
| +-----------------------------------------+ |
| | [logo32] Chipotle    [Chain meal]   [v] | |   <- restaurant header chip, 48px tall
| +-----------------------------------------+ |   <- Card bg, Teal Chain meal pill
|                                             |
| +-----------------------------------------+ |
| |                                         | |
| |       [ meal photo thumbnail ]          | |   <- existing Phase 1 thumbnail
| |                                         | |
| +-----------------------------------------+ |
|                                             |
|  Totals                                     |
| +-----------------------------------------+ |
| |  [Triangle] Recognition       [Star]    | |   <- Triangle = existing confidence dot, Teal
| |  [Circle]   Restaurant match  [Star]    | |   <- Circle = NEW confidence dot, Teal
| |                                         | |
| |  Calories  642     Protein  38g         | |
| |  Carbs     58g     Fat      28g         | |
| +-----------------------------------------+ |
|                                             |
|  [ §9.5 Customization confirmation card  ] |
|                                             |
|  Items                                      |
| +-----------------------------------------+ |
| |  Chicken bowl, Chipotle               > | |
| |  Brown rice, black beans...             | |
| +-----------------------------------------+ |
|                                             |
+---------------------------------------------+
|  [ Save to log: Teal primary CTA  ]         |
+---------------------------------------------+
```

**Two confidence dot distinction (the key UX decision).**

The two confidence signals are visually distinguished by **shape + adjacent label**, not by color alone (color-blind safe):

- Recognition confidence: filled **triangle** (Lucide Triangle, filled, 12px), with label "Recognition" beside it
- Restaurant match confidence: filled **circle** (12px), with label "Restaurant match" beside it

Color reuses the existing Phase 1 confidence palette: Teal (>=0.80), neutral white 60% (0.50 to 0.79), Orange #B75E18 (<0.50). The shape carries the signal even when both are the same color.

Adjacent text label is ALWAYS rendered (not a tooltip). Confidence dots without labels are too ambiguous when stacked. Each row reads "{shape} {label}" left-aligned, with the shape doubling as a tap target that opens a brief explainer sheet.

Tap a dot to open a short explainer sheet:

- Recognition: "How sure we are the items in your photo match what you're reporting."
- Restaurant match: "How well the items match Chipotle's official menu. Higher confidence pulls nutrition data directly from Chipotle."

**Restaurant header chip interaction.**

- Tap anywhere on the chip to open a small action sheet with two options:
  - "Change restaurant" -> opens §9.2 search modal
  - "Remove restaurant context" -> drops `restaurant_id`, recomputes nutrition via standard Phase 1 pipeline, reloads result review screen
- The "Chain meal" pill is informational, not interactive. It appears only when `chain_type='chain'`. For independent restaurants, the pill text is "Tagged restaurant" instead, in white 60% rather than Teal.
- Logo source: `chain_logo_url`. Fallback Lucide Utensils strokeWidth 1.5 in Teal-tinted Card circle.

**Chevron-down (`[v]`) on the chip indicates the change/remove menu, not a collapse.**

**Mobile, independent restaurant variant:**

```
| +-----------------------------------------+ |
| | [Utensils] Joe's Pizza  [Tagged]    [v] | |   <- white 60% Tagged pill, no Chain meal
| +-----------------------------------------+ |
```

Restaurant match confidence dot is hidden for independent restaurants because there's no menu to match against; only the Recognition dot shows in the totals header.

**Desktop responsive (>=md).** Restaurant chip sits inside the same column as the totals header, not full width. Confidence dots remain stacked vertically with labels; on desktop there's enough room that we could go horizontal, but vertical preserves consistency with mobile and makes labels easier to scan.

**Interaction notes.**

- Restaurant chip mounts immediately when the result loads if `restaurant_id` is set.
- Change/remove sheet uses a 240ms slide-up on mobile. Action sheet height is content-driven.
- After "Remove restaurant context", a confirm dialog appears: "Recalculate nutrition without restaurant data?" with "Recalculate" (Teal) and "Keep restaurant" (Navy). This prevents accidental nutrition shifts from a fat-finger tap.
- Confidence dot tap opens explainer sheet (210ms slide-up). Sheet auto-dismisses after 8s if untouched.
- Totals header retains existing Phase 1 quick-edit affordances for macros; restaurant chip does not block them.

**Copy strings.**

- Chip change action: "Change restaurant"
- Chip remove action: "Remove restaurant context"
- Chip remove confirm heading: "Recalculate nutrition without restaurant data?"
- Chip remove confirm body: "Your totals will be re-estimated without the chain's official numbers."
- Chip remove confirm primary: "Recalculate"
- Chip remove confirm secondary: "Keep restaurant"
- Chain badge: "Chain meal"
- Independent badge: "Tagged"
- Recognition label: "Recognition"
- Restaurant match label: "Restaurant match"
- Recognition explainer: "How sure we are the items in your photo match what you're reporting."
- Restaurant match explainer: "How well the items match Chipotle's official menu. Higher confidence pulls nutrition data directly from Chipotle."

**Brand tokens.**

- Restaurant chip: Card #1E3054 bg, 8px radius, 48px tall
- Chip logo container: 32x32, 6px radius, Card with Teal Utensils fallback
- Chain meal pill: Teal #2DA5A0 bg with white text, 12px Instrument Sans Medium
- Tagged pill: white 12% bg with white 60% text
- Chevron-down: white 80% strokeWidth 1.5
- Triangle (Recognition dot): Lucide Triangle filled, Teal at >=0.80 / white 60% at 0.50 to 0.79 / Orange #B75E18 at <0.50, 12px
- Circle (Restaurant match dot): solid SVG circle, same color rules, 12px
- Adjacent labels: white 80% Instrument Sans Regular 13px
- Confidence dot row tap target: 32px tall row covering dot + label
- Action sheet: Card #1E3054 with 16px top radius

**Accessibility notes.**

- Restaurant chip: `<button>` with aria-label "Selected restaurant: Chipotle, chain meal. Tap to change or remove."
- Chevron is decorative; `aria-hidden="true"`.
- Chain meal / Tagged pill: `role="status"` so a SR announces context changes when present.
- Confidence dots: each is a `<button>` with composite aria-label "Recognition confidence: high. Tap for details." Screen reader hears the label text plus the qualitative confidence band rather than "triangle".
- Color is supplemented by shape (triangle vs circle) AND adjacent label, so no color-only signal.
- Action sheet: `role="dialog"` with focus trap; ESC closes; backdrop tap closes.
- Remove confirm: focus lands on "Keep restaurant" (the safer choice) so a stray Enter doesn't recalculate.
- Live region announces "Nutrition recalculated without restaurant" after a successful remove, so SR users know the totals just changed.

### 9.5 Customization confirmation card + bottom sheet

**Voice for the customization card.** Collaborative, never corrective. The tone is "Here's what I see; tap to fix anything I got wrong" not "Verify each line". The user is the authority on their own meal; Hannah is the helpful assistant.

**Placement.** Above the items list on the result review screen, between the totals header and item rows. Card only renders for `customization_model in ('base_plus_slots', 'signature_plus_mods')`. For `fixed_item` it collapses to a one-line confirmation chip.

**Visual distinction of slot states (the key UX decision).** Three states per slot, signaled by a combination of left-edge indicator + chip text + confidence dot:

| State | Left indicator | Chip text | Confidence dot |
|---|---|---|---|
| AI-detected with high confidence (>=0.70) | thin Teal vertical bar 2px | Detected selection | Teal filled circle |
| AI-detected with low confidence (<0.70) | thin Orange vertical bar 2px | Selection plus "Please confirm" small text | Orange filled circle |
| Default (no detection, using chain default) | none | "Default" italicized in white 60% before the selection | open circle outline white 40% |
| User confirmed (after they opened the sheet and accepted) | thin Teal bar 2px | Selection plus tiny Teal checkmark suffix | Teal filled with white check |

The left vertical bar is consistent with the existing Phase 1 confidence-strip pattern and is color + position + text label (not color alone).

**Mobile 375 portrait, expanded customization card (Chipotle bowl canonical):**

```
+---------------------------------------------+
| +-----------------------------------------+ |
| | [ChefHat] Your bowl                     | |   <- card header, 48px tall
| |                                         | |   Card #1E3054 bg
| +-----------------------------------------+ |
| | T| Protein                              | |   T = thin Teal bar (high confidence)
| | T|   Chicken                  [Teal o]  | |   <- chip 32px tall, Teal filled dot
| |  |                                      | |
| | T| Rice                                 | |
| | T|   Brown rice               [Teal o]  | |
| |  |                                      | |
| | T| Beans                                | |
| | T|   Black beans              [Teal o]  | |
| |  |                                      | |
| | T| Salsa                                | |
| | T|   Fresh tomato + Corn      [Teal o]  | |   <- 2 selected, multi-select
| |  |                                      | |
| | O| Fajita veggies                       | |   O = thin Orange bar (low conf)
| | O|   Please confirm           [Orng o]  | |
| |  |                                      | |
| |  | Cheese                               | |   <- no bar, default
| |  |   Default, none added      [open o]  | |
| |  |                                      | |
| |  | Guacamole                            | |
| |  |   Default, none added      [open o]  | |
| |  |                                      | |
| | +-----------------------------------+   | |
| | | Recalculated totals               |   | |   <- inline expandable on changes
| | | Calories 642, Protein 38g, ...    |   | |
| | +-----------------------------------+   | |
| +-----------------------------------------+ |
```

Each slot row is 56px tall. Slot name 12px Instrument Sans Medium white 60% on the top half; selection chip 14px Instrument Sans Medium white 90% on the bottom half. Confidence dot right-aligned, 14px.

**Tap any row to open the bottom sheet for that slot.**

**Bottom sheet height decision.** Content-driven, capped at 75% viewport. Rationale: Chipotle salsa has 4 options + corn = 5 chips that fit in roughly 200px including header; protein has 5 options that fit similarly. A fixed 60% height would feel half-empty for short lists and require scrolling for some long lists; content-driven scales gracefully. Cap at 75% prevents the sheet from feeling like a full-screen page when most slots have 4 to 8 options.

**Mobile 375 portrait, bottom sheet for "Salsa" (multi-select):**

```
+---------------------------------------------+
|       [drag handle]                         |   <- 4px tall, white 30%
+---------------------------------------------+
| Salsa                          [X]   [Done] |   <- header, Done Teal
| Choose any that apply.                      |   13px subtitle, white 60%
+---------------------------------------------+
|                                             |
| +-------------+ +-------------+             |
| | Fresh tomato [x] Mild salsa                |   <- chips, 40px tall, 2-col grid
| +-------------+ +-------------+             |
| +-------------+ +-------------+             |
| | Corn      [x]] | Medium salsa             |
| +-------------+ +-------------+             |
| +-------------+ +-------------+             |
| | Hot salsa     | Tomatillo green          |
| +-------------+ +-------------+             |
|                                             |
| Reset to detected                           |   <- text link bottom, Teal 14px
+---------------------------------------------+
```

Selected chips (Fresh tomato, Corn): Teal #2DA5A0 background, white text. Unselected: Card with 12% white border, white 80% text.

**Mobile 375 portrait, bottom sheet for "Protein" (single-select):**

```
+---------------------------------------------+
|       [drag handle]                         |
+---------------------------------------------+
| Protein                        [X]   [Done] |
| Choose one.                                 |
+---------------------------------------------+
|                                             |
| +-------------+ +-------------+             |
| | Chicken   [v]] | Steak                   |   <- check icon on selected
| +-------------+ +-------------+             |
| +-------------+ +-------------+             |
| | Barbacoa     | Carnitas                  |
| +-------------+ +-------------+             |
| +-------------+ +-------------+             |
| | Sofritas     | No protein                |
| +-------------+ +-------------+             |
|                                             |
| Reset to detected                           |
+---------------------------------------------+
```

**Mobile 375 portrait, collapsed fixed_item card (McDonald's Big Mac example):**

```
+---------------------------------------------+
| +-----------------------------------------+ |
| | [ChefHat] Big Mac, McDonald's   [Pencil]| |   <- one line, tap to change
| +-----------------------------------------+ |
```

Tap opens the search results within the same chain restricted to the McDonald's menu (not §9.2 modal; an in-card override for swapping the item itself).

**Live macro recalc behavior.**

- Each tap on a chip inside the bottom sheet triggers an immediate client-side macro recalc using the cached `restaurant_menu_items` payload for that combination.
- Recalc animates the inline "Recalculated totals" strip with a soft 200ms color pulse (Teal -> Card -> back to default) so the user sees their change reflected.
- Totals header at the top of the screen also updates with the same animation cue.
- Live macro recalc is purely client-side; no network round trip. Only persists on Save.

**Cost extras (guacamole +$2.30 type cases).** Spec mentions guac is +$2.30 extra cost. UX treats cost as **out of scope for nutrition view**; the customization card displays nutrition only. Cost would be a future Phase 2 feature if Gary wants it. No cost annotations on chips in this wireframe.

**Interaction notes.**

- Card header tap collapses/expands the slot list (chevron in header). Persists collapse preference per session.
- Bottom sheet opens with 280ms slide-up + 80ms backdrop fade-in. Drag handle is functional: drag down to dismiss (Done implicit on dismiss with current selections kept).
- Done button always saves the bottom sheet's current selection back to the card, even if unchanged. ESC = Done.
- "Reset to detected" returns the slot to the AI's original detection; useful if the user explored options and wants to revert.
- Per-slot saved selection persists if the user reopens the same sheet (sheet state is sticky to component, not network).
- The Phase 1 "smart-confirm" pattern (auto-collapse a row when user confirms it) is reused here: after any user tap-through, the row's confidence dot becomes Teal-with-checkmark and that row deprioritizes visually (no orange flag).

**Copy strings.**

- Card header: "Your bowl" (or "Your sandwich", "Your meal", chain-specific noun pulled from `menu_item.category_label` or fallback "Your meal")
- Slot row "Please confirm" small text: "Please confirm" (Orange #B75E18, 11px)
- Default selection text: "Default, none added" or "Default, {item}" if chain default has a positive selection (e.g., regular fries)
- Bottom sheet single-select subtitle: "Choose one."
- Bottom sheet multi-select subtitle: "Choose any that apply."
- Done button: "Done"
- Reset link: "Reset to detected"
- Fixed_item card: "{item name}, {chain}" with "Tap to change" subtitle on tap

**Brand tokens.**

- Card bg: Card #1E3054, 12px radius
- Card header: ChefHat icon Teal strokeWidth 1.5, 18px header text white 95%
- Slot row hover/press: Navy #1A2744 with 200ms ease
- High-confidence left bar: Teal #2DA5A0, 2px wide, 32px tall, centered on row
- Low-confidence left bar: Orange #B75E18, same size
- High-confidence dot: Teal filled circle 14px
- Low-confidence dot: Orange filled circle 14px
- Default dot: white 40% open circle outline 14px
- User-confirmed dot: Teal filled circle with inset white check
- Bottom sheet bg: Card #1E3054 with 16px top radius
- Bottom sheet selected chip: Teal #2DA5A0 bg, white text
- Bottom sheet unselected chip: transparent with 12% white border, white 80% text
- Done button: Teal #2DA5A0 text in header, no background
- Reset link: Teal #2DA5A0 underline 14px
- Recalc pulse: Teal #2DA5A0 fade to Card over 200ms

**Accessibility notes.**

- Customization card: `role="region"` with `aria-label="Customize your meal"`.
- Each slot row: `<button>` with composite aria-label "Protein: Chicken, AI detected, high confidence. Tap to change."
- "Please confirm" rows: aria-label "Fajita veggies: needs your confirmation, low AI confidence. Tap to choose."
- Default rows: aria-label "Cheese: not added, chain default. Tap to add."
- Confidence dot is part of the row's aria-label, not a separate focusable element, to avoid focus clutter. (Compare to §9.4 where the dots are tappable; here they're informational because the whole row is the tap target.)
- Bottom sheet: `role="dialog"`, `aria-modal="true"`, initial focus on Done button so keyboard users can dismiss without tabbing through every chip.
- Chips: `role="checkbox"` for multi-select, `role="radio"` for single-select. Selected state announced.
- Recalc strip is a live region (`aria-live="polite"`) that announces "Updated: 680 calories, 42 grams protein" after each chip change. Throttled to one announcement per 1.5s to prevent SR overload during rapid taps.
- Color-only avoided: each state has shape (bar, dot, check) + text label ("Please confirm", "Default") in addition to color.
- Motor-impairment: slot rows 56px tall, chips 40px tall in 2-col grid with 12px gaps satisfy 44px minimum + spacing.
- Bottom sheet drag handle has a visible 4px line and a 32px hit zone above it; keyboard users get a "Close" button alternative via ESC.

### 9.6 Add restaurant manually modal

**Voice for the dedup confirmation.** Curious, not corrective. We don't say "Did you mean Chipotle?" because that frames the user as having made an error. We say "There's already a Chipotle in the directory. Use it, or add yours as a separate restaurant?" The user is offered both paths and the language treats their input as legitimate.

**Placement.** Full-screen sheet on mobile, centered card 480x560 on desktop. Reached from §9.2 "Can't find your restaurant? Add it." link or the empty-results "Add a restaurant" CTA.

**Mobile 375 portrait, add restaurant form:**

```
+---------------------------------------------+
| [<]  Add a restaurant                  [X]  |
+---------------------------------------------+
|                                             |
|  Restaurant name *                          |   12px Medium, white 60%
| +-----------------------------------------+ |
| |  Joe's Pizza                            | |   <- autofocused, 48px tall input
| +-----------------------------------------+ |
|  4 / 80                                     |   <- char counter, white 40% 11px
|                                             |
|  City                                       |
| +-----------------------------------------+ |
| |  New York                               | |   <- autocomplete from US cities
| +-----------------------------------------+ |
|                                             |
|  Restaurant type                            |
| +-----------------------------------------+ |
| |  Fast casual                       [v]  | |   <- dropdown
| +-----------------------------------------+ |
|                                             |
| +-----------------------------------------+ |
| | [info] We don't have menu data for      | |   <- explainer card, Navy bg
| | | independent restaurants. Your meal    | |
| | | will be tagged with this restaurant   | |
| | | and analyzed with standard nutrition  | |
| | | recognition.                          | |
| +-----------------------------------------+ |
|                                             |
|                                             |
| +-----------------------------------------+ |
| |        Add and use this restaurant      | |   <- Teal primary, 48px tall
| +-----------------------------------------+ |
|  Cancel                                     |   <- text link, white 70%
|                                             |
+---------------------------------------------+
```

**Mobile 375 portrait, dedup confirmation when user types "Chipotell":**

```
+---------------------------------------------+
| [<]  Add a restaurant                  [X]  |
+---------------------------------------------+
|                                             |
|  Restaurant name *                          |
| +-----------------------------------------+ |
| |  Chipotell                              | |
| +-----------------------------------------+ |
|                                             |
| +-----------------------------------------+ |
| | [Building2 Teal]                        | |   <- dedup card, Card bg
| |                                         | |   1px Teal border at 30% opacity
| | There's already a Chipotle in the      | |   15px Medium, white 95%
| | directory.                              | |
| |                                         | |
| | Use the existing one, or add yours as  | |   13px Regular, white 75%
| | a separate restaurant?                  | |
| |                                         | |
| | +-----------------------------------+   | |
| | | [logo32] Chipotle                 |   | |   <- existing result, tappable row
| | |          47 menu items            |   | |
| | |                                 > |   | |
| | +-----------------------------------+   | |
| |                                         | |
| | +-----------------------------------+   | |
| | | Add Chipotell as a new restaurant |   | |   <- secondary action, white 80% text
| | +-----------------------------------+   | |   on Navy bg
| |                                         | |
| +-----------------------------------------+ |
|                                             |
|  Cancel                                     |
|                                             |
+---------------------------------------------+
```

When dedup is active, the city + type fields and the "Add and use" button hide. The user picks one of two paths inside the dedup card or backs out.

**Desktop responsive (>=md).** 480x560 centered card with backdrop blur. Form fields full width within the card. Dedup confirmation expands the card height to accommodate the suggestion row.

**Restaurant type dropdown options.**

- Fast casual
- Sit-down
- Fast food
- Coffee shop
- Bar or grill
- Other

Dropdown defaults to "Fast casual" because it's the most common independent category and avoids forcing a selection.

**Interaction notes.**

- Name field autofocused on modal mount.
- Name field debounce: 400ms after last keystroke triggers a server-side near-match check via `pg_trgm` similarity threshold 0.55 (per spec §13.2). When match found, the dedup card slides in below the input over 240ms.
- City field uses autocomplete from a bundled US cities list (top 5000 by population). No external API call.
- Type dropdown: native `<select>` on mobile for accessibility; styled custom on desktop.
- "Add and use" primary CTA submits the form, creates the restaurant with `chain_type='independent_user_added'`, immediately sets it as the meal's restaurant context, closes the modal, and returns to NutriVision tab with the §9.1 selector card collapsed to the new restaurant.
- Dedup card "Use the existing one" path: select the existing restaurant, close modal, set it as context.
- Dedup card "Add as new restaurant" path: dismisses the dedup, submits the form as-is, creates a new row even though similar exists. Spec §13.2 returns a 409 originally but we treat the 409 as a confirmation prompt rather than an outright block; the user can override with informed consent.
- Form validation: name required, 1 to 80 chars, no leading/trailing whitespace. Submit disabled until valid.
- ESC closes the modal (asks confirm if form has any input).

**Copy strings.**

- Header: "Add a restaurant"
- Name label: "Restaurant name"
- Name required marker: asterisk in Teal
- City label: "City"
- Type label: "Restaurant type"
- Explainer card body: "We don't have menu data for independent restaurants. Your meal will be tagged with this restaurant and analyzed with standard nutrition recognition."
- Primary CTA: "Add and use this restaurant"
- Cancel link: "Cancel"
- Dedup heading: "There's already a Chipotle in the directory."
- Dedup body: "Use the existing one, or add yours as a separate restaurant?"
- Dedup add-as-new: "Add Chipotell as a new restaurant"
- Cancel confirm body: "Cancel adding this restaurant?"
- Cancel confirm primary: "Yes, cancel"
- Cancel confirm secondary: "Keep editing"

**Brand tokens.**

- Modal bg: Card #1E3054
- Input bg: Navy #1A2744 with 12% white border
- Input focus border: Teal #2DA5A0, 2px
- Label text: white 60%
- Char counter: white 40% (transitions to Orange #B75E18 if user exceeds 80)
- Explainer card bg: Navy #1A2744 with 1px white 8% border
- Explainer info icon: Lucide Info Teal strokeWidth 1.5
- Dedup card bg: Card #1E3054 with 1px Teal border at 30% opacity for warmth
- Dedup existing result row: Navy on press
- Dedup add-as-new button: Navy bg with white 80% text
- Primary CTA: Teal #2DA5A0 bg, white text
- Cancel link: white 70% underline

**Accessibility notes.**

- Modal: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="add-restaurant-title"`.
- Initial focus on the Restaurant name input.
- Required field announced via `aria-required="true"` and visible asterisk with `aria-label="required"` on the asterisk.
- Char counter announced as "{n} of 80 characters used".
- Dedup card live region: when it appears, SR announces "Similar restaurant found: Chipotle has 47 menu items in the directory. You can use it or add Chipotell as a new restaurant."
- Dedup existing result is a `<button>` with full aria-label "Use existing restaurant: Chipotle, 47 menu items."
- Dedup add-as-new is a `<button>` with aria-label "Add Chipotell as a separate new restaurant. This may create a duplicate."
- The phrase "may create a duplicate" in the SR-only context warns assistive tech users without putting cautionary visual chrome on the screen for sighted users.
- Cancel confirm dialog focuses "Keep editing" first to prevent accidental data loss.
- All form fields have associated `<label>` elements (not just placeholders).
- Type dropdown: native `<select>` on mobile means free VoiceOver/TalkBack support.
- Touch targets: input fields 48px tall, primary CTA 48px tall, cancel link has 44px vertical padding.

### 9.7 Settings page additions

**Placement.** Inside Settings > NutriVision, above the existing privacy retention + corpus opt-in toggles shipped in §17 + §20 builds earlier. Order from top to bottom of the section:

1. Always show the restaurant selector (NEW)
2. Suggest nearby restaurants when I open NutriVision (NEW)
3. NutriVision photo retention (existing)
4. Help improve NutriVision with anonymized meals (existing CorpusOptIn)

The selector toggle goes first because it's the most-used setting (governs whether the §9.1 card appears at all). Geolocation second because it's a sub-behavior of the selector (only relevant when the selector shows).

**Mobile 375 portrait, Settings > NutriVision section:**

```
+---------------------------------------------+
| [<] NutriVision                             |
+---------------------------------------------+
|                                             |
|  Restaurant tagging                         |   12px Medium, white 60%
|                                             |
| +-----------------------------------------+ |
| | Always show the restaurant selector     | |   15px Medium, white 95%
| | Show the restaurant card on the         | |   13px Regular, white 70%
| | NutriVision tab. Turn off to skip       | |
| | straight to capture; you can still      | |
| | tag a restaurant from the result        | |
| | screen.                                 | |
| |                                  [Toggle ON] |   <- 32px tall toggle, Teal when on
| +-----------------------------------------+ |
|                                             |
| +-----------------------------------------+ |
| | Suggest nearby restaurants when I open  | |
| | NutriVision                             | |
| | We'll ask your device for your          | |
| | position when you open NutriVision.    | |
| | Position is used only for that check,  | |
| | never saved.                            | |
| |                                  [Toggle OFF]|
| +-----------------------------------------+ |
|                                             |
|  Privacy                                    |
|                                             |
| +-----------------------------------------+ |
| | NutriVision photo retention             | |   <- existing toggle
| |                                ...      | |
| +-----------------------------------------+ |
|                                             |
| +-----------------------------------------+ |
| | Help improve NutriVision...             | |   <- existing CorpusOptIn
| |                                ...      | |
| +-----------------------------------------+ |
|                                             |
+---------------------------------------------+
```

**Subgroup label "Restaurant tagging"** keeps the two new toggles bundled and signals they're a coherent feature.

**Subgroup label "Privacy"** wraps the existing retention + corpus opt-in.

**Geolocation toggle subtitle voice (the key UX decision).** The subtitle reads:

> "We'll ask your device for your position when you open NutriVision. Position is used only for that check, never saved."

Rationale:

- "Ask your device for your position" rather than "use your location" makes clear the OS is the gatekeeper. The user knows there will be an OS-level prompt the first time.
- "When you open NutriVision" rather than "in the background" clarifies the trigger; this is not passive tracking.
- "Used only for that check" frames the data as ephemeral and scoped.
- "Never saved" is an unconditional promise. We chose this strong phrasing over "stored briefly" or "kept only for the request" because plain language matters more than technical precision in privacy framing.

We deliberately do NOT use phrases like "discover what's nearby" or "improve your experience" or any other product-marketing softening. The toggle is a plain technical description of what happens; trust comes from precision.

**Confirmation copy on toggle change.**

When user turns OFF "Always show the restaurant selector":

> "OK. You can still tag a restaurant from the result screen after capture."

A small Teal Toast appears for 3 seconds. No confirm dialog because turning off has no destructive effect.

When user turns ON "Suggest nearby restaurants when I open NutriVision":

> "OK. We'll ask for your position next time you open NutriVision."

Small Teal Toast 3 seconds. The OS permission prompt comes later, not immediately.

When user turns OFF "Suggest nearby restaurants when I open NutriVision":

> "OK. Nearby suggestions are off."

Small Teal Toast 3 seconds.

When user turns ON "Always show the restaurant selector" (was off):

> "OK. The restaurant card is back."

Small Teal Toast 3 seconds.

No confirm dialog on any of these. The toggles are reversible and have no data implications.

**Interaction notes.**

- Toggles use the existing ViaConnect Switch component (32x18px, Teal when on, Card with 12% white border when off).
- Toggle taps update Supabase `user_preferences` row immediately (optimistic). Network failure falls back to local-only with a small "Saved locally; will sync" footnote and retry on next session.
- Tapping the toggle row anywhere (label or subtitle) toggles the switch.
- Toast lives in a top-of-page region (not bottom) so it doesn't overlap the toggle the user just tapped.

**Copy strings.**

- Subgroup header: "Restaurant tagging"
- Selector toggle label: "Always show the restaurant selector"
- Selector toggle subtitle: "Show the restaurant card on the NutriVision tab. Turn off to skip straight to capture; you can still tag a restaurant from the result screen."
- Geolocation toggle label: "Suggest nearby restaurants when I open NutriVision"
- Geolocation toggle subtitle: "We'll ask your device for your position when you open NutriVision. Position is used only for that check, never saved."
- Confirmation toast (selector off): "OK. You can still tag a restaurant from the result screen after capture."
- Confirmation toast (selector on): "OK. The restaurant card is back."
- Confirmation toast (geolocation on): "OK. We'll ask for your position next time you open NutriVision."
- Confirmation toast (geolocation off): "OK. Nearby suggestions are off."
- Network failure footnote: "Saved locally; will sync"

**Brand tokens.**

- Section bg: Navy #1A2744
- Toggle row bg: Card #1E3054, 12px radius
- Toggle row label: white 95% Instrument Sans Medium 15px
- Toggle row subtitle: white 70% Instrument Sans Regular 13px
- Switch ON: Teal #2DA5A0 track + white thumb
- Switch OFF: Card with 12% white border + white 80% thumb
- Subgroup header: white 60% Instrument Sans Medium 12px, 16px above section
- Toast bg: Card #1E3054 with 1px Teal at 30% border, 12px radius
- Toast text: white 90% 14px

**Accessibility notes.**

- Each toggle row: `<button role="switch">` with `aria-checked` reflecting state.
- Toggle aria-label includes both label and current state: "Always show the restaurant selector, currently on. Activate to turn off."
- Subtitle is associated via `aria-describedby` so SR reads label + state + subtitle.
- Subgroup headers use `<h3>` with visible 12px styling.
- Toast announced via `role="status"` `aria-live="polite"` so it doesn't interrupt other SR speech.
- Toggle tap target: entire row is 72px tall (label + subtitle + padding) and tappable; switch component itself is 44x44 effective.
- Color independence: switch track shape changes (filled when on, outlined when off) in addition to color, so color-blind users perceive state.
- Keyboard users: Space or Enter toggles when focus is on the switch. Tab moves to next row.

### 9.8 Brand tokens enforced

All surfaces use Navy `#1A2744`, Card `#1E3054`, Teal `#2DA5A0`, Orange `#B75E18`. Instrument Sans. Lucide React strokeWidth 1.5. NO emojis. NO em or en dashes.

New icons used in this flow: Utensils (restaurant fallback), MapPin (geolocation), Star (favorite toggle filled when active), Search (modal), ChefHat (customization slots header), Building2 (chain), Store (independent), PlusCircle (add manually).

## Notes Hannah may want to consider

- Geolocation chip row is borderline: too prominent and feels surveilling; too subtle and users miss the value. Find the right balance with the existing NutriVision warmth (matches CorpusOptInBanner posture from Phase 1l).
- Customization card is the most novel UX surface in 170e. The AI pre-fills slots; user confirms. Tone should feel collaborative ("Here's what I see; tap to correct") not corrective ("Verify this").
- Restaurant header chip with chain logo: at launch logos may not be available. Fallback is Lucide Utensils icon in Card-colored circle.
- Add-manually near-match dedup: needs a tone that doesn't feel like the system is correcting the user. "Did you mean Chipotle?" framing.

## Sequencing 170e still needs (in order)

1. **170 Phase 1 baked in production minimum 7 days with telemetry** -- measures actual baseline against §11.2 targets
2. **Gordon catalog: first 5 chains data-complete for Gary signoff** per §20.3 -- multi-week external sourcing project
3. **@capacitor/geolocation approval + install** -- blocks geolocation code
4. **CLAUDE_CHAIN_VISION_MONTHLY_CAP_USD set in deploy env** -- operational decision
5. **pg_trgm extension verified available on live** -- Observe step
6. **Resolver cascade behavior spec-locked**: where does `restaurant_menu` slot in vs Curated/USDA/OFF/vision
7. **Hannah's wireframes (Section 9 below) signed off by Gary**
8. **RESTAURANT_RECOGNITION_ENABLED kill switch ready** as 24h smoke margin per §20.6

Then Michelangelo Workstream B (build) is unblocked. Catalog work + UX wireframes are parallel longest-poles per §20.3-20.4.

## Ratification posture (2026-05-29)

Gary acknowledged 170e at spec level 2026-05-29 by pasting the full spec into the session. Per ViaConnect convention this counts as filed and ratified at the spec level. No code change is required to ratify a filed spec.

The next code action is dispatched when prerequisites in the "Sequencing" section above are resolved.

## Related

- Prompt 170 (shipped Phase 1, commit `47a7663d` on 2026-05-29)
- Prompt 170a + 170a-supplement (ratified 2026-05-29; safe set + §17 + §20 shipped)
- Prompt 170b (filed, not built)
- Prompt 170c (placeholder, not built)
- Prompt 170d (filed 2026-05-29 with Hannah wireframes)
- Heritage: Prompts 15b, 15d, 16, 17b — supplement upload library pattern of curated catalog + structured nutrient data + AI-assisted identification
