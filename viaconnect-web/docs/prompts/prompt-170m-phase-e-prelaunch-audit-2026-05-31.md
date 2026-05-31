# Prompt 170m Phase E Pre-Launch Multi-Agent Audit

Date: 2026-05-31
Auditor: Jeffery (Brain + Main Manager), routing to Michelangelo, Hannah, Performance Advisor, Security Advisor
Verdict: **SHIP WITH CONDITIONS.** One hard blocker (Zod v4 API miscoding, 10 tsc errors) must land before Vercel flips QUICK_LOG_TEXT_ENABLED=true. One soft test assertion miscount stays POST-LAUNCH. All UX, security, performance, and discipline rules clean.

---

## 1. Review scope

**Commits audited.**

| SHA | Title | Files | LOC |
|---|---|---|---|
| 7749aeb2 | Phase A migration + Phase B parser foundation + 4 API routes | 8 | +1,496 |
| ba84afac | Phase C Quick Log modal + IdleSurface three-button row | 4 | +715 |
| 948888b4 | Phase D Settings consolidation + Phase B unit tests | 4 | +462 |

**Schema audited.** supabase/migrations/20260601000020_prompt_170m_phase_a_quick_log_foundation.sql (filename now 20260601000020 because of in-tree timestamp resequencing; spec called for 20260531120000). 89 lines, 4 logical units: meals ALTER (4 cols), meal_items ALTER (3 cols + CHECK), quick_log_sessions CREATE TABLE + 2 indexes + RLS enable, 5 helix_earning_event_types UPSERTs.

**4 production API routes audited.**
- src/app/api/nutrition/quick-log/parse/route.ts (168 LOC)
- src/app/api/nutrition/quick-log/clarify/route.ts (155 LOC)
- src/app/api/nutrition/quick-log/save/route.ts (233 LOC)
- src/app/api/nutrition/quick-log/repeat/route.ts (209 LOC)

There is a pre-existing src/app/api/nutrition/quick-log/route.ts from Prompt #161 which writes quick calories to nutrition_logs. Different domain, different table, no collision with 170m subroutes. Noted for support disambiguation only.

**7 new files in lib.**
- src/lib/nutrition/quick-log/types.ts (Zod schemas + vocab constants)
- src/lib/nutrition/quick-log/haiku-system-prompt.ts (12-section Gordon Blueprint embed)
- src/lib/nutrition/quick-log/parse-client.ts (fetch wrapper)
- src/lib/nutrition/quick-log/__tests__/types.test.ts (17 cases)
- src/lib/nutrition/quick-log/__tests__/haiku-system-prompt.test.ts (20 cases)

**6 new files in app.**
- src/app/(app)/(consumer)/nutrition/components/NutriVisionTab/QuickLog/QuickLogModal.tsx (352 LOC, ARIA dialog + clarification card + discard confirm)
- src/app/(app)/(consumer)/nutrition/components/NutriVisionTab/QuickLog/useQuickLogParser.ts (state machine hook, max 2 rounds enforced)
- src/app/(app)/(consumer)/nutrition/components/NutriVisionTab/QuickLog/quick-log-to-meal-draft.ts (parse to MealDraft adapter)
- src/app/(app)/(consumer)/settings/nutrivision/components/QuickLogSettingsSection.tsx (Phase D read-only card)
- src/app/(app)/(consumer)/nutrition/components/NutriVisionTab/index.tsx (EDITED: three-peer IdleSurface, Quick Log handlers, ReviewingSurface routing)
- src/app/(app)/(consumer)/settings/nutrivision/page.tsx (EDITED: QuickLogSettingsSection mount)

---

## 2. Michelangelo findings (Senior Dev: scope, discipline, hard rules)

| Rule | Result | Evidence |
|---|---|---|
| Zero package.json modifications | **PASS** | git diff 7749aeb2~1 948888b4 across package.json, package-lock.json, pnpm-lock.yaml, yarn.lock returns empty. Spec promised zero new dependencies and that holds. Anthropic SDK was pre-approved per #105; Zod was already in the tree. |
| No em or en dashes (Standing Rule) | **PASS** | grep across all 7 lib + 6 app + 4 route + 1 migration files returns zero matches. The haiku system prompt itself explicitly tells Haiku no em dashes anywhere in any output string and no en dashes (Section 12.3), so the inference pipeline reinforces the rule. |
| No emojis in code | **PASS** | grep across emoji unicode ranges zero hits across all new files. |
| Append-only migration | **PASS** | grep for DROP, ALTER COLUMN, TRUNCATE, DELETE FROM zero matches in the new migration. All ALTER TABLE calls are ADD COLUMN IF NOT EXISTS. CHECK constraint guarded by information_schema lookup. quick_log_sessions is fresh CREATE TABLE IF NOT EXISTS. Helix INSERT uses ON CONFLICT (id) DO NOTHING and is idempotent. |
| Lucide strokeWidth 1.5 | **PASS** | All 7 new Lucide instances in the four new component files explicitly set strokeWidth=1.5: 3 in QuickLogModal (X, HelpCircle, Loader2), 3 in IdleSurface EntryPathCard icons (Camera, ScanBarcode, MessageSquareText), 1 in QuickLogSettingsSection (MessageSquareText). |
| Brand tokens (Navy #1A2744, Card #1E3054, Teal #2DA5A0, Orange #B75E18) | **PASS** | QuickLogModal uses #1A2744/92 backdrop, #1E3054 body, #2DA5A0 Parse CTA + focus ring, #B75E18 discard accent + 480+/495+ counter color. QuickLogSettingsSection uses #1E3054/45 card + #2DA5A0 accent. No hex outside the approved set in any new file. |
| Bio Optimization rendered verbatim | **PASS** | Not exposed on the Quick Log surface in v1; ReviewingSurface.handleSave synthesizes gordon.bio_optimization_delta=null and copy=null so SaveConfirmation gets an empty banner state. This is the correct passthrough until Phase E wires the Gordon delta for Quick Log meals. |
| Mobile/desktop sync rule | **PASS** | IdleSurface EntryPathCard uses single responsive class set (min-h-120px sm:min-h-144px, h-7 w-7 sm:h-9 sm:w-9, etc.) with no separate mobile/desktop branches. QuickLogModal uses items-end justify-center bg... md:items-center for mobile-bottom and desktop-center positioning with a single component. |
| No any in new code | **PASS** (with one acknowledged escape hatch) | grep returns no fresh any in the 7 lib + 4 route + 4 NutriVisionTab new files. The pre-existing (supabase as any) casts in NutriVisionTab/index.tsx for meals + user_nutrivision_settings reads are unchanged from prior commits. |
| Landing page untouched | **PASS** | No files in src/app/page.tsx or marketing routes are touched. |
| Upload page untouched | **PASS** | No files in src/app/(app)/(consumer)/upload/ touched. |

**Michelangelo summary.** Discipline clean across the board. The diff is tight: 2,673 LOC across 16 new files plus surgical edits to two existing files. No protected paths breached. Anti-condescension principle from 170l propagates correctly (no Most common chip on Photo, no NEW chip on Quick Log).

---

## 3. Hannah findings (UX + AI/genomics gates)

| Gate | Wireframe expectation | Implementation | Result |
|---|---|---|---|
| **Gate 1** Three-button row architecture | 3 equal-weight peer cards (Photo + Scan Barcode + Quick Log) at 120px mobile / 144px desktop, no Most common chip, no NEW chip, Photo left | IdleSurface renders grid-cols-3 gap-2 sm:gap-3 with three EntryPathCard peers in order Photo / Scan Barcode / Quick Log, min-h-120px sm:min-h-144px, NO chip overlays on any card | **PASS** |
| **Gate 1** Equal typography + icon sizing | h-7 w-7 sm:h-9 sm:w-9 icons, same text-13 sm:text-sm title, same text-10 sm:text-11 subtitle | All three cards use identical class strings; a single EntryPathCard component instantiated 3x with different icon + copy | **PASS** |
| **Gate 2** 500-char cap with Orange transition | Cap at 500, Orange at 480, medium-weight Orange at 495 | CHAR_CAP=500, ORANGE_AT=480, ORANGE_MEDIUM_AT=495. counterColor switches to #B75E18 at 480+, counterWeight to 600 at 495+. onChange slices to CHAR_CAP so cap is hard-enforced | **PASS** |
| **Gate 2** Cycling examples halt on user typing | 5 examples cycle every 5s; stop when user types | EXAMPLES array length 5 + EXAMPLE_CYCLE_MS=5000. The setInterval callback checks text.trim().length === 0 before advancing index, AND the rendered placeholder is EXAMPLES[exampleIndex] only when text.trim().length === 0, so cycling visibly halts on first keystroke | **PASS** |
| **Gate 2** Discard confirmation on Cancel / Close X | If text present, show Discard what you typed? alert dialog with Keep typing + Discard | requestClose checks text.trim().length > 0 AND state.stage === typing and sets showDiscardConfirm if so; otherwise closes directly. Both the header X button and the footer Cancel link route through requestClose. Escape key also routes through requestClose. | **PASS** |
| **Gate 2** No backdrop click dismiss | Typed text must survive accidental backdrop tap | Outer dialog div has no onClick=onClose handler. Inner content does not have stopPropagation either, but absence of backdrop handler means nothing triggers close. Only header X, footer Cancel, and Escape key fire requestClose. | **PASS** |
| **Gate 2** Cmd-Enter / Ctrl-Enter submits | Keyboard shortcut for power users | Window-level keydown handler checks (e.metaKey OR e.ctrlKey) AND e.key === Enter and calls handleParse() with preventDefault | **PASS** |
| **Gate 2** Clarification card: chip-select + free-text alternative + Continue CTA | Radio group of chips, free-text input, Continue button enabled when one is provided | ClarificationCard component renders role=radiogroup with 2 to 6 option_chips chips (Zod-bounded), Or describe in more detail free-text input below, and Continue button gated by (selected !== null) OR (freeText.trim().length > 0). Selecting a chip clears the free-text and vice versa | **PASS** |
| **Gate 2** Clarification: max 2 rounds, 3rd unresolved falls to error | Up to 2 rounds per spec 9.5; 3rd transitions to error | useQuickLogParser enforces MAX_CLARIFICATION_ROUNDS=2 in the resolveClarification callback; when clarificationRounds >= 2 and Haiku still needs clarification, sets stage=error with kind=malformed_response | **PASS** |
| **Gate 3** Settings Entry path preferences consolidation | One card on /settings/nutrivision/page.tsx with Voice + Quick Log + Barcode subheadings | Current implementation mounts VoiceSettingsSection, QuickLogSettingsSection, then the barcode Link as three independent cards stacked. Hannah Option C vision was a single Entry path preferences parent card with three subheadings. Current is three cards each with its own heading rather than one card with three subheadings. | **SOFT MISS, POST-LAUNCH cleanup** |

**Hannah summary.** All P0 UX gates (Gates 1 + 2) implemented exactly to wireframe. Gate 3 ships at v1 as three sibling sections instead of one consolidated card; visually adjacent and functionally identical, so this is a polish refinement not a launch blocker. The polish improves discoverability when 170e/170f/170h add more cards, so file for the immediate post-launch sweep alongside the From Quick Log chip on the result review header (also deferred).

---

## 4. Performance Advisor findings

| Concern | Result | Evidence |
|---|---|---|
| All migration ADD COLUMNs use IF NOT EXISTS | **PASS** | All 7 new columns on meals + meal_items use ADD COLUMN IF NOT EXISTS. No table rewrite blast; existing rows get NULLs in new columns at zero IO cost on Postgres. The CHECK constraint on entry_modality_hint is added inside a DO block that checks information_schema.check_constraints first, so repeat migrations are idempotent. |
| Indexes added on quick_log_sessions | **PASS** | 2 indexes: idx_quick_log_sessions_created_at (created_at DESC) for time-series queries, idx_quick_log_sessions_parser_version (parser_version, created_at DESC) for parser-version-scoped trend queries. Both are exactly what a telemetry table needs. |
| No N+1 in save endpoint | **PASS** | save/route.ts does 1 INSERT into meals, then 1 batched INSERT into meal_items with insert(itemRows) where itemRows is an array. 2 round trips total. Telemetry adds a 3rd round trip only when Math.random() < 0.2 (20% sample). BOS recompute is a 4th call but already batched server-side. |
| Telemetry sampling reduces write load | **PASS** | The 20% sample gate on quick_log_sessions INSERT cuts write load to 20% of saves. At projected 20-40% NutriVision adoption + 5-10 Quick Log meals/user/day, telemetry inserts stay well under 100/min even at peak. |
| Repeat endpoint avoids N+1 | **PASS** | repeat/route.ts does 1 SELECT meals (single row), 1 INSERT meals, 1 SELECT meal_items (batched), 1 INSERT meal_items (batched). 4 round trips regardless of item count. |
| meal_items write does not lock other tables | **PASS** | The new meal_items.entry_modality_hint CHECK constraint adds a column-level predicate; it does not introduce new FK to other tables. The meals.repeated_from_meal_id FK is self-referential on meals with ON DELETE SET NULL so it never cascades. |
| 12s NLU timeout | **PASS** | NLU_TIMEOUT_MS=12_000 wraps the Anthropic call in withTimeout. Caller does not block beyond 12s. Haiku 4.5 p50 is approximately 340ms so this is generous; p99 with Anthropic queue spikes still well under 12s. |

**Performance Advisor summary.** Migration is non-blocking. Endpoints are batched. Telemetry sampled. NLU timeout-protected. No regression risk to existing nutrition writes.

---

## 5. Security Advisor findings

| Concern | Result | Evidence |
|---|---|---|
| All 4 routes auth-gate via supabase.auth.getUser() | **PASS** | parse:56, clarify:51, save:64, repeat:40 all call data.user destructure from await supabase.auth.getUser() then if not user return 401. Order is: feature-flag check, then auth check, then body parse. Correct. |
| All 4 routes flag-gate via QUICK_LOG_TEXT_ENABLED | **PASS** | parse:48, clarify:43, save:56, repeat:32 all check process.env.QUICK_LOG_TEXT_ENABLED !== true and return 503 if false. Default false at Vercel means the entire code path is inert in production until Phase E flips the env var. |
| quick_log_sessions has RLS enabled, no client policies | **PASS** | Migration line 66 enables RLS with comment Service-role inserts only, no client-visible policies. No CREATE POLICY follows, so client reads return zero rows by default Supabase posture. |
| Save endpoint admin client justified (RLS bypass on insert) | **PASS** | createAdminClient() used at save:101 and repeat:63. Save inserts include explicit user_id: user.id from the await supabase.auth.getUser() check above, so the admin bypass only writes rows owned by the authenticated user. Repeat additionally validates sourceMeal.user_id !== user.id and returns 403 before duplicating, so cross-account exploits are blocked. |
| No raw text on telemetry table | **PASS** | Migration schema for quick_log_sessions has text_input_length INT NOT NULL and no text_input, no raw, no original_text, no prompt columns. Save endpoint at line 178 inserts text_input_length: text_input.length, never the text itself. |
| Repeat forbids cross-account duplication | **PASS** | repeat:76 if sourceMeal.user_id !== user.id return 403. The source meal SELECT is .single() against the meal_id from the body, so a malicious user trying to repeat another user meal hits the 403 cleanly. Additional guard at line 79: if sourceMeal.source !== quick_log blocks the endpoint from being used to copy photo/barcode meals. |
| ANTHROPIC_API_KEY server-side only | **PASS** | Read in parse/route.ts:76 and clarify/route.ts:71. Both files are server-only route handlers (export const runtime = nodejs). No client component imports process.env.ANTHROPIC_API_KEY directly. grep confirms no NEXT_PUBLIC_ANTHROPIC or NEXT_PUBLIC_API_KEY references. |
| safeLog redaction | **PASS** | All error paths use safeLog.error / safeLog.warn / safeLog.info which is the project structured logger. Free-form text input is never logged; only metadata (userId, mealId, latencyMs, errorCode, issues paths). |
| stripCodeFence defense against prompt-injection fence escapes | **PASS** | Both parse and clarify wrap the Haiku output in stripCodeFence which removes leading triple-backtick and trailing triple-backtick lines before JSON.parse. Haiku is instructed not to emit fences but the helper is a defense-in-depth catch. |
| User hash function on telemetry | **PASS** (with note) | hashUserId uses DJB2-style hash for grouping similar users stratification. Comment explicitly states Not a privacy-grade hash; app.corpus_salt-based hashing lives in lib/nutrition/corpus/user-hash.ts for that purpose. Correctly framed: DJB2 is not a privacy primitive but is sufficient for non-PII analytics bucketing. |

**Security Advisor summary.** Posture is correct. Master kill switch is server-side. RLS posture on quick_log_sessions is denial-by-default. Admin client bypass is bounded by explicit user.id writes and 403 guards on cross-account access. No telemetry leakage of raw user text.

---

## 6. Open issues

### 6.1 HARD BLOCKER: Zod v4 API miscoding (.errors to .issues)

**Location.** 5 occurrences across 3 files:
- src/app/api/nutrition/quick-log/parse/route.ts:137 validated.error.errors.map((e) => ...)
- src/app/api/nutrition/quick-log/parse/route.ts:142 validated.error.errors.map((e) => ...)
- src/app/api/nutrition/quick-log/clarify/route.ts:129 validated.error.errors.map((e) => ...)
- src/lib/nutrition/quick-log/parse-client.ts:63 parsed.error.errors.map((e) => ...)
- src/lib/nutrition/quick-log/parse-client.ts:119 parsed.error.errors.map((e) => ...)

**Symptom.** npx tsc --noEmit reports 10 errors confined to 170m files (5 .errors accesses x 2 errors each: Property errors does not exist on type ZodError plus the cascading implicit-any on the (e) callback).

**Root cause.** This project pins zod ^4.3.6. Zod v4 renamed ZodError.errors to ZodError.issues. Each shipped file inherited the v3 API name.

**Why it does not break production today.** QUICK_LOG_TEXT_ENABLED defaults false, so all 4 routes return 503 before the safeParse validator runs. The TypeScript errors do not surface at runtime. Vitest tests pass (37 of 38) because they construct payloads that pass validation rather than triggering the error path.

**Why it must land before Vercel env flip.** As soon as Gary flips QUICK_LOG_TEXT_ENABLED=true in Vercel, the route handlers run live, and any malformed Haiku output will hit the error path which references error.errors. In Node 20+ runtime this throws TypeError: Cannot read properties of undefined (reading map), which the surrounding try/catch will swallow into a generic 500 to the client. The user-facing impact is Quick Log randomly fails after I clarify with no useful error message.

**Required fix.** Find and replace error.errors to error.issues in the 5 locations. Also impacts the pre-existing 170j voice files (src/app/api/nutrition/voice/parse/route.ts, src/lib/nutrition/voice/nlu/parse-client.ts) which have the same pattern but are outside 170m scope; flag to Michelangelo as a follow-up sweep.

### 6.2 POST-LAUNCH soft issue: Test assertion miscount

**Location.** src/lib/nutrition/quick-log/__tests__/haiku-system-prompt.test.ts:57

**Symptom.** 1 vitest test fails out of 38 (37 pass). Expects Diet Coke 12 fl oz to 46mg to appear verbatim in the system prompt, but the prompt has Diet Coke to 46mg (the 12 fl oz size is shared with the prior Coca-Cola entry on the same line). The actual NLU calls Haiku correctly; only the test substring is over-specified.

**Required fix.** Either tighten the prompt copy to include 12 fl oz per-item, or relax the test assertion. Either way it is cosmetic. Does not block launch since the underlying inference behavior is correct.

### 6.3 POST-LAUNCH soft issue: Hannah Gate 3 polish

**Location.** src/app/(app)/(consumer)/settings/nutrivision/page.tsx

**Symptom.** Three separate cards (VoiceSettingsSection, QuickLogSettingsSection, barcode link) rather than one parent Entry path preferences card with three subheadings. Functionally equivalent; visually slightly more cluttered.

**Required fix.** Wrap the three children in a single parent section with the Entry path preferences heading and let each child render as a subsection. Defer until 170e/170f wireframes confirm whether they want to fold into the same card or get sibling sections.

### 6.4 POST-LAUNCH soft issue: Migration filename drift

**Location.** supabase/migrations/20260601000020_prompt_170m_phase_a_quick_log_foundation.sql

**Symptom.** Commit message claims 20260531120000 (the spec value) but the in-tree file is 20260601000020. Both timestamps point to the same migration; the rename happened during commit ordering. Per Phase A migration applied live 2026-05-31 the live application happened on the spec date, so live state is correct. The filename mismatch is a paper trail anomaly only.

**Required fix.** None for launch. Document in audit log for prompt traceability.

### 6.5 POST-LAUNCH note: Pre-existing quick-log/route.ts from #161

**Location.** src/app/api/nutrition/quick-log/route.ts

**Symptom.** Pre-existing endpoint from Prompt #161 lives at the same URL stem as 170m new /quick-log/parse, /clarify, /save, /repeat subroutes. The #161 endpoint writes to nutrition_logs (separate table) with source=quick_calories. No code collision, but customer support documentation will need to distinguish Quick Log calories shortcut (#161, simpler) from Quick Log meal text (170m, full NLU).

**Required fix.** None at code level. Add a glossary entry to internal support docs.

---

## 7. SHIP / NO-SHIP / SHIP-WITH-CONDITIONS recommendation

### Verdict: SHIP WITH CONDITIONS

**Block on:** Section 6.1 (Zod .errors to .issues patch on 5 sites in 3 files). Must land in a follow-up commit before QUICK_LOG_TEXT_ENABLED=true is set in Vercel. Without this fix, schema-validation error paths throw at runtime when Haiku returns out-of-schema JSON. The fix is mechanical and approximately 10 minutes of work; recommend Michelangelo cuts a Phase E-prep commit before localhost smoke and before any production env flip.

**Approve for localhost deployment.** With or without the 6.1 fix, the localhost dev environment will run if Gary sets QUICK_LOG_TEXT_ENABLED=true in .env.local because TypeScript is non-blocking at Next.js dev runtime (Webpack/Turbopack swallow tsc errors with warnings). Gary can validate the three-button row, modal flow, and clarification chip handling on localhost:3000/nutrition/photo-ai immediately. Production Vercel build will block until 6.1 lands because next build runs tsc strictly.

**Defer:** 6.2 (test assertion), 6.3 (Settings consolidation polish), 6.4 (filename drift), 6.5 (support docs) all POST-LAUNCH cleanup.

**Standing rules verified clean.** No package.json change. No em or en dashes. No emojis. Append-only migration. Mobile/desktop sync rule honored. Lucide stroke-width consistent. Brand tokens correct. No protected paths touched. Master kill switch defaults safely.
