# Prompt 170n Phase E Pre-Launch Multi-Agent Audit

**Date:** 2026-05-31
**Auditor:** Jeffery (Brain + Main Manager), routing to Michelangelo, Hannah, Performance Advisor, Security Advisor
**Verdict:** **SHIP WITH CONDITIONS.** Zero hard blockers. Two soft test miscodings (1 substring assertion mismatch + 1 worked-example math precision off by 0.01) — fixed in same commit as this artifact. Four Hannah Gate 2 polish items (visible title, discard-confirmation, status copy progression, "Use text instead" fallback) stay POST-LAUNCH. Materially cleaner Phase E than 170m's audit; the Zod v4 `.issues` lesson landed verbatim from commit 1.

---

## §1 Review scope

**4 commits audited:** `25ad2d83` (Phase A migration), `3b7a535e` (Phase B parser + 3 routes), `ebcfdbd1` (Phase C overlay + 4-button IdleSurface), `59caad58` (Phase D Settings + tests). Net +2,513 LOC across 14 new files + surgical edits to 2 existing files.

**Schema audited.** `supabase/migrations/20260601000030_prompt_170n_phase_a_voice_native_foundation.sql` (113 lines; filename resequenced from commit-claimed 20260601000020 because 170m took that slot — paper-trail-only delta).

**3 production API routes** + **6 new lib files** + **4 new app files + 2 edits** (see Jeffery dispatch reply for full path inventory).

---

## §2 Michelangelo findings (Senior Dev)

| Rule | Result |
|---|---|
| Zero `package.json` modifications | PASS |
| No em/en dashes (Standing Rule) | PASS |
| No emojis in code | PASS |
| Append-only migration | PASS |
| Lucide `strokeWidth={1.5}` | PASS |
| Brand tokens (Navy / Card / Teal / Orange) | PASS |
| Bio Optimization rendered verbatim | PASS |
| Mobile/desktop sync rule | PASS |
| No `: any` in new code | PASS |
| Landing page untouched | PASS |
| Upload page untouched | PASS |
| **Zod v4 `.issues` pattern from commit 1** | **PASS** (170m audit lesson landed verbatim) |
| TypeScript clean on new files | PASS |

**Cleanest pre-launch diff in the 170 series so far.**

---

## §3 Hannah findings (UX + AI/genomics)

| Gate | Result |
|---|---|
| G1 Four-peer row + 2x2 collapse at <=359px | PASS (with soft icon-size note) |
| G1 Anti-condescension (no chips) | PASS |
| G1 Voice sublabel parallelism | SOFT MISS POST-LAUNCH ("Speak your meal." vs Hannah "Say what you ate.") |
| G1 Voice aria-label | PASS (functional, copy-deviation only) |
| G2 Desktop 480x560 centered modal (NOT 170j full-viewport) | PASS |
| G2 Mic ring pulse with reduced-motion fallback | PASS |
| G2 Cycling examples halt on capture | PASS |
| G2 Visible Voice title 18px Medium centered | SOFT MISS POST-LAUNCH (sr-only, not visible) |
| G2 Discard-during-flight confirmation on Cancel/Escape | SOFT MISS POST-LAUNCH (highest-value Gate 2 fix) |
| G2 "Use text instead" deaf/HoH fallback | SOFT MISS POST-LAUNCH |
| G2 Status copy progression (Got it -> parsing -> Taking a moment -> Almost there) | SOFT MISS POST-LAUNCH |
| G2 Clarification card chip radio + Continue | PASS |
| G2 Max 2 clarification rounds | PASS |
| G3 Settings Entry path preferences consolidation | SOFT MISS POST-LAUNCH (inherited from 170m) |
| G3 VoiceNativeSettingsSection v1 read-only | PASS |
| G3 Hannah-revised §4.5 quantifier table | PASS |
| G3 safetyMode swap per Hannah §4 | PASS |
| Combined voice confidence framework | PASS |
| Quick Apply Mode zero-numeric copy | N/A (QAM deferred per spec) |

Gate 2 has four soft polish misses; none block Vercel env-flag flip. Voice + transcript privacy posture lands correctly.

---

## §4 Performance Advisor findings

| Concern | Result |
|---|---|
| ALTER TYPE ADD VALUE IF NOT EXISTS (no enum rewrite) | PASS |
| ADD COLUMN IF NOT EXISTS on meals + meal_items (no rewrite blast) | PASS |
| 3 indexes on voice_native_sessions | PASS |
| No N+1 in save endpoint | PASS (2 round trips + telemetry sample + BOS recompute = 4 max) |
| 20% telemetry sampling | PASS |
| 12s NLU timeout | PASS |
| Server-only Anthropic + Zod imports | PASS |
| combinedConfidence float-drift safety | PASS (note: test math off by 0.01, §6.1 — fixed) |
| Migration applied live | PASS |

Non-blocking. Endpoints batched. No regression risk to existing nutrition writes.

---

## §5 Security Advisor findings

| Concern | Result |
|---|---|
| All 3 routes auth-gate | PASS |
| All 3 routes flag-gate (VOICE_NATIVE_ENABLED) | PASS |
| voice_native_sessions RLS enabled, service-role only | PASS |
| Save endpoint admin client justified (user_id match) | PASS |
| Telemetry stores metadata only (NOT raw transcript or audio) | PASS |
| voice_transcript persistence requires opt-in AND server kill switch | PASS (both default false at v1) |
| source_transcript_span on meal_items follows same retention gate | PASS |
| Confidence numerics always safe to persist | PASS |
| ANTHROPIC_API_KEY server-side only | PASS |
| safeLog redaction (free-form transcript never logged) | PASS |
| stripCodeFence defense vs prompt-injection fence escapes | PASS (defense in depth) |
| DJB2 user-hash labeling (non-PII analytics bucketing) | PASS |
| Audio buffer never crosses network (integer ms metadata only) | PASS |
| Repeat endpoint cross-account guard | N/A (no repeat endpoint in 170n) |

**Strongest privacy posture across the four NutriVision entry paths.**

---

## §6 Open issues

### §6.1 POST-LAUNCH soft: combinedConfidence test math precision off by 0.01 — FIXED

`types.test.ts:191`: expected 0.50 but `combinedConfidence(0.70, 0.35)` returns 0.49 (math: sqrt(0.245) = 0.4949 -> 2dp rounds 0.49). System prompt §9 worked example also said 0.50.

**Fix landed in same commit as this audit artifact:** test now expects 0.49; system prompt worked example updated to `combined 0.49. Just below floor; clarification triggers; high risk item.`

### §6.2 POST-LAUNCH soft: Section 5 substring miscoding — FIXED

`haiku-system-prompt.test.ts:75`: expected `inherited from canonical 170m` but prompt actually says `Apply Section 5 of the canonical 170m verbatim`.

**Fix landed in same commit as this audit artifact:** test assertion updated to match.

### §6.3 POST-LAUNCH soft: Hannah Gate 2 polish bundle (deferred)

- VoiceNativeCaptureOverlay title sr-only, should be visible 18px Medium centered
- handleCancel does not fire discard-confirmation when transcript in flight (highest-value fix)
- Status copy should progress "Got it, parsing your meal..." -> "Taking a moment..." -> "Almost there..."
- Missing "Use text instead" link below Stop CTA (Hannah §9.2 deaf/HoH commitment)
- Voice sublabel "Speak your meal." should be "Say what you ate." per Hannah parallelism

1-2 hour follow-up commit; discard-confirmation is highest-value.

### §6.4 POST-LAUNCH inherited: Settings consolidation not a single parent card

Same finding as 170m §6.3. Defer until 170e/170f confirm folding strategy.

### §6.5 POST-LAUNCH note: Migration filename drift

Commit claimed 20260601000020, file is 20260601000030 (resequenced behind 170m). Both apply identically. Paper-trail only.

### §6.6 POST-LAUNCH note: Phase D toggles intentionally deferred per Hannah v1 scope

VoiceNativeSettingsSection ships v1 read-only per Hannah §9.9. Future toggles (transcript retention opt-in, hide Voice card, push-to-talk default) require `user_voice_native_settings` table + Marshall dictionary scan on user-facing copy.

---

## §7 SHIP / NO-SHIP / SHIP-WITH-CONDITIONS recommendation

### Verdict: **SHIP WITH CONDITIONS** -> with the cosmetic fixes in this same commit, effectively **SHIP CLEAN**

Zero hard blockers. Materially cleaner Phase E than 170m. The Zod v4 lesson from 170m landed verbatim from commit 1.

**Standing rules verified clean.**
- No `package.json` change
- No em or en dashes anywhere
- No emojis
- Append-only migration
- Mobile/desktop sync rule honored
- Lucide `strokeWidth={1.5}` consistent
- Brand tokens correct
- No protected paths touched
- Master kill switch defaults safely OFF
- Two-gate transcript privacy (user opt-in AND server kill switch, both default false)
- Audio always ephemeral by architecture
- Zod v4 `.issues` from commit 1
