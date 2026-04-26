# Prompt #138h — Supplement Upload Diagnostic & Fix (Extension of #138g)

**Project:** ViaConnect™ GeneX360™ Precision Wellness Platform
**Company:** FarmCeutica Wellness LLC
**Owner:** Gary Ferenczi, CEO & Founder
**Classification:** Conversion-stack sibling #5 (capstone) / Onboarding bug-fix implementation spec
**Parent prompts:** #138g (Supplement Upload Diagnostic & Fix, original fix prompt; this prompt extends rather than supersedes); #138 (Hero Rewrite, for `'marketing_copy'` surface and standing rules); #138c (Trust Band, visual non-disruption inheritance); #138d (Sarah Scenario, scope discipline)
**Related governance branch (non-parent):** #138b (Dependabot Triage)
**Conversion-stack siblings:** #138 Hero (shipped); #138c Trust Band (shipped); #138d Sarah Scenario (shipped); #138e Outcome Timeline (shipped); #138g Supplement Upload Diagnostic & Fix (written outside this session, retained); #138h (this prompt, extension)

**Originating analysis:**

- Executive product review (April 24, 2026), critique 5: "I did get stuck on inserting my supplements. It would not allow me to take a picture of my supplement. And, I was not sure if it actually received the information that I inputted."
- Deeper diagnostic findings (April 25, 2026): four critical defects + six secondary findings catalogued in §2 below.

**Status:** Active, authorizes Claude Code to implement §5–§13 as an extension of #138g. The two prompts coexist in the library; #138h's content layers on top of whatever #138g specified rather than replacing it.
**Date:** 2026-04-25
**Delivery Mode:** Claude Code, /effort max
**Local Path:** `C:\Users\garyf\ViaConnect2026\viaconnect-web`
**Supabase Project:** `nnhkcufyqjojdbvdrpky` (us-east-2)

---

## 0. Standing Platform Rules (Non-Negotiable)

Every standing rule from #119 applies, restated for continuity:

- Score name is "Bio Optimization", never "Vitality Score" or "Wellness Score".
- Bioavailability is exactly 10–27×.
- No Semaglutide. Retatrutide is injectable only, never stacked.
- Lucide React icons only, `strokeWidth={1.5}`. No emojis in any client-facing UI.
- `getDisplayName()` for all client-facing names.
- Helix Rewards: Consumer portal only.
- Desktop + Mobile simultaneously, responsive Tailwind from the first commit.
- NEVER touch `package.json`, Supabase email templates, or any previously-applied migration. Migrations are append-only.
- Brand constants: Navy `#1A2744`, Card `#1E3054`, Teal `#2DA5A0`, Orange `#B75E18`, Instrument Sans typography.
- ViaCura tagline: "Built For Your Biology."
- Per the Amendment to #119/#120 (April 23, 2026): No CedarGrowth Organics or Via Cura Ranch references.

---

## 1. Mission Statement

The April 24, 2026 executive review identified the supplement upload flow as the only friction point the reviewer encountered while otherwise praising ease of use. Prompt #138g shipped a first-pass fix. The April 25, 2026 deeper diagnostic surfaced four critical defects that escaped #138g's scope plus six secondary findings that compound the user-visible failure mode. This prompt addresses all ten findings as an extension of #138g.

The user-visible symptom, "It would not allow me to take a picture, and I wasn't sure if it actually received what I inputted," is produced by two distinct failure modes:

1. **Active failure on the photo path.** iPhone HEIC captures fail end-to-end because the client never normalizes them and the server forwards `image/heic` to Anthropic, which only accepts JPEG/PNG/GIF/WebP. The user sees an opaque "API 400" error.
2. **Silent ambiguity on the text path.** Even when typed input succeeds, the user is not visually confirmed that the data was received. Silent failures in onboarding are the single highest-cost UX defect because users abandon without a recoverable error signal.

Both of those are real and tractable. The four critical defects below are the load-bearing fixes; the six secondary findings are quality fixes that prevent regressions and restore the engine cascade that the photo path was supposed to trigger.

### 1.1 Relationship to #138g

#138g is retained, not superseded. This prompt extends it. Where #138g's fix specification and #138h's fix specification overlap, #138h is authoritative for the specific defects it names; everything else from #138g remains binding. The audit trail records two prompts addressing the supplement upload surface in sequence: #138g for the originally-identified scope, #138h for the deeper findings that emerged after #138g's diagnostic baseline was in place.

If a future Supplement Upload prompt is needed (e.g., #138i for further refinements), it extends both #138g and #138h with the same coexistence pattern.

---

## 2. Findings Catalog

The diagnostic surfaced ten findings. Critical defects produce the user-visible failure modes; secondary findings compound the failure or prevent its recurrence.

### 2.1 Critical Defects (Four)

#### 2.1.1 D1, HEIC Captures Fail End-to-End

**Symptom:** iPhone users tapping the camera capture button get an opaque "API 400" error with no remediation guidance.

**Mechanism:**
- `<input accept="image/*">` (or equivalent) accepts HEIC blobs from iOS Camera.
- Client never converts HEIC → JPEG/PNG before upload.
- Server forwards `media_type: 'image/heic'` directly to Anthropic's vision API.
- Anthropic rejects `image/heic` (supported formats are JPEG, PNG, GIF, WebP only) with a 400.
- Client surfaces "API 400" verbatim.

**Affected files (anchors per diagnostic findings):**
- `components/onboarding/SupplementPhotoUpload.tsx`, client capture, no conversion.
- The supplement-vision API route (likely `app/api/onboarding/supplement-photo/route.ts` or similar), server forwards without normalizing.

**Severity:** Critical. End-to-end break on the dominant mobile platform among target users.

#### 2.1.2 D2, No WebView Fallback (Camera Tap Is Silent No-Op in In-App Browsers)

**Symptom:** Users opening ViaConnect from Instagram, Facebook, LinkedIn, or TikTok in-app browsers tap the camera button and nothing happens. No error. No fallback. No file picker.

**Mechanism:**
- Zero User-Agent detection in supplement upload code.
- In-app WebViews have inconsistent `MediaDevices.getUserMedia` and `<input capture="environment">` support; some return undefined, some throw, some silently no-op.
- Client treats every device as a full-featured browser.

**Affected files:**
- `components/onboarding/SupplementPhotoUpload.tsx`, no UA detection, no capability detection.
- Any client utility module that should surface "use the regular browser" guidance.

**Severity:** Critical. Social-channel referrals are a known traffic source; failing silently in the channels that bring visitors through the door is unacceptable.

#### 2.1.3 D3, No AbortSignal.timeout on Client Fetch

**Symptom:** When Vercel's 60-second `maxDuration` cuts the server response, the client fetch awaits indefinitely. User sees a perpetual loading spinner.

**Mechanism:**
- `SupplementPhotoUpload.tsx:63` calls `fetch(url, { method, body, headers })` with no `signal` parameter.
- No client-side timeout enforcement.
- Vercel-side cut produces no client-visible error; the connection hangs from the client's perspective.

**Affected files:**
- `components/onboarding/SupplementPhotoUpload.tsx:63` (line anchor per diagnostic).

**Severity:** Critical. The user reaches a state with no recovery path; they cannot retry, cannot dismiss, cannot understand what happened. This is one of the silent-failure modes the executive reviewer flagged.

#### 2.1.4 D4, Interaction Engine Cascade Dead from Photo Path

**Symptom:** Photo-identified supplements never trigger interaction checks, protocol safety gates, or Bio Optimization recalculation. Users on Phase 6 of the CAQ who add supplements via photo do not get the engine outputs they would get if they typed the same supplements.

**Mechanism:**
- `onProductAdded` callback at `app/(onboarding)/onboarding/[step]/page.tsx:1536` mutates local React state only.
- The companion typed-medication path at `:1449` correctly calls `emitDataEvent('supplement_added', ...)`.
- The photo path was never wired to emit the same event.
- Cascade events `interaction_check`, `protocol_safety_gate`, `bio_optimization_recalc` never fire for photo-identified supplements.

**Affected files:**
- `app/(onboarding)/onboarding/[step]/page.tsx:1536`, missing `emitDataEvent` call.
- The interaction engine entry-point module that consumes `supplement_added` events.

**Severity:** Critical. This is a silent data-integrity defect; the protocol the user receives is computed from an incomplete supplement list. Users on adherent Tier 2 or Tier 3 protocols may receive recommendations that contain known interactions with their actual stack because the photo-added supplements were invisible to the engine. From a Marshall standpoint, this is also a `MARSHALL.SAFETY.INTERACTION_GATE_BYPASS` concern at the architecture layer, even though no public claim is broken.

### 2.2 Secondary Findings (Six)

#### 2.2.1 S1, Active Component / Orphan Coexistence

`components/onboarding/SupplementPhotoUpload.tsx` (active) and `components/onboarding/SupplementPhotoCapture.tsx` (orphan) coexist. The orphan has a 10MB upload guard the active component is missing.

**Risk:** Future engineer modifies the wrong file. Active component accepts arbitrarily large uploads, hitting Vercel body size limits with a different error class than D3.

#### 2.2.2 S2, Vision Route Skips product_lookup_cache

The supplement-vision API route never queries the existing `product_lookup_cache` table before calling Anthropic. Every photo pays full Anthropic vision-API cost regardless of whether an identical product was identified seconds earlier for a different user.

**Risk:** Cost. Not a user-visible defect, but it produces a steady rate of unnecessary Anthropic billing that grows linearly with onboarding volume. The diagnostic findings flagged this as worth fixing within the same PR because the cache-aware code path is also where retry-loop hardening lives.

#### 2.2.3 S3, product_lookup_cache Upsert Silently Swallows Errors

At `app/api/product-lookup/route.ts:132`, the `product_lookup_cache` upsert wraps in a try/catch that silently swallows the error chain. If the cache upsert fails (Supabase rate limit, schema drift, RLS policy mismatch), the request still appears to succeed but the cache is inconsistent.

**Risk:** Silent cache inconsistency that compounds over time. Compounded with S2, it means even after the cache-aware path is wired up, cache entries might not be persisting, and nothing surfaces this.

#### 2.2.4 S4, Client Ignores HTTP Status Code

The client at `SupplementPhotoUpload.tsx` only inspects `response.body.success`. If Vercel returns an HTML 502 page (which happens occasionally during deploys or upstream-provider hiccups), the JSON parser throws into the outer catch and the error message bears no resemblance to the underlying cause.

**Risk:** Diagnostically opaque failures. Users see "Something went wrong" with no actionable signal; engineers chasing a bug report get a stack trace that points at `JSON.parse` rather than the real upstream problem.

#### 2.2.5 S5, HTTPS Enforcement Tied to Old Domain

`capacitor.config.ts:22` enforces HTTPS via `viaconnectapp.com` (the legacy domain). The current canonical domain is `via-connect2026.vercel.app`. There is also no PWA-standalone detection anywhere.

**Risk:** Capacitor mobile shell may fail to recognize the current production deployment as same-origin under HTTPS enforcement, depending on how the configuration is interpreted at runtime. PWA-standalone detection would let the supplement-upload UX adapt for users who installed ViaConnect to their home screen.

#### 2.2.6 S6, Telemetry Signals Without Emission Sites

5 of 13 telemetry signals named in the supplement upload flow have no emission site in the code. They are referenced in dashboards and documentation but never actually emitted.

**Risk:** Dashboards lie. Decisions get made off counts that are structurally always zero or always missing the events they claim to count.

---

## 3. Visual Non-Disruption, Inherited

The visual non-disruption guarantee from #138 §3 applies. This prompt does NOT modify any visual design tokens, brand colors, typography, imagery, component shapes, spacing, layout grids, or section ordering. Specifically:

- Photo upload UI shapes, sizes, button placements stay as currently rendered.
- New UI states added by §6 (uploading / processing / matched / unmatched / error) use existing typography, existing colors, existing spacing tokens.
- No new component shapes, no new icons beyond Lucide at `strokeWidth={1.5}`, no emojis.
- Mobile and desktop parity preserved.

What this prompt DOES modify:

- The text labels and visual states the existing UI surfaces.
- The error-message strings the existing UI surfaces.
- New child elements added strictly to support new feedback states (e.g., a small `<UploadStateBadge />` element that uses existing tokens).

---

## 4. Architecture Decisions

### 4.1 HEIC Conversion: Both Layers (Client-First, Server-Fallback)

Per Gary's decision: client converts when capable, server is fallback.

**Client-side conversion path:**
- On file selection or capture, client checks the file's MIME type (or, because Safari sometimes mis-labels, the file extension).
- If the file is HEIC and the browser supports HEIC decoding (Safari on iOS 17+ has native support; some Chromium builds have it via `image/heic` decoder availability), client uses canvas-based conversion to produce a JPEG blob and uploads the JPEG.
- If the browser does not support HEIC decoding natively, client uploads the original HEIC and lets the server handle conversion.
- If `heic2any` (or any HEIC-specific decoder) is already present in `node_modules`, the client may use it. No new dependencies are added by this prompt. If no decoder is present, native canvas decoding is attempted; failure falls through gracefully to server-side conversion.

**Server-side conversion path (always-on fallback):**
- Server receives upload. If `media_type` is `image/heic` (or the byte-magic indicates HEIC regardless of declared MIME), server uses `sharp` (already at `package.json:59` per diagnostic) to convert to JPEG before forwarding to Anthropic.
- Server caches the converted JPEG bytes in memory for the duration of the request; not persisted.
- Server forwards JPEG to Anthropic with `media_type: 'image/jpeg'`.
- Server logs the conversion as a telemetry event so we can measure what fraction of uploads required server-side conversion.

**Why both layers:** Client conversion reduces upload payload (HEIC is typically larger than JPEG for photos), reduces bandwidth costs, and reduces server-side compute pressure. Server conversion is the floor; it works regardless of client capability or WebView constraints, so HEIC uploads never reach Anthropic untouched. This is the safer architecture than client-only or server-only.

### 4.2 WebView Detection and Fallback UX

Inline UA detection (no new library):

```ts
function isInAppWebView(ua: string): boolean {
  // Major in-app browsers per known UA patterns as of 2026-04-25
  return /Instagram|FBAN|FBAV|Twitter|LinkedInApp|TikTok|Snapchat|MicroMessenger/i.test(ua);
}
```

When `isInAppWebView()` returns true, the supplement upload component renders instead of the normal photo capture path:

- A clear in-element message: "For the best experience adding supplements with your camera, please open ViaConnect in your phone's regular browser."
- A tappable "Copy link" button that copies the current URL to the clipboard.
- A fallback "Type your supplement instead" entry path, which routes to the existing typed-supplement UI.

The fallback path means an in-app WebView user is never blocked; they always have the typed path. The primary CTA is to switch browsers, but if they choose to type, that flow works.

### 4.3 Client Fetch Timeout

The fix is native, no library:

```ts
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 55_000);
try {
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
    signal: AbortSignal.timeout(55_000),  // belt + suspenders
  });
  // ...
} catch (err) {
  if (err.name === 'AbortError' || err.name === 'TimeoutError') {
    // surface "upload took too long" with retry CTA
  }
  // ...
} finally {
  clearTimeout(timeoutId);
}
```

55 seconds is deliberately less than Vercel's 60s `maxDuration` so the client cuts the connection before Vercel does. This means the client always knows about the timeout; it never sees the Vercel HTML 502 page (which addresses S4 partially).

### 4.4 Interaction Engine Cascade Restoration

The fix at `onboarding/[step]/page.tsx:1536` is to mirror the typed-medication path at `:1449`:

```ts
const onProductAdded = async (product) => {
  setLocalSupplements(prev => [...prev, product]);
  await emitDataEvent('supplement_added', {
    source: 'photo_identified',
    product_id: product.id,
    product_name: product.canonical_name,
    confidence: product.identification_confidence,
    user_id: currentUser.id,
    phase: 'caq_phase_6',
  });
  // ... existing local-state updates
};
```

The `source: 'photo_identified'` field is new; it lets the interaction engine and protocol safety gate distinguish photo-identified additions from typed additions if downstream behavior should differ (typically it should not differ, but the data is now available if it ever should).

### 4.5 Cache-Aware Vision Path

Before calling Anthropic, the supplement-vision API route:

- Computes a content hash of the (server-converted) JPEG bytes.
- Queries `product_lookup_cache` for a cache hit on that hash.
- If hit and the cached entry is < 24 hours old (configurable per #138g if it set a different value): returns the cached identification without calling Anthropic.
- If miss or stale: calls Anthropic, then upserts the result with the content hash + timestamp.

The 24-hour TTL is conservative; supplement labels do not change overnight, but it limits exposure to upstream changes (e.g., if Anthropic refines its identification on a re-call).

The cache-key is content-hash-based rather than user-based so that multiple users uploading the same product hit the same cache entry. This is the cost optimization S2 was pointing at.

### 4.6 Cache Upsert Error Surfacing

The fix at `app/api/product-lookup/route.ts:132` removes the silent error swallow. The new pattern:

```ts
const upsertResult = await supabase
  .from('product_lookup_cache')
  .upsert(payload);
if (upsertResult.error) {
  // log to telemetry as 'cache_upsert_failed' with full error chain
  // do NOT throw, request should still succeed
  // do NOT silently swallow, the failure must reach observability
  emitTelemetryEvent('cache_upsert_failed', {
    error_code: upsertResult.error.code,
    error_message: upsertResult.error.message,
    error_details: upsertResult.error.details,
    error_hint: upsertResult.error.hint,
  });
}
```

The behavior change: cache failures now produce telemetry. The request still succeeds (cache misses are handled at read time by S5's hash-lookup logic). But silent loss of cache writes is no longer possible.

### 4.7 HTTP Status Code Handling

The client fetch handler now:

- Checks `response.ok` before parsing JSON.
- If not ok, attempts JSON parse but catches the parse failure and falls through to a status-code-specific error message.
- Surfaces a user-meaningful error string per status range:
  - 400-class: "Something about your photo didn't work, please try a different one or type the supplement name instead."
  - 500-class: "Our servers are having a moment, please try again in a minute."
  - Network/timeout: "Your upload took too long, please try again on a stronger connection."

Each error variant has a "Type instead" fallback CTA so the user always has a path forward.

### 4.8 HTTPS Domain Configuration and PWA Detection

Two small surgical fixes:

- `capacitor.config.ts:22`, update HTTPS enforcement to reference the canonical production domain (`via-connect2026.vercel.app`) instead of the legacy `viaconnectapp.com`. This is a configuration-only change; no code logic changes.
- Add a PWA-standalone detection helper:

```ts
function isPwaStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true;
}
```

When `isPwaStandalone()` is true, the supplement upload UX may opt into platform-standard camera UI patterns (the visible difference is small but real for installed-PWA users). For the MVP fix, the function is defined and exported but not yet branched on; that's reserved for a future polish prompt.

### 4.9 Telemetry Emission Sites

Five missing emission sites identified per S6. Each gets implemented in this prompt:

| Signal Name (representative) | New Emission Site |
|---|---|
| `supplement_photo_capture_attempted` | On camera button tap, before capture begins |
| `supplement_photo_heic_conversion_client` | On successful client-side HEIC conversion |
| `supplement_photo_heic_conversion_server` | On successful server-side HEIC conversion |
| `supplement_photo_cache_hit` | On `product_lookup_cache` hit before Anthropic call |
| `supplement_photo_in_app_webview_detected` | On UA detection identifying an in-app browser |

The exact signal names and table destinations should match what #138g established if it specified a telemetry surface; if it did not, they go to the standard `client_telemetry_events` table.

---

## 5. Orphan Component Audit and Disposition

### 5.1 Audit-First Approach

`SupplementPhotoCapture.tsx` (orphan) is audited before deletion. The audit looks for:

- Guards present in the orphan and absent in the active component (10MB size guard is one; there may be others, orientation correction, dimension caps, retry logic, etc.).
- Imports the orphan uses that the active component does not, these are signals that the orphan was the more recent or more thorough implementation.
- Comments or TODO markers indicating intent that hasn't reached the active component.

The audit produces a concise comparison table in the PR description. Anything in the orphan that should exist in the active component is ported in this PR. The orphan deletion is a separate commit at the end of the PR so it is independently reverseable.

### 5.2 Specific Port: 10MB Guard

The 10MB upload guard from the orphan is ported to the active component. The implementation:

```ts
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
if (file.size > MAX_UPLOAD_BYTES) {
  // surface "image too large" with guidance to retake at lower quality
  return;
}
```

The guard runs after client-side HEIC conversion (because conversion typically reduces file size) but before the upload fetch. Files that exceed the cap after conversion are rejected client-side with a helpful error, never reaching the server.

### 5.3 Orphan Deletion Commit

After the audit and any ports, the orphan file is deleted in its own commit titled `chore(onboarding): remove orphaned SupplementPhotoCapture.tsx (audit complete in PR <number>)`. This commit can be reverted independently if the audit missed something subtle.

---

## 6. UX Feedback States

The user-visible experience requirement from the executive review: "I was not sure if it actually received the information that I inputted." The fix is explicit visual feedback at every stage of the upload lifecycle.

### 6.1 The Five States

| State | Trigger | Visual | Duration |
|---|---|---|---|
| `idle` | Default; no upload in progress | Standard upload UI | N/A |
| `uploading` | After file selected, before server response | Spinner + "Uploading your photo…" | Until server responds or timeout |
| `processing` | Server received, calling Anthropic / cache | Spinner + "Identifying your supplement…" | Until identification result |
| `matched` | Anthropic returned a confident identification | Checkmark (Lucide `check-circle-2`) + matched product card preview | 4 seconds, then auto-confirms or asks user to confirm |
| `unmatched` | Anthropic returned low confidence or no match | Lucide `help-circle` + "We couldn't identify this, type the name instead?" | Persistent until user acts |
| `error` | Any error path | Lucide `alert-circle` + status-code-specific message + "Type instead" CTA | Persistent until user acts |

Each state has a distinct visual element using only existing design tokens, no new colors, no new typography. Lucide icons at `strokeWidth={1.5}` consistent with standing rules. Zero emojis.

### 6.2 State Component

A new component `<SupplementUploadStateBadge state={…} message={…} />` wraps the visual treatment. The component lives at `components/onboarding/SupplementUploadStateBadge.tsx`. It accepts a state enum and renders the corresponding icon + message + (where relevant) action buttons.

The state machine itself lives in the parent `SupplementPhotoUpload.tsx` component as a `useReducer` so transitions are explicit and auditable, no scattered `setState` calls flipping flags.

### 6.3 Confirmation Required Before Cascade Fires

When state reaches `matched`, the user has a brief 4-second window to either confirm the identification or correct it. The `emitDataEvent('supplement_added', ...)` from §4.4 fires only after confirmation, never on initial match. This means the interaction engine cascade only runs against supplements the user has actually confirmed, which avoids producing engine output that the user has to mentally undo.

### 6.4 Telemetry on State Transitions

Every state transition emits a telemetry event. This means we can measure not just "uploads succeeded" but "uploads got stuck at processing for >X seconds," "uploads returned `unmatched` and user typed instead," etc. This is the kind of observability that will catch the next regression before users notice it.

---

## 7. Marshall Pre-Check

This prompt is implementation work, not marketing copy. The new error message strings introduced by §4.7 and §6.1 are short user-facing strings that must pass Marshall pre-check on the `'marketing_copy'` surface (per #138 §7.1) because they are visitor-facing.

### 7.1 Strings That Pass Pre-Check

All strings in §4.7 and §6.1 use:

- No outcome guarantees (`MARSHALL.MARKETING.OUTCOME_GUARANTEE` P0 from #138 §7.3, not violated; these strings describe error states, not outcomes).
- No medical claims.
- No first-person plural except in the genuinely-team voice ("our servers are having a moment", acceptable; not an outcome claim).
- No superlatives.

### 7.2 No New Marshall Rules

This prompt registers no new Marshall rules. The five new rules introduced across #138 / #138c / #138d / #138e cover the surface this prompt's strings touch. The existing pre-check pipeline catches anything regressive.

---

## 8. Database Schema, Migration

This prompt does NOT introduce new Supabase tables. The following existing tables/surfaces are the relevant ones:

- `product_lookup_cache` (existing), used per §4.5; no schema change.
- `client_telemetry_events` (existing or to be reused per #138g), receives the new emission sites from §4.9.
- `data_events` (existing, for `emitDataEvent`), receives the restored `supplement_added` events from §4.4.

If `product_lookup_cache` does not currently have a `content_hash` column (it might be keyed differently per #138g), §4.5 requires adding one in an append-only migration:

```sql
-- Migration: 20260425_supplement_upload_cache_content_hash.sql (only if column missing)
alter table product_lookup_cache
  add column if not exists content_hash text;

create index if not exists idx_product_lookup_cache_content_hash
  on product_lookup_cache(content_hash)
  where content_hash is not null;
```

The migration is conditional (`add column if not exists`) so it is safe to run regardless of whether #138g already added the column. If #138g did add it under a different name, the column should be aliased rather than duplicated, Claude Code's Gate 1 includes verifying the current schema before generating the migration.

---

## 9. OBRA Four Gates

### Gate 1, Observe & Brainstorm

- Verify the current state of the supplement upload code matches the diagnostic findings (file paths, line numbers, observed defects). The diagnostic was as of 2026-04-25; minor drift is possible.
- Check whether `heic2any` or any other HEIC-specific decoder is currently installed in `node_modules` (informational; affects §4.1 client fallback path).
- Verify `sharp` is functional (not just installed), a quick smoke test in a scratch route.
- Confirm `product_lookup_cache` schema and whether `content_hash` already exists.
- Identify the exact telemetry surface (table names, event-emission helpers) #138g established, so #138h's emission sites land in the same place.
- Audit `SupplementPhotoCapture.tsx` (orphan) for guards, imports, comments, TODOs that should port to the active component.
- Verify Vercel `maxDuration` setting on the supplement vision route (§4.3 assumes 60s).

### Gate 2, Blueprint / Micro-Task Decomposition

- Conditional migration `20260425_supplement_upload_cache_content_hash.sql` (per §8).
- Server-side HEIC conversion utility (`lib/onboarding/imageConversion.ts`) using `sharp`.
- Client-side HEIC conversion utility (`lib/onboarding/clientImageConversion.ts`) using native canvas + `heic2any` if available.
- Client UA detection utility (`lib/onboarding/userAgentDetection.ts`) per §4.2.
- PWA-standalone detection helper (`lib/onboarding/pwaDetection.ts`) per §4.8.
- New component `components/onboarding/SupplementUploadStateBadge.tsx` per §6.2.
- Refactor of `components/onboarding/SupplementPhotoUpload.tsx`:
  - Add `useReducer` for state machine.
  - Add UA detection branching for in-app WebViews.
  - Add `AbortSignal.timeout` per §4.3.
  - Add 10MB guard per §5.2 (after client conversion).
  - Add status-code branching per §4.7.
  - Wire state machine to render `<SupplementUploadStateBadge />`.
- Refactor of supplement-vision API route:
  - Add server-side HEIC normalization on entry per §4.1.
  - Add cache-aware path per §4.5.
  - Surface telemetry events per §4.9.
- Fix at `app/api/product-lookup/route.ts:132` to surface cache upsert errors per §4.6.
- Fix at `app/(onboarding)/onboarding/[step]/page.tsx:1536` to emit `supplement_added` event per §4.4.
- Fix at `capacitor.config.ts:22` to update HTTPS domain enforcement per §4.8.
- Audit and (if necessary) port from `SupplementPhotoCapture.tsx` orphan per §5.1.
- Delete orphan `SupplementPhotoCapture.tsx` in separate commit per §5.3.
- Marshall pre-check on every new error string per §7.
- Regression test suite per §10.
- Telemetry dashboard sanity check (the 5 missing signals now emit; existing dashboards should populate).
- Marshall self-scan of the PR.

### Gate 3, Review

- All four critical defects (D1–D4) have a corresponding fix in the diff.
- All six secondary findings (S1–S6) have a corresponding fix in the diff.
- HEIC conversion works end-to-end with a real iPhone HEIC file as the input.
- In-app WebView fallback UX renders correctly when accessed from a simulated Instagram WebView UA.
- Client `AbortSignal.timeout` cuts at 55s, surfaces a recoverable error.
- Photo-identified supplement add triggers `interaction_check`, `protocol_safety_gate`, `bio_optimization_recalc` cascade (verified by integration test with a known-interactive pair).
- `product_lookup_cache` is consulted before every Anthropic call; cache hits skip Anthropic.
- Cache upsert failures surface as telemetry events, not silent swallows.
- HTTPS domain config matches the canonical production domain.
- 10MB upload guard ported from orphan; orphan deleted in a separate commit.
- All new visitor-facing strings pass Marshall `'marketing_copy'` pre-check.
- All new UI uses Lucide at `strokeWidth={1.5}`, zero emojis, `getDisplayName()` where relevant.
- Desktop + mobile parity verified at 360px / 414px / 768px / 1024px viewports.
- No reference to "Vitality Score" / "5–27×" / "Semaglutide" except in guardrail checks.
- No reference to CedarGrowth / Via Cura / cannabis / METRC / NY OCM / psychedelic therapy.
- `package.json` untouched, no new dependencies.
- Supabase email templates and previously-applied migrations untouched.
- Marshall `marshall-lint` self-scan: zero P0 findings.

### Gate 4, Audit / TDD

- ≥90% coverage on new utility modules (`imageConversion`, `clientImageConversion`, `userAgentDetection`, `pwaDetection`).
- HEIC conversion test corpus: real HEIC fixtures convert to valid JPEG; Anthropic call accepts converted JPEG.
- WebView UA detection test: 8 known WebView UAs flagged; 12 known regular-browser UAs not flagged.
- Timeout test: simulate Vercel cut at 60s; client times out at 55s; recoverable error surfaces.
- Cascade test: photo-identified supplement add triggers all three engine events; engine produces same output as typed-medication path.
- Cache hit test: identical content hash hits cache; Anthropic not called.
- Cache miss + upsert success test: Anthropic called, cache populated, telemetry emitted.
- Cache miss + upsert failure test: Anthropic called, cache write fails, telemetry event emitted, request still succeeds.
- Status code test: 502 HTML response surfaces "servers having a moment" with type-instead CTA.
- 10MB guard test: 11MB file rejected client-side, never reaches server.
- State machine test: every transition is auditable; no setState side-paths.

---

## 10. Regression Test Coverage Map

Each finding maps to ≥1 regression test. The map is the audit trail for "this finding is provably fixed."

| Finding | Test File | Test Name |
|---|---|---|
| D1 (HEIC end-to-end) | `tests/e2e/supplement_upload_heic_conversion.test.ts` | iPhone HEIC capture converts and identifies successfully |
| D2 (WebView fallback) | `tests/e2e/supplement_upload_webview_fallback.test.ts` | Instagram WebView shows browser-redirect UX with type-instead fallback |
| D3 (timeout) | `tests/e2e/supplement_upload_client_timeout.test.ts` | Client cuts at 55s with recoverable error |
| D4 (cascade) | `tests/e2e/supplement_photo_engine_cascade.test.ts` | Photo-identified supplement triggers interaction check + safety gate + bio recalc |
| S1 (orphan) | N/A, verified by absence (file no longer exists post-orphan-deletion commit) | — |
| S2 (cache) | `tests/integration/supplement_vision_cache_hit.test.ts` | Identical content hash hits cache; Anthropic not called |
| S3 (cache upsert error) | `tests/integration/product_lookup_cache_error_surface.test.ts` | Cache upsert failure emits telemetry event |
| S4 (status code) | `tests/integration/supplement_upload_status_code.test.ts` | 502 HTML response surfaces meaningful error, not JSON parse failure |
| S5 (HTTPS / PWA) | `tests/unit/capacitor_config.test.ts` and `tests/unit/pwa_detection.test.ts` | Canonical domain enforced / PWA standalone detected when matchMedia matches |
| S6 (telemetry) | `tests/integration/supplement_telemetry_emissions.test.ts` | All 5 previously-missing signals emit at the specified sites |

The map is reproduced verbatim in the PR description for ease of audit.

---

## 11. File Manifest

**New files (create):**
```
lib/onboarding/imageConversion.ts                  (server-side HEIC via sharp)
lib/onboarding/clientImageConversion.ts            (client-side HEIC via canvas + optional heic2any)
lib/onboarding/userAgentDetection.ts               (in-app WebView detection)
lib/onboarding/pwaDetection.ts                     (PWA standalone detection helper)

components/onboarding/SupplementUploadStateBadge.tsx

tests/e2e/supplement_upload_heic_conversion.test.ts
tests/e2e/supplement_upload_webview_fallback.test.ts
tests/e2e/supplement_upload_client_timeout.test.ts
tests/e2e/supplement_photo_engine_cascade.test.ts
tests/integration/supplement_vision_cache_hit.test.ts
tests/integration/product_lookup_cache_error_surface.test.ts
tests/integration/supplement_upload_status_code.test.ts
tests/integration/supplement_telemetry_emissions.test.ts
tests/unit/capacitor_config.test.ts
tests/unit/pwa_detection.test.ts
tests/unit/user_agent_detection.test.ts
tests/unit/image_conversion.test.ts

supabase/migrations/20260425_supplement_upload_cache_content_hash.sql   (CONDITIONAL, only if column missing)
```

**Modified files (surgical edits):**
```
components/onboarding/SupplementPhotoUpload.tsx    (state machine, UA detection, timeout, 10MB guard, status-code handling)
app/api/onboarding/supplement-photo/route.ts       (server HEIC normalization, cache-aware path, telemetry)  [path may differ; Gate 1 confirms]
app/api/product-lookup/route.ts                    (line 132, surface cache upsert errors)
app/(onboarding)/onboarding/[step]/page.tsx        (line 1536, emitDataEvent on photo-identified add)
capacitor.config.ts                                (line 22, canonical domain)
```

**Deleted files (separate commit after audit):**
```
components/onboarding/SupplementPhotoCapture.tsx   (orphan, only after audit-and-port complete)
```

**Explicitly NOT modified (DO NOT TOUCH):**
- `package.json`, no new dependencies; works with `sharp` and (optionally) `heic2any` if already installed.
- Supabase email templates.
- Any previously-applied migration.
- Any visual design token, brand color, typography, imagery.
- The hero, trust band, Sarah scenario, or outcome timeline components, those are #138 / #138c / #138d / #138e territory.

---

## 12. Acceptance Criteria

- All four critical defects (D1–D4) fixed and covered by regression tests.
- All six secondary findings (S1–S6) fixed and covered by regression tests.
- HEIC conversion works on a real iPhone HEIC fixture; Anthropic accepts the converted JPEG.
- In-app WebView UA detection covers Instagram, Facebook, Twitter/X, LinkedIn, TikTok, Snapchat, WeChat, verified by test.
- Client fetch times out at 55s with recoverable error, before Vercel's 60s cut.
- Photo-identified supplements emit `supplement_added` and trigger interaction engine cascade.
- `product_lookup_cache` consulted before every Anthropic call; cache hit skips Anthropic.
- Cache upsert failures emit telemetry; no silent swallow.
- Client honors HTTP status code; 502 HTML response surfaces meaningful error.
- HTTPS enforcement updated to canonical production domain.
- PWA standalone detection helper exists and is unit-tested (branch on it deferred).
- All 5 previously-missing telemetry signals now emit.
- `SupplementPhotoCapture.tsx` audit complete; 10MB guard ported; orphan deleted in separate commit.
- Five UX feedback states (idle, uploading, processing, matched, unmatched, error) render correctly.
- State machine transitions are reducer-based; no scattered setState flag flipping.
- All visitor-facing strings pass Marshall `'marketing_copy'` pre-check.
- All new UI uses Lucide at `strokeWidth={1.5}`, zero emojis, `getDisplayName()`.
- Desktop + mobile parity at 360px / 414px / 768px / 1024px viewports.
- `package.json` unchanged.
- Email templates, applied migrations, design tokens untouched.
- `marshall-lint` self-scan produces zero P0 findings.
- OBRA Gate 1–4 summary in PR description.
- Regression test coverage map (§10) reproduced in PR description.

---

## 13. Rollout Plan

### Phase A, Audit and Foundation (Days 1–2)
- Gate 1 audit complete. Schema confirmed. Telemetry surface confirmed. Orphan audited.
- Conditional migration applied (only if `content_hash` missing).
- Utility modules (`imageConversion`, `clientImageConversion`, `userAgentDetection`, `pwaDetection`) created and unit-tested.
- `<SupplementUploadStateBadge />` component created with all 6 states rendering.

### Phase B, Server-Side Fixes (Days 3–4)
- Server-side HEIC normalization in supplement-vision route.
- Cache-aware path in supplement-vision route.
- Cache upsert error surfacing at `product-lookup/route.ts:132`.
- Telemetry emissions for the server-side signals.

### Phase C, Client-Side Fixes (Days 5–6)
- `SupplementPhotoUpload.tsx` refactored: state machine, UA detection, timeout, 10MB guard, status-code handling.
- Client-side HEIC conversion path.
- WebView fallback UX.
- Engine cascade restoration at `onboarding/[step]/page.tsx:1536`.
- Telemetry emissions for client-side signals.

### Phase D, Configuration and Cleanup (Day 7)
- `capacitor.config.ts:22` HTTPS domain update.
- Orphan audit ports merged into active component.
- Orphan file deleted in separate commit.

### Phase E, Regression Suite Run (Day 8)
- Full regression test pass.
- Visual regression test pass.
- Marshall self-scan.
- PR ready for OBRA Gate 3 review.

### Kill-Switches

- `SUPPLEMENT_PHOTO_PATH_ENABLED`: environment flag, default true. If set to false, the photo-capture button is hidden and supplement entry falls through to typed-only. This is the surgical rollback if a critical regression slips past tests. Setting to false requires Steve + Gary dual approval; audit-logged.
- `SUPPLEMENT_PHOTO_CACHE_ENABLED`: environment flag, default true. If set to false, every photo bypasses cache and calls Anthropic directly. This is the surgical rollback if cache-layer regressions cause incorrect identifications.

---

## 14. Conversion Stack Sibling Coordination

Fifth and final conversion-stack sibling. Different format from #138 / #138c / #138d / #138e, those four were copy + IA + Marshall integration prompts; #138h is implementation/bug-fix work.

The conversion stack is now structurally complete:

- #138 Hero, what is this?
- #138c Trust Band, can I trust this?
- #138d Sarah Scenario, what does this produce?
- #138e Outcome Timeline, what changes for me?
- #138g + #138h Supplement Upload, can I actually use it?

Each surface answers one question. The fifth question, can I actually use it?, is the one the executive reviewer most concretely surfaced, and it's the one that turns into abandonment fastest if the answer is "no."

---

## 15. Document Control

| Field | Value |
|---|---|
| Prompt number | 138h |
| Title | Supplement Upload Diagnostic & Fix (Extension of #138g) |
| Conversion-stack position | Fifth of five (#138, #138c, #138d, #138e, #138g+#138h) |
| Format | Implementation / bug-fix spec, different from copy+IA siblings |
| Relationship to #138g | Extends; both prompts retained; #138h authoritative for the 10 findings it names |
| Originating analysis | Executive review (April 24, 2026) critique 5 + deeper diagnostic (April 25, 2026) |
| Author | Claude (under Gary Ferenczi's direction) |
| Date | 2026-04-25 |
| Delivery formats | .md, .docx |
| Destination | ViaConnect Prompt Library (Google Drive) |
| HEIC strategy | Both layers (client when capable, server fallback), Gary's decision |
| Orphan handling | Audit-first then delete in separate commit, author's call per Gary's "your call" |
| `package.json` policy | No new dependencies, author's call per Gary's "whichever is cleaner" |
| Critical defects | 4 (D1 HEIC, D2 WebView, D3 timeout, D4 cascade) |
| Secondary findings | 6 (S1 orphan, S2 cache miss, S3 cache upsert silence, S4 status code, S5 HTTPS, S6 telemetry) |
| New files | 5 utility/component + 12 test files + 1 conditional migration |
| Modified files | 5 (active component, vision route, product-lookup route, onboarding page, capacitor config) |
| Deleted files | 1 (orphan, separate commit) |
| Visual non-disruption | §3 inherits #138 §3 |
| Successor / sibling prompts | Future Supplement Upload prompts (e.g., #138i if needed) extend both #138g and #138h |

---

## 16. Acknowledgment

By memorializing this prompt in the Prompt Library, Gary establishes:

- The 10 findings catalogued in §2 as the binding scope of #138h. Four critical defects (D1 HEIC, D2 WebView, D3 timeout, D4 cascade) are load-bearing fixes; six secondary findings (S1 orphan, S2 cache miss, S3 cache upsert silence, S4 status code, S5 HTTPS, S6 telemetry) are quality fixes that compose.
- The relationship to #138g as extension, not supersession. Both prompts coexist in the audit trail. Where they overlap, #138h is authoritative for the specific defects it names; everything else from #138g remains binding.
- The HEIC conversion strategy as both layers, client converts when capable, server is always-on fallback, per Gary's April 25, 2026 decision.
- The `package.json` discipline preserved: zero new dependencies. `sharp` (already installed) handles server conversion. Native canvas + optional already-installed `heic2any` handle client conversion. UA detection is inline regex. Timeout is native `AbortSignal.timeout`.
- The orphan component (`SupplementPhotoCapture.tsx`) is audited before deletion; the 10MB guard is ported to the active component; the orphan is deleted in a separate, independently-revertible commit.
- The five UX feedback states (uploading / processing / matched / unmatched / error) as the architectural answer to the executive reviewer's "I was not sure if it actually received the information I inputted", silent failures are no longer possible because every state transition produces a visible badge with a meaningful message.
- The Phase 6 photo-identified-supplement engine cascade restoration as a Marshall-relevant safety fix, bypassing the interaction engine on photo-added supplements is a `MARSHALL.SAFETY.INTERACTION_GATE_BYPASS` concern even though no public claim is broken; the fix at `onboarding/[step]/page.tsx:1536` closes the gap.
- The regression test coverage map in §10 as the audit trail demonstrating each finding is provably fixed. The map is reproduced in the PR description.

The conversion stack is structurally complete with this prompt's memorialization. The five surfaces, Hero, Trust Band, Sarah Scenario, Outcome Timeline, Supplement Upload (#138g + #138h), answer the five questions a homepage visitor must say "yes" to before completing the CAQ. Future conversion work extends this stack rather than rebuilding it.
