# Prompt 230 — Wearables Connections: Three-Column Redesign (Design Spec)

- **Owner:** Gary Ferenczi, Farmceutica Wellness Ltd
- **Date:** 2026-08-24
- **Surface:** `/body-tracker/connections` (`ConnectionsSurface.tsx`). `/wearables` is an 8-line redirect here.
- **Base:** `origin/main @ a3c880e0`; build on worktree `feat/230-connections-3col`.
- **Companion doc:** `phase-0-audit.md` (the read-only audit this design is grounded in).

> **Scope correction (see phase-0-audit.md).** Prompt 230's written premise is stale: the surface moved to `/body-tracker/connections`, "Not configured" is already gone, the per-dimension contributor rows already exist, the upload is a modal (not inline), "219b" is not a shared uploader, and the marks are currently Lucide. Roughly two-thirds of the prompt already ships and is test-locked. **This spec covers only the genuine remainder plus a short list of real fixes.**

---

## 1. Decisions locked in brainstorming (2026-08-24)

| # | Decision | Note |
|---|---|---|
| D1 | **Re-scoped build** — build the remainder + fixes; do not rebuild shipped honesty/contributor plumbing | |
| D2 | **Real vendor logos** on source cards + contributor source pills | Reverses the earlier "keep Lucide" call. **Re-activates the Lex gate (G78, blocking).** |
| D3 | **7 MetricKeys** as the contributor dimension set | `hrv, sleep, resting_hr, recovery, workouts, body_composition, steps`. `strain`→`workouts`, `metabolic`→`body_composition`+`steps`. |
| D4 | **Six source tiles** | Apple Health, Hume, WHOOP, Oura, **Google Health**, **Garmin** |
| D5 | Contributor Source column = **"Connect your device"** when cold, **populates with the real device on connect** | Softens G77's "Needs Whoop or Oura" into a generic CTA (avoids naming not-yet-connectable devices) |
| D6 | **G76 mobile order** | Cold: contributors first, then sources. Once connected: sources → active detail → contributors |
| D7 | **Google = one tile** (Android aggregator: Fitbit + Pixel); no separate Fitbit tile | default; overridable |
| D8 | Google Health + Garmin ship as honest **"Coming soon"** tiles | Garmin has **no connector**; its tile is a real promise, the **Garmin connector is follow-on work, not this build** |

---

## 2. Layout

**Desktop ≥ 1280px** — three columns, proportions ≈ **1 : 1.2 : 1**:

```
+------------------+----------------------+---------------------+
|  Sources         |  Active source       |  Score contributors |
|  (6 cards)       |  (detail panel, NEW) |  (7 dimensions)     |
+------------------+----------------------+---------------------+
```

- **Tablet 900–1279px:** two columns (sources + detail side by side), contributors full-width beneath.
- **Mobile < 900px:** single column, **order flips by state (D6/G76)**; the detail panel becomes a **bottom sheet** on tap.
- Existing page shell, back-to-My-Biology control, header, and left sidebar are **unchanged** (diff-proof required).

**Amends the test-locked 2-column layout** (`connections-ia.test.ts` asserts `min-[1280px]:grid-cols-2`, from Brief 26). **Prompt 230 supersedes Brief 26's 1280 lock** — this is a deliberate, approved change.

---

## 3. Components

### New
- **`ActiveSourceDetailPanel.tsx`** (center column). Content keyed to the selected source:
  - **File source (Apple Health, Hume):** what it feeds, export instructions with the real iOS path, the **dropzone + browse** (promoted out of the modal), chosen-file confirmation, real import status.
  - **OAuth / Coming-soon source (WHOOP, Oura, Google, Garmin):** what it will provide, no Connect action (non-interactive).
  - **Nothing selected:** a designed prompt to pick a source (not an empty box).
- **Dimension detail view** — target of the per-row chevron in the contributor column (§5); explains what the dimension measures and how it is derived.
- **Vendor brand mark** rendering (local, Lex-cleared assets) — extend the `PluginVendorMark` pattern or a new `WearableBrandMark`; Lucide fallback for any vendor whose asset is not yet cleared.

### Changed
- **`ConnectionsSurface.tsx`** — restructure 2-col → 3-col; add **card-selection state** (radio-group semantics, arrow-key nav); render the two new columns; wire per-panel error boundaries.
- **`WearableTileCard.tsx`** — add the 4-signal **selected state** (fill + border + text weight + accent bar; never opacity alone); swap Lucide → real logo; keep one-card-one-action.
- **`ScoreDetailPanel.tsx`** — **split**: the BOS ring stays (its own block); the per-dimension rows become the **right contributor column** driven by the 7 MetricKeys, with the **"Connect your device" cold state → populate-on-connect** and the new **per-row chevron**.
- **Apple/Hume import** — the modal's upload logic moves into the detail panel and is **bug-fixed** (§7).

### Retired (mention/optional, only with approval)
- Orphaned `ConnectionCard.tsx` (dead, wrong 3-action discipline) and `connection-registry.ts` (dead Prompt-85 catalog). Flagged, not deleted without sign-off.

---

## 4. Data flow

- Source of truth stays `GET /api/integrations/wearable-tiles?platform=…` → `{ tiles, scoreDetail, lastUpdatedAt }`.
- **Add Google Health + Garmin** to `FIRST_CLASS_TILE_IDS`; remove them from `FORBIDDEN_FIRST_CLASS_TILE_IDS`. This **reverses the `#63` Google removal** — done honestly (Coming-soon, non-interactive, no fake Manage cross-link).
- **Contributor column** is driven by: the **7 MetricKeys** × `DEFAULT_PRECEDENCE` (the required device, used for the future populated state) × the user's **connected sources** (which device actually populates each row now).
- Wire the **228 state contract** into `load()` (timeout, loading, error) and the upload path.

---

## 5. Contributor column behavior (the core deliverable)

| State | Source cell |
|---|---|
| No source connected | **"＋ Connect your device"** (teal CTA). No wearable named. |
| A source connected for that dimension | The **real device pill** (logo + name + connected dot) |
| — | Each row has a **chevron → dimension detail view** |

- Panel-level disclosure appears **once** at the top (fixes §6.1). No per-row UNKNOWN repetition; no second footer.
- Honest: cold never implies a connection; the value/score discipline (UNKNOWN never 0) is unchanged.

---

## 6. Honesty rules (preserved + tightened)

- UNKNOWN never rendered as 0, placeholder, or empty-axes chart. Unchanged.
- Disclosure **said once** (fixes today's 6× UNKNOWN + duplicated `CONNECTIONS_FOOTER`).
- Coming-soon tiles non-interactive; **soften the `"…is not configured yet"` toast** (`OAUTH_ERROR_COPY`) so "Not configured" never reaches a consumer (§11).
- No fabricated last-sync or counts. Empty state uses neutral tokens, never severity/Orange.

---

## 7. Real bug fixes in the upload flow (higher value than the relayout)

1. **Fail-open success:** server returns HTTP 200 + `{status:'error'}`; client checks only `res.ok` → failed imports render "Import complete." **Fix:** honor `json.status`, or return non-200 on error.
2. **Modal count always 0:** `records_ingested` (server, snake) vs `recordsIngested` (client, camel). **Fix:** align the keys; show the real count.
3. **No timeout** on upload/parse. **Fix:** `AbortController`/`withTimeout` (also satisfies 228 + the repo resilience rule).

---

## 8. Error handling & resilience

- **219i per-panel error boundaries** around each of the three columns (wrap with the existing `ErrorBoundary` / `AdminPanelErrorBoundary` pattern; currently none wrap this surface).
- **228 state contract** applied to `load()` and upload: timeout on transitional states, failure states that name the next action, no success before the server confirms.

---

## 9. Tokens & theming (§8)

- Replace the **13 inline-hex sites** in `WearableTileCard.tsx` + `ScoreDetailPanel.tsx` with tokens.
- Add a **Card `#1E3054` Tailwind utility** (only `--card` exists today) and register **`font-instrument`** in the Tailwind font family (raw CSS class today).
- Any attention/severity color via `severityToken()` only. Empty state stays neutral (no Orange).
- **Vendor logos are the only exception** to Lucide-at-strokeWidth-1.5.

---

## 10. Testing

**Amend (deliberate supersession):**
- `connections-ia.test.ts` — allow the 3-column layout (was `grid-cols-2` lock).
- `brief-26-wearable-lock.test.ts` — the tile set (now 6, incl. Google + Garmin as Coming soon).
- `brief-25-honesty.test.ts` — modal→panel markup; Google tile now present (as Coming soon, no fake Manage).

**New:**
- Card selection state (one active; keyboard arrows; greyscale-distinguishable).
- Contributor cold = "Connect your device"; populate-on-connect shows the real source.
- Per-row chevron → dimension detail view.
- Six-tile set; Google/Garmin non-interactive Coming soon.
- Upload fixes: fail-open path, real (non-zero) count, timeout.
- §6.1 disclosure appears at most once (grep-style assertion).
- No inline hex on the surface (grep-style assertion).
- Mobile order per G76 in both states.
- A11y: roles/arrow-nav on sources; status in text not color-only; focus rings ≥ 3:1; keyboard-accessible dropzone.

**Keep green:** all existing honesty invariants not explicitly amended.

---

## 11. Completion gates

- **Lex (G78, blocking):** every vendor mark is an official, locally-stored, brand-guideline-compliant asset with recorded review; Apple Health wording confirmed; **Google + Garmin marks are the highest-exposure** and must clear before production. Lucide fallback for anything unreviewed.
- **Marshall:** sign-off on all new/changed copy (incl. the §6.1 disclosure and the softened toast). **Hannah** consulted on any assistant-facing copy.
- **Supersedes Brief 26** 1280 lock + 4-tile FORBIDDEN — recorded here as intentional.
- **Diff-proof** the sidebar, logo lockup, and user chip are unchanged.
- Build on `feat/230-connections-3col` off `origin/main`; **direct push to main** per house rule.
- Production-fetch verification (not localhost); screenshots at 1920/1280/900/375 in cold + one-connected states.
- 219l honest-architecture verdict.

---

## 12. Out of scope / follow-on

- **Garmin connector** — not built; this ships the tile only.
- **Precedence no-op** — `DEFAULT_PRECEDENCE`/`pickByPrecedence` are dead code; live resolution is Arnold-trust + newest-row. Flagged, not fixed here.
- **Six-vocabulary reconciliation** (4/7/8/9/… dimension lists) — larger than 230.
- **`/plugins` brand-mark Lex review** — adjacent surface, separate track.

---

## 13. Assumptions (overridable)

- Google Health = one tile covering Fitbit + Pixel (no separate Fitbit tile) — D7.
- Google Health + Garmin are genuinely roadmapped (so "Coming soon" is truthful) — D8.
- Deploy target is `origin/main` via a fresh worktree.
