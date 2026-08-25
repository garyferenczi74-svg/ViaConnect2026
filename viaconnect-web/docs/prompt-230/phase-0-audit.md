# Prompt 230 — Phase 0 Audit Synthesis
Audited against **origin/main @ a3c880e0** (production tip, landed 2026-08-24) via a detached read-only worktree.
Method: 8-agent read-only workflow. Every claim below is backed by file:line evidence in the workflow journal.

---

## 0. The premise correction (read first)

Prompt 230 describes a surface that **no longer exists in that form**. Six factual drifts:

| Prompt 230 says | Reality on origin/main today |
|---|---|
| Surface is at `/wearables` | `/wearables` is an **8-line redirect** to canonical `/body-tracker/connections`. Real surface = `ConnectionsSurface.tsx` (191 lines). (redirect landed today, commit a3c880e0) |
| Current surface = "4 dims all UNKNOWN, Not connected / **Not configured**" | "Not configured" **was already removed** (collapsed to "Coming soon" by Brief 26). Empty state is already honest. |
| The per-dimension **contributor table** is the upgrade (§0.4) | The per-dimension rows are **already built** in `ScoreDetailPanel` (sleep/recovery/strain/metabolic, source attribution, trust-winner/DISAGREE/Manual/Active chrome, UNKNOWN-never-0) — **but the two things that make it Prompt 230 (G77 would-supply badge + per-row chevron→detail-view) are absent.** |
| Build Section 5 "in" `wearable-contributor.ts` / `bos-display.ts` | Those two files are **different things** (flat snapshot; source-level 9-contributor honesty). The real table is the `SCORE_DETAIL_DIMENSIONS → scoreDetailFromSnapshot → buildDimensionSourceRows → ScoreDetailPanel` chain. Building "in" them would **duplicate shipped work**. |
| Center column = detail panel; current state = "**inline expansion inside the Apple Health card**" (§4) | The source-detail content today is a **modal** (`AppleHealthImportModal`), not an inline expansion — and there is **no persistent center detail panel, no card-selection state, and no mobile sheet.** The prompt's center column is **net-new UI**, not the BOS ring. |
| "Reuse the **219b** upload component" (§4) | 219b is the **supplement label-photo** feature, not a shared uploader. No shared uploader exists. The Apple/Hume XML import is bespoke. Requirement is mis-specified. |
| Adopt official **brand marks** (§7) | Today the 4 wearables render as **generic Lucide icons** — no logos, no assets, no hotlinks. That is the *safest possible* G74 posture. Section 7 would **introduce** legal exposure where there is currently none. |

**Bottom line: the honesty + data plumbing is ~2/3 shipped and test-locked; the core UI restructure (§2 3-column, §4 selection + detail panel, §5 G77 + chevron) is genuinely un-built.** The design must be re-scoped to that restructure + a short list of real fixes.

---

## 1. Section-by-section status (built / partial / absent)

- **§2 Three-column layout** — **PARTIAL / net UI work.** Live is 2-column (`grid-cols-1 min-[1280px]:grid-cols-2`): col1 = `WearableTileCard` stack (sources); col2 = `ScoreDetailPanel` (BOS ring + contributor rows *merged*). The real relayout is more than "split the panel": add **card-selection state** (absent today), promote the source-detail **modal → a persistent center panel keyed to selection**, keep score+contributors on the right, add G77 there, add a **mobile sheet** (§2.3). ⚠️ **The 2-column layout is literally test-locked** (`connections-ia.test.ts:35` asserts `min-[1280px]:grid-cols-2`, from "Brief 26 1280 lock"). A 3-column redesign must amend the honesty suite the honesty work just added.
- **§3 Card anatomy** — **BUILT** (minus selection). `WearableTileCard` = icon, name, status dot+label, "Feeds…" secondary line, exactly one action per state. One-card-one-action enforced. **No selected-state** yet (§3.1 wants a 4-signal selected state). (The `ConnectionCard.tsx` the prompt points at is **orphaned dead code** with the wrong 3-action discipline — do not resurrect it.)
- **§4 Detail panel (center column)** — **NET-NEW.** The prompt's center column is the *active-source* detail panel (OAuth: provides/permissions/Connect; file: export instructions/dropzone/import-status; nothing-selected prompt). Today that content exists only as a **modal**; there is **no persistent panel, no selection wiring, no mobile sheet.** (The BOS ring in `ScoreDetailPanel` is column-3 material, not this.)
- **§5 Contributor table** — **BUILT rows, TWO real gaps:** (a) **G77** would-supply badge — absent; (b) **per-row chevron → dimension detail view** (§5) — absent (`ScoreDetailPanel` has no per-row drill-in; only DISAGREE `detail` text).
- **§6 Empty/UNKNOWN** — **PARTIAL.** UNKNOWN-never-0 + honest empty state built and test-locked. But **§6.1 "say it once" is violated**: UNKNOWN disclosed 6+ times, `CONNECTIONS_FOOTER` rendered **twice**. Real low-risk copy fix.
- **§7 Brand marks** — **absent by design** (Lucide icons). Adopting marks is net-new + legal exposure. See gate recs.
- **§8 Tokens** — **PARTIAL / violated.** 13 inline-hex sites in `WearableTileCard.tsx` + `ScoreDetailPanel.tsx` (`#2DA5A0/#B75E18/#1A2744/#1E3054`). `Card #1E3054` has **no** Tailwind utility (only `--card`); `font-instrument` is a raw CSS class not in Tailwind. Prompt's own §11 refuses completion on any inline hex — currently failing.
- **228 state contract** — **absent on this surface.** `stateContract228.ts` exists (in nutrition) but `load()` has no timeout, swallows `!res.ok`, no loading/error UI.
- **219i per-panel error boundaries** — **absent on this surface.** `AdminPanelErrorBoundary` exists platform-wide; nothing wraps the connections panels.

---

## 2. The genuine, un-built deliverable

**G77 — "which device would supply this dimension when none is connected" — is NOT BUILT.** This is the headline value of Prompt 230 (its own §0.4) and the one thing that is actually missing. Empty rows render only "UNKNOWN" with no would-supply hint. The inverse map (device→advertisedDimensions) exists as raw material but is wrong-direction and only shown when connected.

**This is also what makes a third column test-legal:** the honesty suites forbid invented content, so a third column needs *genuine* data. The G77 "what each dimension needs / what would fill it" content is exactly that. **G77 and the 3-column relayout are naturally the same deliverable.**

The full un-built restructure is therefore: **card-selection state** → **persistent center detail panel** (promote the modal) → **G77 would-supply badges** + **per-row chevron → dimension detail view** on the right → **mobile sheet** (§2.3) + conditional column order (G76). Everything else is fixes/cleanup.

**Residual honesty nit (in-scope, small):** tapping a Coming-soon Whoop/Oura tile can fire a toast `"WHOOP is not configured yet."` / `"Oura is not configured yet."` (`ConnectionsSurface.tsx:45,51`). The status pill is clean, but §11 forbids "Not configured" reaching a consumer — soften the toast copy to match "Coming soon."

---

## 3. Real bugs found in the shipped upload flow (higher value than layout)

`AppleHealthImportModal` (the bespoke XML import) has three genuine defects that violate the honest-data ethos:
1. **Fail-open success:** server returns HTTP 200 + `{status:'error'}`; client checks only `res.ok` → **failed imports render "Import complete."** (fabricated success)
2. **Always-0 counts in the modal summary:** server `records_ingested` (snake) vs client `recordsIngested` (camel) → **the modal's success summary always shows 0** (the tile-subtitle path was not traced and may read the real persisted count).
3. **No timeout** on upload/parse → modal can hang in a spinner (violates repo resilience rule / 228).

These are fixes, not rebuilds, and arguably more important than the cosmetic relayout.

---

## 4. Correctness & dead-code notes (surgical, since we're in these files)

- **Precedence is a no-op.** The Prompt-212 `DEFAULT_PRECEDENCE` table + `pickByPrecedence`/`getPreferredProvider` are **dead code** (never called outside tests). The value a user sees is decided by **Arnold trust** (surface) and **newest-row-wins** (BOS scoring) — two other systems on a different taxonomy. Whoop & Oura both default to 0.85 trust → sleep/recovery are **averaged**, never a device pick. BOS same-day ties are nondeterministic. Latent, likely out of presentation scope — flag, don't fix here.
- **Dead modules to mention (don't delete without approval):** `ConnectionCard.tsx`, `connection-registry.ts` (Prompt 85, orphaned), unused `appleStatusLabel()`.
- **Stale catalogs:** `connection-registry.ts` (12 sources) and `tokenManager.ts` (16, incl. Garmin/Fitbit/Withings) drift from the honest 4-tile reality. Dead scaffold.
- **Dead prop:** `lastUpdatedAt` is fetched, stored, passed to `ScoreDetailPanel`, never rendered.
- **Six coexisting dimension vocabularies** (4 display / 8 WearableDimension / 7 MetricKey / 9 BosNamedContributor / 7 EngagementLever / 5 TrackedDimensions). No canonical list. Reconciliation is bigger than Prompt 230.

---

## 5. Integration reality (item 4)

| Integration | Built | Provisioned our side | User-connectable today | Honest status shown |
|---|---|---|---|---|
| Apple Health (web XML) | ✅ | ✅ | ✅ (XML upload, consent-gated) | Connected via XML |
| Hume Body Pod | ✅ (tagged XML only, no OAuth) | n/a | ✅ (via Apple Health export tagged hume) | Not connected → Connected when humeIngestCount>0 |
| Whoop | ✅ (full OAuth v2) | ❌ blank secrets (test-enforced) | ❌ | **Coming soon** |
| Oura | ✅ (full OAuth v2) | ❌ blank secrets | ❌ | **Coming soon** |
| Google Health Connect | ✅ | ❌ double-gated (flag off + no creds) | ❌ | **Coming soon** (flipped today; no tile) |

Anti-fake-connect guard holds: a leftover token row can never fake "Connected" (`isOAuthConnected` needs configured+status+has_tokens).
⚠️ Whether Whoop/Oura/Google secrets are *actually* absent in **production Vercel env** is out of source-audit scope — needs a Vercel check before certifying "Coming soon" as factual.

---

## 6. Gate recommendations

- **G73 (status taxonomy):** PASS — already built + test-locked. Residual = rename "Needs reconnect" → "Needs attention" (or record the deviation); optionally unify the two taxonomies (wearable tiles vs plugin apps).
- **G74 / G78 (brand marks, Lex):** **Recommend NOT adopting brand marks.** Today's Lucide-only posture is the safest; adding licensed marks creates legal exposure + a blocking Lex gate for cosmetic gain. Keep Lucide, record the decision. (Real G74 risk lives on the *adjacent* `/plugins` page, not here.)
- **G75 (dimension list):** **Needs an explicit call.** Six vocabularies coexist and there is no canonical list. The prompt's default ("expand to the full set the score uses") has no well-defined referent. Realistic choice: **keep the 4 display dims** (sleep/recovery/strain/metabolic) or **adopt the 7 MetricKeys** (hrv/sleep/resting_hr/recovery/workouts/body_composition/steps). Do **not** try to reconcile all six lists inside Prompt 230.
- **G76 (mobile order):** Cheap to implement once 3-column lands.
- **G77 (would-supply badge):** **The one thing to actually build.**

---

## 7. Governance questions for Gary (cannot resolve from prompt/code)

1. **Deploy target / branch.** Shared checkout is on a stale 2-month-old feature branch; production is `origin/main` (553 commits ahead). I'll build on a fresh worktree off `origin/main` per "direct push to main" — confirm.
2. **Does Prompt 230 supersede Brief 26's 1280 two-column lock?** The 3-column requirement contradicts a just-landed, test-locked decision. This is a governance call, not a code question.
3. **Given ~70% is already shipped, what should Prompt 230 actually be?** Recommended re-scope: (a) build **G77** + split to 3-column; (b) fix the **3 upload bugs**; (c) **§6.1** collapse UNKNOWN to one disclosure; (d) **§8** token cleanup; (e) wire **228 + 219i**; (f) **skip §7 brand marks**. Cleanup (dead modules) optional.
