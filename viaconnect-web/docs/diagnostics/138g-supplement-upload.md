# Prompt #138g — Supplement Upload Diagnostic

## 1. Executive summary

Two CAQ Phase 6 supplement upload components exist in the repo today, but only one is wired to the live onboarding surface. The active component is `SupplementPhotoUpload.tsx` mounted at `src/app/(auth)/onboarding/[step]/page.tsx:1532`. The dormant component is `SupplementPhotoCapture.tsx` (orphan, no callers). Neither component uses `navigator.mediaDevices.getUserMedia`. Both rely on the `<input type="file" capture="environment">` pattern, which means there is no live viewfinder and no direct camera-permission prompt issued by the page itself. The OS surfaces its own permission UI when the user taps the camera affordance.

The "black viewfinder" failure is therefore not a `getUserMedia` regression in this code path. It is an OS-mediated camera permission denial, an in-app browser (WebView) restriction, or a HEIC capture mismatch. The "silent upload failure" mode is real and traceable: zero telemetry around upload state, no AbortSignal timeouts, multiple swallowed promises, and the active `/api/ai/supplement-vision` route returns HTTP 500 with a body the client treats as JSON without checking `response.ok`. There is no separate Phase 6 photo upload table or per-user upload audit; the only persistence is the 90-day `product_lookup_cache` (text-keyed, not photo-keyed).

`sharp` is installed but never invoked in the supplement path, so HEIC iPhone captures hit Claude Vision raw and fail with "media_type: image/heic" not in the allowed list. Recommended Phase B work is concentrated in: explicit WebView detection, server-side HEIC normalization via `sharp`, full state machine with telemetry, and a per-user upload-attempt table.

## 2. Camera-permission call-site inventory

The CAQ Phase 6 supplement flow does NOT call `navigator.mediaDevices.getUserMedia` anywhere. The only `getUserMedia` call site in the repo is for the Hannah avatar at `src/components/hannah/avatar/AvatarPermissions.tsx:41`. That component is unrelated to supplement upload; it is included here only as a reference pattern.

### A. Active CAQ supplement camera trigger

**`src/components/caq/phase6/SupplementPhotoUpload.tsx:104`**
- Mechanism: `<input type="file" accept="image/jpeg,image/png,image/webp,image/heic" capture="environment" />`
- Trigger event: click on dropzone div at `src/components/caq/phase6/SupplementPhotoUpload.tsx:108`. The dropzone delegates to `inputRef.current?.click()` which is inside a synchronous click handler. User-gesture proximity is preserved (the click handler is synchronous; no `setTimeout`, no awaited Promise before the `.click()` call).
- HTTPS / secure-context validation: not present. The component assumes the host page is HTTPS.
- Constraints object: not applicable (file picker route).
- `navigator.permissions.query`: not used. There is no permission state inspection prior to invoking the picker.
- Error handler coverage: only the catch in `processImage` at `src/components/caq/phase6/SupplementPhotoUpload.tsx:80`. The catch surfaces an opaque error string. None of NotAllowedError, NotFoundError, NotReadableError, OverconstrainedError, SecurityError, AbortError are matched by name (because no `getUserMedia` is used), so the error catalog is implicit.
- MediaStream cleanup: not applicable. There is no live stream. `URL.revokeObjectURL` is called only on the reset path at `src/components/caq/phase6/SupplementPhotoUpload.tsx:98`. If the user uploads, the preview blob URL is leaked until the component unmounts.

### B. Orphan CAQ supplement camera trigger (not mounted)

**`src/components/caq/SupplementPhotoCapture.tsx:95`** and **`:96`**
- Two hidden inputs: one with `capture="environment"` (camera), one without (gallery). Component is not imported anywhere except its own file. Confirmed by grep: zero callers.
- Same pattern as A: file-picker only, no `getUserMedia`.

### C. Other camera triggers (NOT supplement, included for context)

- `src/components/nutrition/PhotoCapture.tsx:91` — meal capture, also `capture="environment"` file picker only.
- `src/components/body-tracker/photos/PoseGuide.tsx:130-138` — body-tracker photos, two file inputs (`capture="user"` and gallery).
- `src/components/body-tracker/manual-input/ScanPhotoUpload.tsx:131` — scan photo, file picker.
- `src/components/consumer-counterfeit/ReportCounterfeitForm.tsx:150` — counterfeit reports, file picker.

### Device-class gotchas evaluated against the code

- **iOS Safari mobile:** HTTPS is enforced by the production domain `viaconnectapp.com` declared at `capacitor.config.ts:22`. User gesture is preserved in component A. A `manifest.json` camera permission is not present at the project root that I can verify; `webDir: 'public'` at `capacitor.config.ts:20` so any manifest must live in `public/`. Glob check warranted in Phase B QA.
- **iOS standalone PWA:** No code branch detects standalone mode (`window.matchMedia('(display-mode: standalone)')` not used anywhere in the supplement flow). On iOS 17+ standalone, the file-picker fallback can silently dismiss without invoking `onChange` if the user cancels the system sheet, and there is no telemetry to detect this.
- **Android Chrome WebView (Instagram, FB, LinkedIn, TikTok, X, Threads):** No WebView detection anywhere in supplement code. `navigator.userAgent` is never checked from this surface. In-app browsers commonly strip `capture="environment"` and may refuse to spawn a camera intent. The user sees nothing happen.
- **HEIC/HEIF iPhone default:** The `accept` list at `SupplementPhotoUpload.tsx:104` includes `image/heic`. The client sends raw bytes plus `mimeType: file.type` to `/api/ai/supplement-vision`. The route at `src/app/api/ai/supplement-vision/route.ts:21` forwards `media_type: mimeType || 'image/jpeg'` to Anthropic. Anthropic's Messages API only accepts `image/jpeg`, `image/png`, `image/gif`, `image/webp`. A HEIC capture will be rejected upstream with a 400 from Anthropic, the route then returns HTTP 500 with body `{ success: false, error: 'API 400: ...' }`. Client at `SupplementPhotoUpload.tsx:71` checks `data.success` so the error surfaces, but the message string includes "API 400" jargon, not a HEIC explanation. `sharp` is in `package.json:59` but is never called for HEIC normalization.

## 3. Upload-pipeline failure-surface table

| Step | Where | Default timeout | Default size limit | Failure surfaced? | Notes |
|---|---|---|---|---|---|
| User taps dropzone | `SupplementPhotoUpload.tsx:108` | n/a | n/a | n/a | OS file picker; no app-level handler if user dismisses. |
| File select onChange | `SupplementPhotoUpload.tsx:86` | n/a | none enforced | partial | No size guard. The orphan component A enforces 10MB at `SupplementPhotoCapture.tsx:55`. The active component does not. |
| Compress >3MB | `SupplementPhotoUpload.tsx:43` | n/a | bound by `createImageBitmap` | weak | If `createImageBitmap` fails on HEIC (Safari support varies), the whole pipeline crashes into the outer catch with a generic message. |
| Read base64 | `SupplementPhotoUpload.tsx:54` | n/a | bound by browser memory | weak | `FileReader` errors are caught generically. |
| POST to `/api/ai/supplement-vision` | `SupplementPhotoUpload.tsx:63` | none on client; Vercel route declares `maxDuration = 60` at `src/app/api/ai/supplement-vision/route.ts:3` | Vercel default 4.5MB request body | partial | No `AbortSignal.timeout`. If Vercel kills the function, the client awaits forever or until tab discards. |
| Anthropic API call | `src/app/api/ai/supplement-vision/route.ts:14` | inherits route's 60s | 5MB after base64 | yes (HTTP 500) | Returns `{ success: false, error: 'API <status>: <text>' }`. Status code is 500 even when Anthropic returned 400; client doesn't inspect status. |
| Cache lookup | NOT IN VISION ROUTE | n/a | n/a | no | The vision route does not consult `product_lookup_cache`. Cache is only used by the text-search route at `src/app/api/ai/product-lookup/route.ts:64`. Photo identifications are never cached, so each capture is a full Anthropic round-trip. |
| Web search confirmation | NOT IN VISION ROUTE | n/a | n/a | no | The text-only `supplement-search` route at `src/app/api/ai/supplement-search/route.ts:75` exists but is never called from the photo path. Confirmation step is missing for camera captures. |
| Response → React state | `SupplementPhotoUpload.tsx:69` | n/a | n/a | partial | `await response.json()` without checking `response.ok`. A 500 response is parsed as JSON and the body's `success: false` is what surfaces, fortunate but accidental. If the route returned a non-JSON body (HTML error page from Vercel platform), `response.json()` throws and lands in the outer catch. |
| Side effects on add | `src/app/(auth)/onboarding/[step]/page.tsx:1536` | n/a | n/a | no | `onProductAdded` adds to local React state `userSupplements`. No write to Supabase. No `emitDataEvent('supplement_added', ...)` fires here, even though the cascade map at `src/lib/ai/emit-event.ts:35` defines that event. The "Interaction Engine" downstream stage therefore never runs from a photo-added supplement during onboarding. |

### Anti-pattern grep results (cited)

- `try { ... } catch { ... }` empty-catch with no telemetry: `src/components/caq/SupplementPhotoCapture.tsx:82` (orphan but indicative of pattern), and the `data_events` insert at `src/lib/ai/emit-event.ts:59` swallows any error silently by design.
- `.catch(() => {})` chains: `src/app/api/ai/product-lookup/route.ts:132` swallows the cache-write error.
- Missing `finally` blocks that reset loading state: `src/components/caq/phase6/SupplementPhotoUpload.tsx:80`. The catch sets `state = 'error'` but does NOT reset `previewUrl`, leaving the preview thumbnail stuck on a failed upload.
- Race conditions on modal close vs. upload: not literally present, but the dropzone has no disabled state during `analyzing`. A user can re-tap the dropzone, fire a second `processImage`, and overwrite `previewUrl` mid-flight. No request cancellation.
- `await fetch(...)` without `signal: AbortSignal.timeout(...)`: `src/components/caq/phase6/SupplementPhotoUpload.tsx:63` and every API route in `src/app/api/ai/`. None of them carry an abort signal.
- Edge function returning HTTP 200 with `{ ok: false }`: `src/app/api/ai/supplement-photo/route.ts:8`, `:13`, `:88`, `:103`, `:111` all return HTTP 200 with `success: false`. The active vision route at `src/app/api/ai/supplement-vision/route.ts:9`, `:12`, `:27`, `:33` returns proper non-200 codes, which is better, but the client at `SupplementPhotoUpload.tsx:69` ignores the status anyway.
- Supabase RLS denying insert silently: `src/app/api/ai/product-lookup/route.ts:126` upsert into `product_lookup_cache` swallows errors via `.then(() => {}, () => {})`. If RLS denies the insert, the cache never warms and every request pays the full Anthropic cost. The cache table has no policy I can verify from generated types alone; needs SQL migration audit in Phase B.

## 4. Telemetry gap analysis

Inventory of what the supplement upload code currently emits:

| Should-have signal | Currently fires? | Where it would fire if added |
|---|---|---|
| `supplement_upload_intent` | No | `SupplementPhotoUpload.tsx:108` (dropzone click) |
| `supplement_camera_requested` | No | Same site; conditional on file-picker capture vs. gallery branch |
| `supplement_camera_permission_result` | No | OS-mediated, not directly observable. Inferable from `onChange` no-fire timeout |
| `supplement_camera_fallback_to_picker` | No | Needs WebView detection branch, currently absent |
| `supplement_file_selected` (MIME, byte size, source) | No | `SupplementPhotoUpload.tsx:89` |
| `supplement_upload_started` | No | `SupplementPhotoUpload.tsx:61` |
| `supplement_upload_progress` | No | Needs `XMLHttpRequest` or `ReadableStream` migration; `fetch` does not expose progress |
| `supplement_upload_completed` | No | `SupplementPhotoUpload.tsx:78` |
| `supplement_upload_failed` | No | `SupplementPhotoUpload.tsx:73` and `:81` (two failure exits, neither emits) |
| `supplement_vision_started` | partial | Server console.log at `src/app/api/ai/supplement-photo/route.ts:16`; not durable telemetry |
| `supplement_vision_completed` (cache_hit, confidence, match_status) | No | Cache hit path doesn't exist for vision. `confidence` is in payload at `:67` but never logged |
| `supplement_vision_failed` | partial | `console.error` at `src/app/api/ai/supplement-vision/route.ts:27` and `:37`, `src/app/api/ai/supplement-photo/route.ts:86`, `:109`. No durable record |
| `supplement_manual_fallback_used` | No | `BrandProductSearch.tsx:221` "Enter manually" branch fires `onManualEntry` but no event |

Existing telemetry primitives that could host the signals:

- `data_events` table writes via `emitDataEvent` at `src/lib/ai/emit-event.ts:23`. Event types are enumerated at `:6` and currently include `supplement_added` and `supplement_removed` but nothing photo-specific.
- `audit_logs` table writes at `src/app/api/ai/[provider]/route.ts:53`. Heavyweight; not appropriate for low-value upload telemetry.
- No PostHog, no Mixpanel, no third-party SDK in `package.json:18-65`. All telemetry today is server-rolled into Supabase. That is consistent with #129 governance and is fine, but the supplement upload path uses none of it.

PII-scrubbing posture: image bytes are sent base64 to Anthropic; they never enter Supabase tables. Filenames pass through untouched. `URL.createObjectURL` blobs are local. Acceptable. The risk in Phase B is logging the full Anthropic response text for debugging, the response text often echoes the brand and product name, which is not PII per se but does expose user health regimen information. Phase B telemetry should hash or category-bucket brand strings before logging.

## 5. Reproduction matrix

All cells reflect what is reproducible from source review only. Physical-device QA is required to convert "physical-device QA pending" to confirmed pass/fail.

| # | Device / condition | Reproducible from code? |
|---|---|---|
| 1 | iOS Safari standard browser, happy path camera | Path exists. File picker invoked at `SupplementPhotoUpload.tsx:108`. No live viewfinder; OS camera sheet only. Likely passes; physical-device QA pending. |
| 2 | iOS Safari Add-to-Home-Screen standalone, camera permission | Path exists, no special handling. iOS 17+ standalone permission inheritance not detected anywhere. Risk of silent dismiss; physical-device QA pending. |
| 3 | iOS Safari, denied permission, retry behavior | No retry affordance distinct from the generic "Try again" button at `SupplementPhotoUpload.tsx:140`. The button calls `reset()` then re-clicks the input. iOS will silently re-deny without re-prompting; user sees the "Try again" button do nothing. Failure mode confirmed by code; physical-device QA pending for severity. |
| 4 | iOS Safari, HEIC photo upload | Confirmed broken from code. `accept` includes `image/heic` at `SupplementPhotoUpload.tsx:104`. Client forwards `mimeType` raw at `:66`. Vision route forwards `media_type: 'image/heic'` to Anthropic at `src/app/api/ai/supplement-vision/route.ts:21`. Anthropic returns 400 (HEIC not in allowed media_type union). Route returns 500 with `error: 'API 400: ...'`. User sees opaque error. `sharp` is installed but never invoked. |
| 5 | Android Chrome, happy path camera | Path exists. File picker invoked. Likely passes; physical-device QA pending. |
| 6 | Android Chrome WebView (Instagram in-app), should fall back to picker | Confirmed broken from code. No WebView detection anywhere. `capture="environment"` is passed unconditionally. Many in-app browsers refuse to spawn camera intent and the click silently no-ops. No telemetry to detect; physical-device QA pending for confirmation. |
| 7 | Desktop Chrome, file picker only | Path exists; `capture="environment"` is ignored on desktop and file picker opens normally. Likely passes; physical-device QA pending. |
| 8 | Desktop Safari, file picker | Same as 7. Likely passes; physical-device QA pending. |
| 9 | Slow 3G network, upload progress / cancel | Confirmed broken from code. No `XMLHttpRequest`-based upload, no progress reporting. `fetch` at `SupplementPhotoUpload.tsx:63` has no `AbortSignal.timeout`. User sees "Reading your supplement label..." spinner with stale "10-15 seconds" text at `:131`. If Vercel cuts at 60s, the response surface depends on whether `fetch` rejects (network error) or hangs (TCP keepalive). |
| 10 | Offline at upload time, queued or rejected | Path exists but minimal. `fetch` rejects with `TypeError: Failed to fetch`. Catch at `:80` sets `state = 'error'`, surfaces `err.message` raw, user sees "Failed to fetch", not a friendly offline message. No queue, no retry. |
| 11 | File >10 MB, rejection with size hint | Confirmed broken from code. No size guard in the active component. Compression at `:43` reduces large files but does not reject. A 50MB HEIC capture will attempt compression in-browser and may OOM on low-end Android. The orphan component at `SupplementPhotoCapture.tsx:55` enforces 10MB; the live component does not. |
| 12 | File of unsupported MIME, rejection with format hint | Partial. `accept="image/jpeg,image/png,image/webp,image/heic"` filters at picker level on most platforms. If a user works around it (e.g., drag-drop on desktop in some browsers, or a non-conforming WebView), the bytes are sent raw to Anthropic and rejected with a 400. Client surfaces "API 400: ..." not a format hint. |

## 6. Root-cause hypotheses, ranked by confidence

### High confidence

1. **HEIC iPhone captures fail end-to-end with no recovery.** The accept list permits HEIC, the client never converts, the server never converts despite `sharp` being available, and Anthropic rejects HEIC outright. A user takes a photo with a default-config iPhone, sees a generic "API 400" error, has no idea what to do. Evidence: `src/components/caq/phase6/SupplementPhotoUpload.tsx:104`, `src/app/api/ai/supplement-vision/route.ts:21`, Anthropic Messages API media_type union.

2. **No WebView fallback. Camera tap is a no-op in social in-app browsers.** No code path detects in-app browsers. `capture="environment"` may be silently dropped. User taps "Add a photo of your product" and nothing happens. Evidence: zero matches for `userAgent.*Instagram|FBAV|Linked|TikTok` across `src/components/caq/`.

3. **No request timeout means hung uploads sit forever.** `fetch` without `AbortSignal.timeout`. If the Vercel function exceeds `maxDuration = 60`, the client may never resolve. User stares at "Reading your supplement label..." indefinitely. Evidence: `src/components/caq/phase6/SupplementPhotoUpload.tsx:63`, no `signal:` option.

4. **Photo-added supplements never trigger the Interaction Engine cascade.** `onProductAdded` at `src/app/(auth)/onboarding/[step]/page.tsx:1536` only mutates local React state. `emitDataEvent(user.id, 'supplement_added', ...)` is wired for medications at `:1449` but not for the photo path. Downstream `interaction_check`, `protocol_safety_gate`, `bio_optimization_recalc` cascades defined at `src/lib/ai/emit-event.ts:35` never fire. Direct Hannah-sensitive impact: "incomplete supplements → unsafe protocol" per the prompt context.

### Medium confidence

5. **No upload audit trail. Phase B cannot reproduce field reports.** No `supplement_uploads` or `supplement_photo_uploads` table. No row written per attempt. Whatever the user reports as "it didn't work" is invisible to the team. Evidence: zero matches for `supplement_upload|supplement_photo_upload` table names in any sql or tsx.

6. **Image preview blob URL leak.** `URL.createObjectURL` at `:40` is only revoked in `reset()` at `:98`. The success path does not call `reset()`; the user typically taps "Add to My Supplements" which calls `onProductAdded(product); reset()` at `:196` so this is OK in the happy path. But the error path at `:80` does not revoke. Multiple failed retries in one session leak preview blobs.

7. **HTTP status is ignored by the client.** `await response.json()` without `response.ok` check at `:69`. Currently saved by the route returning `{ success: false }` in JSON form, but a Vercel platform-level error (cold start crash, deploy mid-flight, HTML 502 page) trips the JSON parser into the outer catch and surfaces `err.message` like "Unexpected token < in JSON at position 0". User sees gibberish.

8. **No size limit on the live component.** A user could pick a 50MB HEIC and the in-browser canvas resize might OOM on a 3GB-RAM Android. Evidence: only the orphan `SupplementPhotoCapture.tsx:55` has a 10MB guard.

### Low confidence

9. **`product_lookup_cache` may have RLS that silently rejects unauth writes.** The route at `src/app/api/ai/product-lookup/route.ts:126` uses the user-scoped `createClient()` from `@/lib/supabase/server`, not a service role. If RLS on `product_lookup_cache` requires a specific role, the upsert silently no-ops via the swallowed error chain at `:132`, and every photo upload pays full Anthropic cost. Needs migration-level RLS audit in Phase B; can't confirm from `src/lib/supabase/types.ts:12145` alone.

10. **Photo path bypasses cache entirely.** The vision route never consults `product_lookup_cache`. Even a high-confidence brand-and-product match from a previous photo cannot warm the cache for the next user uploading the same product. This is a perf-and-cost issue more than a bug, but it surfaces in field as "the second user to upload Thorne Basic Nutrients should get an instant result, but does not."

## 7. Recommended fixes for Phase B

These are scoped to plug into the §B.1–B.6 spec of #138g.

### 7.1 State machine (#138g §B.1)

Replace the 5-string union `'idle' | 'compressing' | 'analyzing' | 'complete' | 'error'` at `src/components/caq/phase6/SupplementPhotoUpload.tsx:25` with a discriminated union that carries telemetry context. Suggested states:

- `idle`
- `permission_requested` (file picker invoked, awaiting onChange or timeout)
- `permission_denied` (onChange did not fire within 30s, heuristic for "user declined system sheet")
- `webview_blocked` (detected before invoking picker)
- `file_selected` (carry MIME, byte size, source)
- `compressing` (carry progress percent)
- `heic_converting` (new state for sharp pipeline)
- `uploading` (carry start timestamp; for elapsed-time toasts)
- `analyzing` (server-side; carry server request id)
- `complete` (carry product, confidence, cache_hit)
- `error` (carry typed error code from §B.4 catalog)

Each transition emits one telemetry signal from §4.

### 7.2 5 UX banner states (#138g §B.2)

Replace the binary error string at `:73` with a banner component keyed off the error catalog. The five banners should map to:

1. **Permission needed.** "Allow camera or photo access in your browser to continue."
2. **In-app browser limit.** "Open ViaConnect in Safari or Chrome to upload a photo." (route to deep link)
3. **Format not supported.** "We support JPEG, PNG, WebP, and HEIC photos under 10 MB."
4. **Trouble reading label.** "We could not read this label. Try the Supplement Facts panel, or enter manually." (with manual-entry CTA)
5. **Service issue.** "Our identification service is busy. Try again in a moment, or enter manually." (with retry and manual-entry CTAs)

All banner copy must use commas, colons, semicolons only, no dashes per the user's standing rule.

### 7.3 3-tier camera fallback (#138g §B.3)

Phase B must add a runtime detection layer before invoking the file picker:

- **Tier 1: native viewfinder eligible.** iOS Safari mobile (non-WebView, non-PWA-edge-case), Android Chrome non-WebView. Use `capture="environment"`.
- **Tier 2: file picker only.** Desktop browsers, iOS Safari standalone PWA on iOS 17+ (treat as picker-only out of caution), unrecognized mobile UAs.
- **Tier 3: WebView.** Detect Instagram, FBAV, Threads, FB_IAB, LinkedInApp, TikTok, Twitter, Line. Show a banner: "Open in your browser to add a photo" with a one-tap deep link to `https://viaconnectapp.com/onboarding/...` outside the WebView. Do not invoke the picker.

WebView regex should live in a single utility, e.g. `src/lib/device/detect-webview.ts`, and be tested. Telemetry signal `supplement_camera_fallback_to_picker` and `supplement_camera_webview_blocked` fire from this layer.

### 7.4 Error code catalog (#138g §B.4)

Define a typed catalog and map every server failure path to one. Suggested codes:

- `E_NO_FILE`, `E_BAD_MIME`, `E_TOO_LARGE`, `E_HEIC_CONVERT_FAILED`
- `E_TIMEOUT`, `E_NETWORK_OFFLINE`, `E_RATE_LIMITED`
- `E_VISION_AUTH`, `E_VISION_BUSY`, `E_VISION_BAD_RESPONSE`
- `E_LOW_CONFIDENCE` (not blocking; surface manual-edit affordance)
- `E_INTERNAL`

Routes at `src/app/api/ai/supplement-photo/route.ts:8-13`, `:88-92`, `:102-104`, `:108-114` and `src/app/api/ai/supplement-vision/route.ts:9`, `:12`, `:27`, `:37` should return both an HTTP status and a typed `errorCode` field. Client maps `errorCode` to the §7.2 banner.

### 7.5 HEIC handling (#138g §B.5)

Phase B should add server-side normalization in the vision route:

- If `mimeType === 'image/heic' || 'image/heif'`, run incoming buffer through `sharp(buffer).toFormat('jpeg', { quality: 85 }).toBuffer()` before forwarding to Anthropic.
- Pass `media_type: 'image/jpeg'` to Anthropic.
- Add `image/jpeg` to the body field after conversion.
- Cap converted output at 5MB; resize down if exceeded.
- Telemetry: `supplement_heic_converted` with input bytes and output bytes.

`sharp` is already approved (`project_prompt_106_deps_approved.md`) and present at `package.json:59`. No new dependency.

### 7.6 90-day cache (#138g §B.6)

Two changes needed:

1. **Photo-key the cache.** The vision route should compute a perceptual hash of the normalized image (Marshall already has pure-TS phash per `project_prompt_124_decisions.md`; reuse `src/lib/marshall/vision/...`). Store `{ phash, brand, product_name, ingredients, expires_at }` in a new table `supplement_vision_cache` or extend `product_lookup_cache` with a `phash` column. On next request, hash-match before paying Anthropic cost. Cache TTL 90 days, matching existing convention at `src/app/api/ai/product-lookup/route.ts:131`.
2. **Cross-key vision and text.** When vision identifies `brand: 'Thorne', productName: 'Basic Nutrients 2/Day'`, also write into `product_lookup_cache` keyed on the normalized text query so subsequent text searches hit instantly.

### 7.7 Cross-cutting (not numbered in #138g but needed)

- **Add `AbortSignal.timeout(45_000)` to the client fetch** at `src/components/caq/phase6/SupplementPhotoUpload.tsx:63`. Vercel maxDuration is 60s; client gives up at 45s with a clean `E_TIMEOUT` and friendly retry banner.
- **Add a 10MB pre-flight size guard** in `processImage` at `:34` to match the orphan component's behavior. Reject with `E_TOO_LARGE` and human-readable hint.
- **Wire `emitDataEvent('supplement_added', ...)`** at `src/app/(auth)/onboarding/[step]/page.tsx:1546` inside `onProductAdded` callback so the Interaction Engine cascade fires for photo-identified supplements, not just typed medications.
- **Create a `supplement_uploads` audit table** with row per attempt (user_id, attempt_id, source: camera|picker|webview, mime, byte_size_in, byte_size_out, error_code, vision_confidence, created_at). Phase B can then answer "how often does this fail in production." RLS: row-owner read; service-role write from API route.
- **Decommission the orphan `SupplementPhotoCapture.tsx`** to remove drift between two implementations. Either delete or fold its 10MB guard and `cameraInputRef`+`fileInputRef` two-button pattern into the active component.
- **Verify Products bucket usage.** No supplement upload code today writes the photo bytes to the `Products` bucket. The bytes are forwarded base64 to Anthropic and discarded. If Phase B wants to keep photos for "show me my last upload" or for re-vision on cache miss, write to `Products/users/{user_id}/supplement-uploads/{attempt_id}.jpg`. Bucket name confirmed capital P per `project_prompt_110_bucket_rename.md` and the existing usage at `src/app/api/admin/shop/upload/route.ts:107`.
- **getDisplayName contract.** The active component renders `product.brand` and `product.productName` directly at `:155-156`. These are user-supplied (via Anthropic) values, not agent slugs, so the brand-rule at `src/lib/compliance/rules/brand.ts:271` does not strictly apply. No `getDisplayName()` change needed in supplement display, but Phase B should confirm with Hannah whether any FarmCeutica-branded supplement entries should round-trip through `getDisplayName('farmceutica')` for consistent rendering.
