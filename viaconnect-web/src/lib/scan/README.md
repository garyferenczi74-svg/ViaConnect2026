# Scan MediaPipe assets

This directory backs the FormaVision body scan pose guide. The pose detection
model (MediaPipe PoseLandmarker) and its WASM runtime are self hosted under
`public/mediapipe/` rather than loaded from a CDN. There is no postinstall or
prebuild script that fetches or copies these assets automatically; they are
committed to the repository as binary files and must be refreshed by hand
whenever the pinned package version changes.

## Pinned package version

`@mediapipe/tasks-vision` is pinned as an exact version (no caret, no tilde)
in `viaconnect-web/package.json`:

```
"@mediapipe/tasks-vision": "1.0.1"
```

`public/mediapipe/VERSION` contains exactly this same string. A contract
test at `src/lib/scan/__tests__/mediapipeVersion.test.ts` asserts the two
stay in sync and that the version is exact.

## Self hosted assets

```
public/mediapipe/
  VERSION                       exact installed package version
  wasm/
    vision_wasm_internal.js
    vision_wasm_internal.wasm
    vision_wasm_nosimd_internal.js
    vision_wasm_nosimd_internal.wasm
  pose_landmarker_lite.task     the pose landmarker model
```

`FilesetResolver.forVisionTasks` must be pointed at `/mediapipe/wasm` only.
Do not add a CDN fallback (jsdelivr, googleapis script tag, etc); this is a
security and privacy requirement for the scan feature, not just a
performance choice.

At runtime `forVisionTasks` feature detects SIMD support and picks either
the `vision_wasm_internal` pair or the `vision_wasm_nosimd_internal` pair,
so both pairs must be present. The `vision_wasm_module_internal` pair that
also ships in the npm package is only used when `forVisionTasks` is called
with its module flag set, which this project does not do, so it is
intentionally not copied here.

## Manual asset refresh procedure

When the pinned version of `@mediapipe/tasks-vision` changes, refresh the
assets in this order:

1. Update the exact version in `viaconnect-web/package.json` and run
   `npm install --save-exact @mediapipe/tasks-vision@<new version>` from
   `viaconnect-web/`. Do not use `^` or `~`.
2. Recopy the WASM runtime from the freshly installed package (only the
   `vision_wasm_internal` and `vision_wasm_nosimd_internal` pairs; skip
   `vision_wasm_module_internal`, which is unused by this project):
   ```
   cp node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.js public/mediapipe/wasm/
   cp node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm public/mediapipe/wasm/
   cp node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_nosimd_internal.js public/mediapipe/wasm/
   cp node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_nosimd_internal.wasm public/mediapipe/wasm/
   ```
3. Re-fetch the model file with a pinned, versioned URL (prefer a numbered
   version segment over `latest`):
   ```
   curl -fSL https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/<version>/pose_landmarker_lite.task \
     -o public/mediapipe/pose_landmarker_lite.task
   ```
   If the versioned URL 404s, fall back to the `latest` path segment and
   note that explicitly in the commit message, since `latest` is not
   reproducible.
4. Recompute and record the sha256 of the model file (`shasum -a 256
   public/mediapipe/pose_landmarker_lite.task`) and update the value below.
5. Update `public/mediapipe/VERSION` to the new exact version string.
6. Run the version contract test:
   ```
   npx vitest run src/lib/scan/__tests__/mediapipeVersion.test.ts
   ```
7. Commit the package.json, package-lock.json, and public/mediapipe changes
   together as one change set.

## Current model provenance

- URL used: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`
- sha256: `59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a`
- Bytes: 5777746

## Weak QA fallback

If the pose landmarker fails to load for any reason (network blocked,
GPU delegate unavailable and CPU delegate also throws, WASM fetch fails,
init exceeds the timeout budget) the scan hook must degrade to a weak QA
mode rather than crash the capture flow. In weak QA mode the live pose
overlay is not shown and the user instead sees the guidance copy "Pose
guide unavailable. Stand in the outline." The failure is recorded as a
structured log entry (no bytes, no image data, no landmarks) so the
degrade can be tracked without capturing anything sensitive.

## Landmarks are never persisted

Pose landmarks collected during a live scan session are used only for
in browser QA (framing, distance, pose match). Persistence is OFF by
default and gated end to end (G81):

- The server-only env flag `SCAN_PERSIST_LANDMARKS` defaults OFF. The
  finalize route (`src/app/api/scan/finalize/route.ts`) only includes
  landmarks in the frame insert when this flag is explicitly `true`/`1`;
  otherwise any client-supplied landmarks are stripped before the write.
- The `landmarks` column on `body_photo_session_frames` exists dormant
  behind that flag and is never read or rendered by any UI.
- As defense in depth independent of the flag, the migration
  (`supabase/migrations/20260829120000_prompt_231_body_photo_sessions_scan.sql`)
  runs `REVOKE INSERT (landmarks), UPDATE (landmarks) ON
  body_photo_session_frames FROM anon, authenticated`, so even a
  compromised client cannot write that column directly regardless of the
  application-level flag.

## Signed-upload persistence flow

`src/lib/scan/persist.ts` (`persistScan`) is the only path that writes a
captured scan to Storage and the database. Image bytes never transit this
app's own API routes:

1. `POST /api/scan/prepare` - metadata only (scan id, which poses are
   present/skipped), no image bytes. Idempotent on the caller-supplied
   scan id. Returns one signed UPLOAD URL per full and thumb object, for
   each non-skipped pose.
2. The client uploads each full and thumb blob DIRECTLY to Supabase
   Storage via `uploadToSignedUrl`, bypassing this app's servers
   entirely.
3. `POST /api/scan/finalize` - metadata plus the storage paths just
   uploaded to. The server re-verifies each path (pattern and existence)
   before recording it, and only reports success once
   `capture_status='ready'` is confirmed server side.

`finalize` is always called, even when some uploads failed, so a session
never gets silently stuck at `uploading`; the server records whatever
succeeded and marks the rest `partial`. Object URLs for captured frames
are revoked only after `finalize` confirms a CONFIRMED `ready` result,
never before and never on a partial result, so a failed attempt can still
retry with the live blobs.

## Reconstruction attach point

The self hosted assets and the pose landmarker hook in this directory are
the input stage for body scan capture only. A future reconstruction
pipeline (turning the four captured poses into a 3D or volumetric
estimate) is expected to attach as a child of `body_photo_sessions`,
for example a `body_photo_session_artifacts` table keyed by session id,
rather than requiring any change to how these assets are loaded or how
capture works today.
