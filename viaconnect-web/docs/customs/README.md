# CBP Customs e-Recordation Module (Prompt #114)

Statute-critical compliance surface for FarmCeutica Wellness LLC that manages
the four rightsholder duties for meaningful border enforcement under
**19 C.F.R. Part 133**: Record, Respond, Equip, Monitor.

## Phased delivery status

| Phase | Scope | Status |
|---|---|---|
| P1 | Schema + RLS + business-day math + dashboard shell | Shipped 2026-04-23 |
| P2a | Recordations read path (list, detail, fee calc) | Shipped 2026-04-23 |
| P2b | Recordations write path + state machine + CEO RPC + IC classes | Shipped 2026-04-23 |
| P3 | `customs_recordation_products` junction + picker | Shipped 2026-04-23 |
| P4a | IPRS alerts review UI + test-insert + dashboard tile wire | Shipped 2026-04-23 |
| P4b | `iprs_daily_scan` edge function + registry + pg_cron | Shipped 2026-04-23 |
| P5 | Marshall subagent + Hannah walkthrough mount | Shipped 2026-04-23 |
| P6 | Mobile parity + test backfill + OBRA Gate A + this doc | Shipped 2026-04-23 |

## Schema (live in Supabase ViaConnect2026, `public`)

**Core (14 tables):**
- `customs_recordations` — one row per CBP IPRR filing; status lifecycle enforced by `recordationStateMachine`
- `customs_recordation_classes` — trademark IC breakdown
- `customs_fee_ledger` — fee postings
- `customs_detentions` — Notice of Detention intake; 7-business-day response clock
- `customs_detention_images` — SHA-256 chain-of-custody for CBP-disclosed samples
- `customs_seizures` — post-seizure lifecycle; 30-business-day disclosure clock
- `customs_fines_imposed` — § 133.27 civil fines (tracked; CBP collects)
- `customs_e_allegations` — outbound TVR submissions
- `customs_moiety_claims` — § 1619 whistleblower claims (admin+ceo+cfo access only)
- `customs_authentication_guides` — CBP Product Identification Guides
- `customs_guide_sections` — structured guide content
- `customs_trainings` — CBP port training requests
- `customs_iprs_scan_results` — IPRS daily-scan hits + synthetic test rows
- `customs_counsel_reviews` — counsel sign-offs on customs deliverables

**Scope-add tables (P2b/P3/P4a):**
- `customs_counsel_sessions` — MFA + nightly-expiring counsel access (Q2=2a)
- `customs_recordation_products` — SKU junction (`sku TEXT REFERENCES master_skus(sku)`)
- `iprs_scan_config` — single-row gate for the edge function

**Parent integration:**
- `legal_investigation_cases.has_customs_activity` column (cron-refreshed every 5 min, not trigger-based per Q4)
- `legal_operations_audit_log.action_category` extended with 7 customs values

## Enums

16 `customs_*` enums shipped in P1; see
`src/lib/customs/types.ts` for TS mirrors. Custom domain
`marshall_ai_disclaimer TEXT` applied on every Marshall-drafted row with a
nonempty CHECK.

## Application surface

```
/admin/legal/customs                     Dashboard (6 tiles: 2 live, 4 placeholders)
/admin/legal/customs/recordations        List + status filter
/admin/legal/customs/recordations/new    Create form with fee preview
/admin/legal/customs/recordations/[id]   Detail + actions + IC classes + products
/admin/legal/customs/alerts              IPRS alert review workflow
```

**API routes (all under `/api/admin/legal/customs/`):**
- `recordations` — GET list + POST create
- `recordations/[id]` — GET detail + PATCH update (allow-list + state machine)
- `recordations/[id]/classes` — POST + DELETE IC class rows
- `recordations/[id]/products` — GET linked + POST link + DELETE unlink
- `recordations/[id]/ceo-approve` — POST wraps SECURITY DEFINER RPC
- `master-skus` — GET picker data (service-role fetch)
- `alerts` — GET list with filters
- `alerts/[id]` — PATCH review action
- `alerts/[id]/open-as-case` — POST creates `legal_investigation_case` + atomically links
- `iprs/test-insert` — POST dev-only synthetic seed (env-gated)

## Edge function

`supabase/functions/iprs_daily_scan/index.ts` — deployed with `verify_jwt=false`
for cron invocation. Scheduled by `iprs_daily_scan_cron` at `6 6 * * *` UTC.
Gated by `iprs_scan_config.agent_enabled` (FALSE by default).

**Activation steps when CBP scrape path is ready:**

1. Replace the `fetchIprsMatches` stub body with the production scrape.
   All outbound `fetch()` calls must go through `safeFetchWithAllowlist`
   (enforces `IPRS_HOST_ALLOW`, `redirect: 'manual'`, 10s timeout,
   content-type validation).
2. Strip seller signals via the existing `stripSellerSignals` helper before
   normalization + hashing; do not introduce raw seller strings into
   `listing_title_normalized`.
3. Re-deploy: `supabase functions deploy iprs_daily_scan --project-ref nnhkcufyqjojdbvdrpky`.
4. Flip the gate (admin-only via RLS):
   ```sql
   UPDATE public.iprs_scan_config
   SET agent_enabled = TRUE, updated_at = NOW()
   WHERE config_id = TRUE;
   ```
5. Next 06:06 UTC run populates `/admin/legal/customs/alerts`.

## Dev-only synthetic seeder

The `/api/admin/legal/customs/iprs/test-insert` endpoint is triple-gated
(legal-ops role + `ENABLE_IPRS_TEST_INSERT=true` env flag + `is_synthetic=TRUE`
marker on every row). Set the env flag in `.env.local`, then click **Seed
test alert** on `/admin/legal/customs/alerts` to exercise the full review
workflow (confirm unauthorized / dismiss / open as case) before the live
scraper activates.

Production dashboard counts filter `is_synthetic=FALSE` so synthetic rows
never inflate the real alert count.

## Review workflow

On every customs alert row, a legal-ops user can:
- **Mark unauthorized** → sets `status='confirmed_unauthorized'` + `reviewed_by` from `auth.uid()`
- **Mark authorized** → `status='confirmed_authorized'` (first-sale doctrine path)
- **Dismiss** → `status='dismissed'`
- **Open as case** → creates a `legal_investigation_cases` row with `bucket='counterfeit'`, `state='intake'`, `priority='p2_high'` via `POST /alerts/[id]/open-as-case`. Label via reused `nextCaseLabel` (LEG-YYYY-NNNNNN). Atomic: compensating delete rolls the case back on link failure.

## Key lib files

- `src/lib/customs/types.ts` — enums, SLA constants, countdown classifiers
- `src/lib/customs/businessDays.ts` — US federal BD math with 2026-2028 holidays (Juneteenth, Thanksgiving, Columbus, leap Feb 29, OPM observance shifts)
- `src/lib/customs/cbpFeeCalculator.ts` — $190/IC initial + $80/IC renewal
- `src/lib/customs/recordationStateMachine.ts` — 7-state lifecycle, `canTransition` + `allowedNextStatuses`

## Test coverage

| Suite | Tests | Focus |
|---|---|---|
| `tests/prompt-114-business-days.test.ts` | 27 | Holiday math, 7-BD and 30-BD windows, weekend rollover, leap day |
| `tests/prompt-114-fee-calculator.test.ts` | 13 | 1/5/6/45 IC tiers, copyright flat, CEO threshold crossing at 6 IC |
| `tests/prompt-114-recordation-state-machine.test.ts` | 20 | Happy path, rejections, withdrawn-terminal, identical-state |
| `tests/prompt-114-countdown-states.test.ts` | 26 | Detention + renewal thresholds + constants |
| **Total** | **86** | all green |

## Marshall subagent

`viaconnect-web/.claude/agents/marshall.md` — CBP case officer persona. Read-only. Invoke via `subagent_type: "marshall"` in the Agent tool, or let Jeffery dispatch when customs-related work matches Marshall's description.

**Never violates:**
- "Counterfeit" / "infringing" as legal conclusions in drafted output
- AI disclaimer missing from drafted rows
- Direct submission to CBP portals (prepares payloads only)
- Peptide dosing / clinical claims in CBP-facing materials

## Hannah walkthrough slot

`src/components/admin/hannah/HannahWalkthrough.tsx` — mount-point stub per
`project_hannah_video_walkthroughs` memory. Currently mounted on
`/admin/legal/customs/recordations/new` with `target="customs.recordation.new"`.
Production no-op until Gary's cross-cutting video+chatbox framework lands.

## Security posture

- RLS enabled on every `customs_*` table with role-scoped policies
- `customs_moiety_claims` narrowed to `admin + ceo + cfo` only per Q6 (§ 1619 reward intel is sensitive)
- `customs_counsel_reviews` requires BOTH `legal_privilege_grants` active AND a non-expired `customs_counsel_sessions` row (MFA aal2) for external counsel
- CEO approval flows through SECURITY DEFINER RPC `approve_customs_recordation_ceo(p_recordation_id)` — derives approver from `auth.uid()`, re-asserts role + aal2 at DB level
- Importer PII behind `*_vault_ref TEXT` indirection (18 U.S.C. § 1905 trade secrets compliance)
- `trade_secrets_flag BOOLEAN NOT NULL DEFAULT TRUE` on every table carrying importer/SKU/seller data

## OBRA Gate A status

| Category | Status |
|---|---|
| Migration applies clean to live Supabase | PASS |
| RLS enabled on all customs_* tables | PASS |
| FK integrity against legal_investigation_cases | PASS |
| Business-day test coverage (20+ cases, 100% lines on helper) | PASS |
| 7-BD + 30-BD clocks correct across all 2026-2028 holidays | PASS |
| Renewal countdown state classifier tested at all thresholds | PASS |
| IPRS scan runs on schedule; heartbeat emits even when disabled | PASS |
| Marshall subagent registered; description + guardrails complete | PASS |
| Hannah walkthrough mount point rendered | PASS |
| `npx tsc --noEmit`: zero new errors | PASS |
| `npm run build`: deliberately NOT run locally per feedback_never_npm_build_locally | N/A (CI only) |
| Zero edits to package.json | PASS |
| Zero edits to existing applied migrations | PASS |
| Zero edits to Supabase auth/email config | PASS |
| Zero new `counterfeit_cases` table references | PASS |
| No top-level `/admin/customs/` routes (all nested under `/admin/legal/customs/`) | PASS |
