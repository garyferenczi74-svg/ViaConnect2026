# PROMPT 223: SIGNUP LOCATION, STRUCTURED TYPE-TO-SEARCH DROPDOWNS FOR CITY, STATE OR PROVINCE, AND COUNTRY

**Platform:** ViaConnect (Next.js 14 / TypeScript / Tailwind / Supabase project nnhkcufyqjojdbvdrpky, us-east-2 / Vercel)
**Route affected:** /signup step 3 (Profile, the "Tell Us About Yourself" card), plus the Profile edit surface which must reuse the same component. Desktop and mobile.
**Agents:** Michelangelo (Senior Developer), Hannah (label/placeholder copy), Marshall (lexicon pass), Security Advisor (no PII in logs), Jeffery (report)
**Observed state:** Location is a single free-text input (currently holding "Buffalo"), which yields unstructured, ambiguous data (which Buffalo, which country) and blocks any location-aware behavior downstream.

---

## 1. THE COMPONENT: TEXT-ACTIVATED STRUCTURED LOCATION

Replace the single Location input with a three-field structured selector, each field a text-activated combobox (the user types, matching options filter live, arrow keys and tap both select):

1. **Country:** searchable select over the full ISO country list. Typing filters by name (e.g. typing "can" surfaces Canada). Default: no preselection; the field is required.
2. **State or Province:** dependent on the selected country; label adapts to the country's convention (State for the US and Australia, Province for Canada, Region/County as the generic label elsewhere; a per-country label map with a sensible generic fallback). Populated from the selected country's subdivision list (ISO 3166-2 based). Required where the country has subdivisions; hidden or optional where it genuinely does not.
3. **City:** typeahead filtered by the selected country and subdivision against the seeded cities reference (Section 2). Matching is prefix-and-contains, diacritic-insensitive. **Free-entry fallback:** if the user's city is not in the reference list, they can keep their typed text as the city (shown as "Use '<typed value>'" at the end of the suggestions). No user is ever blocked from signing up because a smaller city is missing; the honest typed value is stored and the miss is logged for reference-data growth.
4. **Order and dependency:** Country first, then State/Province, then City; changing a parent clears its dependents. Tab/keyboard flow natural; each combobox accessible (combobox/listbox roles, aria-expanded, active-option announcement).
5. **Design:** existing form tokens (the current input styling), Instrument Sans, Teal focus treatment as on the current Location field, 44px touch targets, dropdown panels legible over the page background, no page-level overflow at 375/390px, mobile keyboards appropriate (text, not number).

## 2. REFERENCE DATA (NO NEW PACKAGES)

1. **Seed via append-only migrations into reference tables** (countries, subdivisions, cities), sourced from a public-domain/CC0 dataset prepared at build time: countries (ISO 3166-1 with names and codes), subdivisions (ISO 3166-2), and a cities list covering at least all cities above roughly 15,000 population worldwide plus complete coverage for the US and Canada (the launch markets). No runtime third-party geocoding API and no npm dependency for this (honoring the package.json rule); the dataset is data, shipped as migration seed files, with its source and license recorded in the migration comment.
2. **Query path:** typeahead queries hit an indexed server-side search (prefix index on normalized names, filtered by country/subdivision), debounced client-side; three-layer resilience on the lookup (timeout, fail-open to free-entry mode with a logged event so signup never stalls on the reference service, structured logging).

## 3. STORAGE AND MIGRATION OF EXISTING DATA

1. **Profile schema:** replace the single location string with structured fields: city, subdivision_name, subdivision_code, country_name, country_code (append-only migration; the legacy string column is retained as location_legacy, not dropped).
2. **Backfill:** existing profiles with a legacy string are parsed ONLY where unambiguous against the reference data (exact single-match city or "City, ST" patterns); ambiguous values (like a bare "Buffalo") are left unparsed with the legacy string intact and the profile flagged for a one-time in-app prompt ("Confirm your location") the next time the user visits Profile. Never guess which Buffalo. Report the backfill statistics (parsed, prompted, total).
3. **Downstream consumers:** inventory every reader of the old location string (profile display, any personalization, admin views) and point them at the structured fields with a formatted display helper (e.g. "Buffalo, NY, United States"); the legacy column feeds nothing after this prompt (grep-verified).
4. **Privacy posture:** location is stored at city granularity only (no coordinates introduced by this prompt); no location values in logs beyond structured non-PII event metadata; Security Advisor verifies.

## 4. VERIFICATION (EVIDENCE-GATED)

1. Deployed signup walkthrough: type-filtered selection of Country, adaptive State/Province label proven with two countries (US showing State, Canada showing Province), dependent City typeahead, and account creation succeeding with structured values stored (row-level evidence). Desktop and mobile screenshot sequences (6 minimum).
2. Free-entry fallback demonstrated (a small unlisted city accepted via "Use '<value>'" and stored; miss logged).
3. Dependency clearing demonstrated (changing country clears subdivision and city).
4. Fail-open demonstrated (reference lookup killed in a test context; signup completes in free-entry mode with the logged event).
5. Backfill statistics reported; the Profile "confirm your location" prompt demonstrated on a flagged fixture account; Profile edit reusing the same component shown.
6. Accessibility pass noted (keyboard-only completion of all three fields); no overflow at 375/390px; console clean.
7. Grep evidence: no consumer of location_legacy remains.

## 5. GUARDRAILS

Standard set applies: append-only migrations (reference seeds included, license noted); no package.json changes without Gary's explicit approval (dataset as seed data, not a dependency); never touch email templates; locked strings; UNKNOWN never fabricated (ambiguous backfills prompt, never guess); no location coordinates introduced; Helix Rewards consumer scope; getDisplayName(); no em/en dashes; desktop and mobile in the same pass; Jeffery review per 221a on the completion report; direct push to main.

## 6. ACCEPTANCE CRITERIA

1. The three-field text-activated selector live on signup step 3 and Profile edit, with adaptive labeling, dependency behavior, free-entry fallback, accessibility, and the design/mobile requirements met.
2. Reference tables seeded with recorded source/license; indexed lookup with resilience; no new packages.
3. Structured storage live; unambiguous backfills parsed, ambiguous ones prompted (never guessed); downstream readers migrated with grep proof.
4. All Section 4 evidence attached; anything unfinished stated plainly with remaining work.
