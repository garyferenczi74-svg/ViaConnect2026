# Prompt 170p-supplement-2: Email Forwarding for Grocery Imports

**Filed:** 2026-06-01
**Status:** Filed Blueprint-ready. NOT YET AUTHORIZED FOR BUILD. Blueprint kickoff target Nov 2026 (post-170p-1 ship + at least 60 days adoption telemetry).
**Owner agent:** Gordon (per-service parser configs + parser test fixtures + ToS review per service + abuse-handling posture)
**Build agent:** Michelangelo (TDD, OBRA) + Platform engineer (AWS SES infrastructure)
**UX agent:** Hannah (pending imports review screen + grocery email setup wizard + per-service progress indicator)
**Co-owners:** Arnold (per-service parser failure rate telemetry + abuse signal monitoring), Kelsey (per-service ToS review + inbound email privacy disclosure + abuse complaint posture)
**Orchestrator:** Jeffery
**Hard-blocked-by:** 170p Phase 1 SHIPPED + ratification + AWS SES inbound provisioned + DNS subdomain on `inbox.viaconnect.com` configured + at least 8 weeks of Phase 1 production data
**Provides for Phase 3-4:** Per-service parser infrastructure (reused for PDF + Chrome agent) + `pantry_pending_imports` schema (also used by PDF + Chrome agent flows).

## 0. Summary

Supplement 2 ships the second pantry entry path: email forwarding from grocery services. Users register a one-of-a-kind ViaConnect inbound email address (e.g., `gary-7f3a2c@inbox.viaconnect.com`), forward their grocery service order confirmations to it, and ViaConnect parses each email into a pantry pending-import that the user reviews and accepts.

Ships 9 grocery service parsers: Instacart, Amazon Fresh, Whole Foods, Walmart Grocery, Kroger, Safeway, Target Drive Up, HelloFresh, Blue Apron. Infrastructure is AWS SES inbound (DNS + Lambda + webhook to ViaConnect API) with SPF/DKIM/DMARC verification, quarantine, and per-service dispatch.

Phase 2 does not ship: PDF upload (Phase 3), Chrome agent (Phase 3), suggestion engine (Phase 4), browser-based real-time imports (Phase 3 Chrome agent).

Headline behavioral metric for Phase 2 ratification at +60 days post-ship: per-service parser failure rate must be below 5% across the 9 services. Above 5% on any service triggers parser hold (the service is feature-flagged off pending Gordon iteration) without blocking the other 8.

## 1. What it is

A second pantry import path. Users opt in by enabling "Email forwarding" in Settings; the system generates a unique inbound email address per user that mirrors a per-user UUID. Users add this email as an alternate or forwarding address on their grocery service of choice (each service documented separately). When a grocery service sends an order confirmation, ViaConnect's inbound mail server receives it, dispatches to the per-service parser, and creates a `pantry_pending_imports` row. A push notification (if user opted in) and/or in-app banner notifies the user their import is ready to review. The user reviews the parsed items + accepts/edits/discards.

User-facing affordances added in Phase 2:
1. Settings: "Email forwarding" toggle + per-user inbound address display + per-service setup wizards.
2. Pantry tab: a "Pending imports" badge in the header + a pending-imports review screen.
3. Push notification (if user opted in): "Your Instacart order is ready to review."
4. In-app banner on /pantry: "1 pending import."

The user does NOT get in Phase 2:
- Real-time imports during checkout (Phase 3 Chrome agent).
- PDF receipt upload (Phase 3).
- Auto-acceptance of imports without review (intentional: avoid silent pantry pollution).

## 2. Why this matters

Phase 1 manual + receipt scan covers entry. Phase 2 covers high-frequency low-friction entry: users who order groceries online (now the majority for major US metros per a 2025 ATL/SF/NYC consumer survey) want their pantry to populate without rescanning receipts they never see physically.

Empirically (Gordon Q1 2026 corpus): users who order groceries online via Instacart/Amazon Fresh have 0% pantry adoption in Phase 1 because they never see a physical receipt to scan. Phase 2 closes that gap.

Strategic value: per-service parser fleet that Phase 2 builds is reused by Phase 3 PDF + Chrome agent paths. Phase 2 is the heaviest infrastructure investment but creates a parser layer that 4 of 5 import paths share.

## 3. Data model

Three new tables. Append-only migrations per standing rule.

### 3.1 `pantry_pending_imports`

Holds parsed imports awaiting user review.

```sql
CREATE TABLE IF NOT EXISTS public.pantry_pending_imports (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Provenance
  import_kind              TEXT NOT NULL CHECK (import_kind IN (
                             'grocery_email', 'pdf_upload',
                             'chrome_agent', 'manual_paste')),
  service_slug             TEXT NOT NULL,
  service_display_name     TEXT NOT NULL,
  source_email_id          UUID,
  source_email_received_at TIMESTAMPTZ,

  -- Parsed payload (Gordon-authored shape)
  parsed_items             JSONB NOT NULL DEFAULT '[]'::jsonb,
  parsed_total_amount      NUMERIC,
  parsed_currency          TEXT,
  parsed_order_id          TEXT,
  parsed_store_name        TEXT,
  parsed_delivery_date     DATE,

  -- Parser metadata
  parser_version           TEXT NOT NULL,
  parser_confidence_avg    NUMERIC CHECK (parser_confidence_avg BETWEEN 0 AND 1),
  parser_warnings          JSONB DEFAULT '[]'::jsonb,

  -- Review status
  status                   TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                             'pending', 'reviewed_saved',
                             'reviewed_partial_saved',
                             'reviewed_discarded',
                             'parser_error', 'expired')),
  reviewed_at              TIMESTAMPTZ,
  expires_at               TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),

  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_imports_user_status
  ON public.pantry_pending_imports(user_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_pending_imports_user_expires
  ON public.pantry_pending_imports(user_id, expires_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_pending_imports_service_slug
  ON public.pantry_pending_imports(service_slug);

ALTER TABLE public.pantry_pending_imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pending_imports_owner_all" ON public.pantry_pending_imports;
CREATE POLICY "pending_imports_owner_all"
  ON public.pantry_pending_imports FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS pending_imports_updated_at ON public.pantry_pending_imports;
CREATE TRIGGER pending_imports_updated_at
  BEFORE UPDATE ON public.pantry_pending_imports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

**Design notes:**
- `import_kind` is a closed enum used by Phase 2 (`grocery_email`), Phase 3 (`pdf_upload`, `chrome_agent`), and a Phase 1.1 supplement candidate (`manual_paste` for a "paste an order confirmation text" fallback). Phase 2 emits only `grocery_email`.
- `service_slug` is the canonical per-service identifier (`instacart`, `amazon_fresh`, `whole_foods`, `walmart_grocery`, `kroger`, `safeway`, `target_drive_up`, `hellofresh`, `blue_apron`); Phase 3 PDF + Chrome agent use the same slugs.
- `parsed_items` JSONB is the parser's output shape: `[{ raw_name, quantity, unit, category_hint, brand, confidence }, ...]`. Review screen edits this client-side before commit; the final `pantry_items` insert reads from the user-edited form, not directly from this JSONB.
- `expires_at` defaults to 14 days; cron job purges expired pending imports to keep the table thin. Users notified at 13 days via in-app banner.
- `status='expired'` is set by the cron, not the user; the row is not deleted (audit trail).
- `parser_warnings` JSONB captures parser uncertainty (e.g., "could not extract delivery date", "1 line item below confidence threshold") for surfacing in review UI.

### 3.2 `pantry_inbound_email_addresses`

Per-user inbound address mapping.

```sql
CREATE TABLE IF NOT EXISTS public.pantry_inbound_email_addresses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  inbound_local_part  TEXT NOT NULL UNIQUE,
  inbound_full_address TEXT NOT NULL UNIQUE,

  -- Status
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  deactivated_at      TIMESTAMPTZ,
  deactivated_reason  TEXT,

  -- Telemetry
  emails_received_count INTEGER NOT NULL DEFAULT 0,
  imports_created_count INTEGER NOT NULL DEFAULT 0,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inbound_addresses_inbound_local_part
  ON public.pantry_inbound_email_addresses(inbound_local_part);

ALTER TABLE public.pantry_inbound_email_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inbound_addresses_owner_select" ON public.pantry_inbound_email_addresses;
CREATE POLICY "inbound_addresses_owner_select"
  ON public.pantry_inbound_email_addresses FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "inbound_addresses_service_role_write" ON public.pantry_inbound_email_addresses;
CREATE POLICY "inbound_addresses_service_role_write"
  ON public.pantry_inbound_email_addresses FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "inbound_addresses_service_role_update" ON public.pantry_inbound_email_addresses;
CREATE POLICY "inbound_addresses_service_role_update"
  ON public.pantry_inbound_email_addresses FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

**Design notes:**
- `inbound_local_part` is generated server-side as `<user-firstname-or-username>-<6-char-random>` (e.g., `gary-7f3a2c`). The 6-char random prevents address guessing.
- `inbound_full_address` is `<inbound_local_part>@inbox.viaconnect.com` precomputed for query convenience.
- `is_active=FALSE + deactivated_reason='user_disabled'` is set when user toggles email forwarding off; the row persists for re-enable. `deactivated_reason='abuse_signal'` is set by the SES Lambda when abuse heuristics fire.
- Service-role writes only because address generation happens via the API at user opt-in time; users cannot set their own local_part.

### 3.3 `grocery_import_sessions` (telemetry)

```sql
CREATE TABLE IF NOT EXISTS public.grocery_import_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_hash             TEXT NOT NULL,
  session_id            UUID NOT NULL,
  service_slug          TEXT NOT NULL,

  -- Inbound metadata (NO email body persisted)
  inbound_email_size_bytes INTEGER,
  inbound_email_received_at TIMESTAMPTZ,
  spf_dkim_dmarc_pass   BOOLEAN,
  abuse_score           NUMERIC,

  -- Parser metadata
  parser_version        TEXT NOT NULL,
  items_detected_count  INTEGER,
  parser_confidence_avg NUMERIC CHECK (parser_confidence_avg BETWEEN 0 AND 1),

  -- Outcome
  session_outcome       TEXT NOT NULL CHECK (session_outcome IN (
                          'pending_created', 'parser_error',
                          'quarantined_abuse', 'authentication_failed',
                          'review_saved_all', 'review_saved_partial',
                          'review_discarded')),
  items_saved_count     INTEGER NOT NULL DEFAULT 0,

  -- Latency
  parser_latency_ms     INTEGER,
  end_to_end_ms         INTEGER,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grocery_sessions_user_hash_created
  ON public.grocery_import_sessions(user_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_grocery_sessions_service_outcome
  ON public.grocery_import_sessions(service_slug, session_outcome);

ALTER TABLE public.grocery_import_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "grocery_sessions_service_role_only" ON public.grocery_import_sessions;
CREATE POLICY "grocery_sessions_service_role_only"
  ON public.grocery_import_sessions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

100% sampling for Phase 2 first 60 days (parser-quality validation) then drop to 20% after parser failure rate stabilizes below 5%.

### 3.4 `grocery_service_parser_configs` (Gordon-maintainable)

```sql
CREATE TABLE IF NOT EXISTS public.grocery_service_parser_configs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_slug            TEXT NOT NULL UNIQUE,
  display_name            TEXT NOT NULL,
  parser_version          TEXT NOT NULL,

  -- Email matching
  sender_domain_patterns  TEXT[] NOT NULL DEFAULT '{}',
  subject_patterns        TEXT[] NOT NULL DEFAULT '{}',

  -- HTML parsing (primary)
  html_selectors          JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Text fallback patterns
  text_patterns           JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- NLU fallback prompt addendum
  nlu_addendum            TEXT,

  -- Status
  is_enabled              BOOLEAN NOT NULL DEFAULT FALSE,
  failure_rate_observed   NUMERIC CHECK (failure_rate_observed BETWEEN 0 AND 1),
  last_observed_at        TIMESTAMPTZ,

  curated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.grocery_service_parser_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parser_configs_read_authenticated" ON public.grocery_service_parser_configs;
CREATE POLICY "parser_configs_read_authenticated"
  ON public.grocery_service_parser_configs FOR SELECT
  USING (auth.role() = 'authenticated');
```

Gordon authors one row per service. Per-service parser config detail:
- `sender_domain_patterns`: array of regex for the From domain (e.g., `instacart.com`, `instacartmail.com`).
- `subject_patterns`: array of regex for subject identification (e.g., `^Your order is on the way`).
- `html_selectors`: JSONB describing CSS selectors (e.g., `{ items_table: 'table.order-items tr', item_name: 'td.name', item_quantity: 'td.qty' }`).
- `text_patterns`: JSONB describing fallback regex when HTML parse fails (e.g., `{ item_line: '^(\\d+)\\s+x\\s+(.+)\\s+\\$', currency: '\\$([0-9.]+)' }`).
- `nlu_addendum`: optional text appended to the Haiku NLU prompt for service-specific quirks (e.g., "Walmart Grocery uses 'each' for produce items").
- `failure_rate_observed` updated by an Arnold rollup job from `grocery_import_sessions` per service.

## 4. AWS SES inbound infrastructure

### 4.1 DNS configuration

Subdomain `inbox.viaconnect.com` with MX records pointing to AWS SES inbound endpoints in `us-east-1` and `us-west-2` (multi-region failover).

```
inbox.viaconnect.com.  IN MX  10 inbound-smtp.us-east-1.amazonaws.com.
inbox.viaconnect.com.  IN MX  20 inbound-smtp.us-west-2.amazonaws.com.
```

Plus SPF, DKIM, DMARC verification records for the receiving subdomain.

DNS provisioning is a one-time Platform engineering setup. Documented in `docs/infra/170p-supplement-2-ses-inbound-setup.md` (filed alongside this spec; placeholder for Blueprint phase).

### 4.2 SES inbound rule + Lambda dispatcher

SES inbound rule receives all mail at `*@inbox.viaconnect.com` and triggers a Lambda function with the raw MIME message.

Lambda function `ses-inbound-pantry-dispatcher`:

1. **Parse raw MIME**: extract From, To, Subject, Date, HTML body, text body, attachments.
2. **Local part lookup**: split `To` on `@`, look up `inbound_local_part` in `pantry_inbound_email_addresses`. Reject (no DLQ; bounce silently) if not found.
3. **Verify SPF/DKIM/DMARC**: check the inbound mail's authentication headers. Bounce-quarantine if SPF fail + DKIM fail; flag for review if DMARC fail.
4. **Abuse scoring**: heuristics for non-grocery emails (e.g., sender domain not in known grocery service list, subject pattern unmatched any service). Above-threshold abuse score: log to telemetry + bounce silently.
5. **Service dispatch**: match sender domain + subject against `grocery_service_parser_configs`. Pick matching service or quarantine if no match.
6. **Parser invocation**: call POST `/api/pantry/grocery/email/receive` on the ViaConnect API with a signed webhook payload.
7. **Webhook authentication**: HMAC-SHA256 signature with a SES_INBOUND_WEBHOOK_SECRET env var shared between Lambda + ViaConnect API.

Webhook payload shape:
```json
{
  "session_id": "uuid",
  "user_id": "uuid",
  "inbound_email_id": "uuid",
  "service_slug": "instacart",
  "from_address": "...",
  "subject": "...",
  "received_at": "ISO timestamp",
  "html_body": "...",
  "text_body": "...",
  "spf_pass": true,
  "dkim_pass": true,
  "dmarc_pass": true,
  "abuse_score": 0.03
}
```

ViaConnect API endpoint runs the per-service parser and creates the `pantry_pending_imports` row.

### 4.3 Lambda observability

- CloudWatch Logs for parse failures.
- CloudWatch Metrics for per-service receive count + dispatch count + quarantine count.
- Dead Letter Queue (SQS) for Lambda failures.
- Alarms: per-service abnormal rate (3x baseline) triggers Gordon notification.

### 4.4 Cost posture

SES inbound: $0.10 per 1,000 emails received. At 50,000 monthly emails (estimate): $5/month.
Lambda invocations: $0.20 per 1M + $0.0000166667 per GB-second. At 50,000 invocations × 500ms × 256MB: ~$1/month.
Total AWS SES + Lambda infrastructure: under $10/month at projected Phase 2 first-year volume.

## 5. Per-service parsers (Gordon long-pole)

Nine services, in priority order based on US consumer share:

1. **Instacart**: HTML-first, order confirmation + delivery confirmation emails. ~1.5 engineer-weeks parser + test fixtures.
2. **Amazon Fresh / Amazon Grocery**: HTML email with structured tables. Edge case: subscribe-and-save items mixed in. ~1.5 weeks.
3. **Whole Foods Market**: Amazon-owned but distinct email format. ~1 week (reuses Amazon parser scaffolding).
4. **Walmart Grocery**: HTML with embedded JSON-LD in some emails. Variable format. ~1.5 weeks.
5. **Kroger**: HTML with store-brand and chain-brand split. ~1 week.
6. **Safeway**: Albertson's parent; similar to Kroger format. ~1 week.
7. **Target Drive Up**: HTML; simpler format than groceries-only services. ~0.75 weeks.
8. **HelloFresh**: meal kit; quantity is per-recipe rather than per-item. Parser maps recipe ingredients to pantry items. ~1.5 weeks.
9. **Blue Apron**: meal kit similar to HelloFresh. ~1 week.

Per-service parser deliverables per service:
- `grocery_service_parser_configs` row.
- 5-10 sample emails (sanitized; from Gordon collection + beta cohort).
- Per-service test fixtures (HTML + text fallback + edge cases).
- Per-service documentation (1 paragraph in `docs/pantry/grocery-parsers/<slug>.md`).
- Per-service ToS review by Kelsey (1 hour each).

Total Gordon long-pole: 12-18 weeks of parser content authoring + engineering.

## 6. API surface

Phase 2 adds 6 routes.

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/pantry/inbound/enable` | Generate + return user's inbound email address; insert `pantry_inbound_email_addresses` row |
| POST | `/api/pantry/inbound/disable` | Set `is_active=FALSE + deactivated_reason='user_disabled'` |
| POST | `/api/pantry/grocery/email/receive` | Webhook from SES Lambda; HMAC verified; dispatches to per-service parser; creates `pantry_pending_imports` row |
| GET | `/api/pantry/pending-imports` | List user's pending imports |
| POST | `/api/pantry/pending-imports/[id]/save` | Accept reviewed import; transactionally insert `pantry_items` rows + mark pending status `reviewed_saved` or `reviewed_partial_saved` |
| POST | `/api/pantry/pending-imports/[id]/discard` | Mark pending status `reviewed_discarded`; no `pantry_items` inserted |

All routes gated by `GROCERY_EMAIL_FORWARDING_ENABLED` + per-service kill switches (`GROCERY_PARSER_INSTACART_ENABLED`, etc.) so a failing service can be toggled off without affecting the other 8.

## 7. UI surfaces

### 7.1 Settings > Email forwarding section

A new section in Settings > Pantry. Toggling enables/disables email forwarding for the user.

When enabled:
- Inbound email address displayed (copyable button + QR code for mobile-to-desktop)
- 9-service setup wizard cards: each card shows "Set up Instacart" / "Set up Amazon Fresh" / etc. Tap opens a per-service explainer modal with the exact steps to add the inbound address to that service (Settings > Notifications > Add email).
- Toggle: "Show parsed items for review before saving to pantry" (defaults ON; off means auto-accept, NOT shipped in Phase 2 but reserved for Phase 2.1)
- Toggle: "Push notification when import ready"

When disabled:
- "Re-enable" CTA + brief explainer of what email forwarding does.

### 7.2 Pantry tab: pending imports banner + review screen

When `pantry_pending_imports.status='pending'` count > 0:
- A teal-colored banner at top of Pantry tab: "{count} pending imports" + "Review" CTA.
- Tap "Review" opens a new sub-screen at `/pantry/pending-imports`.

Pending imports review screen:
- List of pending imports, each as a card with service icon + service display name + parsed total + delivery date + item count.
- Tap a card opens the per-import review view:
  - Items list with per-item edit + remove (same component as receipt scan review).
  - Parser warnings surfaced as small chips ("Parser missed delivery date" etc).
  - "Save all to pantry" + "Discard" + "Cancel" actions.

### 7.3 Push notifications

When a `pantry_pending_imports` row is created AND the user has `push_notifications_enabled=TRUE`:
- Push: "Your {service_display_name} order is ready to review"
- Tap deep-links to `/pantry/pending-imports`.

## 8. Helix events

Phase 2 adds 4 Helix events.

| Event | Points | Cap | Trigger |
|---|---|---|---|
| `grocery_email_address_configured` | 5 | 1 lifetime | User completes the email forwarding setup for the first time |
| `grocery_per_service_enabled` | 3 | 9 lifetime (1 per service) | User completes the per-service setup wizard for any service |
| `grocery_email_imported` | 4 | 5/day | A `pantry_pending_imports` row is reviewed and `status='reviewed_saved'` or `reviewed_partial_saved' |
| `grocery_import_review_discarded` | 0 | n/a | A pending import is discarded; no points awarded; tracked for telemetry |

## 9. Composition

### 9.1 With 170p-1

Reuses `pantry_items` schema. Adds `added_via='grocery_email_import'` rows on accepted imports. `added_via_session` references the `pantry_pending_imports.id`.

### 9.2 With 170l (OFF cache)

Per-service parser output runs through cascade lookup just like Phase 1 receipt scan. OFF cache provides barcode-to-product mapping when service includes barcode (some, like Amazon Fresh, do).

### 9.3 With 170c (dietary filter)

Same Phase 1 posture: `contains_allergens` populates when 170c ratifies. The pending-imports review screen surfaces an allergen warning chip per item when 170c is live AND the item's canonical_name resolves to an allergen the user has flagged.

## 10. Hard rules reaffirmed

Standing rules per Phase 1 §10 reaffirmed. Additionally:

- No credential storage for grocery services (the email forwarding pattern requires zero credentials; the user adds our inbound address to their service settings directly).
- AWS SES + Lambda infrastructure is owned by platform engineering; ViaConnect API only sees signed webhooks.
- Inbound emails are NEVER stored past the Lambda invocation (HTML body, text body, attachments all discarded after parsing). Only the metadata in `grocery_import_sessions` + parsed shape in `pantry_pending_imports.parsed_items` persists.
- SPF/DKIM/DMARC failure is auto-quarantined; user does not see quarantined emails (Kelsey-authored explainer in Settings).
- Per-service ToS review by Kelsey required before each parser is enabled (one-time per service).

## 11. Phasing within supplement 2 (Blueprint long-poles)

### 11.1 Phase 2.A: AWS SES infrastructure setup

- DNS configuration.
- SES inbound rule + Lambda deployment.
- HMAC webhook signing + verification.
- DLQ + alarms + CloudWatch dashboards.
- Beta cohort allowlist (initial: 50 ViaConnect employees and trusted users).

Estimated: 4-5 platform-engineer-weeks.

### 11.2 Phase 2.B: Parser infrastructure

- `grocery_service_parser_configs` table seed (9 rows; Gordon initial drafts).
- `src/lib/pantry/grocery/parsers/` library: dispatcher + per-service modules.
- HTML parser library (cheerio or similar; verified as dev-dep that ships in Next.js build without new package.json addition since not user-facing).

Wait: ALL Phase 2 work must respect zero new package.json deps. Cheerio is not currently in package.json. Alternatives:
- Use Node's native `DOMParser` API (Node 22+ has experimental support).
- Use regex-only parsing fallback for HTML.
- Use the existing 170l html5-qrcode library's DOM helpers (limited; not designed for HTML email parsing).

Gordon recommendation pending Blueprint: regex-only parsing as primary with NLU (Claude Haiku) as fallback. This avoids the dep blocker and matches the Phase 1 receipt scan philosophy (Vision API handles structure inference, regex extracts known patterns).

Estimated: 2 engineer-weeks parser infrastructure + per-service work in 11.3.

### 11.3 Phase 2.C: Per-service parsers

9 parsers at 0.75-1.5 weeks each = 9-13.5 engineer-weeks total.

Sequenced by priority. Instacart + Amazon Fresh ship first; Walmart, Kroger, Safeway second; Target, Whole Foods third; HelloFresh + Blue Apron last.

### 11.4 Phase 2.D: UI surfaces

- Settings section.
- Pantry tab pending banner + review screen.
- Push notification integration.

Estimated: 3 engineer-weeks + 1 Hannah parallel.

### 11.5 Phase 2.E: Pre-launch beta + ratification gate

- 50-user beta with real grocery emails.
- Per-service failure rate measured.
- Per-service enabled only when failure rate below 5% on beta data.
- Public launch after at least 2 services hit the threshold; remaining services ship as they qualify.

Estimated: 4-6 weeks beta + iteration.

### 11.6 Total Phase 2 runway

| Slice | Engineer-weeks |
|---|---|
| 2.A AWS SES infrastructure | 4-5 (platform) |
| 2.B Parser infrastructure | 2 |
| 2.C Per-service parsers | 9-13.5 (+ Gordon parallel) |
| 2.D UI | 3 (+ 1 Hannah parallel) |
| 2.E Beta + ratification | 4-6 |
| **Total** | **22-29 engineer-weeks** |

With 2 engineers + platform engineer in parallel: ~12-16 calendar weeks. Plus 4-6 beta weeks.

Optimistic ship target: Apr 2027 (Blueprint Nov 2026, build Dec-Mar, beta Apr, ship Apr-May).

## 12. Acceptance criteria

1. SES inbound infrastructure provisioned and verified by external email tester (mail-tester.com).
2. 3 tables created (+ index + RLS + trigger) per §3.
3. Lambda function deployed; tested with synthetic emails for each of 9 services.
4. 9 parsers shipped with documented `grocery_service_parser_configs` rows.
5. 6 API routes operational; each route 401s without auth (where applicable) + 503s with kill switch off + HMAC-verified on webhook + idempotent on save.
6. Beta cohort of 50 users tested with real emails; per-service failure rate below 5% on 9-of-9 services for public launch OR per-service flag-on for qualifying services only.
7. Settings section UI: enable + disable + per-service wizard renders.
8. Pending imports banner + review screen functional.
9. Push notification arrives within 30 seconds of email receipt.
10. Quarantine path: spam email to user's inbound address does NOT create a pending import.
11. SPF/DKIM/DMARC failure: email bounced silently; logged to telemetry.
12. Email body NEVER persisted past Lambda invocation; verified via Lambda code review + storage audit.
13. 4 Helix events fire correctly with documented caps.
14. Telemetry sessions insert at 100% sampling (Phase 2 first 60 days); user_hash never reveals user_id.
15. Practitioner test account: no pantry pending imports visible.
16. Hard rules per §10 satisfied.

## 13. Open questions for Gary (pre-Blueprint resolution)

| # | Question | Recommendation |
|---|---|---|
| Q1 | Subdomain choice: `inbox.viaconnect.com` vs. `pantry.viaconnect.com` vs. `groceries.viaconnect.com`? | `inbox.viaconnect.com` for forward-extensibility (future inbound paths beyond groceries) |
| Q2 | Beta cohort size: 50 internal vs. 100 external opt-in? | 50 internal first; expand to 100 external after 30 days |
| Q3 | Service priority order: should we ship Instacart + Amazon Fresh first (broadest reach) or HelloFresh + Blue Apron first (most structured emails, easiest parsers)? | Instacart + Amazon Fresh first; reach matters more than parser difficulty |
| Q4 | "Auto-accept" feature (skip review) shipped in Phase 2 or held to Phase 2.1? | Held to Phase 2.1 after 60 days of per-service failure rate data |
| Q5 | Should Phase 2 wait for 170c ratification or ship without allergen surfacing? | Ship without (Phase 2.1 supplement adds allergen surfacing when 170c ratifies) |
| Q6 | Push notification rate-limit: how to handle a user who places 3 grocery orders in 1 day? | Bundle: send a single "3 imports ready" push instead of 3 separate notifications |
| Q7 | Should the inbound email address be displayed as plain text or QR code only? | Both: plain text + QR code; QR for mobile-to-desktop convenience |
| Q8 | Per-service ToS review by Kelsey at what depth? Full ToS read vs. inbound email forwarding language only? | Inbound email forwarding language only; full ToS read filed as Q4 2027 follow-up if needed |

## 14. Filed-not-built reaffirmation

Filed 2026-06-01. NOT YET AUTHORIZED FOR BUILD. Blueprint kickoff target Nov 2026 contingent on 170p Phase 1 SHIPPED at minimum 25% adoption rate by then. Below 25%: Phase 2 deprioritized. Above 25%: Phase 2 Blueprint accelerates. Build authorization separate.

## 15. Related

- `prompt-170p-phase-1-spec-2026-06-01.md` (Phase 1 foundation; hard prerequisite)
- `prompt-170p-supplement-3-2026-06-01.md` (Phase 3 PDF + Chrome agent; reuses Phase 2 parser infrastructure)
- `prompt-170p-supplement-4-2026-06-01.md` (Phase 4 suggestion engine)
- `project_prompt_170p_phase_split.md` (ratified phase split memo)
- `feedback_jeffery_pre_launch_review.md` (Phase 2.E gate)
