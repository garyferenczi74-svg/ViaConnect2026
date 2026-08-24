# Prompt 210l: Scan Pipeline Diagnosis

**Date:** 2026-08-15  
**Production:** https://www.viaconnectapp.com/body-tracker  
**Method:** Code-level hop trace of capture, analysis, write, render, and manual entry against production wiring. Live camera proof remains Gary non-delegable (auth + device).

## Root-cause statement

**Several independent breaks**, not one single root cause:

1. **Persist timeout (scan write hop):** Client `persistScan` aborts at **5s** while `/api/body/scan/persist` chains multiple 5s-bounded Supabase calls. A legitimate persist can exceed 5s wall clock and surface as silent fail-open (`reason: timeout`) with no spine row and no FormaVision data.
2. **Circumference race (3D shape hop):** Geometric girths write via `/api/body/circumference` only after a `body_tracker_entries` row exists for `scan_id`. Entry is created by persist (above). Circumference lookup used only **5 × 600ms = 3s** of retries; if persist is slower, girths never land. FormaVision `scanToParamVector` needs circumferences for a personalized mesh; without them the body stays template/estimated rings.
3. **Manual Log Data contract mismatch (avatar tabs hop):** `WeightMeasurementsForm` writes girths only to `body_tracker_weight` (`waist_in`, `hips_in`, ...). The FormaVision spine and measurements grid read **`body_tracker_circumference`** (+ hip from weight). Manual girths never reached the table the renderer and tabs consume for shape.
4. **Composition snapshot entry resolution (fat/muscle tabs hop):** `useLatestComposition` only loads a parent entry via `fat.entry_id` or `muscle.entry_id`. A manual weight/girth entry with **no** segmental fat/muscle rows produces **null snapshot**, so Body Fat / Muscle Mass tabs look empty even when weight and girths exist. Honest No data for composition fields is correct; blanking the whole spine for lack of segmental rows is not.

Capture/camera: composition uses `BodyScanUploader` with four `input[type=file] capture="environment"` slots (not a separate getUserMedia stream). That is the current guided four-view flow (not a pre-split photos session). Permission denial is browser-native; empty frames cannot advance analyze (`allFilled` requires four base64 payloads). Edge analysis is `body-scan-analyze` (60s vision timeout server-side). No evidence of a wrong route mounting the old photos session for Scan My Body after 210k (`?scan=1` + composition panel).

## Hop matrix

| Hop | Path | Status | Evidence |
| :---- | :---- | :---- | :---- |
| 1 Launch | Composition `BiologyActionRow` / FormaVision empty CTA → `?scan=1` / panel | LIVE (code) | composition page `shouldOpenScanFromQuery`, `BodyScanUploader` |
| 2 Camera | File input + `capture="environment"` | LIVE partial | Desktop: file picker. Mobile: OS camera. No custom getUserMedia UX |
| 3 Capture | Four slots must be non-null base64 | LIVE | `allFilled` gate |
| 4 Analyze | Edge `body-scan-analyze` + client `runInMemoryMeasurement` (4s/view fail-open) | LIVE with risk | Vision 60s; geometric skips if no `clinical_assessments.height_cm` |
| 5 Write composition | `persistScan` → `/api/body/scan/persist` | **BROKEN timeout** | Client 5s abort vs multi-step server work |
| 6 Write girths | `/api/body/circumference` after entry | **BROKEN race** | 3s retry window too short vs persist |
| 7 Read/render 3D | FormaVision `scanToParamVector` + `BodyCompositionAvatar` | LIVE if spine filled | Empty without entry + circ |
| 8 Manual write | `submitEntry` weight row only | **BROKEN for circ spine** | Girths not in `body_tracker_circumference` |
| 9 Fat/muscle tabs | `useLatestComposition` via segmental only | **BROKEN entry resolve** | No fat/muscle row → null snapshot |

## Not one root cause

Three write/read contract and timing failures stacked. Capture UI wiring after 210k is substantially correct; the spine fails after analyze or on manual dual-write.

## Escalations (no improvised composition math)

- Computing body fat % from girths alone (Navy formula exists in client scan path but must not auto-apply to manual tape without Gary sign-off on when it is user-visible).
- Capacitor native camera permission UX beyond HTML capture attribute (if shell still blocks, needs native config audit on device).
