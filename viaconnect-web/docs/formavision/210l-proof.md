# Prompt 210l: Proof and remaining non-delegable steps

**Code ship:** pipeline repairs on main (persist timeout, circ race, manual dual-write, composition entry fallback, spine contract tests).  
**Production alias:** https://www.viaconnectapp.com  

## What was fixed in code (agent-proven)

| Fix | Evidence |
| :---- | :---- |
| Scan persist client timeout 5s → 45s | `SCAN_PERSIST_CLIENT_TIMEOUT_MS`, unit test |
| Circumference entry lookup 3s → 15s | `ENTRY_LOOKUP_RETRIES=15`, unit test |
| Analyze path: persist then flush girths; wait for geometric | `BodyScanUploader.tsx` |
| Manual girths → `body_tracker_circumference` | `WeightMeasurementsForm.tsx` dual-write |
| Fat/muscle tabs: entry without segmental rows still resolves | `useLatestComposition` fallback |
| Shared spine contract module + tests | `scanSpineContract.ts` + `scanSpineContract210l.test.ts` |
| Diagnosis document | `docs/formavision/210l-diagnosis.md` |

## Gary non-delegable production proof (required for close)

1. **Phone scan:** On production, open My Biology → FormaVision / Scan My Body. Grant camera. Capture four views with quality prompts. Confirm processing UI, then personalized 3D on `/body-tracker/formavision`. Screen-record end to end.
2. **Desktop capture-to-render:** Four fixture photos through the same uploader; confirm save + FormaVision render (or honest error with retry, not silence).
3. **Manual Log Data:** Enter weight + girths. Confirm Measurements and FormaVision shape update. Body Fat / Muscle tabs show the entry spine with honest **No data** for composition % unless a segmental or scan source provided them (not fabricated).

Until Gary attaches that recording, acceptance criteria 2–4 remain open by design of the prompt.

## Escalations

1. Auto-computing body fat % from manual girths for the fat tab: **not** implemented (ownership / honesty). Recommend optional Navy estimate only behind explicit user opt-in if Gary wants it.
2. Capacitor-native camera permission copy beyond HTML `capture`: validate on device if WebView still blocks.
3. Geometric pipeline skip when `clinical_assessments.height_cm` is null: surface an honest pre-scan prompt to complete height in clinical assessment (product copy change; not fabricated height).

## Forced failure paths (code-level)

| Path | Expected |
| :---- | :---- |
| Persist timeout | User-facing retry message in uploader; reason `timeout` |
| Persist non-ok | Retry Analyze message |
| Circ entry still missing after retries | Circ route `ok:false` logged; composition fat may still exist |
| Manual girths only | Circumference spine filled; composition % remain null (honest) |
