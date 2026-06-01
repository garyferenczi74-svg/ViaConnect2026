# Prompt 170p-supplement-3: Additional Input Paths

**Filed:** 2026-06-01
**Status:** Filed Blueprint-ready. NOT YET AUTHORIZED FOR BUILD. Blueprint kickoff target May 2027 (after 170p-2 stabilizes + at least 30 days production data).
**Owner agent:** Gordon (PDF parser scaffolds + image vision prompt extension + Chrome agent endpoint contract + multi-store data model)
**Build agent:** Michelangelo
**UX agent:** Hannah (upload sheet UI + Chrome agent confirmation modal + multi-store filter)
**Co-owners:** Arnold (per-path import success telemetry + advanced analytics rollups), Kelsey (Chrome agent privacy disclosure + advanced analytics consumer-data disclosure)
**Orchestrator:** Jeffery
**Hard-blocked-by:** 170p Phase 1 SHIPPED + 170p-2 SHIPPED with parser infrastructure operational + Claude in Chrome reaching general availability (external)
**Provides for Phase 4:** Multi-store schema + advanced analytics surfaces.

## 0. Summary

Supplement 3 ships three additional pantry entry paths: PDF upload (Amazon Fresh order confirmations, Whole Foods receipts, Walmart e-receipts), image upload (photos of receipts or packaging labels) via the Anthropic Vision API, and the Claude in Chrome agent endpoint. Adds multi-store support to pantry items (where each was purchased) and advanced pantry analytics (spend per category, waste estimates).

Phase 3 does not ship the meal suggestion engine (Phase 4). Phase 3 IS gated by Claude in Chrome reaching general availability; if not GA by Phase 3 build kickoff, the Chrome agent endpoint ships behind a feature flag with the PDF + image paths fully live.

## 1. What it is

Three new pantry import paths plus multi-store + analytics.

User-facing affordances added in Phase 3:
1. PDF upload: drag-and-drop a PDF order confirmation; parsed and reviewed.
2. Image upload: take a photo of a product label, package barcode, or pantry shelf; parsed and reviewed.
3. Chrome agent: with the Claude in Chrome extension installed, click "Import to ViaConnect" while viewing a grocery service order page; agent posts to a signed ViaConnect endpoint.
4. Multi-store filter: filter pantry items by purchase store.
5. Spend analytics: per-category spend over time, waste estimates, savings projections.

## 2. Why this matters

Phase 1 covers manual + receipt. Phase 2 covers email forwarding. Phase 3 covers the residual:
- Users who get PDF receipts via email but their service is not in the 9 Phase 2 services (long tail).
- Users who scan physical packaging or shelf inventories.
- Users who prefer in-browser one-click imports over email forwarding (lower friction for occasional shoppers).

Multi-store + analytics are smaller adds that lift the existing pantry's usefulness without major user-facing affordances.

## 3. Data model

Two small data model additions. Append-only migrations.

### 3.1 `pantry_items` columns added

```sql
ALTER TABLE public.pantry_items
  ADD COLUMN IF NOT EXISTS store_name TEXT,
  ADD COLUMN IF NOT EXISTS price_paid NUMERIC,
  ADD COLUMN IF NOT EXISTS price_currency TEXT;

CREATE INDEX IF NOT EXISTS idx_pantry_items_user_store
  ON public.pantry_items(user_id, store_name) WHERE store_name IS NOT NULL;
```

`store_name` is denormalized (no separate stores table for v1); Phase 4 analytics rolls up by store_name canonicalized. `price_paid` + `price_currency` populated when source documents include pricing.

### 3.2 `pantry_chrome_agent_tokens`

Signed token registry for Chrome agent requests.

```sql
CREATE TABLE IF NOT EXISTS public.pantry_chrome_agent_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash      TEXT NOT NULL UNIQUE,
  token_prefix    TEXT NOT NULL,
  display_label   TEXT,

  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
  last_used_at    TIMESTAMPTZ,
  use_count       INTEGER NOT NULL DEFAULT 0,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_chrome_tokens_user
  ON public.pantry_chrome_agent_tokens(user_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_chrome_tokens_hash
  ON public.pantry_chrome_agent_tokens(token_hash) WHERE is_active = TRUE;

ALTER TABLE public.pantry_chrome_agent_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chrome_tokens_owner_select" ON public.pantry_chrome_agent_tokens;
CREATE POLICY "chrome_tokens_owner_select"
  ON public.pantry_chrome_agent_tokens FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "chrome_tokens_service_role_write" ON public.pantry_chrome_agent_tokens;
CREATE POLICY "chrome_tokens_service_role_write"
  ON public.pantry_chrome_agent_tokens FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "chrome_tokens_owner_revoke" ON public.pantry_chrome_agent_tokens;
CREATE POLICY "chrome_tokens_owner_revoke"
  ON public.pantry_chrome_agent_tokens FOR UPDATE
  USING (auth.uid() = user_id AND is_active = TRUE)
  WITH CHECK (auth.uid() = user_id);
```

User generates a token in Settings; the plaintext shows once at creation; the token_hash stores SHA-256. Token expires in 90 days unless rotated. Chrome agent posts include the token in an Authorization header.

## 4. PDF upload path

### 4.1 UX

In the manual entry modal, a third sub-path "Upload PDF":
- Drag-and-drop zone + tap-to-pick file picker.
- 10MB size limit.
- Spinner with "Parsing your receipt..." status.
- Review screen identical to receipt scan (Phase 1) and grocery email import (Phase 2).

### 4.2 Parser

Without new package.json deps, PDF parsing options:
- Anthropic Vision API on rendered PDF pages (most reliable; PDF as image)
- Browser's built-in PDF.js shipped via Capacitor's WebView (Capacitor 6 has PDF support)
- Convert PDF to text via Vision API receipt parser already in Phase 1 (treat each page as a receipt image)

Gordon recommendation pending Blueprint: convert PDF to per-page images client-side, call the existing Phase 1 receipt parser per page. Multi-page receipts are stitched into a single `pantry_pending_imports` row. The pdfjs-dist package is in the wider Node ecosystem but not in ViaConnect's package.json; verification at Blueprint pending; if it cannot be added without an exception, fallback is Anthropic Vision direct on PDF (Vision API accepts PDF input).

### 4.3 Route

POST `/api/pantry/upload/pdf` with multipart form upload. Authenticated. Returns `pantry_pending_imports.id` on success.

## 5. Image upload path

### 5.1 UX

Modal sub-path "Take or upload a photo":
- Camera capture (reuses Phase 1 WebCameraPreview)
- File picker
- 10MB size limit
- Anthropic Vision API parse + review screen

### 5.2 Parser

Reuses the Phase 1 receipt Vision parser. Image-specific Gordon system prompt addendum for cases like "shelf photo of 10 pantry items" (different from receipt parsing).

### 5.3 Route

POST `/api/pantry/upload/image` with multipart form upload. Returns `pantry_pending_imports.id`.

## 6. Chrome agent endpoint

### 6.1 Contract

External: Claude in Chrome extension provides a "Send to ViaConnect" action when the user is on a grocery service order page (Instacart order detail, Amazon order history, etc.). The agent extracts the order data via DOM scraping and posts to ViaConnect.

Endpoint: POST `/api/pantry/chrome-agent/import`

Authentication:
- `Authorization: Bearer <user-token>` header (user-generated in Settings > Pantry > Chrome agent)
- HMAC signature header (the Chrome agent signs the request body with a shared agent secret)
- Both must validate

Payload:
```json
{
  "service_slug": "instacart",
  "items": [
    { "raw_name": "...", "quantity": 2, "unit": "lb", "category_hint": "produce" }
  ],
  "store_name": "...",
  "purchase_date": "ISO date",
  "total_amount": "...",
  "currency": "USD"
}
```

Response: `{ pending_import_id: "uuid" }`.

Server-side: validates auth + creates `pantry_pending_imports` row with `import_kind='chrome_agent'`.

### 6.2 Hard external dependency

Claude in Chrome must be generally available (not beta) for this path to surface to users. If not GA at build time, the endpoint exists behind `CHROME_AGENT_ENDPOINT_ENABLED` flag (default off); the UI Setting for token generation is hidden.

### 6.3 Settings UI

Settings > Pantry > Chrome agent section:
- "Generate token" CTA + token display (one-time) + copy button
- List of active tokens with `display_label`, `last_used_at`, `use_count`
- Revoke action per token

## 7. Multi-store

### 7.1 Filter

Pantry tab filter row gains a "Store" dropdown that lists distinct `store_name` values from the user's items. Tap filters items to that store.

### 7.2 Analytics

In Settings > Pantry > Analytics (new subscreen):
- Spend per store per month (bar chart)
- Spend per category per month (pie chart)
- Waste estimate: count of items past expiration without consumption events
- Savings projection: count of `pantry_expiration_avoided` events × estimated avg price

Analytics are read-only; data is computed server-side from `pantry_items` + `pantry_consumption_log` aggregations.

## 8. Helix events

Phase 3 adds 2 Helix events.

| Event | Points | Cap | Trigger |
|---|---|---|---|
| `pantry_pdf_imported` | 4 | 5/day | A `pantry_pending_imports` row from PDF upload reviewed and saved |
| `pantry_chrome_agent_imported` | 4 | 5/day | A `pantry_pending_imports` row from Chrome agent reviewed and saved |

(Image upload is included under existing `pantry_item_added_manually` event since user is consciously initiating per-image.)

## 9. API surface

Phase 3 adds 5 routes.

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/pantry/upload/pdf` | Parse PDF receipt + create pending import |
| POST | `/api/pantry/upload/image` | Parse image (receipt/label/shelf) + create pending import |
| POST | `/api/pantry/chrome-agent/import` | Chrome agent webhook |
| POST | `/api/pantry/chrome-agent/tokens` | Generate new agent token |
| DELETE | `/api/pantry/chrome-agent/tokens/[id]` | Revoke token |

Plus a read endpoint for analytics:
- GET `/api/pantry/analytics/summary` returning spend/waste/savings rollups for the analytics subscreen.

## 10. Composition

### 10.1 With Phase 1

Reuses `pantry_items` (with new store_name + price_paid columns). Reuses receipt Vision parser. Reuses cascade lookup.

### 10.2 With Phase 2

Reuses `pantry_pending_imports` schema. Reuses per-service parser configs (PDF and Chrome agent share service slugs with email forwarding).

### 10.3 With 170c

Same posture: allergen surfacing once 170c ratifies.

### 10.4 With Phase 4

Multi-store data enables Phase 4 to suggest "use what's about to expire at <store_name>" affordances; analytics surface complements the Make-from-pantry card.

## 11. Hard rules reaffirmed

Per Phase 1 §10 + Phase 2 §10. Additionally:
- Chrome agent tokens are SHA-256 hashed at rest; plaintext shown once at creation.
- PDF + image uploads never persisted past parser invocation (same posture as receipt scan in Phase 1).
- Multi-store analytics consumer-only.

## 12. Phasing within supplement 3

| Slice | Engineer-weeks |
|---|---|
| 3.A PDF parser (Vision or pdfjs-dist if approved) | 3 |
| 3.B Image upload | 1 |
| 3.C Chrome agent endpoint + tokens + Settings UI | 2 |
| 3.D Multi-store + analytics | 2 |
| 3.E Audit + smoke | 1 |
| **Total** | **9 engineer-weeks** |

With 1 engineer: ~9 calendar weeks. With 2: ~6 weeks.

Optimistic ship target: Aug 2027 (Blueprint May 2027, build Jun-Jul, ship Aug). Chrome agent path may flag-off if Claude in Chrome not GA at ship.

## 13. Acceptance criteria

1. 2 schema changes applied (pantry_items columns + pantry_chrome_agent_tokens table).
2. PDF path: a 1-page Amazon Fresh confirmation PDF parses to 5+ items at parser_confidence_avg >= 0.80; review screen renders; save creates pantry items.
3. Image path: a clear photo of a packaging label returns at least 1 item; user can edit before save.
4. Chrome agent path (if GA): token generation works; agent webhook receives auth + creates pending import.
5. Multi-store filter functional; analytics screen renders charts.
6. 2 Helix events fire correctly.
7. PDF + image upload data never persisted past parser invocation; verified by storage audit.
8. Chrome agent token revoke immediately invalidates subsequent requests.
9. Practitioner test account: no pantry UI changes visible.
10. Hard rules satisfied.

## 14. Open questions for Gary (pre-Blueprint resolution)

| # | Question | Recommendation |
|---|---|---|
| Q1 | If pdfjs-dist cannot be added as a dep, fall back to Vision-only PDF parsing? | Yes; Anthropic Vision accepts PDF natively; treat as default |
| Q2 | Chrome agent: ship endpoint flag-on when GA reaches or flag-off until 30 days post-GA? | Flag-on at GA; monitor 30 days |
| Q3 | Multi-store data: should existing pantry items get a one-time backfill prompt asking "where did you buy this?" or leave blank? | Leave blank; surface only on items added in Phase 3+ |
| Q4 | Image upload: should the system distinguish "receipt photo" from "packaging label" from "shelf inventory" with different prompts? | Yes; client-side hint dropdown lets user pick before upload |
| Q5 | Analytics screen: per-month or per-week granularity? | Per-month with per-week toggle |
| Q6 | Chrome agent token expiry: 90 days vs. 1 year? | 90 days with one-tap renewal in Settings |
| Q7 | Waste estimate: should we surface a "savings projection" or is that too aspirational/manipulative? | Surface but frame as projection ("If you used everything before expiring, you'd save approximately $X this month"); Kelsey-reviewed copy |
| Q8 | If Claude in Chrome never reaches GA, do we ship Phase 3 with PDF + image only? | Yes; Phase 3 minus Chrome agent is still a meaningful supplement |

## 15. Filed-not-built reaffirmation

Filed 2026-06-01. NOT YET AUTHORIZED FOR BUILD. Blueprint kickoff target May 2027 contingent on Phase 2 SHIPPED + stabilized parser failure rate + Claude in Chrome GA status known.

## 16. Related

- `prompt-170p-phase-1-spec-2026-06-01.md` (Phase 1; hard prerequisite)
- `prompt-170p-supplement-2-2026-06-01.md` (Phase 2; hard prerequisite; provides parser infrastructure)
- `prompt-170p-supplement-4-2026-06-01.md` (Phase 4; multi-store data feeds suggestion engine)
- `project_prompt_170p_phase_split.md` (ratified phase split memo)
