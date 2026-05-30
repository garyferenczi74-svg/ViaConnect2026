# Prompt 170k Filed: NutriVision i18n and Locale-Aware Food Database Integration

Date: 2026-05-29
Status: **Filed at spec level; ratified.** NO code work. Hannah dispatched for §14 wireframes (5 surfaces; lighter than prior 170-series fills because §14 is intentionally minimal per spec).
Memorialized by: Jeffery (orchestrator).

## Mission (one line)

Add nutrition-domain i18n on top of an app-wide Prompt 173 i18n foundation: multi-source food database integration starting with CNF for Canada, locale-aware nutrient cascade routing, cuisine taxonomy localization, locale-tagged restaurant catalog phased rollout, unit display preferences, jurisdiction-specific food-related disclaimers, recipe library locale tagging, and Prompt 170j voice language extension to French Canadian, all shipped as Phase 2 (Canada en-CA + fr-CA) in v1 with UK/EU/Spanish/Portuguese filed for future supplements.

## Why this filing posture differs from prior 170-series filings (5 structural distinctions)

170k memorializes-only with Hannah dispatched for §14 wireframes, same posture as 170d/170e/170f/170h/170i/170j. Five structural distinctions from those filings:

1. **Spec depends on a prompt Gary has NOT yet pasted (Prompt 173).** §0 status: "Hard dependency on Prompt 173 (ViaConnect App-Wide i18n Foundation), which is filed simultaneously with this prompt as a prerequisite and is explicitly NOT in scope for 170k." Spec §3.1 enumerates 173's scope (translation library, locale detection waterfall, URL routing, Intl formatting, pluralization, RTL, brand voice translation memory, translation review workflow, QA). **Gap flagged for Gary** — see "Flags for Gary" below. This is the first 170-series filing whose hard prerequisite is itself a yet-to-be-filed prompt.

2. **Multiple upstream sequencing gates make 170k the deepest-pipelined 170-series filing.** Needs:
   - Prompt 173 ratified + shipped (not yet pasted)
   - 170 + 170a + 170a-supplement ratified (DONE 2026-05-29)
   - At least one of 170e (restaurant catalog), 170f (recipe library), 170h (insights surface) shipped (all currently filed-only)
   
   Whereas 170i had two upstream gates (170h shipped + practitioner infra) and 170j had zero, 170k has FOUR. Deepest pipeline in the series.

3. **The decomposition is architecturally sound.** Gary's framing on filing: "Cross-cutting work that probably should be part of a broader app-wide i18n prompt rather than NutriVision-scoped." Spec §1.1 acknowledges this directly: 60% of typical "NutriVision i18n" work is foundational translation infrastructure that the entire platform needs (Prompt 173 scope); 40% is genuinely NutriVision-specific (170k scope). The split keeps the NutriVision domain prompt library coherent and doesn't bottleneck the rest of the platform on Gordon for translation decisions.

4. **No package.json modifications.** §22 item 2: "No package.json modifications without Gary approval. Translation infrastructure dependencies are in Prompt 173, not 170k." Cleanest scope claim of any 170-series filing — translation library (next-intl recommended), Intl wrappers, translation management platform integration all live in 173. 170k is purely application code on top of that foundation.

5. **NEW agent role (recurring): Kelsey.** Spec preamble names "Kelsey (Compliance, per-jurisdiction disclaimer review and food database licensing)" as co-owner. Same gap as 170i — Kelsey NOT in current 9-agent fleet. **Recurring flag.** Per-locale Kelsey work (CNF license review, Health Canada disclaimer review, future per-country licensing memos) is on the critical path for every locale phase.

## The decomposition: 170k vs Prompt 173 (§3)

| Belongs in Prompt 173 (app-wide) | Belongs in 170k (nutrition-specific) |
|---|---|
| Translation library (next-intl recommended) | Food database ingestion pipelines (CNF, M&W CoFID, EFSA EuroFIR) |
| Translation file structure + key conventions | Locale-aware nutrient cascade routing |
| Locale detection waterfall (URL > preference > Accept-Language > IP) | Cuisine taxonomy localization with cultural review |
| Locale-aware URL routing (Next.js middleware) | Restaurant catalog phased rollout per locale |
| Intl.DateTimeFormat + NumberFormat wrappers | Unit display preferences (metric / imperial / mixed; kJ deferred to EU) |
| Intl.PluralRules wrapper | Jurisdiction-specific food disclaimers (FDA US, Health Canada CA, FSA UK, EFSA EU) |
| RTL support patterns (filed for future) | Recipe library locale tagging |
| Brand voice translation guidelines + memory | Voice (170j) language support extension (French Canadian Haiku NLU prompt) |
| Translation review workflow (Lokalise / Crowdin) | Food-related translation string content (owned by Gordon, hosted by 173 infrastructure) |
| Pseudo-localization QA | |

170k consumes 173's infrastructure; 170k does NOT build it. The boundary is unambiguous per §3.

## Phased locale rollout (mirrors 170g §1.3 staged pattern)

| Phase | Scope | Status |
|---|---|---|
| Phase 1 (existing) | en-US (USDA FDC, US chains, FDA disclaimer) | Live |
| Phase 2 (170k v1) | en-CA + fr-CA (CNF, 8 Canadian chains, Health Canada framing) | Filed |
| Phase 3 | en-GB (M&W CoFID, UK chains, FSA/NHS framing) | Filed as 170k-supplement-uk |
| Phase 4 | EU multi-country (EuroFIR + per-country, kJ display, EFSA framing) | Filed as 170k-supplement-eu |
| Future | Spanish, Portuguese, German, Italian, Mexican, Australian, RTL (Arabic, Hebrew) | Filed as future supplements |

Canada chosen as Phase 2 because: CNF freely licensed (Open Government License - Canada, no commercial negotiation), French Canadian + English Canadian supported by every STT/translation workflow, existing Canadian user base, Health Canada framing well-documented, modest 8-chain catalog feasible (Tim Hortons, A&W Canada, Boston Pizza, Swiss Chalet, Earl's, Cactus Club, Harvey's, Mr. Sub).

## Food database licensing summary (§4.5)

| Database | License | Per-locale cost | Phase |
|---|---|---|---|
| USDA FDC | Public domain | $0 | Existing (US) |
| CNF (Canada) | Open Government License - CA | $0 + attribution | **170k v1** |
| M&W CoFID (UK) | Open Government Licence v3 | $0 + attribution | 170k-supplement-uk |
| EFSA EuroFIR | Varies; some commercial | $0 to ~€several thousand | 170k-supplement-eu |
| ANSES Ciqual (France) | Open with attribution | $0 | 170k-supplement-eu |
| BLS (Germany) | Commercial | Several thousand EUR/yr | 170k-supplement-eu (if scoped) |
| BEDCA (Spain) | Open with attribution | $0 | 170k-supplement-eu |

Kelsey's per-phase licensing memo is a Blueprint deliverable. v1 needs only the CNF review (straightforward Open Government License - Canada confirmation).

## Locale-aware cascade (§5)

| User locale | Cascade order |
|---|---|
| en-US | farmceutica_curated > usda_fdc > open_food_facts > vision_provider |
| en-CA, fr-CA | farmceutica_curated > **cnf** > usda_fdc > open_food_facts > vision_provider |
| en-GB | farmceutica_curated > mw_cofid > usda_fdc > open_food_facts > vision_provider *(when 170k-supplement-uk ships)* |
| *-EU | farmceutica_curated > {country-specific} > usda_fdc > open_food_facts > vision_provider *(when 170k-supplement-eu ships)* |

USDA FDC remains in non-US cascades as a secondary fallback for branded and global foods. Router lives in `src/lib/nutrition/nutrient-cascade/locale-router.ts` and is configured by `nutrient_cascade_locale_rules` table (data-driven, not hardcoded). Cuisine-aware boost tiebreaker (§5.4): tourtière for fr-CA user prefers CNF over USDA FDC.

**NO regression for US users** is load-bearing (§5.5). Integration test verifies en-US analyze response is bit-identical pre and post 170k.

## Cuisine taxonomy localization (§6)

- ~30 cuisine slugs at launch translated to en-US, en-CA, fr-CA
- Cultural sensitivity flags (e.g., "asian" too broad; substitutes with specific country of origin where available)
- New Canadian tags added: canadian_general, french_canadian, canadian_indigenous (with cultural review), maritimes
- Storage: English slugs canonical in `meal_items.cuisine_tag`; localized display names in new `cuisine_tags_locale` table at render time

## Restaurant catalog phased rollout (§7)

- 8 Canadian chains added (Tim Hortons, A&W Canada, Boston Pizza, Swiss Chalet, Earl's, Cactus Club, Harvey's, Mr. Sub) with `available_locales: ['en-CA', 'fr-CA']`
- Existing US chains tagged with appropriate locale arrays: Chipotle = ['en-US', 'en-CA'], Sweetgreen = ['en-US'], McDonald's/Subway/Starbucks = ['en-US', 'en-CA'] (with cross-border macro caveat note)
- Cross-border macro precision filed for `170k-supplement-canada-menu-precision`
- UK + EU chain catalogs deferred to per-locale supplements

## Unit display preferences (§8)

| User preference | Defaults |
|---|---|
| metric | grams, ml, kcal (kJ alongside when EU ships) |
| imperial | oz, fl oz, kcal |
| mixed | grams primarily, oz for personal weights and large portions |

Per-locale defaults: en-US = imperial; en-CA + fr-CA = mixed (Canadian colloquial reality); en-GB + EU = metric.

Conversion happens at render time. Storage canonical (grams, kcal); never double-converted.

## Jurisdiction-specific disclaimers (§9)

- en-US: existing FDA disclaimer (unchanged)
- en-CA: "These statements have not been evaluated by Health Canada. ViaConnect is intended for general wellness information and is not a substitute for medical advice." (illustrative; Kelsey reviews actual production text with Canadian regulatory consultant during Blueprint)
- fr-CA: "Ces déclarations n'ont pas été évaluées par Santé Canada. ViaConnect est destiné à fournir des informations générales sur le bien-être et ne remplace pas un avis médical." (illustrative)
- en-GB + EU: deferred to per-locale supplements

**Bio Optimization localization (§9.6)** per locale with Gary signoff: fr-CA = "Optimisation Bio"; Spanish = "Optimización Bio"; Portuguese = "Otimização Bio"; German = "Bio-Optimierung". Standing rule item 7 ("verbatim") interpreted as "verbatim within a locale".

**Bioavailability "10x to 28x" (§9.7)** localized connector only: fr-CA = "10x à 28x"; Spanish = "10x a 28x"; German = "10x bis 28x". Numerical values do not change.

## Voice (170j) French Canadian support (§11)

- All major STT providers (Web Speech, Capacitor native iOS + Android, Gemini Audio) support fr-CA
- Gordon authors French Canadian Haiku system prompt mirroring English taxonomy
- Gordon's curated test set: 10 French Canadian speakers × 100 commands = 1000 recordings (parallel to the English set per 170j §14)
- Voice button hints localized: "Essayez de dire: Ajouter 2 cuillères à soupe d'huile d'olive."
- Mixed-language utterances (Canadian code-switching) not handled v1; filed for future refinement

## Cost model

| Phase | Vendor cost | Engineering + curation |
|---|---|---|
| Phase 2 (v1, Canada) | ~$5,000 to $8,000 (translation en-CA + fr-CA + Kelsey legal review + Canadian chain curation) | 2 to 3 weeks Gordon + ~1 to 2 weeks Michelangelo |
| Phase 3 (UK) | ~$500 to $1,500 (en-GB cheaper, mostly regional terminology) | 1 to 2 weeks Gordon |
| Phase 4 (EU) | Variable; up to ~€several thousand for commercial databases | Multi-month per-country |

170k v1 is among the more expensive 170-series prompts to ship in vendor cost but trivial in storage growth (<50 MB at v1).

## Helix events filed (4, consumer-side only per Standing Rule #8)

| Event | Points | Purpose |
|---|---|---|
| `locale_preference_changed` | 1 | User changed locale in Settings |
| `first_canadian_meal_logged` | 3 | First meal using Canadian cascade |
| `first_french_canadian_voice_edit` | 3 | First fr-CA voice edit completed |
| `unit_system_changed` | 1 | User toggled unit system |

## Migrations filed (11 total)

All append-only with ONE documented exception (nutrient_source CHECK reconstitution, mirrors 170e §7.8 + 170f §8.3 precedent):

1. `food_database_sources`
2. `cuisine_tags_locale`
3. `nutrient_cascade_locale_rules`
4. `users` augmentation: `preferred_locale` + `preferred_unit_system`
5. `restaurants` augmentation: `available_locales` text[]
6. `recipes` augmentation: `locale`
7. `meals` + `meal_items` augmentation: `locale_at_save`
8. `meal_items` `nutrient_source` CHECK reconstitution to add `cnf` (**documented exception**)
9. Helix events block (4 event types)
10. `cnf_foods` (with trigram indexes on description + description_fr)
11. `cnf_nutrient_amounts`

This is the third 170-series prompt using the CHECK reconstitution exception pattern (after 170e §7.8 added `restaurant_menu`, 170f §8.3 added `recipe_template`).

## Three kill switches

- `LOCALE_AWARE_CASCADE_ENABLED` (master, default false). When false, every user uses en-US cascade.
- `CANADIAN_NUTRIENT_FILE_ENABLED` (default false until CNF ingestion + Gordon signoff). When false, en-CA + fr-CA fall back to USDA FDC primary.
- `LOCALE_AWARE_RESTAURANT_SEARCH_ENABLED` (default true after launch). When false, restaurant search returns all chains regardless of locale.

## Privacy posture

- Locale preference is NOT consent-gated; it is a display preference visible to anyone who can see other display preferences
- **Locale preference is NOT visible to practitioners** per Prompt 170i §8.5 redaction matrix extension (verified in §16.1)
- Same meal may render differently to consumer + practitioner depending on their respective locales (intentional)
- No personal data flows TO food databases (CNF, USDA FDC, etc. are read-only one-way ingestion)
- Per-locale compliance posture: Kelsey confirms food database license permits commercial use, disclaimer framing meets local regulator posture, marketing claims compliance for "10x to 28x" copy per locale
- GDPR not introduced by 170k; handled at platform level

## §14 UI surfaces (Hannah's dispatch this turn, 5 substantive surfaces)

<!-- HANNAH: replace the placeholder paragraph between START and END markers below with the §14.1 through §14.5 wireframe section per the dispatch prompt. §14.6 is empty (no new icons). Voice posture continues the 170h/170i/170j pattern (warmth + precision). UX surface is intentionally minimal because most rendering and string concerns belong in Prompt 173. -->

<!-- HANNAH_WIREFRAMES_START -->

Voice posture inherits from 170h §13.5 (consumer-copy clinical-claim linter) and 170i §11 (trust-architecture transparency). Locale UX here is warmth + precision: changing locale is a decision the consumer makes consciously, not a setting that silently rearranges the world. Every locale-affecting affordance carries enough context that the consumer understands what flips when they flip it. Prompt 173 owns the underlying translation primitives (string keys, Intl wrappers, locale routing); 170k consumes those primitives at the surfaces below. All exact strings shown are en-US; en-CA differences are minimal (date format, disclaimer body); fr-CA strings are referenced for production translation per spec §9.6 + §9.7 without drafting French copy in this artifact (Gary signs off translations).

### §14.1 Settings, Preferences additions (route `/settings/preferences`)

**Layout:** Existing Preferences page. Adds two grouped rows ABOVE the existing notification preferences block: a Locale section (single row, dropdown right) and a Unit system section (single row, segmented radio right). Each row is a 72px card with Lucide icon left (Globe for locale, Ruler for units, both strokeWidth 1.5, 20px, Navy 80 percent), title + sub-line stacked middle, control right. Below the Unit system row, a 13px Navy 70 percent hint line surfaces a one-sentence explanation when the user opens the Mixed option.

**Header copy:**
- Section header above the two rows (14px Teal `#2DA5A0` uppercase letter-spaced 0.05em): `Region and units`
- Locale row title: `Language and region`
- Locale row sub-line (13px Navy 70 percent): `Sets the language, restaurant catalog, food database, and disclaimers for your account.`
- Unit row title: `Unit system`
- Unit row sub-line (13px Navy 70 percent): `How weights and volumes are shown across your meals.`

**Body copy:**
- Locale dropdown options at launch: `English (United States)`, `English (Canada)`, `French (Canada)`. Each row shows the language label first and the country in parens; fr-CA shows `Français (Canada)` per spec §11 fr-CA hint pattern.
- Unit system segmented radio options: `Metric`, `Imperial`, `Mixed`
- Mixed-option inline hint (appears below the segmented radio when Mixed is selected, 12px Navy 70 percent): `Weights in grams, your personal weights and large portions in ounces. This is how most Canadians read nutrition labels.`
- Metric hint when selected: `Grams and milliliters throughout.`
- Imperial hint when selected: `Ounces and fluid ounces throughout.`

**CTAs:**
- Locale dropdown change: opens the locale change confirmation modal (described below) before commit
- Unit system radio change: applies immediately (no modal) because unit changes do not re-filter catalogs or change disclaimers; macro chips re-render in the new system on next view
- Both controls carry a Reset link below if value differs from the locale-default (`Use {locale} default`)

**Locale change confirmation modal (the most consequential surface in §14):**

Layout: 480px centered on desktop, full-height on mobile. Card `#1E3054` bg. From top: 24px header region with Globe icon centered at 32px Teal `#2DA5A0` + headline + sub-headline; 16px gap; "Here is what changes" block (Card 90 percent inner bg); 24px gap; required acknowledgment checkbox row 56px; 16px gap; CTA bar (Confirm primary + Cancel text link).

Header copy: `Switch to {target_locale_display_name}?`
Sub-headline (13px Navy 70 percent): `This is an account-wide change. We will keep your meals, recipes, and supplement history exactly as they are.`

"Here is what changes" block (one line per affected surface, with Lucide icon left at 16px):
- (Globe) `The app reads in {target_language}.`
- (UtensilsCrossed) `Restaurants and recipes default to the {target_country} catalog. You can still see entries from other regions with a filter.`
- (ChefHat) `Cuisine tags use {target_country}-appropriate names where we have them.`
- (Ruler) `Units switch to {target_default_units}. You can change this in Preferences.`
- (FileText) `Wellness disclaimers update to {target_regulator_framing}.`

For the en-CA target: `target_language` = "Canadian English", `target_country` = "Canadian", `target_default_units` = "Mixed (grams plus ounces)", `target_regulator_framing` = "Health Canada framing".
For the fr-CA target: same values translated; production strings live in Prompt 173 translation memory. Bio Optimization brand name is rendered as `Optimisation Bio` per spec §9.6 in fr-CA but is referenced here only as the production anchor for the closing line.

Closing line above acknowledgment (always shown, 13px Navy 80 percent): `Your meals and recipes stay where they are. You can switch back anytime.`

Required acknowledgment checkbox: `I understand this changes the app language, catalog defaults, and disclaimers.`

CTAs:
- `Confirm switch` (Teal `#2DA5A0` solid, disabled until checkbox checked); aria-label expanded: `Confirm switch to {target_locale_display_name}`
- `Cancel` (text link Navy 80 percent underlined, returns to Preferences with no change)

**Conditional states:**
- First-time locale change ever: modal appears with the orientation framing above
- Subsequent locale changes (same user has switched before): modal still appears (locale change is high-impact) but the sub-headline drops to `Account-wide change. Your meals, recipes, and supplement history stay as they are.` and the acknowledgment checkbox is preserved (no shortcut)
- Switch to same locale as current: dropdown returns to its current value silently; no modal
- Cross-locale recipe library effect (composes with 170f): if the consumer has saved recipes in the current locale, modal adds an extra line at the bottom of the "Here is what changes" block: `Your recipe library will default to showing {target_country} recipes. Toggle "Show all regions" to see your existing recipes.` This line ONLY appears when the consumer has at least 1 saved recipe; otherwise omitted (no preemptive load).
- After confirming: full-page transition spinner for 1 to 2 seconds while Prompt 173 routing recomputes URL + reloads translations; aria-live="assertive" announces `Switching to {target_locale}.`
- Restaurant chip filter is NOT modified by the locale switch (filter chip state is independently controlled per §14.2)

**Accessibility commitments:**
- Tap targets 44x44 minimum throughout (dropdown control natively meets this on iOS and Android)
- Locale dropdown native picker on mobile (iOS UIPickerView, Android Spinner) for platform familiarity; custom select on desktop with Tab + Arrow keys
- Modal traps focus on open; focus lands on the headline (read by screen reader); Tab cycles through Confirm > Cancel > acknowledgment > back to Confirm
- aria-live="assertive" on modal open to announce the headline + sub-headline together
- aria-live="polite" on the acknowledgment checkbox state change (enables Confirm button; screen reader announces "Confirm switch enabled")
- Color contrast verified: Teal `#2DA5A0` Confirm CTA on Navy `#1A2744` modal bg measures 4.7:1
- Instrument Sans typography falls back to `system-ui, -apple-system, "Segoe UI", sans-serif` chain; fr-CA accented chars (é, à, ç) render in fallback chain without ligature loss
- Reduced-motion: spinner replaced with static loading text `Switching to {target_locale}...` no rotation
- iOS Voice Control identifiers: `Language and region`, `Unit system`, `Mixed`, `Confirm switch`, `Cancel`; Android Voice Access mirrors

**Push-back / UX decisions:**
- **Locale change as modal-confirmed, not silent.** Spec implied a dropdown change committed immediately. Pushed: locale is the second-most-impactful preference in the entire app (after primary auth identity), affecting routing, catalog, units, disclaimer framing, and cuisine substitution simultaneously. A silent commit teaches the consumer that locale "just changed something" without giving them a chance to verify they want all of it. The modal is the trust contract: here is the list of things that change, here is the acknowledgment, here is the confirm.
- **Modal lists effects with icons, not paragraphs.** Five short Lucide-icon-prefixed lines beat a paragraph wall. Mirrors the orientation pattern from 170i §11.3 pre-step orientation modal (three icons for three trust invariants); 170k uses five icons for five locale invariants.
- **Cross-locale recipe library line conditional, not preemptive.** Showing the recipe filter caveat for users who have zero recipes is noise. The line only renders when at least one recipe exists, which is the only case where the warning is load-bearing.
- **Mixed unit description anchored to Canadian reality.** Spec §8.1 said "grams primarily, oz for personal weights and large portions" which is technically accurate but cognitively dense for a Settings sub-line. Reframed as `Weights in grams, your personal weights and large portions in ounces. This is how most Canadians read nutrition labels.` The second sentence anchors Mixed to a real-world reading pattern the consumer already knows, removing the "what does mixed even mean" cognitive trap.
- **Unit change applies without modal.** Unit changes do not re-filter catalogs or change disclaimers; only display formatting flips. Modal would over-weight the action and degrade the locale-change modal's signal.
- **"Switch back anytime" closing line.** Borrowed from 170i §11.3 acknowledgment language. Locale change must feel reversible at the moment of confirmation, not buried in fine print.

**Mobile adaptation:** Preferences page is mobile-first. Locale and Unit rows stack identically. Modal goes full-height; "Here is what changes" block scrolls internally if it exceeds 60 percent of viewport; sticky CTA bar at bottom with safe-area inset; checkbox row above CTA bar. Modal swipe-down dismissal disabled (this is a confirmation modal, not a casual sheet).

---

### §14.2 Restaurant search locale chip (existing search surface, composes with 170e)

**Layout:** On the existing restaurant search results list (from 170e). Each restaurant card gains a small locale chip in the metadata row right of the chain name, between the existing distance and price-range chips. Chip is 22px tall, 11px text, rounded 4px, with content varying by the restaurant's `available_locales` field intersected with the consumer's `preferred_locale`.

**Header copy:** N/A (chips are inline metadata, no header)

**Body copy:**
- Chip variants (chip text on the card, viewed by an en-CA consumer):
  - Chain available in en-CA only (e.g., Tim Hortons, Boston Pizza): `CA` (Teal `#2DA5A0` text on Teal 8 percent fill)
  - Chain available in both en-US and en-CA (e.g., Subway, Starbucks): `US, CA` (Teal text on Teal 8 percent fill)
  - Chain available in en-US only (e.g., Sweetgreen): `US only` (Navy 60 percent text on Navy 8 percent fill, italic)
- Tooltip on `US only` chip (appears on tap on mobile, on hover on desktop): `This chain is not currently in Canada. Nutrition data is based on the US menu.`
- Tooltip on `US, CA` chip: `Available in both countries. Some menu items may differ; we will note any differences on the meal.` (the "we will note" wording is forward-looking to 170k-supplement-canada-menu-precision)
- Tooltip on `CA` chip: none (the chip itself is sufficient; no additional context needed)

**CTAs:**
- Chip is informational; tap on mobile reveals tooltip, tap-elsewhere dismisses
- Chain card itself is the navigation; chip does not consume the tap target of the card

**Conditional states:**
- Consumer locale en-US: chip logic inverts; `US, CA` becomes `US, CA` still (order: consumer's locale first), `CA` becomes `CA only` with parallel tooltip "This chain is not currently in the US. Nutrition data is based on the Canadian menu." (relevant when a US consumer searches a Canadian-only chain such as Cactus Club)
- Consumer locale fr-CA: chip logic same as en-CA; tooltip copy translated per Prompt 173 translation memory
- `LOCALE_AWARE_RESTAURANT_SEARCH_ENABLED` kill switch false: chip hidden entirely; all restaurants render without locale context

**Accessibility commitments:**
- Chip aria-label fully verbose: `Available in {locales_list}` (e.g., `Available in United States only`)
- US-only tooltip aria-describedby on the chip so screen reader users hear the tooltip text without tapping
- Color contrast: Teal text `#2DA5A0` on Teal 8 percent fill measures 4.6:1; Navy 60 percent text on Navy 8 percent fill measures 4.5:1 (right at floor, verified)
- Italic on `US only` chip is supplementary; aria-label does NOT carry the italic state (visual differentiation only)
- Tooltip dismiss on tap-elsewhere works with screen reader interaction (VoiceOver double-tap-elsewhere dismisses)
- Reduced-motion: tooltip appears immediately (no fade-in)
- iOS Voice Control identifier: `Locale chip` (matches platform pattern of identifying decoration chips)

**Push-back / UX decisions:**
- **`US only` framing chosen over `Not in Canada` or `International`.** The chip space is small; chip text must read at-a-glance. `US only` is honest, neutral, and tells the consumer the chain's geographic scope without implying the chain is somehow inferior. `Not in Canada` is negative-framed; `International` is misleading (the chain might be US-only without "international" reach). The tooltip carries the longer context.
- **Tooltip on `US only` includes the data-source caveat.** "Nutrition data is based on the US menu" is the load-bearing piece: a consumer logging a meal from a US trip should know the macros they see are US-menu macros, in case a sibling Canadian menu has slight differences. This sets accurate expectations without delaying the meal log.
- **`CA` chip carries no tooltip.** For en-CA consumers, a chain marked `CA` is local, expected, requires no explanation. Adding a tooltip would be noise. Tooltip-only-when-needed is the pattern.
- **Chips do NOT filter results.** Pushed against a filter UI on top of the chip pattern. Restaurant search already has filters (distance, cuisine, price); adding a "Canada only" filter would over-feature this surface. The chip teaches the consumer to read locale-context per result; if a "filter to local only" affordance becomes desired by telemetry signal, it lives in 170k-supplement-canada-menu-precision.
- **Chip placement after chain name, before distance.** The locale chip is a higher-priority piece of context than distance (locale tells the consumer "can I eat here at all", distance tells them "how far"). Ordering reflects priority.

**Mobile adaptation:** Chip same 22px tall on mobile; tooltip is bottom-sheet on touch (not floating tooltip) so it does not occlude the chain card; sheet auto-dismisses on outside tap or 4 seconds idle.

---

### §14.3 Cuisine tag display with cultural sensitivity substitution (existing surfaces, composes with 170 + 170b)

**Layout:** Wherever cuisine tags are rendered (meal cards, recipe cards, restaurant cards, search filter chips). The render pipeline substitutes per `cuisine_tags_locale` table at render time. No visual layout change; only the displayed string changes.

**Header copy:** N/A (cuisine tag is an inline chip on existing cards)

**Body copy:**
- The canonical English slug `asian` (legacy broad tag) displays as:
  - en-US: `Asian` (legacy display, broad term preserved)
  - en-CA: substituted per cuisine_tags_locale to the specific country of origin where available: `Chinese`, `Vietnamese`, `Korean`, `Japanese`, `Thai`, `Filipino`, `Indian` (matched via secondary `cuisine_origin_country` field on the meal_item if present; falls back to `East Asian` or `Southeast Asian` when origin is known broadly but not by country; falls back to `Asian` only when origin is genuinely unknown)
  - fr-CA: same substitution logic, French display names per Prompt 173 translation memory
- The new Canadian-specific tags (added in 170k v1, per spec §6) display as:
  - `canadian_general` -> en-CA: `Canadian` / fr-CA: `Canadien`
  - `french_canadian` -> en-CA: `French Canadian` / fr-CA: `Canadien français`
  - `canadian_indigenous` -> en-CA: `Indigenous Canadian` / fr-CA: `Autochtone canadien` (cultural review flag per spec §6; Kelsey + Hounddog co-curated)
  - `maritimes` -> en-CA: `Maritimes` / fr-CA: `Maritimes`

**Origin chip visibility (the explicit UX question):**
- The substituted display name is the ONLY chip rendered on the meal/recipe/restaurant card. The legacy broad tag (`Asian`) does NOT also appear as a second chip.
- HOWEVER, the substitution detail is available on tap-and-hold for power users: long-press on the chip surfaces a small tooltip `Cuisine: Chinese (was tagged Asian)`. This is opt-in transparency for consumers who want to understand the substitution.
- The tooltip does NOT appear on hover (desktop) or single tap (mobile) because the broad term leak is precisely what we are trying to avoid surfacing to en-CA + fr-CA consumers by default.

**CTAs:**
- Chip itself is informational (existing behavior from 170 + 170b); tap navigates to cuisine filter view
- Long-press tooltip is read-only; tap-elsewhere dismisses

**Conditional states:**
- Origin country known: substituted chip displays specific country name
- Origin country broad-region known (e.g., "East Asian" or "Southeast Asian"): chip displays the broader region in the locale's translated form, NOT the legacy `Asian` term
- Origin country unknown: chip falls back to the locale-appropriate broad term. For en-CA + fr-CA, this is `Asian` / `Asiatique` only if the cuisine_tags_locale table has no more specific entry; the cultural-sensitivity flag in spec §6 reduces this fallback rate by curating the substitution table aggressively
- en-US consumer: no substitution; legacy `Asian` chip preserved (Phase 1 behavior unchanged; spec §5.5 NO regression for US users)
- Chip on a meal that was logged BEFORE the consumer switched locale: still renders with current-locale substitution (cuisine_tag is canonical English slug in storage per spec §6 storage rule; display is render-time only)

**Accessibility commitments:**
- Chip aria-label: `Cuisine: {substituted_name}` (no parenthetical legacy term in default aria-label; surfaces only via long-press tooltip)
- Long-press tooltip aria-live="polite" announcement: `Cuisine: Chinese, originally tagged Asian.`
- Color contrast verified per existing cuisine chip token (Navy 80 percent text on Card `#1E3054` chip fill, 5.1:1)
- Reduced-motion: tooltip appears immediately, no fade
- iOS Voice Control identifier: `Cuisine chip` with content matching the substituted display name
- Screen reader users iterating through a meal card list hear `Cuisine: Chinese` instead of `Cuisine: Asian` for en-CA + fr-CA, preserving the cultural sensitivity in the audio surface as well as the visual

**Push-back / UX decisions:**
- **Original broad term hidden by default, available on long-press.** This was the explicit UX question. Resolved by NOT showing the broad term by default (the substitution is the entire point), but making it available on intentional discovery (long-press) for consumers who want to understand the data. This avoids two failure modes simultaneously: (a) double-chipping which would teach the consumer that "Asian = Chinese" which defeats the cultural sensitivity intent; (b) hiding the substitution entirely with no path to "wait, why does my Chinese meal say Chinese when I think I tagged it Asian?"
- **Substitution is render-time, not storage-time.** Canonical English slug stays in `meal_items.cuisine_tag` (per spec §6 storage rule); display name is computed at render via cuisine_tags_locale join. This means a consumer switching locale does NOT need to re-process their historical meals; the display just re-renders. Database stays clean; UX stays adaptive.
- **Cultural sensitivity is the load-bearing intent.** The spec §6 directive ("`asian` too broad; substitutes with specific country of origin where available") is preserved by treating substitution as the default, not as an opt-in. The opt-out (no substitution) lives at the locale level: en-US keeps legacy `Asian` chips, en-CA + fr-CA see the substitution. This puts the cultural-sensitivity treatment at the locale that has the consumer base demanding it without changing US behavior.
- **`canadian_indigenous` tagged with the Kelsey + Hounddog co-curation footnote in the spec only.** UI surface treats it identically to other tags; the cultural review process is upstream (curating which dishes get the tag, not how the chip looks). Surfacing the curation process on the chip would be performative; treating the tag with the same UX weight as `Italian` or `Mexican` signals respect.
- **No "Show original" toggle in Settings.** Pushed back on adding a Settings preference. The substitution is part of the locale; it is not a separate axis a consumer should toggle. If a consumer wants the legacy broad term, they can long-press the chip; if they want it always, they can switch locale to en-US.

**Mobile adaptation:** Same chip rendering across mobile and desktop. Long-press threshold 500ms on mobile (matches platform convention for "show more info" gesture); on desktop the long-press equivalent is right-click which surfaces the same tooltip.

---

### §14.4 Unit conversion at render (existing macro chips, portion displays, recipe details)

**Layout:** No layout change. Every numeric weight / volume display reads from `preferred_unit_system` and renders in the consumer's unit family. Storage stays canonical (grams + kcal + milliliters); conversion is render-time only. Display surfaces: macro chips on meal cards, portion size on meal_items, recipe ingredient quantities, restaurant menu item portions, supplement dose units (where applicable; supplement units are typically mg already so usually unaffected).

**Header copy:** N/A

**Body copy (conversion rules and display precision):**
- Weight conversions:
  - Less than 28 g: render in grams only (no oz equivalent in Imperial; "5 g" reads better than "0.2 oz" which feels noisy). For Imperial pref users below 28 g, fall back to grams display because oz precision degrades sharply below 1 oz
  - 28 g to 999 g: convert at render. Round oz to nearest 0.5 oz when target precision is "common kitchen reading" (e.g., 142 g -> 5 oz, not 5.0 oz; 100 g -> 3.5 oz; 250 g -> 9 oz). For weights ending in 0.25 / 0.75 oz boundaries, round up.
  - 1000 g and above: render in lb + oz on Imperial (e.g., 1500 g -> 3 lb 5 oz). Metric continues in g until 5000 g, then kg.
- Volume conversions:
  - Less than 30 ml: render in ml + tsp/tbsp where the value matches a common kitchen unit (5 ml = 1 tsp, 15 ml = 1 tbsp); otherwise render in ml only for both metric and imperial (precision-loss avoidance)
  - 30 ml to 999 ml: convert to fl oz, round to nearest 0.25 fl oz
  - 1 L and above: render in L on metric, qt on imperial
- Energy: always kcal at launch (kJ deferred to EU per spec §8). en-CA + fr-CA consumers see kcal only.

**Display formatting:**
- Numeric format honors Intl.NumberFormat for the locale (en-US: `1,500`; en-CA: `1,500`; fr-CA: `1 500` with thin space per French Canadian convention; handled by Prompt 173)
- Unit abbreviations: `g`, `oz`, `lb`, `ml`, `fl oz`, `L`, `qt`, `kcal`, `tsp`, `tbsp`
- fr-CA unit display per spec §8: `g`, `oz`, `lb`, `ml`, `oz liq`, `L`, `qt`, `kcal`, `c. à thé`, `c. à soupe` (production strings live in Prompt 173 translation memory; this artifact references the values for completeness)

**CTAs:** N/A (passive display; no interaction)

**Conditional states:**
- Mixed preference active: weights under 500g (typical food portion range) render in grams; weights over 500g (personal scale weights, large servings) render in lb + oz. Volumes render in ml under 250 ml, fl oz over.
- Switching from metric to imperial mid-session: existing rendered values re-render on next data-fetch boundary; cached cards do not retro-update (de-facto refresh on next interaction)
- Recipe ingredient quantities in cross-locale recipes: storage canonical (grams), display per consumer preference. A fr-CA consumer viewing a US-origin recipe sees `100 g` not `3.5 oz` if their preference is Metric.
- Bioavailability claim "10x to 28x" (per spec §9.7): renders verbatim in English locales; for fr-CA, the production translation is `10x à 28x` (referenced anchor, not drafted in this artifact). Numerical value never converted.

**Accessibility commitments:**
- aria-label on macro chips includes the full unit name: `240 kilocalories, 12 grams of fat, 30 grams of protein` (screen readers prefer expanded units over abbreviations for clarity)
- Conversion rounding boundaries documented in code comments (lib/nutrition/unit-conversion.ts) for future audit
- Color contrast unchanged from existing macro chip tokens
- Reduced-motion: no animation on unit display
- Number locale formatting honors RTL when RTL locales eventually ship (deferred per spec §3 RTL filed-for-future)

**Push-back / UX decisions:**
- **Conversion precision: rounding to 0.5 oz boundary, NOT 0.1 oz.** This was the explicit UX question. The right answer is: kitchen-readable precision, not engineering precision. 142.5 grams -> 5 oz is what a consumer expects on a kitchen scale; 142 g -> 5.0089 oz is correct math but reads like a bug. The rounding rule preserves trust in the conversion: "this is approximately the same amount, expressed in your units." Where the original gram value is itself a round number (100 g, 250 g), the rounded oz value is also round (3.5 oz, 9 oz). Where the original gram value is unusual (147 g from a barcode scan), the oz value rounds to the nearest 0.5 (5 oz). For weights below 28 g (1 oz), the conversion is not surfaced at all; the gram value renders raw because sub-oz precision degrades to "0.7 oz" levels of awkwardness.
- **Storage stays canonical (grams + kcal + ml).** Per spec §8.3 storage rule, no double-conversion. A meal logged in oz by an Imperial user is stored as grams; switching to Metric mid-session re-renders the same canonical value as grams. This avoids the rounding-drift bug where a value converted forth and back loses 0.4 g each cycle.
- **Mixed default uses a kitchen-pragmatic threshold (500g for weights, 250 ml for volumes).** Below those thresholds, Mixed renders metric (most cookbooks and nutrition labels read in grams below 500g); above, Mixed renders imperial (a 1 lb steak reads as 1 lb to most Canadian consumers, not 454 g). The thresholds are documented and configurable per spec §8.4 if telemetry shows consumer confusion.
- **kJ display deferred to EU launch.** Spec §8 was explicit; honored here. en-CA + fr-CA see kcal only. kJ + kcal dual display is a 170k-supplement-eu concern.
- **Bioavailability "10x to 28x" anchor preserved.** Per spec §9.7, the verbatim phrase carries the Bio Optimization brand promise. The connector ("to" -> "à" in fr-CA) is the only piece that localizes; numerical values stay. Production translation is signed off by Gary; this artifact references the anchor for downstream translation review.

**Mobile adaptation:** No layout change; identical rendering. Long numeric values with thin-space (fr-CA `1 500 g`) measured against macro chip widths to ensure no wrap on common phone widths.

---

### §14.5 Disclaimer text per-locale rendering (sticky footer, card footers, modal)

**Layout:** Disclaimer placement is unchanged from Prompt 170h §13.5 + 170i §6.7: sticky footer on the bottom of consumer flows that surface insights or coaching notes, card footers on individual insight cards, and modal acknowledgment when an insight is shared externally. Content varies by `preferred_locale`; visual treatment stays identical across locales.

**Header copy:** N/A (disclaimer is body text)

**Body copy (per-locale strings, with regulator-framing):**

en-US (existing, unchanged):
- Sticky footer: `These statements have not been evaluated by the FDA. ViaConnect is intended for general wellness information and is not a substitute for medical advice.`
- Card footer (condensed): `Not evaluated by the FDA. Not medical advice.`

en-CA (new in 170k v1, Kelsey-reviewed during Blueprint):
- Sticky footer: `These statements have not been evaluated by Health Canada. ViaConnect is intended for general wellness information and is not a substitute for medical advice.`
- Card footer (condensed): `Not evaluated by Health Canada. Not medical advice.`

fr-CA (new in 170k v1, Kelsey-reviewed during Blueprint):
- Sticky footer: production translation per Prompt 173 translation memory; illustrative content per spec §9 = `Ces déclarations n'ont pas été évaluées par Santé Canada. ViaConnect est destiné à fournir des informations générales sur le bien-être et ne remplace pas un avis médical.`
- Card footer (condensed): production translation; illustrative = `Non évalué par Santé Canada. Pas un avis médical.`

**Visual treatment:** Identical across all locales. 11px Navy 60 percent text, italic, centered on sticky footer; left-aligned on card footers; full-paragraph on modal. Same Card `#1E3054` background, same 16px padding. No locale-conditional color, no locale-conditional badge, no flag icons. The treatment signal is content-only.

**CTAs:** N/A (disclaimer is informational only; per 170h pattern, no "Learn more" link, no "Acknowledge" button at footer-level)

**Conditional states:**
- Sticky footer: persistent across consumer-facing scroll surfaces (Insights tab, Coaching Notes tab, Recommendations); shown once at bottom; never reflowing or repositioning
- Card footer: per insight / per coaching note as currently rendered
- Modal disclaimer: when a consumer shares an insight externally (per 170h §13.5), modal acknowledgment shows full sticky-footer-length disclaimer, full-paragraph treatment
- Locale change with consent (§14.1 modal): disclaimer regenerates at next page render in new locale; no separate notification ("your disclaimer has updated") because the modal already declared the change as part of locale switch
- Kill switch `LOCALE_AWARE_CASCADE_ENABLED` false: every consumer sees en-US disclaimer regardless of preferred_locale; this is the master kill switch behavior

**Accessibility commitments:**
- Disclaimer text aria-label = the full text (not abbreviated), so screen readers do not truncate
- Color contrast: Navy 60 percent on Card `#1E3054` bg measures 4.5:1 exactly (at floor, verified per existing 170h token audit)
- Italic styling preserved via CSS font-style; aria does not announce italic (visual styling only)
- Sticky footer remains in keyboard tab order at the end of the page; Tab cycles past it last
- fr-CA accented characters render via fallback chain `Instrument Sans, system-ui, -apple-system, "Segoe UI", sans-serif`; no fallback degradation observed for á, é, ç, à, è
- Reduced-motion: disclaimer does not animate

**Push-back / UX decisions:**
- **Visual treatment IDENTICAL across locales.** This was the explicit UX question. Two paths: (a) signal "this is your local disclaimer" with a flag icon or color change, or (b) keep the visual identical and let the content do the work. Chose (b) for three reasons. First, locale-conditional visual treatment teaches consumers that disclaimers vary by region in a way that might invite cross-comparison ("why does my friend's app have a different colored footer?"). Identical treatment signals "this is the disclaimer, full stop, framed for where you are." Second, flag icons in regulatory disclaimers are tonally off; regulators are not nations on a sports board. Third, the content change is itself the differentiator and the most legally-load-bearing piece: "Health Canada" vs "FDA" is the substance.
- **Health Canada framing for en-CA AND fr-CA.** Both Canadian English and French Canadian consumers see Health Canada / Santé Canada framing; the regulator is the same for both linguistic communities. Only the language differs. This avoids a confusing situation where bilingual Canadian consumers see different regulator names depending on language toggle.
- **Card footer condensed version.** Per existing 170h pattern; preserved. Condensed reads `Not evaluated by Health Canada. Not medical advice.` which is the legal floor in seven words. Sticky footer carries the longer educational version.
- **Production translations are Kelsey + Gary signoff items, not Hannah drafts.** The illustrative French text in spec §9 is exactly that: illustrative. The production fr-CA disclaimer goes through Canadian regulatory consultant review per spec §9 sequencing prerequisite #5. This artifact references the production string slot without committing the final wording.
- **Disclaimer placement does not move with locale.** Sticky footer stays sticky-footer; card footer stays card-footer. Position is a UX rhythm consumers learn; content is the locale variable.

**Mobile adaptation:** Sticky footer max-height 64px on mobile to accommodate longer Health Canada framing (15 percent longer than FDA in en-CA, ~25 percent longer in fr-CA due to French syntax expansion); text wraps to 3 lines max with explicit line-height to prevent collision with safe-area bottom. Card footer wraps native.

---

## UX architecture summary

**Top 4 UX decisions made:**

1. **Locale change is modal-confirmed, with a five-icon "Here is what changes" block.** Locale is the second-most-impactful preference in the app; silent commit would degrade consumer trust the first time they discover the catalog filtered itself or the disclaimer changed wording. The modal mirrors 170i's three-icon orientation pattern (Granular / Time-bounded / Reversible) and applies it to locale's five invariants (Language / Catalog / Cuisine / Units / Disclaimer). The acknowledgment checkbox below the block is the consent contract; this is the same pattern as the 170i three-step consent modal Step 3.

2. **Cuisine substitution hides the broad term by default, surfaces on long-press.** The cultural sensitivity intent (spec §6) requires the substituted display to be primary; double-chipping would undermine the substitution. But total opacity would confuse consumers who want to understand the system. Long-press tooltip threads the needle: default-clean, intentional-discovery for power users. Storage stays canonical English; display is locale-adaptive at render time.

3. **Unit conversion rounds to kitchen-readable precision (0.5 oz boundaries), not engineering precision.** 142 g -> 5 oz, not 5.0089 oz. Sub-28g weights skip conversion entirely (precision degrades). Storage canonical (grams + kcal + ml); double-conversion drift avoided. Mixed unit defaults use Canadian colloquial reality (grams under 500g, lb/oz above).

4. **Disclaimer visual treatment identical across locales; content is the differentiator.** No flag icons, no locale-conditional colors. Health Canada framing for both en-CA + fr-CA (same regulator, different languages). Production translations are Kelsey + Canadian regulatory consultant signoff items, not Hannah drafts. Card-footer condensed version preserved from 170h.

**Spec push-back captured:**

- §8.1 Mixed unit description ("grams primarily, oz for personal weights and large portions") reframed to anchor in Canadian nutrition-label reading reality, removing the "what does mixed even mean" cognitive trap.
- §14.1 locale dropdown silent-commit assumption rejected; modal confirmation is the trust contract.
- §14.2 `US only` chip framing chosen over `Not in Canada` or `International`; tooltip carries the data-source caveat.
- §14.3 broad-term-suppression made the default; long-press tooltip is the opt-in transparency layer.
- §14.5 locale-conditional visual treatment rejected; identical treatment preserves disclaimer trust across consumer cohorts.

**Cross-locale UX considerations:**

- **Locale switching preserves historical data.** Meals, recipes, and supplement history stay as they are; only display formatting (units, cuisine substitution, disclaimer) re-renders. The locale modal's "Your meals and recipes stay where they are" closing line is load-bearing trust messaging.
- **Cross-locale recipe library (composes with 170f).** Switching from en-CA to fr-CA shows fr-CA recipes by default per spec §10.2. The modal surfaces a "Toggle Show all regions to see your existing recipes" line ONLY when the consumer has at least one saved recipe. Empty-state on the recipe library tab in fr-CA (when consumer has no fr-CA recipes yet but has en-CA recipes): `No French Canadian recipes yet. Tap "Show all regions" to see your existing recipes, or save a new one.` (fr-CA production translation per Prompt 173).
- **Locale not visible to practitioners (per 170i §8.5 redaction matrix extension).** A consumer at en-CA viewing a meal alongside their practitioner at en-US sees the same meal rendered in different locales. This is intentional. Each party sees their own units, their own disclaimer, their own cuisine substitution. No reconciliation needed; the meal data itself (kcal, grams, foods) is canonical.
- **Cuisine substitution operates on render, not on save.** A meal saved before locale switch renders with current-locale substitution next time it is viewed. No re-processing. The cuisine_tags_locale table is the join layer that makes this work without database migration on locale change.

**Bio Optimization and bioavailability localization edge cases (anchors for production translation):**

- **Bio Optimization brand name.** Verbatim within a locale per spec §9.6. en-US + en-CA = `Bio Optimization` (identical). fr-CA = `Optimisation Bio` (production string; Gary signoff per spec). This artifact references the en-US form throughout; production en-CA / fr-CA strings live in Prompt 173 translation memory with the brand-voice translation guidelines that 173 owns. Surface anchors where the brand name appears in 170k surfaces: Settings header section is generic ("Region and units"; no brand mention); locale-change modal does not invoke the brand by name; macro chip aria-labels are generic ("240 kilocalories"); disclaimer footer does not invoke the brand. The brand name appears in §14.5 modal disclaimer ONLY in the closing sentence per existing 170h pattern. Production translation slot is at the modal-disclaimer string; fr-CA renders `ViaConnect` (brand name itself unchanged) + `Optimisation Bio` (where the Bio Optimization phrase appears in the longer disclaimer wording per Prompt 173 translation memory).
- **Bioavailability "10x to 28x"** verbatim in English locales per spec §9.7. fr-CA production translation `10x à 28x` (connector localized, numerical value unchanged). Surface anchor: macro chip explanations on insight cards (when an insight cites the "10x to 28x bioavailability" claim per 170h §13.5 + Catalyst+/Methylation product context); production string lives in Prompt 173 translation memory with the verbatim-number constraint encoded as a translation rule.
- **Locale switching does not "translate" the brand name or the bioavailability number.** A consumer flipping from en-CA to fr-CA mid-session sees `Bio Optimization` -> `Optimisation Bio` and `10x to 28x` -> `10x à 28x` rendered automatically by Prompt 173's translation memory at the string-key level. This artifact does not draft those production strings; the wireframes hand the slots off cleanly to the production translation workflow.

<!-- HANNAH_WIREFRAMES_END -->

## When 170k can sensibly build (sequencing prerequisites, in order)

1. **Prompt 173 (App-Wide i18n Foundation) filed, ratified, shipped, dogfooded ≥7 days** — hardest blocker; not yet pasted
2. **At least one of 170e (restaurant catalog), 170f (recipe library), 170h (insights surface) shipped** — currently all three filed-only
3. **Kelsey added to agent fleet OR compliance owner reassigned** (recurring flag from 170i)
4. **Kelsey CNF license memo signed** (Open Government License - Canada confirmation, ~1-2 days)
5. **Kelsey Health Canada disclaimer review** with Canadian regulatory consultant (~1-2 days)
6. **Gordon Canadian chains catalog drafted** (8 chains × ~25 menu items, citations required, ~1-2 weeks)
7. **Gordon cuisine tag translation table** for ~30 slugs × 3 locales with cultural sensitivity flags (~1 week)
8. **Gordon French Canadian Haiku NLU system prompt** authored (~1 week)
9. **Gordon French Canadian curated voice test set** (10 speakers × 100 commands, ~1-2 weeks external recording)
10. **Translation files en-CA + fr-CA complete** via Prompt 173's translation review workflow (~$3-5k vendor)
11. **Hannah wireframes signed off by Gary** (this turn's dispatch)
12. **Three kill switches ready**, all defaulted false
13. **No-regression test for en-US users** verified pre any en-CA traffic routing

Estimated runway from Gary green-light to 170k Phase 2 ship: **8 to 12 weeks** (driven by translation vendor turnaround + Gordon catalog curation + voice test set recording). 

Deepest pipeline implies earliest ship is **multi-quarter** when 173 + at-least-one-of-170efh sequencing is honored.

## Four flags for Gary

### Flag 1: Prompt 173 not yet pasted — hard prerequisite gap

Spec §0 declares Prompt 173 (App-Wide i18n Foundation) as a hard prerequisite "filed simultaneously with this prompt." Gary pasted 170k but did NOT paste 173. The 170k filing references 173's scope in §3.1 (translation library, locale detection waterfall, URL routing, Intl wrappers, pluralization, RTL, brand voice translation memory, translation review workflow, QA), enough for me to draft a placeholder, but the production 173 spec requires Gary's input on:

- Translation library choice (170k §3.1 recommends `next-intl`; needs Gary confirmation)
- Translation management platform choice (Lokalise vs Crowdin vs alternative)
- Brand voice translation guidelines content
- RTL launch sequencing (filed-for-future even within 173)
- 173 owner agent (likely Hounddog given social-analytics breadth, OR a new TBD agent given infrastructure breadth)

**Recommended action**: Gary pastes Prompt 173 spec next, OR explicitly directs me to draft a 173 placeholder from 170k §3.1 + memorialize it for future fill. Without 173, 170k cannot Blueprint.

### Flag 2: Multi-upstream sequencing — deepest-pipelined 170-series filing

170k has FOUR upstream gates: 173 shipped + 170 ratified (done) + 170a ratified (done) + at-least-one-of-170e/170f/170h shipped (none shipped). Whereas 170i had 2 upstream gates and 170j had 0, 170k has 4.

Practical implication: 170k is earliest plausibly **multi-quarter out**, gated by translation vendor turnaround (8-12 weeks alone), Gordon catalog curation (~3 weeks), voice test set recording (~2 weeks), and the cascade-dependent ship order of 173 + 170e/f/h.

**Recommended action**: file-and-defer. 170k's value is locale expansion; without Canadian users feeling underserved by the current US-only experience (which I have no signal of), prioritization stays below 170d/e/f/h. If Gary has telemetry indicating Canadian user demand, that changes the calc.

### Flag 3: Kelsey gap (recurring from 170i)

Same gap as 170i: "Kelsey (Compliance, per-jurisdiction disclaimer review and food database licensing)" named as co-owner; Kelsey NOT in current 9-agent fleet. Per-locale Kelsey work is on the critical path for every locale phase (CNF review, Health Canada disclaimer, Canadian regulatory consultant coordination, future UK FSA + EU per-country reviews).

**Recommended action**: add Kelsey to the agent fleet. The compliance role is now load-bearing across 170i (HIPAA-adjacent + Practitioner TOS + BAA framework) and 170k (per-jurisdiction food disclaimer + database licensing memos) and accumulates more responsibility with every locale phase and every consent surface.

### Flag 4: nutrient_source CHECK reconstitution = third 170-series exception

170k §12.7 reconstitutes the `meal_items.nutrient_source` CHECK to add `cnf`. Same documented-exception pattern as 170e §7.8 (added `restaurant_menu`) and 170f §8.3 (added `recipe_template`). This is the THIRD 170-series prompt using this pattern.

**Recommended action**: consider whether the pattern should be normalized into a documented standing precedent (e.g., a `feedback_check_reconstitution_for_enum_extension.md` memory file) so future locale supplements (170k-supplement-uk for `mw_cofid`, 170k-supplement-eu for `efsa_eurofir` + `anses_ciqual` + `bls` + `bedca`) don't need to re-litigate the exception at each Audit gate. Currently each instance is self-litigated; standardizing avoids audit overhead and protects the "append-only" rule from drift.

## Composition with other 170-series prompts

- **170**: cascade pattern from §2.2 step 6 is the surface 170k augments with locale-aware routing
- **170a + supplement**: nutrient_source CHECK reconstitution precedent
- **170b**: cuisine_tag column on `farmceutica_curated_foods` is the column 170k localizes
- **170e**: restaurant catalog structure + customization_model enum (Canadian chains added with same shape; locale tagging via `available_locales` text[])
- **170f**: recipe library + recipe_items shape (locale field added; cross-locale matching uses locale-independent pHash; library default-filter by locale with "show all" toggle)
- **170g**: phased rollout pattern (170k mirrors the staged Phase 1/2/3/4 approach); licensing-first selection pattern (open-licensed databases ship first, commercially-licensed deferred to Kelsey legal review)
- **170h**: catalog citation requirement (every CNF + Canadian chain row needs source URL + access date)
- **170i**: redaction matrix verified — locale preference is consumer-only, not visible to practitioner
- **170j**: voice operation taxonomy + NLU system prompt structure extended for French Canadian; Hannah's §11 wireframes extend to fr-CA hints
- **Prompt 173 (prerequisite)**: translation library, locale detection waterfall, URL routing, Intl wrappers, brand voice translation memory, RTL support, translation review workflow — 170k consumes these, does NOT build them

## Ratification posture (2026-05-29)

Gary acknowledged 170k at spec level 2026-05-29. Per ViaConnect convention this counts as filed and ratified at the spec level. No code change required this turn.

**Distinct from prior 170-series: 170k explicitly depends on a not-yet-filed prompt (173).** The filing is internally complete but the dependency tree is incomplete until 173 is filed.

## 170k-supplements anticipated

Filed for future:
- **170k-supplement-uk**: M&W CoFID UK food database, 10+ UK chains, en-GB locale, FSA/NHS framing, Kelsey UK regulatory review
- **170k-supplement-eu**: EuroFIR + per-country databases, EU chains per-country, multi-language launch, kJ display support, EFSA + per-country food authority framing
- **170k-supplement-canada-menu-precision**: revisit Chipotle/McDonald's/Subway/Starbucks Canadian menus where they differ from US menus; per-locale macro overrides
- **170k-supplement-spanish-portuguese**: launch ES + PT locales (when EU ships)
- **170k-supplement-rtl**: Arabic + Hebrew (gated on Prompt 173 RTL support)
- **170k-supplement-mixed-language-voice**: handle Canadian code-switching utterances in voice editing

## Related

- Prompt 170 Phase 1 (shipped 2026-05-29 commit `47a7663d`)
- Prompt 170a + 170a-supplement (ratified 2026-05-29)
- Prompt 170b (filed; depth sensors, curated foods seed pattern)
- Prompt 170c (placeholder; PHI redaction)
- Prompt 170d (filed; multi-photo)
- Prompt 170e (filed; restaurant catalog, the `available_locales` augmentation here)
- Prompt 170f (filed; recipe library, the `locale` field here)
- Prompt 170g (filed; phased rollout pattern + licensing-first selection pattern, heritage)
- Prompt 170h (filed; catalog citation requirement pattern)
- Prompt 170i (filed; redaction matrix verified for locale not leaking to practitioner)
- Prompt 170j (filed + GREEN-LIT for fast-track build 2026-05-29; French Canadian voice extension)
- **Prompt 173 (NOT YET PASTED; hard prerequisite)**: App-Wide i18n Foundation
- Heritage: Prompts 15-17 (supplement protocols and Bio Optimization Analytics naming); CAQ Phase 0 (three-portal architecture, supports practitioner-locale-independent rendering); Prompt 16 (medication interaction safety, jurisdiction-specific)
