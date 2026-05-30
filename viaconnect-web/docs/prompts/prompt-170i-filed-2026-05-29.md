# Prompt 170i Filed: Practitioner Consent-Based Meal Review, Three-Portal Coaching Surface

Date: 2026-05-29
Status: **Filed at spec level; ratified.** NO code work. Hannah dispatched for §11 wireframes (longest-pole UX deliverable per §22).
Memorialized by: Jeffery (orchestrator).

## Mission (one line)

Extend the consumer-sovereign trust architecture from 170h's per-insight sharing into ongoing scope-based practitioner visibility: a consenting consumer grants a connected practitioner access to one or more of four nutrition data scopes (Summary, Detailed Meals, Symptom Correlations, Supplement Adherence) for a time-bound window, and the practitioner can leave acknowledgment-tracked coaching notes attached to meals, insights, weekly reviews, or the overall protocol, all within the existing Practitioner Portal and Naturopath Portal, mirrored across both with identical consent semantics.

## Why this filing posture follows the 170d/e/f/h pattern (with five structural differences)

170i memorializes-only with Hannah dispatched for §11 wireframes, same posture as 170d/170e/170f/170h. Five structural differences:

1. **Spec §0 directive is the hardest sequencing constraint in any 170-series filing.** Quote: "Sequenced after Prompts 170 + 170a + 170a-supplement ratify, Prompt 170h (shared_insights pattern) ships, and the existing three-portal architecture's practitioner connection infrastructure is verified live." 170h must SHIP (not just file). 170h itself is filed-only. So 170i is filed-on-top-of-a-filed-blocker, the strongest dependency chain in the 170-series.

2. **Hannah dispatch warrants on UX surface count alone**, distinct from 170g (no Hannah). §11 enumerates 9 wireframe surfaces (Settings, Practitioner Detail, three-step Consent Flow Modal, Coaching Notes tab, Dashboard hero badge, Patient List with consent chip, Practitioner Nutrition Review tab, Add Note bottom sheet, Note management) plus naturopath mirror, notifications, icons. The three-step consent flow modal is the heaviest flow-choreography surface in the entire 170-series.

3. **First 170-series prompt with cross-portal scope.** Every prior 170-series prompt was consumer-portal-only. 170i extends to Practitioner Portal (`/practitioner/*`) and Naturopath Portal (`/naturopath/*`). Architectural reach is significantly larger; the redaction matrix from 170a-supplement §19.1 (extended through 170d/e/f/g/h) gets its largest single extension here in §8.5.

4. **NEW agent role: Kelsey.** Spec preamble names "Kelsey (Compliance, HIPAA-adjacent posture and BAA framing if practitioners are HIPAA-covered)" as co-owner. Kelsey is NOT in the current 9-agent ViaConnect fleet (Jeffery, Michelangelo, Hannah, Gordon, Arnold, Hounddog, Sherlock, plus security-advisor + performance-advisor). **Gap flagged for Gary** in "Three flags" below.

5. **HIPAA-adjacent posture explicitly introduced.** §8.3 frames ViaCura consumer as not-HIPAA-covered, but the Practitioner Portal receiving consumer data may be HIPAA-covered. The spec adopts a HIPAA-adjacent posture (7-year audit retention, no bulk export, append-only logs, consumer-visible access log) without claiming HIPAA-Compliant status. The standing rule from `feedback_compliance_claims_match_reality.md` (HIPAA-aware until BAA + program confirmed) is respected; 170i deliberately stays one step back from HIPAA-Compliant language.

## The four scope categories (cornerstone architecture)

| Scope | What practitioner sees | What is excluded | Default |
|---|---|---|---|
| Nutrition Summary | Daily/weekly macro aggregates, meal counts, protocol adherence estimate | Individual meal names, items, restaurant, timestamps | Not granted |
| Detailed Meals | Per-meal records with items, macros, restaurant, recipe name, timestamps | Photos (sub-toggle, default off), multi-photo frames, customization deltas, custom model metadata, recipe template contents | Not granted |
| Symptom Correlations | 170h Notable + Strong insights, "Why we think this" body, sample counts | Raw symptom log, Recent observation insights, dismissed insights, feedback ratings | Not granted |
| Supplement Adherence | Aggregate percentage, timing patterns, skip frequency | Individual dose log, consumer dose notes, cost data, source info | Not granted |

Each scope is independently grantable. The practitioner's Nutrition Review tab renders ONLY the granted scopes; ungranted scopes are absent (not "locked" or "upgrade-prompted") per §5.2.

## Consent architecture quick reference

- **Default-deny**: every newly-connected practitioner starts at zero nutrition access (§3.1).
- **5 duration options**: 7d / 30d / 90d / 1yr / Indefinite. No "permanent" option. Indefinite = 1 year with 14-day-pre-expiry re-affirmation banner (§3.3).
- **Granular per-practitioner**: a consumer with MD + ND can grant different scopes to each (§3.4).
- **Revocation immediate**: no grace period; practitioner notified within 60 seconds; existing coaching notes persist as historical record but no new notes possible without re-consent (§3.5).
- **Modification without revoke**: scope and duration adjustable; audit log captures before/after; scope reductions notify practitioner, expansions do not (§3.6).
- **Consumer-initiated only**: NO API endpoint, NO UI affordance, NO email template lets a practitioner request access. The consumer is sovereign. This is THE central trust-architecture decision.

## Coaching notes model summary

- **4 target kinds**: meal, insight (from 170h), week, overall protocol (§6.1).
- **4 severity levels** with distinct visual treatment: Informational (neutral) / Suggestion (Teal) / Recommendation (Orange) / Action Required (Orange + Bell icon, persistent badge) (§6.3).
- **7-day edit window**: enforced at both RLS layer (update policy) and application layer (UI removes edit actions); nightly cron sets `is_locked = TRUE` on day-8 (§6.4).
- **5 acknowledgment states**: Unread / Read / Acknowledged / Follow-up needed / Completed. Consumer transitions, practitioner sees read-only (§6.5).
- **No clinical-claim linter on practitioner notes** (§6.8). Licensed practitioners use clinical language; standing FDA disclaimer on the Coaching Notes tab carries the contextual framing.

## Practitioner-side surfaces summary

- Patient List gains a Nutrition consent state chip per row (5 states: Full / Partial / None / Revoked / Expired) (§5.1).
- Patient Detail gains a Nutrition tab that renders only granted scopes; no-consent state shows a stark LockIcon + "Patient has not shared" message, no request affordance (§5.2).
- Add Note CTAs at section headers AND per-record, pre-populated target with override (§5.3).
- **No bulk operations**: no CSV/PDF export, no bulk-tag, no printable summary. Intentional trust-architecture constraint, NOT a feature gap (§5.4).
- Every load writes to `practitioner_nutrition_access_log`; consumer sees the log via Settings > NutriVision > Practitioner Sharing > Audit log (§5.5).

## Naturopath parallel

- Identical consent semantics, scope categories, coaching note system in `/naturopath/*` (§7.1, §7.2).
- Notes from MD vs ND tagged with role chip on consumer-side Coaching Notes tab (§7.2).
- **No cross-portal note visibility in v1**: an ND does not see notes left by the MD on the same consumer (§7.4). Filed for 170i-supplement.

## Audit and compliance posture

- Two append-only audit tables: `consent_change_audit_log` + `practitioner_nutrition_access_log` (§9.4, §9.5).
- **7-year retention** for both, matching common medical record norms even though ViaCura is not HIPAA-covered.
- Consumer-visible access log (§4.2 Audit Log section), transparency surfaces are part of the trust architecture, NOT separate features.
- **Audit log writes are load-bearing**: if an audit log write fails, the underlying action (grant, revoke, access) is REJECTED with 503 (§18.1). This is the strictest fail-closed gate in the 170-series.

## HIPAA-adjacent posture

§8.3 adopts:
- All access logged, 7-year retention
- All consent changes logged
- No bulk export pathways
- No data shared beyond consenting consumer's chosen recipients
- Audit logs accessible to consumer for transparency
- Practitioner Terms of Use (Kelsey deliverable; placeholder for BAA framework)

Standing rule `feedback_compliance_claims_match_reality.md` respected: 170i language stays "HIPAA-adjacent" not "HIPAA-Compliant" until BAAs + program in place. Formal BAA framework filed as future enhancement (out of 170 family).

## Updated practitioner portal redaction matrix delta

170a-supplement §19.1 redaction matrix (extended through 170d §15.4, 170e §15.4, 170f §15.4, 170g §14.5, 170h §13.3) gets its LARGEST single extension in 170i §8.5: 4 new practitioner columns added (Nutrition Summary / Detailed Meals / Symptom Correlations / Supplement Adherence), plus new data-element rows (recipe template contents, customization slot details, multi-photo frames, custom model cohort, supplement consumer dose notes, photo retention preferences, geolocation history, coaching note acknowledgments).

The matrix is enforced as runtime code in `src/lib/practitioner-sharing/redaction-matrix.ts` (NEW) and verified by integration test `tests/integration/practitioner-sharing/redaction-matrix-correctness.test.ts` for every scope combination.

## Cost model

- $0 external API calls (Postgres reads + writes + existing notification infrastructure).
- Storage growth ~5 GB/year at full scale, dominated by `practitioner_nutrition_access_log`.
- 7-year retention means storage management becomes meaningful at scale; `access-log-rotation` Edge Function filed for future (v1 ships without).
- **Cheapest prompt in the 170-series to operate.** No competitive cost-stack reduction (unlike 170e/170f/170g which save $1k-2k/mo each); 170i's value is qualitative (trust, clinical workflow).

## Helix events filed (6, consumer-side only per Standing Rule #8)

Practitioner-side actions (creating notes, loading Nutrition Review) write to the access log but do NOT award Helix points. Consumer-side events:

| Event key | Points | Purpose |
|---|---|---|
| `practitioner_nutrition_consent_granted` | 4 | Consumer granted any scope |
| `practitioner_nutrition_consent_revoked` | 0 | No penalty; logged for audit |
| `practitioner_nutrition_consent_reaffirmed` | 2 | Annual re-affirmation completed |
| `coaching_note_received` | 1 | Note received from practitioner |
| `coaching_note_acknowledged` | 2 | Any state transition above Read |
| `coaching_note_action_completed` | 3 | Action Required marked Completed (gold-standard metric) |

## Migrations filed (5 tables + 1 Helix block + 4 Edge Functions)

All append-only:
1. `practitioner_nutrition_consents` (consent rows, RLS party-scoped)
2. `practitioner_coaching_notes` (RLS insert gated by active consent)
3. `coaching_note_acknowledgments` (consumer-only state transitions)
4. `practitioner_nutrition_access_log` (append-only, 7-year)
5. `consent_change_audit_log` (append-only, 7-year)
6. Helix events block (6 event types)

Plus 4 Edge Functions:
- `coaching-notes-lock-old` (nightly cron, sets `is_locked` on day-8 notes)
- `consent-expiry-reminder` (14-day-pre-expiry banner trigger)
- `consent-expired-purge-notifications` (day-of expiry)
- `access-log-rotation` (v1 ships without; filed for future)

## Three nested kill switches (§12.4)

All default false at launch:
- `PRACTITIONER_NUTRITION_REVIEW_ENABLED` (master)
- `PRACTITIONER_COACHING_NOTES_ENABLED` (note creation; read-only still works when this is off)
- `PRACTITIONER_NATUROPATH_PORTAL_ENABLED` (disables ND parallel only)

Hierarchy verified by `tests/integration/practitioner-sharing/kill-switch-hierarchy.test.ts`.

## Privacy posture

- Default-deny baseline
- Consumer-initiated only (no practitioner-request endpoint)
- Audit log visible to consumer (§4.2)
- Photos default OFF in Detailed Meals (sub-toggle, §3.2)
- **170g corpus exclusion**: meals in active Detailed Meals consents excluded from training corpus (§8.4); enforced by integration test
- Notifications respect quiet hours (§13.7)
- No bulk export pathways (§13.8)
- Practitioner cannot share consumer data outside platform (architectural + contractual via TOS)

## §11 UI surfaces (Hannah's dispatch this turn, 9 surfaces)

<!-- HANNAH: replace the placeholder paragraph between START and END markers below with the §11.1 through §11.9 wireframe section per the dispatch prompt. Voice posture: consumer-facing copy follows clinical-claim linter from 170h §13.5; practitioner coaching notes are EXEMPT per 170i §6.8 but the Coaching Notes tab carries the standing FDA disclaimer. -->

<!-- HANNAH_WIREFRAMES_START -->

Voice posture inherited from 170h §13.5 linter for consumer copy: forbid "should", "diagnose", "treat", "cure", "prevent", causation verbs, recommendations to stop a medication; require "associated with", "may affect", sample size + time window, defer-to-practitioner framing. Practitioner coaching notes (§11.4 cards, §11.8 author surface, §11.9 management) are EXEMPT per 170i §6.8 but every Coaching Notes surface carries the standing FDA disclaimer footer.

### §11.1 Consumer Settings, Practitioner Sharing (route `/settings/practitioner-sharing`)

**Layout:** Standard Settings sub-page, Navy `#1A2744` page bg, Card `#1E3054` row cards. Header strip 56px with back chevron + title. Below: three vertical sections in order: Active sharing, Connected without sharing, Recently expired or revoked. Each section header is 16px with subtitle line. Each connected-practitioner row is a 72px card with avatar (48px circle) + name/role/connected-since stacked left + state chip cluster right + chevron-right.

**Header copy:**
- Page title: `Practitioner sharing`
- Intro paragraph below title (one time, 13px Navy 70 percent): `Choose what each connected practitioner can see. You can change or remove access at any time.`

**Body copy:**
- Section 1 header: `Active sharing` / subtitle `Practitioners with current access to your data`
- Section 2 header: `Connected without sharing` / subtitle `Connected to your account but with no data access`
- Section 3 header: `Recently expired or revoked` / subtitle `Past sharing arrangements from the last 90 days`
- Empty section 1: `No practitioners are currently sharing your data. Tap a practitioner below to set up sharing.`
- Empty section 2: hidden (omit if no rows)
- Empty section 3: hidden (omit if no rows)
- Per-row meta line under name: `{Role} | Connected since {month_year}`
- State chip text variants: `Full` (4 scopes), `Partial (n/4)`, `None`, `Expires {date}`, `Expired {date}`, `Revoked {date}`

**CTAs:**
- Section 1 row tap: navigates to §11.2 Practitioner Detail
- Section 2 row tap: navigates to §11.2 in "no sharing" state with Start sharing CTA visible
- Section 3 row tap: read-only history view (audit summary only)
- No top-level "Add practitioner" CTA on this page; connections are established elsewhere (existing CAQ practitioner connection flow)

**Conditional states:**
- All three sections empty: full-page empty state with Compass illustration + headline `No practitioner connections yet` + body `When you connect a practitioner from your Care Team settings, they will appear here so you can choose what to share.`
- A practitioner in Section 1 with a pending re-affirmation (14 days pre-expiry of Indefinite): row gets a small Orange `#B75E18` dot at top-right of the avatar + chip reads `Renews in {n} days`

**Push-back / UX decisions:** Spec implies a flat list with chip-driven state. Pushed back to three-section grouping because the cognitive load of mixed-state rows in one list is higher; a consumer scanning a flat list cannot tell at a glance "who currently sees what" vs "who has access lapsed". The three-section structure also reinforces that revoked/expired entries are intentionally surfaced (not buried) which is a trust signal. Added the one-time intro paragraph because Settings pages without intro context get re-scanned every visit; one sentence sets the mental model permanently.

**Mobile adaptation:** Same vertical stack, 343px card width. State chips wrap below name/role on mobile if combined width exceeds 60 percent of card. Avatar drops to 40px.

### §11.2 Consumer Practitioner Detail (route `/settings/practitioner-sharing/[practitioner_id]`)

**Layout:** 96px header region with 56px avatar circle left + name/role/connected-since stacked right. Below: 4 stacked sections: Currently sharing (scope chips + expiry), Modify, Coaching notes received, Audit log (collapsible).

**Header copy:**
- Above avatar: back chevron + small breadcrumb `Practitioner sharing /`
- Name (20px Instrument Sans Medium): `{First Last}, {Credentials}`
- Role + connected-since (13px Navy 70 percent): `{Role} | Connected since {month_year}`
- Optional badge: `Verified practitioner` (Teal `#2DA5A0` 11px chip, only when `verified=true`)

**Body copy:**
- Section 1 header: `Currently sharing`
- If sharing: 4 scope chip rows, each 56px tall, with Check icon (granted) or XCircle icon (not granted), scope name + scope sub-detail. Scope rows order: Nutrition Summary, Detailed Meals (with photo sub-state line), Symptom Correlations, Supplement Adherence.
  - Granted row text: `{Scope name}` / sub line `Expires {date}` or `Indefinite, renews {date}` (Indefinite never says "permanent")
  - Detailed Meals sub-detail: `Photos: included` (Teal Check) OR `Photos: not included` (Navy 60 percent XCircle)
  - Not-granted row text: `{Scope name}` / sub line `Not currently shared`
- If sharing nothing: empty state inside the section: `You are not currently sharing data with this practitioner.`
- Section 2 header: `Modify sharing`
- Section 2 body: `You can change which scopes are visible or extend the window at any time.`
- Section 3 header: `Coaching notes received` / subtitle `{n} notes from this practitioner | View on Coaching Notes`
- Section 4 header: `Access history`
- Section 4 intro (one-time, displayed always): `Here is what your practitioner has reviewed.`
- Audit log row format: `{date}, {time} | Viewed {scope_name}` (last 10 entries; pagination control `Show 10 more` text button)

**CTAs:**
- Section 2 primary CTA: `Modify sharing` (Teal `#2DA5A0` solid, opens §11.3 three-step modal in modify mode)
- Section 2 secondary CTA: `Revoke all` (Orange `#B75E18` text button)
- Section 3 inline link: `View on Coaching Notes` (navigates to §11.4)
- Section 4 collapse toggle: chevron-right rotates to chevron-down

**Conditional states:**
- Connected without sharing: Section 1 shows the "not currently sharing" empty state; Section 2 swaps the primary CTA label to `Start sharing` (Teal solid); Section 3 is hidden; Section 4 is collapsed by default with empty inner state `No access history yet.`
- Revoked or expired (read-only history view from §11.1 Section 3): all sections render in read-only frozen state; Modify CTA replaced with text `This sharing arrangement ended on {date}.`; consumer can still expand audit log for historical context

**Push-back / UX decisions:** Spec asked for "Coaching Notes received count" as a counter. Surfaced it as a section with a navigational link instead of a stat block because a count without a destination is a dead-end UI pattern. Also pushed back on the audit log title: spec called it "Audit Log"; that word is surveillance-coded and reads as forensic. Renamed to `Access history` with the friendlier "Here is what your practitioner has reviewed" intro line, which directly addresses the trust-architecture decision in the dispatch prompt (audit log as reassurance, not as feature gate). The technical term `practitioner_nutrition_access_log` stays in code; consumer copy uses the warmer surface.

**Mobile adaptation:** Same stack. Audit log rows wrap timestamp + scope on two lines on 343px. Section 2 CTAs stack vertically (Modify above Revoke) instead of side-by-side.

### §11.3 Three-step consent flow modal (THE HEAVIEST FLOW IN 170i)

This is the most consequential surface in the entire 170-series for trust architecture. It runs in two modes: first-time (preceded by orientation modal per §4.6) and modify-existing (orientation skipped). Step transitions are horizontal swipe on mobile, button advance on desktop, with a 3-dot progress indicator at the top of the modal.

**Pre-step orientation modal (first-time only, per §4.6):**

Layout: full-height modal on mobile, 520px centered on desktop, Card `#1E3054` bg. Single screen. Tap close `x` or `Continue` CTA. Tracked by `first_time_sharing_seen_at` flag; never re-shown.

Header copy: `Before you share, a few things to know`

Body copy: 3 stacked humanized panels (Lucide icon left at strokeWidth 1.5, two lines text right):
- (UserCog) `You choose what to share, scope by scope.` / sub `Pick zero, one, or all four kinds of data. Each kind is independent.`
- (Clock) `You choose how long.` / sub `7 days, 30 days, 90 days, 1 year, or indefinite. Indefinite renews each year with your confirmation.`
- (ShieldCheck) `You can change or stop anytime.` / sub `Revoke immediately, with no waiting period. Your practitioner is notified within a minute.`

Closing line: `Notes your practitioner leaves for you are professional advice from a licensed practitioner. ViaConnect facilitates the message but does not provide medical advice itself.`

CTA: `Continue` (Teal solid, full width)

UX rationale (orientation framed as onboarding not friction): three icons + three single-line concepts beats a paragraph wall every time. Each line surfaces one trust-architecture invariant in plain language: granularity, time-boundedness, reversibility. The closing line is load-bearing for the dual-voice problem flagged in §11.4: it explicitly tells the user that practitioner notes are professional advice while ViaConnect's voice stays observational. Set this expectation BEFORE first consent so the consumer reads coaching notes correctly from day one.

**Step 1 of 3: Choose what to share**

Layout: progress dots top (current solid Teal, others Navy 40 percent). Header. 4 scope cards stacked, each 96px tall with checkbox-pattern toggle right. Scope cards in canonical order. The Detailed Meals card expands inline (animated 200ms) to show a sub-toggle for photos ONLY when Detailed Meals is itself enabled, never pre-rendered stranded. Next button bottom, disabled until at least one scope selected.

Header copy: `What can {Dr. LastName} see?`

Sub-header (13px Navy 70 percent): `Pick the kinds of data you want to share. You can change this later.`

Body, each scope card body (14px Navy 85 percent for title, 12px Navy 70 percent for sub):
- `Nutrition Summary` / sub `Daily and weekly macro averages, meal counts, protocol adherence estimate. No individual meals.`
- `Detailed Meals` / sub `Each meal with food items, macros, restaurant name, recipe name, timestamps.`
  - When ON, expands to sub-toggle row: `Include meal photos` / sub `Photos are off by default. You can turn this on if you want your practitioner to see meal photos.`
- `Symptom Correlations` / sub `Patterns we surfaced that link foods or supplements to symptoms in your logs.`
- `Supplement Adherence` / sub `How often you take your supplements and your typical timing pattern.`

CTAs: `Next` (Teal solid, disabled until selection); `Cancel` (text button Navy 80 percent)

UX rationale (sub-toggle only when parent ON): pre-rendering the photo sub-toggle in a disabled state when Detailed Meals is OFF teaches the user nothing and adds visual noise. Conditionally rendering it the moment Detailed Meals toggles on (with a 200ms expand) signals the sub-toggle is owned by Detailed Meals, not free-standing. Photos default OFF inside the sub-toggle row, matching the spec §3.2 default-off posture.

**Step 2 of 3: Choose how long**

Layout: progress dots top. Header. 5 radio rows, 56px each, full-width. Selected row gets Teal 2px border + Teal 8 percent fill. Default selection: 90 days. The Indefinite row carries an inline secondary note line below the radio label.

Header copy: `For how long?`

Sub-header (13px Navy 70 percent): `You can change or end this sooner anytime.`

Body, radio labels:
- `7 days` / no sub
- `30 days` / no sub
- `(o) 90 days` (default selected) / sub `Most common`
- `1 year` / no sub
- `Indefinite` / sub `Renews each year. We will ask you to confirm 14 days before each renewal.`

CTAs: `Back` (text button Navy 80 percent); `Next` (Teal solid)

UX rationale ("Indefinite" framing): spec asked for "Indefinite" with an annual renewal note. Pushed back on the bare word "Indefinite" by anchoring it to the renewal contract in the same line, so the user never reads it as "permanent". The inline `Renews each year. We will ask you to confirm 14 days before each renewal.` removes the cognitive trap that "indefinite" might be one-and-done forever. The `Most common` micro-label on 90 days is borrowed from settings-defaults UX patterns; it nudges without pressuring and helps decision-paralyzed users accept the default.

**Step 3 of 3: Review and confirm**

Layout: progress dots top. Header. Review summary block (Card 90 percent bg). "What this means" block (Card `#1E3054` bg) listing scope-by-scope plain-language commitment lines conditional on selected scopes. Required acknowledgment checkbox 56px row near bottom. Confirm CTA at bottom, disabled until checkbox checked.

Header copy: `Review and confirm`

Sub-header (13px Navy 70 percent): `Here is what you are about to share with {Dr. LastName}.`

Body, review summary block (the chosen state, plain-language):
- Practitioner line: `Sharing with {Dr. LastName}, {Role}`
- Scope line: `Sharing: {scope_list_joined_with_commas}` (e.g., `Sharing: Nutrition Summary, Detailed Meals (no photos), Symptom Correlations`)
- Duration line: `For: {duration_label}` (e.g., `For: 90 days, until {end_date}` or `For: Indefinite, renews {first_renewal_date}`)

Body, "What this means" block: conditional commitment lines, one per granted scope:
- If Nutrition Summary granted: `Your daily and weekly macro averages will be visible to {Dr. LastName}.`
- If Detailed Meals granted (without photos): `Each meal you log, with food items, macros, restaurant, recipe name, and time, will be visible to {Dr. LastName}.`
- If Detailed Meals granted (with photos): `Each meal you log, including the food items, macros, restaurant, recipe name, time, AND photos, will be visible to {Dr. LastName}.`
- If Symptom Correlations granted: `Patterns we have surfaced in your logs that link foods or supplements with symptoms will be visible to {Dr. LastName}.`
- If Supplement Adherence granted: `How often you take your supplements and your typical timing will be visible to {Dr. LastName}.`

Closing line (always): `{Dr. LastName} cannot share this data outside of ViaConnect, and they cannot see anything beyond the scopes above. You can change or stop sharing anytime.`

Required checkbox row: `I understand what I am sharing and that I can change or stop this anytime.`

CTAs: `Back` (text button); `Confirm sharing` (Teal solid, disabled until checkbox checked)

**Conditional states (across all 3 steps):**
- Modify mode (entered from §11.2 Modify CTA): orientation modal skipped; Step 1 pre-selects current scope state; Step 2 pre-selects current duration; Step 3 review block highlights changed values in Teal (diff posture); Confirm CTA label changes to `Save changes`
- Scope reduction in modify mode: Step 3 adds a one-line notice above the closing line: `Reducing sharing will notify {Dr. LastName}.` (per §3.6 spec semantics)
- Scope expansion in modify mode: no notice (per spec, expansions are silent)
- Validation: Step 1 Next disabled with at least one scope selected; Step 3 Confirm disabled until checkbox checked. Disabled state announces via `aria-live` polite.
- Cancel at any step: confirmation dialog `Discard changes?` / `Keep editing` / `Discard` (Orange text button)

**Push-back / UX decisions:**

1. **Conditional commitment lines on Step 3.** Spec asked for "conditional 'I understand' copy by scope mix". Pushed past the generic single-line approach: rather than one paragraph that mentions every possible scope, the Step 3 "What this means" block renders ONE plain-language sentence per granted scope, in scope order, in a separate block from the summary. This means a consumer granting only Nutrition Summary sees exactly one commitment line; a consumer granting all 4 sees 4. The cognitive load scales with the consent surface, not the spec list.

2. **The acknowledgment checkbox sits BELOW "What this means", not inside the closing line.** Spec implied an inline acknowledgment. Pushed back: a checkbox below the substantive content is a clearer commitment than an inline tick. The checkbox label `I understand what I am sharing and that I can change or stop this anytime.` is the consent contract in one sentence; placing it as its own 56px row signals weight without alarm.

3. **Mobile step transitions: horizontal swipe with button fallback.** Spec said swipe on mobile, button on desktop. Pushed: keep both buttons on both platforms (Back/Next) for accessibility; swipe is additive on touch, never the sole advance pathway. Keyboard users tab to Next; screen reader users hear "Next, step 2 of 3".

4. **Progress indicator language.** Spec said "3-step modal". Did not show numeric "Step 2 of 3" text at the top because progress dots already carry the signal; numeric labels feel administrative. Numeric labels do appear in the `aria-label` for screen readers.

5. **Modify mode diff posture in Step 3.** Spec did not specify modify-mode review treatment. Added Teal highlight on changed values + the scope-reduction notice line so the consumer sees what is changing, not just the final state. This is the same diff posture used in code-review tools; familiar pattern translated to consent UX.

**Mobile adaptation:** Full-height modal; each step is a single scrollable viewport. Progress dots at top below 56px header. Bottom CTA bar floats above keyboard. Horizontal swipe between steps with 300ms ease-out. Cancel sits in top-right `x` instead of bottom Cancel button.

### §11.4 Consumer Coaching Notes tab (on Bio Optimization Analytics)

**Layout:** New tab on Bio Optimization Analytics tab strip (between Insights from 170h and any existing tab). Filter chip row 56px at top. Note card vertical list below ordered by `created_at` DESC, with pagination at 20. Sticky footer disclaimer + tab-context FDA disclaimer at the top of the tab body (one-time per session education strip).

**Header copy:**
- Tab label: `Coaching notes`
- Tab-context disclaimer strip (top of tab body, persistent within session, dismissible with `x` after read): `These notes are professional advice from your connected practitioners. ViaConnect facilitates the messages but does not provide medical advice.`

**Body copy:**
- Filter chip row: `All` (default), `Unread`, `From {Dr. LastName}` (one per connected practitioner sharing notes), `Action required`
- Empty state (no notes): Compass illustration + headline `No coaching notes yet` + body `When a practitioner leaves a note about a meal, an insight, your weekly review, or your overall protocol, it will appear here.`
- Note card structure (collapsed): practitioner avatar 40px + name/role line + severity chip + 2-line preview of body + acknowledgment state chip + timestamp
- Note card body (expanded): full note body (practitioner-authored, exempt from linter) + target reference (e.g., `On your meal: Salmon bowl, May 28` or `On the insight: Dairy and bloating pattern` or `On your week of May 22 to May 28` or `On your overall protocol`) + state-transition CTA row

**CTAs:**
- Filter chips: tap to apply (single-select; `All` is default)
- Note card body tap: expands inline (250ms ease-out)
- State-transition CTAs in expanded state, contextual to current state:
  - Unread: `Mark as read` (Teal solid)
  - Read: `Acknowledge` (Teal solid) | `Mark follow-up needed` (Orange text)
  - Acknowledged: `Mark complete` (Teal solid) | `Mark follow-up needed` (Orange text)
  - Follow-up needed: `Mark complete` (Teal solid) | `Back to acknowledged` (text button)
  - Completed: no transition CTAs; chip reads `Completed {date}`
- Per-card practitioner avatar tap: navigates to §11.2 for that practitioner

**Conditional states:**
- Severity treatment:
  - Informational: card has neutral Navy 30 percent 1px border, severity chip text `Informational`
  - Suggestion: card has Teal `#2DA5A0` 4px LEFT rule (not full border, to keep it visually quiet), chip `Suggestion`
  - Recommendation: card has Orange `#B75E18` 4px LEFT rule, chip `Recommendation`
  - Action required: card has Orange `#B75E18` 4px LEFT rule + Bell icon 16px top-right of card + persistent badge on filter chip `Action required` (count) + the card stays at top of `All` view until state advances above Read
- Unread state: card has small Teal 8px dot on the top-left of the avatar; fades when expanded once
- Edit window expired (older than 7 days, from practitioner side, shown on consumer side as informational): footer line on card `Note locked by practitioner edit window.`

**Push-back / UX decisions:**

1. **Dual-voice clarification.** This is the explicit UX challenge from the dispatch prompt. Resolved by stacking the tab-context disclaimer at the top of the tab body (read-once-dismiss-with-x) AND keeping the per-card footer disclaimer subdued. The tab-context strip says explicitly "These notes are professional advice from your connected practitioners. ViaConnect facilitates the messages but does not provide medical advice." This sets the speaker frame: practitioner speaks professionally, ViaConnect speaks observationally elsewhere in the app. Per-card body uses the practitioner's clinical voice without softening (per §6.8 linter exemption). The orientation modal in §11.3 also primes this distinction before first consent, so the consumer arrives at the first coaching note with the speaker model already established.

2. **Severity visual hierarchy without alarming consumers.** Spec listed 4 severity levels. Used LEFT 4px rules instead of full borders for Suggestion and Recommendation so the card structure stays calm; Informational gets a quiet 1px neutral border so it does not feel "ranked below the others". Action required gets the rule PLUS a Bell icon top-right PLUS persistent filter-chip badge, the strongest treatment but still no full-card alarm. Reasoning: a wall of Orange borders would create alarm fatigue and shift consumer interpretation of every note toward "concern". The hierarchy is real but discreet.

3. **State-transition CTAs feel like reading-progress, not task-tracking.** Resolved the spec's 5-state model by hiding the state machinery until a card is expanded; the COLLAPSED card just shows a small state chip. CTAs only appear on expand. This means the default-scan view of the tab is a list of notes (warm), not a list of tasks (cold). Within the expanded state, transitions are framed as advancement (Acknowledge then Mark complete) rather than as tickbox compliance, and `Mark follow-up needed` is on an Orange text button so it does not pull eye attention away from the warmer Acknowledged path. Pushed back on the spec's implied task-tracker default: this is a coaching relationship surface, not a TODO list.

4. **`Back to acknowledged` from Follow-up needed.** Spec did not enumerate reverse transitions. Added one explicit reverse path (Follow-up needed -> Acknowledged) because consumers can re-read a note and decide a follow-up is no longer needed; locking forward-only would feel infantilizing. No other reverse paths exposed (Completed is terminal; Unread cannot be reset).

**Mobile adaptation:** Filter chip row horizontal scroll on 375 viewport. Note cards 343 wide. Expanded body wraps native; state-transition CTAs stack vertically with primary on top. Bell icon for Action required moves to inline with the severity chip instead of top-right when card is below 360px.

### §11.5 Consumer Dashboard hero, unread coaching notes badge

**Layout:** Sits BELOW the Bio Optimization Score hero and BELOW the 170h Insights badge (if present). Practitioner-avatar-left chip pattern matching the 170h Insights badge visual weight. Auto-dismiss after 14 days unless any unread note has severity Action required.

**Header copy:** N/A (badge is single-line chip)

**Body copy:**
- Single unread, single practitioner: `{n} new note from Dr. {LastName}`
- Multiple unread, single practitioner: `{n} new notes from Dr. {LastName}`
- Multiple unread, multiple practitioners: `{n} new coaching notes`
- Action required present (overrides above): `Action required: {n} note{s} need a response` (Orange text on Card bg, Bell icon left)
- Aria-label: `View {n} new coaching notes from your practitioners`

**CTAs:** Badge tap navigates to `/bio-optimization-analytics?tab=coaching-notes`; Action required variant pre-applies the Action required filter

**Conditional states:**
- Coexists with 170h Insights badge: insights badge sits above (older surface, established hero space); coaching notes badge sits below it, identical visual weight
- Coexists with §11.5b re-affirmation banner (next subsection): if both present, the re-affirmation banner sits ABOVE both badges as it is time-sensitive and consent-architecture-load-bearing
- After 14 days idle with no Action required notes: auto-removed from hero (matches 170h badge auto-dismiss pattern)
- Action required notes: badge persists with Orange treatment until consumer transitions out of Unread on the Action required note(s); never auto-dismissed

**Push-back / UX decisions:** Spec implied a count-only badge. Added the practitioner-avatar-left variant for single-practitioner cases because consumers respond to faces; "new note from Dr. Chen" is warmer than "1 new coaching note". Multi-practitioner case falls back to count-only. Pushed on the Action required treatment: spec was ambiguous on whether the badge would visually escalate; chose to escalate (Orange text + Bell + persistent) because Action required is the consumer-side commitment that requires response, and a coaching note marked Action required by a licensed practitioner deserves more than the standard informational badge.

**Mobile adaptation:** Same width as 170h badge (full-card minus 16px gutter). Avatar 24px inline left of text on mobile vs 28px on desktop.

### §11.5b Re-affirmation banner (consent expiry, 14 days pre-expiry)

**Layout:** Sits at the TOP of the Dashboard hero region, above all badges, when an Indefinite consent is within 14 days of its annual renewal. Card `#1E3054` background with Teal `#2DA5A0` 1px border, 80px tall, full-width minus gutter. Inline 3-button row.

**Header copy:** `Your sharing with Dr. {LastName} renews in {n} days`

**Body copy (13px Navy 80 percent):** `You set this to Indefinite, which renews each year with your confirmation. Want to keep sharing, change what you share, or let it end?`

**CTAs:**
- `Continue sharing` (Teal `#2DA5A0` solid, primary)
- `Review settings` (text button Navy 80 percent, opens §11.2)
- `Let it expire` (Orange `#B75E18` text button)

**Conditional states:**
- Multiple consents pending re-affirmation: banner stacks (max 2 visible; "more" link surfaces the rest in §11.1)
- Coexists with §11.5 coaching notes badge: re-affirmation always above coaching notes badge
- After consent expires without action: banner replaced by an Informational notice for 7 days (`Sharing with Dr. {LastName} ended on {date}. You can set it up again in Practitioner sharing.`) then auto-dismisses

**Push-back / UX decisions:** Spec asked for the banner copy approval. Pushed back on the obvious framing ("Your consent expires soon, please renew") because that reads as compliance-paperwork-language. Reframed as a calm question with three honest options: continue, change, or let it end. The "Let it end" option is given equal visual weight (text button) to the other secondary option, not buried as a "Decline" affordance, because letting consent lapse is a valid and trusted choice. Banner placement above coaching notes badge is intentional: a consent decision has temporary priority over note-reading until it is resolved or the 14-day window expires.

**Mobile adaptation:** Three CTAs stack vertically on 375 viewport with `Continue sharing` on top. Banner height grows to 140px on stack.

### §11.6 Practitioner Patient List (existing surface, with consent state chip column added)

**Layout:** Existing patient list at `/practitioner/patients`. Adds a new column right of the patient name: Nutrition consent state chip. Mirrored at `/naturopath/patients` with identical layout; role chip on the patient card swaps `MD` for `ND` where role-display patterns exist.

**Header copy:** N/A (column header `Nutrition` 11px text Navy 70 percent above chips)

**Body copy:** Chip variants per row (per §5.1):
- `Full` (Teal `#2DA5A0` text on Teal 12 percent fill) - all 4 scopes granted
- `Partial 3/4` (Teal text on Teal 8 percent fill) - dynamic numerator
- `None` (Navy 60 percent text on Navy 12 percent fill)
- `Revoked` (Orange `#B75E18` text on Orange 12 percent fill)
- `Expired {date}` (Navy 60 percent text on Navy 12 percent fill, italic)

**CTAs:**
- Chip tap: navigates to Patient Detail with Nutrition tab pre-selected (§11.7)
- Patient name tap: existing behavior (Patient Detail with default tab)

**Conditional states:**
- Patient with no recent Detailed Meals activity but Full scope grant: chip remains `Full`; activity state surfaces in §11.7 Nutrition Summary
- Patient connected but never granted: chip `None`
- Patient with recently expired grant (less than 30 days): chip `Expired {date}` so practitioner has context for why data stopped appearing

**Push-back / UX decisions:** Spec listed 5 states; all 5 carried over. Pushed on color tokens: chose Orange (not Red) for Revoked because Red would read as a clinical alarm; Orange signals "this was deliberately changed" without escalating. Italic on Expired is a small typographic cue that the state is past-tense, learned from email-client read/unread cues. Naturopath mirror noted: the column is identical; only the role chip on adjacent patient-card surfaces swaps MD/ND. Nothing in this column needs role-conditional logic.

**Mobile adaptation:** Patient list is desktop-first on practitioner portal; mobile shows chip below patient name instead of right of name.

### §11.7 Practitioner Patient Detail, Nutrition Review tab

**Layout:** New tab on Patient Detail at `/practitioner/patients/[id]?tab=nutrition`. Vertical sections, one per granted scope, in canonical order: Nutrition Summary, Detailed Meals, Symptom Correlations, Supplement Adherence. Ungranted scopes are ABSENT (not "locked" or "upgrade-prompted"). Each section has a header row with section title + per-section Add Note CTA. Mirrored at `/naturopath/patients/[id]?tab=nutrition` with identical layout.

**Header copy:**
- Tab label: `Nutrition`
- Per-section headers: `Nutrition summary`, `Detailed meals`, `Symptom correlations`, `Supplement adherence`

**Body copy (per granted scope):**
- **Nutrition Summary section:** Macro trend chart (weekly aggregates) top, then weekly summary card list below (date range, calorie average, protein/carb/fat distribution, meal count, protocol adherence estimate). No individual meals.
- **Detailed Meals section:** Vertical meal list, paginated 20 per page. Each meal row: time + restaurant/recipe (if any) + items list (collapsed to "{n} items" with expand) + macros line. Date filter chip row above: `All`, `This week`, `This month`, `Last 90 days`. Per-meal `Add note to this meal` text link in the row footer.
- **Symptom Correlations section:** Insight list (Notable + Strong only per scope definition), each insight as a read-only card mirroring 170h §11.2 card structure (with Why-we-think-this expander). Per-insight `Add note to this insight` text link.
- **Supplement Adherence section:** Top stat card with overall adherence percentage (e.g., `82 percent over 30 days`), timing sparkline below (when supplements are typically taken across the day), skip frequency stat (`Skipped {n} of {m} doses`). No individual dose log entries. Add Note CTA in section header only.

**CTAs:**
- Per-section header: `Add note to this section` (text button Navy 80 percent) - opens §11.8 with target pre-populated to the scope or week
- Per-record links (meals, insights): `Add note to this meal` / `Add note to this insight` - opens §11.8 with target pre-populated to the record
- Tab-level: `Add note on overall protocol` (anchor link bottom of page; opens §11.8 with target = protocol)
- No bulk-select, no export, no print, no copy-to-clipboard (per §5.4 spec; intentional trust constraint)

**Conditional states:**
- **No consent state (zero scopes granted):** Full-tab empty state with LockIcon 64px Navy 60 percent + headline `This patient has not shared their nutrition data with you.` + body `Nutrition data is shared by the patient from their own settings. You will see what they choose to share, when they choose to share it.` + (intentional absence) NO request affordance, NO email link, NO contact-patient button.
- **Partial consent state:** Only granted scope sections render. Ungranted scopes are not rendered at all. No placeholder, no "Upgrade prompt", no "Patient has not granted" inline message. Section absence IS the signal.
- **Recently expired consent:** Tab shows the no-consent state from above with an inline informational notice ABOVE the LockIcon: `This patient previously shared nutrition data with you. The sharing window ended on {date}.` No re-request button.

**Push-back / UX decisions:**

1. **Default-deny presentation without shaming or hostility.** The dispatch prompt asked how to communicate this. Resolution: the LockIcon is large (64px) and Navy 60 percent (calm, not red-alarm). The headline is factual and patient-first: `This patient has not shared their nutrition data with you.` (not "Access denied" which sounds adversarial; not "Request access" which would violate the consumer-sovereign rule). The body explains the patient-sovereign model in one sentence: `Nutrition data is shared by the patient from their own settings. You will see what they choose to share, when they choose to share it.` This is informational and reflective of the trust architecture; it does not apologize, blame, or escalate. Crucially: NO request affordance. The practitioner cannot type a message, send an email, or trigger anything that would reach the patient. The trust architecture is preserved at the UI layer, not just the API layer. Pushing back on any product instinct to "soften the dead-end" with an inline link or contact button: such a link would erode the consumer-sovereign invariant by transmitting practitioner intent to the consumer through the platform.

2. **Ungranted scopes are absent, not "locked".** A locked-section pattern would create a temptation flow ("Patient has not granted Symptom Correlations" with a tap that does nothing). Absence is cleaner. The practitioner sees what they have access to, the rest of the tab is silent.

3. **No tab-level bulk operations.** Spec already enforces no CSV/PDF/print. Wireframed accordingly: there is no toolbar at the tab level beyond Add Note. The intentional sparseness is the architectural feature.

4. **Per-record Add Note links use plain text, not buttons.** Spec said per-record Add Note links; could have been buttons or chips. Used plain text link styling (Navy 80 percent, underline on hover) because a row of buttons inside meal rows would visually compete with the meal data itself. The text link is unambiguously a CTA but does not pull the eye away from the clinical content.

**Mobile adaptation:** Practitioner portal is desktop-first. Mobile renders sections in a single column with section headers becoming sticky on scroll. Add Note CTAs collapse to icons + accessible labels on small viewport. The no-consent state stays large and centered (LockIcon 64px stays at 64px).

### §11.8 Practitioner Add Note bottom sheet

**Layout:** Bottom sheet on mobile, modal on desktop, 480px wide on desktop. Card `#1E3054` bg. Header with inferred target chip + dropdown to change target. Severity radio chip row. 1,000-char textarea with live counter. Follow-up toggle. Save and Cancel CTAs.

**Header copy:** `Add a coaching note`

**Body copy:**
- Target row: pre-populated chip showing inferred target (`On the meal: Salmon bowl, May 28` or `On the insight: Dairy and bloating pattern` or `On the week of May 22 to May 28` or `On the overall protocol`). Tap the chip opens a target selector dropdown: `Meal`, `Insight`, `Week`, `Overall protocol` (only options where the practitioner has scope access).
- Body label (12px Navy 70 percent above textarea): `Your note`
- Body textarea: 1,000-char limit. Live counter (12px Navy 60 percent, right-aligned below textarea): `{n} / 1,000`
- Counter Orange treatment at 950+; counter remains in 1,000 hard-stop (no submission past it)
- Severity label (12px Navy 70 percent above radio row): `Severity`
- Severity radio chips (4, single-select), each chip shows color preview swatch:
  - `Informational` (Navy 40 percent swatch left of label)
  - `Suggestion` (Teal `#2DA5A0` swatch)
  - `Recommendation` (Orange `#B75E18` swatch)
  - `Action required` (Orange + Bell icon)
- Follow-up toggle row (56px): `Mark as follow-up needed for next visit` + toggle right; default OFF. (Distinct from the severity Action required; this is a practitioner-tracking flag, not a consumer-state.)

**CTAs:**
- `Save note` (Teal `#2DA5A0` solid, primary, full-width on mobile, right-aligned on desktop)
- `Cancel` (text button Navy 80 percent, left-aligned)
- Save disabled when textarea is empty OR target is null

**Conditional states:**
- Target dropdown only shows options for which scope access is currently granted (e.g., if Detailed Meals is not granted, `Meal` is not in the dropdown)
- Entry from per-section Add Note: target pre-set to scope/week, chip shows that target, dropdown still allows change
- Entry from per-record link: target pre-set to the specific record (meal id or insight id), chip shows record title
- Validation: empty body shows inline error below textarea on Save tap: `Add a note before saving.`

**Push-back / UX decisions:**

1. **Bottom sheet over modal on mobile.** Coaching note authoring is a focused task but not a destination; bottom sheet keeps the underlying Patient Detail visible behind the sheet, so the practitioner sees the target context while writing. Modal would obliterate that context.

2. **Severity chips with color swatch previews.** Spec said "severity radio chips with color preview". Implemented as a small color swatch left of each chip label so the practitioner sees the color they are choosing for the consumer-side card treatment. This is forward-of-effect transparency: the author sees what the recipient sees.

3. **`Action required` severity vs `follow-up needed` flag are intentionally separated.** Spec mixed these in some passages. Treated them as distinct: severity is a consumer-facing visual treatment driving the recipient experience; follow-up flag is a practitioner-private bookmark for the next clinical visit. The flag does not appear on the consumer card.

4. **1,000-char hard limit.** Spec said 1,000 with live counter. Made it a hard stop (no overflow) rather than a soft warning because a coaching note over 1,000 characters is structurally a different artifact (a referral letter, a chart note) which has its own venue. The 1,000-char limit gently enforces the "coaching note" genre.

**Mobile adaptation:** Bottom sheet rises 350ms ease-out from below viewport. Drag handle 32px wide top. Save CTA floats above keyboard. Target dropdown opens as a secondary bottom sheet on top.

### §11.9 Practitioner Note management (own notes)

**Layout:** Practitioner-side view of their own notes within the Patient Detail Nutrition tab AND a dedicated Notes by me list at `/practitioner/notes`. Each note card on the practitioner side shows: consumer-rendering preview (what the patient sees) + consumer acknowledgment state + Edit/Delete actions (if within 7 days) + Acknowledgment Timeline expander.

**Header copy:**
- Notes-by-me page title: `Notes I have written`
- Per-note card header: target chip + severity chip + timestamp `Posted {date}`

**Body copy:**
- Consumer-rendering preview block: shows the note exactly as the consumer sees it (body + practitioner avatar + severity treatment) within a 90 percent inset card; labelled above the block (12px Navy 60 percent): `What your patient sees`
- Consumer acknowledgment state line: `Acknowledgment: {state_label}` where state_label is one of `Unread`, `Read {date}`, `Acknowledged {date}`, `Follow-up needed`, `Completed {date}`
- Acknowledgment Timeline expander (default collapsed): chevron-right + `Acknowledgment timeline`. Expanded: vertical timestamp list of state transitions, each line `{state} on {date} at {time}`
- Edit-window indicator: `Edit window: {n} days remaining` (visible while within 7 days)
- After 7 days: lock indicator replaces edit/delete actions: `Locked. Notes are read-only after 7 days.` (12px Navy 60 percent with LockIcon left)

**CTAs:**
- Within 7 days: `Edit` (text button Navy 80 percent) | `Delete` (Orange `#B75E18` text button)
- After 7 days: no Edit, no Delete; only the Locked indicator
- Edit tap: opens §11.8 with current note pre-populated; on Save, audit log records the edit
- Delete tap: confirmation dialog `Delete this note?` / body `Your patient will no longer see this note. The deletion is recorded in the audit log.` / `Delete note` (Orange solid) | `Keep note` (text)
- Acknowledgment Timeline expander tap: 200ms expand

**Conditional states:**
- Note edited within 7-day window: card shows `Edited {date}` line below original posted date
- Note deleted: removed from list; surfaces in admin audit log only (not on Patient Detail)
- Consumer transition to Completed: timeline expander stays available; Edit/Delete still bound to the 7-day rule (Completed state does not extend the edit window)
- Action required notes that are still Unread after 48 hours: card border gets the same Orange treatment as the consumer-side card (signals to practitioner that the consumer has not yet seen it)

**Push-back / UX decisions:**

1. **Consumer-rendering preview is the primary content of the practitioner-side card.** Spec said "note as displayed to consumer". Made it the dominant visual element with a clear `What your patient sees` label. Reasoning: practitioners need a tight feedback loop on how their notes land; showing the consumer rendering inline builds note-quality intuition over time. This is also a small but real authoring-quality nudge: a practitioner who sees their note rendered with Orange Recommendation treatment may decide retroactively that Suggestion was the right severity.

2. **Acknowledgment Timeline as expander, not always-visible.** Spec said "expander showing state transitions". Kept it collapsed by default to keep the card compact; an expanded timeline is a clinical-workflow tool but not the daily-scan signal. The default-collapsed posture matches the trust posture: the practitioner can see the journey if they want, but the headline is the current state.

3. **Lock indicator language.** Spec said "Locked indicator after 7 days". Pushed on the bare word "Locked" by surfacing the WHY in the same line: `Locked. Notes are read-only after 7 days.` This contextualizes the rule rather than treating it as an opaque platform constraint.

4. **Notes by me as a dedicated page.** Spec implied Notes management as a Patient Detail feature; pushed to also expose a practitioner-level `/practitioner/notes` page so a practitioner can scan their authoring activity across all patients. This is a practitioner-portal feature, NOT a consumer surface; nothing here leaks to the consumer.

**Naturopath mirror per §11.10:** The §11.6, §11.7, §11.8, and §11.9 wireframes apply identically at `/naturopath/*`. Only the role chip (where displayed adjacent to practitioner identity in shared consumer surfaces like §11.2 and §11.4) swaps `MD` for `ND`. Consumer copy uses role-neutral `practitioner` throughout, so no consumer-side wireframe changes are required for the naturopath portal.

---

## UX architecture summary

### Top 5 UX decisions

1. **Default-deny presentation without hostility (§11.7).** The no-consent state in the practitioner Nutrition tab is large, calm, and factual, with NO request affordance. The architecture is preserved at the UI layer (not just API), and the language is patient-first ("This patient has not shared") rather than adversarial ("Access denied"). The body sentence teaches the patient-sovereign model in one line.

2. **Three-step consent flow uses progressive disclosure with conditional commitment lines (§11.3).** Step 1 reveals the photo sub-toggle only when Detailed Meals is ON; Step 2 anchors "Indefinite" to its annual-renewal contract inline; Step 3 generates scope-by-scope commitment lines so cognitive load scales with the chosen scope set, not the spec list. A required checkbox below the substantive content is the consent contract in one sentence, weight without alarm.

3. **Dual-voice resolution via session-strip + orientation modal (§11.4 + §11.3 orientation).** The first-time orientation modal (§11.3) primes the consumer with "Notes your practitioner leaves for you are professional advice from a licensed practitioner. ViaConnect facilitates the message but does not provide medical advice itself." The Coaching Notes tab (§11.4) restates this at the top of the tab body in a session-dismissible strip. The speaker frame is established before first consent and reinforced at every read, so the consumer never confuses ViaConnect's observational voice with the practitioner's clinical voice.

4. **Severity hierarchy via LEFT rules + Bell + persistent filter badge (§11.4).** Cards stay calm; Suggestion and Recommendation use 4px left rules (not full borders); Informational gets a quiet 1px neutral border so it does not feel "ranked below"; only Action Required gets Bell + persistent badge. Visual hierarchy is real but discreet; no alarm fatigue.

5. **State-transition CTAs hidden until expand (§11.4).** The collapsed Coaching Notes tab reads as a list of notes (warm), not a list of tasks (cold). State CTAs surface only on card expansion. `Mark follow-up needed` lives on an Orange TEXT button (not a button), keeping warmer Acknowledged paths visually primary. This was the deliberate antidote to spec's implied task-tracker default.

### Spec push-back captured

- **§11.1:** Three-section grouping (Active / Connected without sharing / Recently expired or revoked) replaces a flat list with mixed-state chips.
- **§11.2:** Renamed "Audit Log" to "Access history" with "Here is what your practitioner has reviewed" intro line; consumer copy uses warmer surface, technical name stays in code.
- **§11.3:** Step 3 conditional commitment lines per granted scope; required checkbox as its own 56px row below "What this means"; horizontal swipe additive to buttons, never sole pathway.
- **§11.4:** Tab-context disclaimer strip is read-once-then-dismissible (not always-visible) to avoid disclaimer-blindness; state CTAs collapsed until expand.
- **§11.5:** Practitioner-avatar variant for single-practitioner badge text (warmer than count-only).
- **§11.5b:** Re-affirmation banner reframed as a calm three-option question instead of compliance-paperwork-language; `Let it expire` given equal text-button weight, not buried as a "Decline" affordance.
- **§11.6:** Orange (not Red) for Revoked chip; italic for Expired to encode past-tense typographically.
- **§11.7:** Ungranted scopes are absent, not "locked"; per-record Add Note as plain text links, not buttons; no tab-level toolbar beyond Add Note.
- **§11.8:** Bottom sheet over modal on mobile so target context stays visible; severity chips include color swatch previews (forward-of-effect transparency); 1,000-char hard limit (not soft warning) to enforce the coaching-note genre.
- **§11.9:** Consumer-rendering preview is the primary content of the practitioner card; dedicated `/practitioner/notes` page added for cross-patient authoring scan; Lock indicator carries the WHY in the same line.

### The trust architecture's three transparency surfaces

The consumer-side surfaces have three independent transparency surfaces that reinforce the trust posture, each visible from a different entry point so transparency is never gated:

1. **Access history (§11.2 Section 4).** Per-practitioner record of every load: when the practitioner viewed which scope, with the warmer "Here is what your practitioner has reviewed" framing. This is reassurance-coded ("here is what they did with what you gave them"), not surveillance-coded ("tracking practitioner access"). Always available on Practitioner Detail; not gated behind a settings menu.

2. **Consent change history (§11.2 implicit, surfaced via the Access history block when expanded).** Every consent change (grant, scope modification, duration change, revoke) appears in the audit log alongside view records, so the consumer sees the full timeline of "what I granted, when, and what they viewed". This couples the consent record with the access record, making them legible as a single trust timeline.

3. **Acknowledgment Timeline on coaching notes (§11.9, mirrored on the consumer-side card).** The consumer can see (on their own notes) the full state transition history of each note: when they read it, when they acknowledged, when they marked it complete. This is the consumer's own behavior reflected back to them, building meta-awareness of their engagement and giving them control over their relationship to practitioner advice without making it feel like surveillance.

These three surfaces are intentionally redundant: a consumer who wants to check on their practitioner relationship can do it from Settings (§11.2 access history), from the Coaching Notes tab (§11.4 expanded card timeline), or from the consent flow modify mode (§11.3 diff posture). Transparency is the default state, not a feature gate. This is the architectural answer to the dispatch prompt's framing of the audit log as "intentional transparency, NOT a feature gate".

<!-- HANNAH_WIREFRAMES_END -->

## When 170i can sensibly build (sequencing prerequisites, in order)

1. **170h ships and dogfoods minimum 14 days** with telemetry (hardest blocker; 170h is filed-only)
2. **Kelsey added to agent fleet** OR compliance owner explicitly reassigned (Gary decision; see Flag 1)
3. **Practitioner Portal connection infrastructure verified live** in production (not verified by current session)
4. **Practitioner Terms of Use update drafted**, reviewed by Kelsey + Anthropic legal counsel, signed off by Gary
5. **HIPAA-adjacent posture memo** signed Kelsey, approved Gary
6. **170g corpus exclusion filter built** (whichever ships first owns the integration; if 170g first, retrofit; if 170i first, build into 170g Blueprint)
7. **Hannah wireframes signed off by Gary** with explicit tone-pass approval for default-deny + three-step modal
8. **Three kill switches ready**, all defaulted false for launch margin
9. (Recommended) **Phase A/B split** per Flag 3, ship consumer + practitioner first, naturopath parallel as Phase B

Then Michelangelo Workstream is unblocked.

## Three explicit flags for Gary

### Flag 1: Kelsey co-owner role names an agent not in the 9-agent fleet

Spec preamble lists "Kelsey (Compliance, HIPAA-adjacent posture and BAA framing if practitioners are HIPAA-covered)" as co-owner. The current ViaConnect fleet (per `project_agent_team_structure.md` and the in-session subagent list) is 9 agents: Jeffery (orchestrator), Michelangelo (senior dev), Hannah (UX/AI/genomics), Gordon (nutrition), Arnold (body tracker), Hounddog (scraping), Sherlock (social), plus security-advisor and performance-advisor.

**Kelsey does not exist as a subagent.** Three options:

- **(Recommended) Add Kelsey to the fleet as Compliance specialist** — file a separate prompt defining role, scope, agent card, before 170i Blueprint kickoff. Compliance work spans more than 170i (Practitioner TOS, BAA framework, future audit posture across the platform), so the role pays for itself.
- (Alternative) Substitute security-advisor for compliance review during 170i; security-advisor scope already covers RLS + PII + auth which overlaps significantly with the HIPAA-adjacent posture work. Limitation: security-advisor is read-only review, not authoring (will not draft Practitioner TOS).
- (Defer) Keep Kelsey assignment open until Blueprint kickoff; assign at that point. Risk: Blueprint cannot start the legal-artifact long pole until the assignment is made.

Standing question for Gary; no action this turn.

### Flag 2: 170h-shipped is the hardest 170-series sequencing constraint

Every prior 170-series filing said "depends on 170 shipped" (170d, 170e, 170f), and that condition is satisfied (170 shipped 2026-05-29 commit `47a7663d`). 170g said "depends on corpus at 50k", a calendar wait. 170h said "depends on 30 days meal data", also a calendar wait.

170i says **depends on 170h SHIPPED**, and 170h itself is filed-only with a multi-month build runway (Gordon catalog drafting of 50 conflict rules + 100 plausibility pairings + 30 tips, 30-user pilot cohort, FDR Edge Function, statistical methods memo). Build-order implication: 170i is filed-on-top-of-a-filed-blocker, the strongest dependency in the entire 170-series.

Practical timeline: 170h Blueprint cannot start until Gordon's catalog is signed off (multi-week external sourcing, not automatable). Once 170h ships, 14-day dogfood is the minimum before 170i Blueprint. **Earliest plausible 170i ship: ~4-6 months out**, assuming 170h Blueprint starts soon.

If Gary wants to accelerate 170i without 170h shipping first, the spec §1.4 heritage clause becomes load-bearing: 170h's `shared_insights` table (§9.6) and the per-insight share pattern are the precedent 170i extends. Without 170h's table existing, 170i would need to ship a stub of `shared_insights` too (would no longer be additive; would couple 170h schema to 170i Blueprint). Not recommended.

### Flag 3: First 170-series cross-portal prompt; consider Phase A/B split

Every prior 170-series prompt was consumer-portal-only (with the practitioner redaction matrix as a paper artifact, not a built portal surface). 170i builds the first practitioner-portal AND naturopath-portal surfaces in the NutriVision domain. Architectural surface area is the largest in the 170-series.

**Recommendation: split 170i Blueprint into Phase A (consumer + practitioner) and Phase B (naturopath parallel).** Rationale:

- Both portals share data layer and consent semantics; the naturopath surface is a UI mirror, not a separate engine.
- Shipping Phase A first lets the trust architecture mature in one portal before extending to two; if issues surface they fix in one place not two.
- Phase B can ship 2-3 weeks after Phase A with high confidence (UI mirror is mechanical).
- The `PRACTITIONER_NATUROPATH_PORTAL_ENABLED` kill switch (§12.4) was designed for exactly this split; spec anticipates it but does not enforce it.

Standing question for Gary; not blocking the filing.

## 170i-supplement anticipated per §22.5

Filed for future prompt:
- Full consumer-practitioner messaging (beyond 5 acknowledgment states)
- Cross-portal note visibility (consumer explicitly grants MD + ND to see each other's notes)
- Household sharing (parent shares minor child's nutrition with practitioner)
- BAA framework implementation
- Bulk operations for practitioners with appropriate consent UX (deliberately deferred from v1)

## Composition with other NutriVision prompts

- **170**: builds the meal records that Detailed Meals scope reads
- **170a + supplement**: practitioner redaction matrix established here gets extended in §8.5
- **170d (multi-photo)**: when shipped, multi-photo individual frames are excluded from practitioner Detailed Meals view per §3.2; only the ensembled meal visible
- **170e (chain context)**: chain restaurant context appears in Detailed Meals when granted; chain customization slot deltas hidden, only resulting macros shown
- **170f (recipes)**: recipe name on meals visible to practitioner; recipe TEMPLATE contents never visible (consumer recipe library is private)
- **170g (custom model)**: explicit corpus exclusion for shared meals (§8.4); training-consent and clinical-share-consent are independently consented
- **170h (symptom analytics)**: `shared_insights` pattern from 170h §13.2 PRESERVED unchanged; coexists with 170i ongoing-scope sharing. Per-insight share and ongoing-scope share are both available.

## Ratification posture (2026-05-29)

Gary acknowledged 170i at spec level 2026-05-29 by pasting the full spec into the session. Per ViaConnect convention this counts as filed and ratified at the spec level. No code change required.

The next code action is dispatched when the 9 prerequisites in "When 170i can sensibly build" are resolved, projected 4-6 months minimum.

## Related

- Prompt 170 Phase 1 (shipped 2026-05-29 commit `47a7663d`)
- Prompt 170a + 170a-supplement (ratified 2026-05-29)
- Prompt 170b (filed; depth sensors)
- Prompt 170c (placeholder; PHI redaction)
- Prompt 170d (filed; multi-photo)
- Prompt 170e (filed; restaurant context)
- Prompt 170f (filed; recipe-aware)
- Prompt 170g (filed; custom model fine-tune)
- Prompt 170h (filed; symptom × supplement analytics, the immediate predecessor 170i extends)
- Heritage: Prompts 15-17a (supplement protocols + Bio Optimization Analytics); CAQ Phase 0 (three-portal architecture); Prompt 16 (4-severity framework adopted internally with gentler visual treatment)
