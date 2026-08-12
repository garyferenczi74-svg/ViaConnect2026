# Prompt 210k: FormaVision Body Composition section audit matrix

**Date:** 2026-08-11  
**Production:** https://www.viaconnectapp.com/body-tracker  
**Branch:** `fix/210k-composition-audit`  
**Method:** Production route probes (auth-gated surfaces), code-level enumeration of every interactive control, unit tests for navigation contracts, wiring fixes for confirmed breaks.

## Section health summary

| Metric | Count |
| :---- | :---- |
| Elements audited (seeded + discovered) | 42 |
| Wiring fixed this prompt | 6 |
| Escalated for Gary (not improvised) | 5 |

---

## Title / navigation decisions already locked

- Hub card branded **FormaVision Body Composition** (210j two-tone).
- Four-tab row includes FormaVision (210i).
- 3D surface only on `/body-tracker/formavision` (210h Rev C).

---

## Matrix

Legend: **PASS** observed or contract-proven; **FIXED** break repaired this prompt; **ESCALATED** structural / out of wiring scope; **CODE** verified in source with production path alive (auth blocks full anonymous click-through).

### Navigation and links

| ID | Element | Expected | Observed | Result | Notes / fix |
| :---- | :---- | :---- | :---- | :---- | :---- |
| N1 | Sidebar My Biology | Lands on hub `/body-tracker` | `Sidebar.tsx` + `MobileNavBar.tsx` href `/body-tracker`; hub page renders `BodyTrackerHub` | PASS (CODE) | |
| N2 | Hub card FormaVision Body Composition | Opens composition; no standalone FormaVision card | `SURFACES` composition title + href; no `id: formavision` card; unit tests green | PASS (CODE) | 210j |
| N3 | Four-tab row | Each tab navigates; active states; identical treatment both surfaces | Toggle shared; composition + formavision both mount it | PASS (CODE) | |
| N3a | Tab Body Fat / Muscle / Measurements from composition | Stay on composition, switch content | `onSectionNav` setSection | FIXED | Now also `router.replace(?section=)` so URL/back match |
| N3b | Tab FormaVision from composition | Navigate to `/body-tracker/formavision` | `router.push(FORMAVISION_PATH)` | PASS (CODE) | |
| N3c | Tabs from formavision to content | `/body-tracker/composition?section=` | Uses `compositionSectionHref` | FIXED | Centralized helper |
| N4 | Measurements tab | Real navigation to measurements surface | Section `measurements` shows `MeasurementsGrid` + `MeasurementsPanel` + `UnitToggle` | PASS (CODE) | |
| N5a | Deep link `/body-tracker/formavision` | Direct load | Production 307 to login when unauthenticated (route registered) | PASS (CODE/prod probe) | Auth wall expected |
| N5b | Deep link `/body-tracker/composition` | Direct load | Same | PASS (CODE/prod probe) | |
| N5c | Deep link `?section=measurements` | Opens measurements | `parseCompositionSection` + effect | PASS (CODE) | |
| N6 | Retired inline "View your 3D body" | Absent | Grep zero hits in `src` | PASS (CODE) | 210i |
| N6b | Standalone hub FormaVision card | Absent | hubConfig test asserts not present | PASS (CODE) | 210j |
| N7 | My Biology back link | Returns to hub | `BackToHubLink` on composition + formavision | PASS (CODE) | |

### Buttons, toggles, controls

| ID | Element | Expected | Observed | Result | Notes / fix |
| :---- | :---- | :---- | :---- | :---- | :---- |
| B8 | Scan My Body (composition) | Opens scan flow; completed scan lands FormaVision | Inline panel; **was** stay on composition after save | FIXED | `runScanPersist` success → `router.push(formavision)` |
| B8b | Scan My Body (formavision empty) | Launches scan flow | **Was** `/body-tracker/photos` (photo sessions, not composition scan) | FIXED | Now `compositionScanHref()` = `?scan=1` |
| B8c | `?scan=1` deep link | Opens scan panel | Composition reads query and opens `scanOpen` | FIXED | |
| B9 | Log Data | Manual entry; save writes spine | `InlineEntryPanel` + `BodyCompositionForm` + `handleSaved` refresh | PASS (CODE) | Full write path needs Gary live save walk |
| B10 | Doctor report (`DownloadReportButton`) | Gated no-scan message + generate with data | 404 → "Scan your body first…"; POST `/api/formavision/scan-report` | PASS (CODE) | Live generate needs scanned account |
| B11 | Show Comparison Overlay | Ghost first scan; honest single-scan | FormaVision toggle; disabled without first scan + honest copy | PASS (CODE) | |
| B12 | Select Body Part (13 regions) | Zoom/frame all regions | 12 ring keys in `SELECT_BODY_PART_REGIONS` (+ All) | ESCALATED | Spec says 13; picker has 12 (no 13th ring). Confirm intended count with Gary |
| B13 | Male / Female toggle | Both surfaces; state across tabs | Composition persisted; **formavision was local-only** | FIXED | FormaVision now persists via `setGenderOverride` |
| B14 | Units control | Converts both directions, section-wide | Only measurements tab had toggle; formavision hardcoded `in` | FIXED | FormaVision mounts shared `UnitToggle` + same localStorage key |
| B15a | Time Machine (formavision) | Scrub/play drive avatar | `JourneyTimeline` → `scrubVector` → avatar | PASS (CODE) | |
| B15b | Time Machine (composition) | Spec listed under section | Scrub still set but **no 3D avatar** after 210h freeze; readouts still show | ESCALATED | Numbers timeline is honest; morph scrub is dead on 2D surface by design of freeze. Decide: remove scrub wiring or accept display-only |
| B15c | DetailDrawer / callouts | Tappable regions | HoverSystem + LegendBar pin regions on composition 2D | PASS (CODE) | |
| B15d | Future Self (formavision) | Ghost projection | Wired to avatar ghost props | PASS (CODE) | |
| B15e | Future Self / Clip on composition | 3D-era panels | Future Self ghost + clip canvas look for missing 3D mesh; static-card path only | ESCALATED | Post-210h leftover; either relocate to formavision only or leave as numbers/static. Not a silent fail for clip (honest 2D fallback) |
| B15f | RegionProtocolPanel on composition | Shows when region selected | `selectedBodyPart` never set (SelectBodyPart removed with 3D) | ESCALATED | Dead path on composition; panel never mounts |

### Data wiring and states

| ID | Element | Expected | Observed | Result | Notes / fix |
| :---- | :---- | :---- | :---- | :---- | :---- |
| D16 | One spine | Manual + scan → body_tracker → both surfaces | Both pages use `useLatestComposition` / history / circ hooks | PASS (CODE) | Live dual-write walk is Gary non-delegable |
| D17 | Empty states | Neutral body + Scan CTA; No data cards | FormaVision empty CTA; composition empty hint + Unknown cards | PASS (CODE) | |
| D18 | Reason-tagged logs quiet | No schema-drift noise in audit | Not instrumented in this agent session against live dashboards | ESCALATED | Needs Gary/ops walk with logging console + telemetry dashboard open |
| D19 | Telemetry events | tab_entered, ghost, tier | Emits present in code (`useAvatarTelemetry`, report/clip emitters) | PASS (CODE) | Dashboard row verification is ops walk |
| D20 | Error paths | 2D floor + numbers; interrupted scan defined | Composition error banner + Retry; scan persist error + Retry; AvatarErrorBoundary on 3D path | PASS (CODE) | Forced render error not re-planted this session |

### Discovered elements (STEP 0 DOM/code walk, not in seed list)

| ID | Element | Expected | Observed | Result | Notes |
| :---- | :---- | :---- | :---- | :---- | :---- |
| X1 | GeneticsOverlay CTA | Link to genetics upload when absent | Mounted on composition non-measurement sections | PASS (CODE) | |
| X2 | ClipCreatorSurface | Shareable transformation | Composition only; canvas null → static card | PASS (CODE) with ESCALATED placement | See B15e |
| X3 | AgentNarration / BOS / MilestoneMoment | Read-only layers | Mounted composition; fail-open | PASS (CODE) | |
| X4 | Cadence + streak surfaces | Fingerprint flag, streak, tip, opt-in | Composition | PASS (CODE) | |
| X5 | EntryHistoryTimeline + ScanPhotoGallery | History under section | Composition footer | PASS (CODE) | |
| X6 | Hub other cards unchanged | Pixel-stable non-composition cards | Config untouched except 210j composition title | PASS (CODE) | |
| X7 | Log measurements empty CTA on formavision | Reach manual entry | Now `?section=measurements` | FIXED | Was generic composition root |

---

## Wiring fixes shipped (this prompt)

1. **Section URL sync** — content tabs call `router.replace(compositionSectionHref(tab))`.
2. **Post-scan landing** — successful `runScanPersist` navigates to FormaVision.
3. **Scan deep link** — `?scan=1` opens Scan My Body; FormaVision empty CTA uses it.
4. **Gender persist on FormaVision** — same `setGenderOverride` spine as composition.
5. **Units on FormaVision** — shared `UnitToggle` + `vc.body-tracker.measurement-unit`.
6. **Dead 3D imports on composition** — removed unused `BodyCompositionAvatar` / `SelectBodyPartControl` imports (surface stays 2D per 210h).

Regression tests: `src/lib/body-tracker/__tests__/compositionNav.test.ts` (5 cases).

---

## Escalation list (Gary decisions)

1. **Body part count 12 vs 13** — picker has 12 rings; hub subtitle says 13 point measurements. Align copy or add missing region.
2. **Composition Time Machine scrub** — morph target removed with 3D freeze; keep as numbers-only or hide scrub controls on composition.
3. **Future Self / Clip placement** — 3D-dependent affordances still mounted on frozen composition; prefer formavision-only?
4. **RegionProtocolPanel on composition** — never reachable without Select Body Part; mount control on 2D or formavision-only.
5. **Telemetry + reason-log quiet walk** — requires authenticated production session and dashboard access (non-delegable ops/Gary).

---

## Production recordings

| Surface | Probe | Status |
| :---- | :---- | :---- |
| Hub | `GET /body-tracker` | 307 → login (route live) |
| Composition | `GET /body-tracker/composition` | 307 → login |
| FormaVision | `GET /body-tracker/formavision` | 307 → login |
| Full authenticated click-through desktop + Capacitor | Pending | **Gary non-delegable** |

Pixel-diff of non-composition hub cards: config-only change surface (210j); 210k nav fixes do not alter hub media or grid classes.

---

## How to re-verify (Gary)

1. Hub: one composition card, titled FormaVision Body Composition; open it.
2. Cycle four tabs; confirm URL `?section=` updates on content tabs; FormaVision tab full-routes.
3. Empty account: FormaVision → Scan My Body opens composition scan panel (`?scan=1`).
4. Complete a scan → lands on FormaVision with body.
5. Toggle Male/Female on both surfaces; switch tabs; gender holds.
6. Toggle in/cm on measurements and FormaVision; values convert; preference holds.
7. Comparison overlay, body part select, Time Machine on FormaVision only for 3D morph.
8. Doctor report: no-scan message; with data, generate works.
9. Back My Biology returns to hub.
