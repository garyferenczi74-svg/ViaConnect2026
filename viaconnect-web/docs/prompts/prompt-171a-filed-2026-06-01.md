# Prompt 171a Filed: NutriVision Photo Signed-URL Mechanism (Retroactive Filing)

Date: 2026-06-01 (filed retroactive to the ship date of the underlying code)
Status: **Filed memorialization. Code shipped.** The signed-URL mechanism this prompt describes already lives at `src/app/api/nutrition/photo/analyze/route.ts:267-292` and on `MealDraft.thumbnail_url` at `src/app/(app)/(consumer)/nutrition/components/NutriVisionTab/types.ts:153-174`. This prompt formalizes the contract that downstream prompts (notably 172 §3) reference.
Memorialized by: Michelangelo (build agent), during Prompt 172 Phase 0.

## Mission (one line)

Memorialize the existing 60-minute signed-URL plumbing that lets the NutriVision client render a meal photo thumbnail without a second round-trip, so Prompt 172 and any later downstream prompt can cite a stable contract instead of re-deriving the plumbing.

## What the code does

When a user uploads a meal photo to `POST /api/nutrition/photo/analyze`, the route writes the JPEG/PNG/WebP to the `nutrivision-meals` Supabase Storage bucket under `<user_id>/<YYYY-MM>/<fileId>.jpg`. Immediately after the upload succeeds, the route calls `storageClient.storage.from('nutrivision-meals').createSignedUrl(storagePath, 3600)` to mint a 60-minute (3600-second) signed URL for the same object. The signed URL is returned to the client on the `MealDraft` response payload as the field `thumbnail_url`.

The client uses `thumbnail_url` to render a photo thumbnail in `AnalysisResult` and `SaveConfirmation` without re-fetching, re-uploading, or holding the original `File` in memory across the post-analyze navigation. When the signed URL generation fails, the route logs a warning via `safeLog.warn` and continues; `thumbnail_url` is left undefined and the UI hides the thumbnail block gracefully. Barcode-sourced meals never have a photo and so always have `thumbnail_url` undefined.

## Where it lives

- **Route file:** `src/app/api/nutrition/photo/analyze/route.ts` lines 267 through 292. The block is bracketed by the `Prompt 171a:` source comment that names the mechanism explicitly.
- **Type:** `src/app/(app)/(consumer)/nutrition/components/NutriVisionTab/types.ts` line 160: `thumbnail_url?: string` on the `MealDraft` interface, with a comment naming Prompt 171a and noting the barcode-source carveout.
- **Bucket:** `nutrivision-meals` (Supabase Storage). The bucket already existed pre-171a for ephemeral meal photo storage via `photo_meal_blobs`. 171a reuses the bucket; no new bucket created.
- **TTL:** 3600 seconds (60 minutes) on each signed URL. Picked to comfortably cover the post-analyze edit-and-save flow plus a generous user think-time window, while still expiring well before the photo's 24-hour ephemeral retention runs out (`photo_meal_blobs.retention_policy = 'ephemeral_24h'`).

## Who built it

Michelangelo, in the same pass that shipped the analyze route's primary `detectMeal` integration. The 171a block is a focused addition on top of the existing upload + blob-row plumbing; it does not change the analyze response shape's other fields and it does not change the cache, the audit recorder, or the photo retention policy.

## The contract Prompt 172 section 3 line 56 references

172 §3 declares 171a as standing spec inheritance for the MealCard surface:

> **Prompt 171a:** the signed URL mechanism for meal images (delivered by `/api/nutrition/photo/analyze`, images in the `nutrivision-meals` Supabase Storage bucket, 1-hour TTL on the signed URL, returned on `MealDraft.thumbnail_url`). Memorialized at `docs/prompts/prompt-171a-filed-2026-06-01.md`. The card photo thumbnail uses this mechanism; it does not build its own.

The contract this prompt locks in:

1. **Endpoint:** `POST /api/nutrition/photo/analyze` is the sole producer of `thumbnail_url`. Downstream surfaces (172 MealCard, 170f recipe match short-circuit, 170q forward plan preview) consume `MealDraft.thumbnail_url`; they do not call `createSignedUrl` themselves.
2. **Bucket:** `nutrivision-meals`. Any future meal-image surface that needs a thumbnail uses this bucket. No second bucket is introduced for the same purpose.
3. **TTL:** 3600 seconds. The TTL is short enough that the URL cannot meaningfully outlive its session-bound use; it is long enough to cover the realistic edit-and-save loop. A future re-derivation that needs a different TTL ships as a new field rather than reusing `thumbnail_url`.
4. **Field name and shape:** `thumbnail_url?: string` on `MealDraft`. Optional. Undefined for barcode-sourced meals and as a graceful fallback when signed-URL minting fails. Consumers handle the undefined case by hiding the thumbnail block.
5. **Failure mode:** the route logs and continues. The thumbnail is best-effort; a missing thumbnail never aborts the analyze response.

## What this prompt does not change

This is a memorialization. No code ships from this filing. The code already lives at the cited paths. The next opportunity to evolve the contract is when a downstream prompt explicitly requests a change (longer TTL, a different bucket, a non-photo media kind) and Gary green-lights the change in writing.

## Why a retroactive filing

171a was shipped as part of the analyze-route consolidation without a standalone filing. 172 §3 references 171a as if it were a filed prompt. Filing 171a now closes the documentation gap so 172 and later prompts cite a stable artifact rather than a code comment, and so the next agent reading the analyze route has a single page that names the contract verbatim.

## File touchpoints (read only; no code shipped from this filing)

- `src/app/api/nutrition/photo/analyze/route.ts` (lines 267-292: the signed-URL block).
- `src/app/(app)/(consumer)/nutrition/components/NutriVisionTab/types.ts` (line 160: `MealDraft.thumbnail_url`).

## Composition with the existing 170 surface

171a composes with:

- **170 base analyze pipeline:** the signed URL is minted between `storageClient.storage.upload` and the `detectMeal` call; the analyze pipeline downstream of `detectMeal` is unchanged.
- **170 base ephemeral photo retention:** `photo_meal_blobs.retention_policy = 'ephemeral_24h'` continues to govern hard photo deletion. The 60-minute signed URL is short-lived inside the 24-hour photo lifetime; expiry of the signed URL does not delete the photo.
- **170c §3 PHI redaction (Phase 0 deferred):** when §3 ships, the redacted image is what gets uploaded and what the signed URL points to. The 171a contract does not change.
- **170c §10 degraded service messaging (Phase 0 shipped):** the degraded service kind is a separate column on `nutrition_photo_jobs`. A degraded analysis still produces a `thumbnail_url` if the upload succeeded.

## Standing rules compliance

- No em or en dashes in code, doc, or commit message.
- No emojis in code or doc.
- No package.json change.
- No Supabase email change.
- Memorialization only; no migration shipped from this filing.
