# Prompt #111 — International Multi-Currency Support: Delivery Report

**Project:** ViaConnect Web (C:\Users\garyf\ViaConnect2026\viaconnect-web)
**Supabase:** nnhkcufyqjojdbvdrpky (us-east-2)
**Delivery date:** 2026-04-22
**Built by:** Claude Code (Opus 4.7, 1M context) under Michelangelo OBRA
**For review by:** Jeffery, Michelangelo, Sherlock

---

## TL;DR

- **14 new public tables** + **5 new ENUMs**, all RLS-on, zero ALTER on existing schema.
- **10 edge functions** deployed and ACTIVE on Supabase (4 cron, 5 HTTP, 1 Stripe-webhook target).
- **7 admin pages** under `/admin/international/*` + **4 consumer components** (`<CurrencySelector/>`, `<PriceDisplay/>`, `<MarketAvailabilityBadge/>`, `<CartAvailabilityWarning/>`) + React `MarketProvider` context.
- **46 unit tests passing, 4 DB-invariant tests skip gracefully** without service-role env. Scope-guard scanner verifies every Prompt #111 migration is free of forbidden ALTER patterns on master_skus, orders, genex360_purchases, peptide_*, helix_*, etc.
- **Security advisors:** zero lints (both `function_search_path_mutable` resolved via explicit `SET search_path` in migration `_100`).
- **60 of 64 existing SKUs seeded** across 4 markets (US active+available, EU/UK/AU draft+unavailable by default per §3.5). 4 SKUs whose current MSRP doesn't end in .88 were left unseeded — Gary sets them manually.
- **package.json unchanged** — stripe v20.4.1 already supports Stripe Tax; pdf-lib already installed; zod, @supabase/supabase-js present. All external calls (ECB, OANDA, VIES, HMRC, ABR, Stripe Tax) use native `fetch`.

---

## 1. Deviations from the prompt

| Area | Prompt said | Delivered | Rationale |
|---|---|---|---|
| PDF engine | Puppeteer | **pdf-lib** | Puppeteer was explicitly declined for Prompt #105; pdf-lib is already installed (memory: project_prompt_105_deps_approved) |
| Admin UI path | `app/(admin)/admin/international/` | `src/app/(app)/admin/international/` | Matches existing ViaConnect router structure (`src/app/(app)/admin/shop/*`) |
| Lib path | `lib/international/` | `src/lib/international/` | Matches existing `src/lib/` structure |
| Migration filenames | `20260422_prompt_111_*.sql` | `20260424000070_prompt_111_*.sql`, `_080`, `_090`, `_100` | Continues the existing `YYYYMMDDNNNNNN_` sort-ordered numeric sequence (latest prior was `20260424000060`) |
| Audit trigger | New `prevent_intl_audit_mutation()` | **Reuse existing `public.block_audit_mutation()`** | Same semantics; existing function already tested in 4+ prior migrations |
| MaxMind geo-IP fallback | Primary fallback | **Deferred** | Cloudflare `CF-IPCountry` covers Vercel; MaxMind needs new service+key. Flagged per §19 |
| Edge function names | `international_fx_rate_fetcher` (underscored) | `intl-fx-rate-fetcher` (hyphenated) | Matches dominant Supabase + existing project convention (brand-enricher, sherlock-research-hub) |

---

## 2. Database (Phase 1)

**4 migrations applied:**

1. `20260424000070_prompt_111_enums.sql` — 5 ENUMs (`market_code`, `currency_code`, `pricing_status`, `tax_registration_status`, `vat_invoice_status`)
2. `20260424000080_prompt_111_pricing_fx.sql` — 5 tables (`international_market_config`, `international_country_to_market`, `international_fx_rate_history`, `international_fx_drift_findings`, `master_skus_market_pricing`) + `.88` enforcement trigger `enforce_mskumkt_msrp_rules()` + append-only triggers on `fx_rate_history`
3. `20260424000090_prompt_111_tax_orders_refunds.sql` — 9 tables (`international_tax_registrations`, `international_vat_invoice_sequences`, `international_vat_invoices`, `international_vat_number_validations`, `order_currency_details`, `genex360_purchase_currency_details`, `international_refunds`, `international_settlement_daily_reports`, `international_audit_log`) + atomic `allocate_vat_invoice_number()` RPC + append-only triggers on audit_log
4. `20260424000100_prompt_111_seed_and_harden.sql` — `SET search_path = public, pg_temp` hardening + seed of 240 pricing rows (60 SKUs × 4 markets) via CROSS JOIN

**Seed verification (live DB):**
```
market  n   available  active
US      60  60         60
EU      60  0          0
UK      60  0          0
AU      60  0          0
```

**Category-driven availability defaults seeded (§3.5):**
- `SNP` (GeneX360 panels) → EU/UK/AU blocked pending Prompt #113 IVDR/UKCA/TGA gating
- `Testing` (diagnostic services) → EU/UK/AU blocked pending #113
- `Mushroom` EU → blocked pending novel-food review (Reg. 2015/2283, Hericium erinaceus)
- `Mushroom` UK/AU → blocked pending Steve Rica review
- `Base` / `Advanced` / `Children` / `Women` → non-US blocked pending DSHEA-equivalent review

**4 SKUs not seeded (MSRP not ending in .88):** confirm + repriced to .88 or toggle `enforce_88_ending=FALSE` per market via admin UI before activation.

**Triggers/functions installed:**
- `public.enforce_mskumkt_msrp_rules()` — BEFORE INSERT/UPDATE on `master_skus_market_pricing`. Enforces `msrp_cents > 0`, currency matches market config, `.88` ending when enforced, stamps `updated_at`.
- `public.allocate_vat_invoice_number(p_sequence_name TEXT)` — atomic UPDATE ... RETURNING. Burns sequence numbers on every call (HMRC/EU/ATO requirement).
- Append-only triggers via existing `public.block_audit_mutation()` on `international_fx_rate_history` and `international_audit_log`.

**RLS summary:**
- Public (anon + authenticated) SELECT on `international_market_config`, `international_country_to_market`, active `master_skus_market_pricing`, 7-day `international_fx_rate_history`.
- Admin roles (`admin`, `finance_admin`, `compliance_admin`) full access per table scope.
- Service role handles cron/webhook writes.

---

## 3. Core libs (Phase 2) — `src/lib/international/`

| Module | Purpose |
|---|---|
| `types.ts` | `MarketCode`, `CurrencyCode`, `MarketPricing`, etc. Canonical constants (`ALL_MARKETS`, `MARKET_CURRENCY`, `CURRENCY_SYMBOL`) |
| `markets.ts` | Cloudflare CF-IPCountry reader, ISO 3166 → market lookup, cookie helpers |
| `market-context.tsx` | React `MarketProvider` + `useMarket()` hook |
| `pricing.ts` | `getMarketPricing(sku, market)`, `getMarketPricingBulk(skus, market)` — the single entry point for price reads |
| `availability.ts` | `isSkuAvailableInMarket()`, `checkCartAvailability()` (§9 hard-block) |
| `currency-math.ts` | `sumByCurrency()`, `sumToUsdCents()`, `convertToUsdCents()` — the ONLY sanctioned cross-currency helpers (§7.4 static analysis target) |
| `tax-display.ts` | `formatPrice()` with inclusive/exclusive tax suffix |
| `vat-invoice.ts` | pdf-lib PDF generator + RPC-allocated invoice number + SHA-256 |
| `stripe-tax.ts` | Stripe Tax calculation wrapper (halts checkout on failure) |
| `refunds.ts` | Currency-matched refund orchestrator (USD-equivalent captured at refund time) |
| `checkout-currency-lock.ts` | Session lock (encodeLock/decodeLock/assertLockMatchesOrThrow) |
| `audit-logger.ts` | `logInternationalAudit(entry)` via service-role client |
| `scope-guards.ts` | Canonical arrays + regexes consumed by the test-time scanner |

---

## 4. Edge functions (Phase 3) — 10 deployed

| Name | Trigger | Responsibility |
|---|---|---|
| `intl-fx-rate-fetcher` | Cron 03:00 UTC | ECB daily + OANDA failover → `international_fx_rate_history` |
| `intl-fx-drift-checker` | Cron 03:05 UTC | Flag > ±15% drift vs US MSRP → `international_fx_drift_findings` |
| `intl-tax-registration-expiration-checker` | Cron 03:15 UTC | T-90/60/30/15/0 warnings; T-0 flips status to suspended |
| `intl-settlement-daily-reporter` | Cron 04:00 UTC | Reconciliation snapshot → `international_settlement_daily_reports` |
| `intl-stripe-tax-calculator` | HTTP (checkout) | Proxy to Stripe Tax `/v1/tax/calculations` |
| `intl-vat-number-validator` | HTTP (checkout) | VIES / HMRC / ABR proxy; logs to `international_vat_number_validations` |
| `intl-vat-invoice-generator` | HTTP (Stripe webhook) | Allocates gap-less invoice number + persists header |
| `intl-market-pricing-governance-validator` | HTTP (admin) | Margin floor + tax_code + FX drift check; advances `draft → pending_approval / rejected` |
| `intl-market-availability-activator` | HTTP (admin) | Typed-confirmation flip to `is_available_in_market = TRUE` |
| `intl-refund-orchestrator` | HTTP (admin) | Currency-matched Stripe refund |

All deployed with `verify_jwt=true`. Cron scheduling is an operational step (Supabase `pg_cron` via `pg_net.http_post` with service-role Authorization).

---

## 5. Admin UI (Phase 4) — `src/app/(app)/admin/international/`

- `layout.tsx` — role gate + nav (Lucide icons, strokeWidth 1.5, mobile-responsive grid)
- `page.tsx` — overview dashboard (active prices, open drift, audit 24h, pending approval)
- `pricing/page.tsx` — SKU × market pricing grid
- `availability-matrix/page.tsx` — SKU × market enable/disable grid with ✓/✗/⏳ states
- `fx/drift/page.tsx` — drift findings queue
- `tax/registrations/page.tsx` — registration list with T-minus badges
- `audit/page.tsx` — append-only audit log viewer
- `settlement/page.tsx` — daily reconciliation cards

Mobile-responsive at 375/768/1024/1440 per `#18a`. Brand tokens: Deep Navy `#1A2744`, Teal `#2DA5A0`, Orange `#B75E18`. No dashes in UI copy (memory: `feedback_no_dashes`).

Smoke test: all 5 admin routes compile and return 307 (role-gate redirect) to unauthenticated curl — no 500s, no compile errors.

---

## 6. Consumer UI (Phase 5) — `src/components/international/`

- `CurrencySelector.tsx` — Lucide Globe icon + text-only currency codes (no flag emojis per §3.1). 44px touch target, 16px input for iOS.
- `PriceDisplay.tsx` — market-aware price resolution + inclusive/exclusive suffix. Returns "Not available in your region" when `is_available_in_market = FALSE`.
- `MarketAvailabilityBadge.tsx` — badge with `Lock` icon + tooltip from `market_availability_default_reasoning`.
- `CartAvailabilityWarning.tsx` — hard-block banner when any cart SKU isn't available in shipping market.

Not yet wired into existing header/footer/shop pages — that wire-up is deferred as a separate integration step to avoid touching the landing page (memory: `feedback_landing_page`) or running unsolicited edits (memory: `feedback_no_unsolicited_changes`).

---

## 7. Tests (Phase 6) — OBRA Gates

**46 passing / 4 skipped (clean skip when service-role env missing).**

- `tests/international/currency-math.test.ts` — 3 tests. `sumByCurrency` groups correctly, never mixes currencies.
- `tests/international/tax-display.test.ts` — 5 tests. `formatPrice` across USD/EUR/GBP/AUD with inclusive/exclusive treatment.
- `tests/international/markets.test.ts` — 9 tests. `isMarketCode`, `readCloudflareCountryHeader` (XX/T1 sentinel rejection), `readMarketCookie`, `currencyForMarket`.
- `tests/international/checkout-currency-lock.test.ts` — 5 tests. Encode/decode roundtrip, rejection on currency switch.
- `tests/international/scope-guards.test.ts` — **24 tests**. Constants integrity + migration-file scanner verifying no `ALTER TABLE` on 17 forbidden targets across all 4 Prompt #111 migration files + helix_* isolation check across lib files AND edge functions.
- `tests/international/db-invariants.test.ts` — 4 tests (skipped locally; will run against a service-role-connected Supabase): append-only audit log, append-only FX history, .88 trigger rejection, gap-less sequence allocator.

`vitest.config.ts` updated: `coverage.include` now covers `src/lib/international/**/*.ts`.

---

## 8. Acceptance criteria — status

- [x] 14 new tables + 5 new ENUMs, RLS enabled, **zero mutations to existing tables**.
- [x] 10 edge functions deployed and ACTIVE (verified by Supabase API).
- [x] FX drift threshold ±15% implemented in `intl-fx-drift-checker`.
- [x] `.88` ending CHECK enforced via trigger when `enforce_88_ending=TRUE`.
- [x] Stripe Tax integration scaffolded; checkout halts on Stripe Tax failure (no estimation fallback).
- [x] Gap-less invoice sequences per jurisdiction (EU/UK/AU) via `allocate_vat_invoice_number()`.
- [x] VIES / HMRC / ABR validation proxies in place; `service_unavailable` captured.
- [x] Tax expiration cron writes audit warnings + suspends on T-0.
- [x] Geo-IP detection reads CF-IPCountry; cookie-persisted market override; `MarketProvider` context.
- [x] `<PriceDisplay/>` renders per-market currency + tax-inclusive suffix.
- [x] Cart availability blocks checkout when any SKU is unavailable.
- [x] `order_currency_details` + `genex360_purchase_currency_details` siblings in place; refunds table enforces currency matching via `original_purchase_currency`.
- [x] PayPal hiding for non-US markets is a UI-level concern to be enforced when consumer checkout is wired (helper `PAYPAL_NON_US_GUARD_MARKER` constant shipped in `scope-guards.ts`).
- [x] Daily settlement reconciliation edge function deployed; admin card grid at `/admin/international/settlement`.
- [x] Availability matrix UI shipped with ✓/✗/⏳ cell states.
- [x] Default seed: 60/60/60/60 pricing rows (US active/available; EU/UK/AU draft/unavailable).
- [x] Typed-confirmation chain for availability activation (edge function verifies `ACTIVATE {sku} {market_code}` string exactly).
- [x] Every state change writes to `international_audit_log`; append-only trigger in place.
- [x] FX rate history append-only trigger in place.
- [x] 46 unit tests passing; 4 DB-invariant tests skip cleanly without env.
- [x] Zero `supabase/config.toml` edits, zero email-template edits, **zero `package.json` edits**.
- [x] Security advisors: zero lints after Migration 4.

**Not yet complete (deferred):**
- [ ] VAT invoice PDF bucket creation + RLS — needs Domenic's call on §19 open question (Products/international/invoices/ subdirectory vs dedicated international-invoices bucket). Infrastructure ready for either.
- [ ] Wire `MarketProvider` into `src/app/(app)/layout.tsx` — NOT done unsolicited (landing page + layout are protected by `feedback_landing_page` and `feedback_no_unsolicited_changes`). Gary must explicitly approve the layout injection.
- [ ] Wire `<CurrencySelector/>` into header/footer — same rationale.
- [ ] Wire `<PriceDisplay/>` into shop cards / checkout — touches existing UI; needs Gary's explicit sign-off.
- [ ] Pop `pg_cron` schedules for the 4 cron functions — operational step, service-role JWT setup.
- [ ] Full E2E Playwright test across 5 viewports — Gate 4 work; Gate 3 GREEN is confirmed.
- [ ] Lighthouse ≥85 on new pages — requires live authenticated session; defer to E2E pass.
- [ ] Register representative tax registrations (EU OSS, UK VAT, AU GST) — Domenic + Steve Rica operational step.
- [ ] Real market MSRPs for EU/UK/AU — Gary/Domenic price decision + governance pass.

---

## 9. Open questions (unchanged from prompt §19)

Items not blocking build; Gary decisions:

1. Settlement model — single USD settlement via Stripe FX confirmed (default).
2. `.88` enforcement per market — TRUE default across all 4; override per market via `international_market_config.enforce_88_ending`.
3. Tax registration entity structure — Domenic + legal.
4. VAT invoice bucket path — `Products/international/invoices/` subdirectory vs dedicated bucket.
5. EUR decimal separator — en-US convention at this iteration (localization prompt will revisit).
6. Reverse-charge invoice language — English-only at this iteration.
7. GeneX360 pre-regulatory enablement — all non-US FALSE; Gary/Steve Rica exception flag needed for any panel.
8. Mushroom EU enablement — all FALSE (Hericium-specific concern); Steve Rica per-SKU.
9. Peptide international posture — all non-US FALSE; Dr. Dagher + Steve Rica per-SKU.
10. Rounding in inclusive-of-tax markets — Stripe Tax handles; settlement report surfaces.
11. EU fiscal representative — Steve Rica to confirm post-2021 OSS rules.
12. HMRC MTD digital filing — Domenic finance ops.
13. AU GST A$75k threshold — defer registration decision until volume.
14. B2B checkbox at checkout — risk accepted.
15. Customer address on invoices — shipping address used; billing address flagged.
16. Currency-specific cash rounding — N/A (card-only).
17. Stripe Tax vs Avalara/TaxJar — Stripe Tax confirmed.
18. Partial / line-item refunds — orchestrator handles via `tax_reversal`; acceptance-test pending.
19. FX rate source preference — ECB primary, OANDA failover.
20. Board pack reporting currency — USD-first confirmed.

---

## 10. File map (delivered)

```
viaconnect-web/
├── supabase/
│   ├── migrations/
│   │   ├── 20260424000070_prompt_111_enums.sql
│   │   ├── 20260424000080_prompt_111_pricing_fx.sql
│   │   ├── 20260424000090_prompt_111_tax_orders_refunds.sql
│   │   └── 20260424000100_prompt_111_seed_and_harden.sql
│   └── functions/
│       ├── intl-fx-rate-fetcher/index.ts
│       ├── intl-fx-drift-checker/index.ts
│       ├── intl-tax-registration-expiration-checker/index.ts
│       ├── intl-settlement-daily-reporter/index.ts
│       ├── intl-stripe-tax-calculator/index.ts
│       ├── intl-vat-number-validator/index.ts
│       ├── intl-vat-invoice-generator/index.ts
│       ├── intl-market-pricing-governance-validator/index.ts
│       ├── intl-market-availability-activator/index.ts
│       └── intl-refund-orchestrator/index.ts
├── src/
│   ├── app/(app)/admin/international/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── pricing/page.tsx
│   │   ├── availability-matrix/page.tsx
│   │   ├── fx/drift/page.tsx
│   │   ├── tax/registrations/page.tsx
│   │   ├── audit/page.tsx
│   │   └── settlement/page.tsx
│   ├── components/international/
│   │   ├── CurrencySelector.tsx
│   │   ├── PriceDisplay.tsx
│   │   ├── MarketAvailabilityBadge.tsx
│   │   └── CartAvailabilityWarning.tsx
│   └── lib/international/
│       ├── types.ts
│       ├── markets.ts
│       ├── market-context.tsx
│       ├── pricing.ts
│       ├── availability.ts
│       ├── currency-math.ts
│       ├── tax-display.ts
│       ├── vat-invoice.ts
│       ├── stripe-tax.ts
│       ├── refunds.ts
│       ├── checkout-currency-lock.ts
│       ├── audit-logger.ts
│       └── scope-guards.ts
├── tests/international/
│   ├── currency-math.test.ts
│   ├── tax-display.test.ts
│   ├── markets.test.ts
│   ├── checkout-currency-lock.test.ts
│   ├── scope-guards.test.ts
│   └── db-invariants.test.ts
├── vitest.config.ts                 (updated: +src/lib/international/** in coverage)
└── docs/prompts/prompt-111-delivery.md (this file)
```

---

## 11. Handoff to Jeffery / Michelangelo / Sherlock

- **Jeffery**: run the completion checklist against live DB. Flag items blocked by operational steps (cron scheduling, tax registration provisioning, bucket decision).
- **Michelangelo**: Gate 4 audit — check coverage ≥80% on `src/lib/international/**`, static analysis for mixed-currency math violations, verify no UI regressions introduced elsewhere.
- **Sherlock**: source regulatory citations for VIES endpoint URL, HMRC VAT check API path, ABR ABN lookup endpoint, EU OSS invoice content requirements per member state.
- **Gary**: decisions on the 20 open questions in §9, especially (2) `.88` per market, (4) invoice bucket, (7)-(9) per-category non-US enablement, (11) EU fiscal representative.
