# FormaVision Competitive Matrix (Appendix A of the 211 Charter)

The single positioning source for investor and Nexus conversations. Companion to
[211-formavision-v2-charter.md](211-formavision-v2-charter.md).

Owner: Sherlock. Sherlock updates this table at every 211 merge so positioning always matches
shipped truth. A cell moves to Shipped only with evidence.

Status values: **Shipped** (live today), **211a / 211b / 211c / 211d** (building in that
prompt), **None** (competitor lacks it). Competitor columns reflect their shipped products as
verified July 2026 (ZOZOFIT app and suit; Hume Body Pod and app).

Governance: only Shipped cells may be used unqualified in external materials. Any cell used in
investor or Nexus materials before its feature is Shipped is a Gary escalation (charter Section
5).

| Capability | FormaVision (Via Cura) | ZOZOFIT | Hume Body Pod |
|---|---|---|---|
| Capture method | 4 photos, no hardware | Phone scan, suit for best accuracy | BIA hardware scale with hand sensors |
| Hardware required | None. Shipped | Optional suit | Required pod |
| 3D avatar | Parametric wireframe, cinematic, data-true. Shipped | 3D mesh viewer | None |
| Journey animation | Time machine morph across full history. Shipped | Side-by-side, BodyMorph video | Trend graphs only |
| Shareable transformation video | Shipped, partial (WebM on desktop and Android; iOS shareable card in progress) | Shipped (BodyMorph) | None |
| Measurement regions | 12 circumferences plus segments. Shipped | 16 locations | Segmental BIA (arms, legs, torso) |
| Body fat method | Photo AI estimate with confidence. Shipped | Navy method from measurements | 8-electrode multi-frequency BIA |
| Published accuracy | 211b merge ships the validation machinery, cohort schema, held-out harness, and public methodology (whitepaper draft). The accuracy figure itself is GATED on a real labeled held-out cohort plus Gary's explicit sign-off, neither of which exist yet. Not Shipped; no number to cite externally. | 0.15 inch average error, with suit | DEXA correlation claims |
| Statistical honesty (noise versus real change) | 211b merge ships the minimum-detectable-change engine, within-noise classification, trend confidence bands, plateau detection, and spike softening as live machinery behind honest states. Pre-launch production data is mostly empty, so this is honest-state machinery, not a demonstrated live accuracy claim. | None | Trend averages only |
| Per-user calibration fusion (scale, wearable, DEXA anchor) | 211b merge ships the fusion machinery (scale via Prompt 201, guided tape entry, DEXA import) and the honest tightened or not-tightened consumer display, evaluated by its own fusion-mode harness. Pre-launch, most users carry no anchor data yet, so this is machinery, not a live accuracy claim. | None | Own hardware only |
| Cycle-aware modeling | 211b merge ships the opt-in cycle-context data model, phase-aware classification wrapper, and pregnancy-mode composition suppression (fails closed). GATED on Kelsey clinical and sensitivity clearance before any user-facing surface ships. | None | None |
| Goal setting per region | 211c | Shipped | Goal weight only |
| Interactive goal body with generated plan | 211c (goal body plus Gordon plan plus protocol) | Goal Simulator (shape preview only) | None |
| Nutrition logging | NutriVision photo AI, Gordon-scored. Shipped | AI food journal (photo, barcode) | Meal scoring |
| Causal attribution (behavior to body result) | 211c | None | None |
| Posture and asymmetry | 211c (asymmetry data already in pipeline) | Posture Mode, 8 points | Segmental imbalance |
| Genetics-informed body insights | 211d (GENEX360) | None | None |
| Future-self trajectory avatar | 211d | None | None |
| Protocol and supplement action loop | Shipped platform, avatar tap-through in 211c | Workout video suggestions | Content articles |
| AI coaching | Named agents, Kelsey-cleared, protocol-connected. Shipped, upgraded 211c | Generic smart assistant chat | AI insights (Pro.f) |
| Unified health score | Bio Optimization Score. Shipped | None | Health scores |
| Health platform sync | 211a foundation (flag off by default; iOS write pending a write-capable plugin, Android partial) | Shipped | Shipped (plus Fitbit, Garmin) |
| PDF and doctor report | Shipped (one-source with the app; non-dismissible AI-estimate disclaimer) | Shipped (PDF stats) | Shipped (doctor share) |
| Practitioner channel | 211d (in-platform practitioners, software only) | Trainer use informal | B2B hardware to clinics |
| Privacy posture | 211d headline (on-device extraction, photo deletion, vector-only persistence) | Cloud processing | Encrypted, HIPAA-grade storage |
| Gamification and streaks | Helix, consumer only. Streak Shipped | None | Community |
| AR experience | 211d (past self and goal body in AR) | None | None |
| Accuracy guardrail culture (UNKNOWN, never fabricate) | Shipped, series-wide invariant | None stated | None stated |

## Maintenance log

| Date | Editor | Change | Evidence |
|---|---|---|---|
| 2026-07-09 | Charter filing | Baseline matrix filed from Prompt 211 Appendix A | Prompt 211 charter |
| 2026-07-11 | 211a merge | Doctor report and streak moved to Shipped; shareable video to Shipped-partial (iOS card follow-up); health sync recorded as 211a foundation, NOT Shipped (iOS write pending a write-capable plugin) | Branch feat/211a-growth: opus whole-branch review clean, 1254 tests green |
| 2026-07-14 | 211b merge (prepared) | Published accuracy, statistical honesty, per-user calibration fusion, and cycle-aware modeling cells updated to describe what 211b actually ships: the trust MACHINERY (cohort schema, held-out harness, claim gate, MDC and noise engine, trend bands, fusion service, cycle and pregnancy gating) behind honest gated or empty states. None of these four cells moved to Shipped. The published accuracy NUMBER remains gated on a real held-out cohort plus Gary's sign-off (does not exist yet). Cycle-aware modeling additionally remains gated on Kelsey clinical clearance before any user-facing ship. | Branch feat/211b-trust: all 18 tasks per-task reviewed clean; final whole-branch review pending; 1545 tests green; 3 merge-deferred migrations |
