# FormaVision V2 Series Charter and Roadmap (Prompt 211)

Filed 2026-07-09 as the standing reference for the FormaVision V2 series. No code ships from
this charter; 211a through 211d ship the code. Each lettered prompt is additive to the
completed V1 (210 series) and may not regress it.

| Field | Value |
|---|---|
| Project | ViaConnect Web (viaconnect-web) |
| Stack | Next.js 14+ / TypeScript / Tailwind / Supabase (nnhkcufyqjojdbvdrpky) / Vercel |
| Module owner | Arnold (Body Tracker) under Jeffery orchestration |
| Build crew | Jeffery, Michelangelo (OBRA), Sherlock (competitive verification + audit), Arnold (data + telemetry), Gordon (all nutrition computation), Hannah (copy + guided moments), Kelsey (compliance, claims, privacy) |
| Classification | Series charter and roadmap. Gary receives gate-cleared results only |
| Depends on | The full 210 series closeout. See "Filing-status dependency note" below |
| Author | Gary Ferenczi, Founder and CEO |
| Companion file | [211-competitive-matrix.md](211-competitive-matrix.md) (Appendix A, Sherlock-maintained at every merge) |

## 0. Standing rules for the entire 211 series (non-negotiable)

Every lettered prompt inherits these.

1. Lucide React icons only at strokeWidth 1.5. No emojis in code, UI strings, logs, or copy.
2. No em dashes and no en dashes anywhere (code, comments, test names, UI copy). Hyphens in compound words are fine. grep the diff before shipping.
3. Design tokens only: Deep Navy #1A2744, Card #1E3054, Teal #2DA5A0, Orange #B75E18, Instrument Sans. Status colors via severityToken. Agent names via getDisplayName. Gordon slug lowercase gordon.
4. Desktop and mobile in synchronism, responsive Tailwind from the first line.
5. Append-only Supabase migrations, rollback run_ids archived. Never edit an applied migration, never touch email templates. package.json locked without Gary's explicit approval.
6. Resilience everywhere: Promise.race 3 to 5 second timeouts, reason-tagged fail-open, structured logging. The 210d guardrails (types, drift check, migration parity, strict mode in pre-prod) stay green on every branch.
7. UNKNOWN and estimated stay honest, never 0, never fabricated. Honest disabled states are never flipped to look finished.
8. Bio Optimization Score is the only score name. Bioavailability copy at 10x to 28x where present. Helix is consumer only, invisible to practitioners. Gordon owns all nutrition computation as sole source of truth.
9. No medical claims. No accuracy claim in product or marketing before the 211b harness pass on a held-out cohort. Kelsey clears every claim, disclaimer, and privacy string.
10. The V1 fallback ladder (cinematic, lite, 2D floor) and the one-source-of-truth rule (avatar equals cards equals vector) are never at risk. Any 211 feature that cannot hold them does not ship.

## 1. The strategy in one paragraph

ZOZOFIT owns shape, virality, and goal visualization. Hume owns metabolic depth, published
accuracy, and the clinical channel. FormaVision's unfair advantage is the platform around it:
genetics, a real nutrition engine, protocols and commerce, agents, and one unified score. The
series runs in strict strategic order. 211a ships the growth engine and the parity pack so no
user churns for a table-stakes gap. 211b makes FormaVision the most trusted scanner on the
market by proving and publishing accuracy and by being statistically honest. 211c closes the
loops nobody else can close, goal to plan and behavior to result. 211d activates the moat no
competitor can copy: genetics, the future self, privacy leadership, the practitioner channel,
and the AR moment.

## 2. The series map

| Prompt | Theme | Ships | Depends on |
|---|---|---|---|
| 211a | Growth and parity | Shareable transformation video, health platform sync, PDF and doctor report, scan cadence and consistency coaching with Helix streak | V1 closeout |
| 211b | Trust and accuracy | Ground-truth cohort run and the published accuracy claim, statistical honesty (minimum detectable change, confidence bands), per-user calibration fusion, cycle-aware modeling | 211a telemetry live, 210c harness |
| 211c | Loop closers | Interactive goal body wired to Gordon and protocols, causal attribution (scans versus adherence), posture and asymmetry module, upgraded agent-guided journey | 211b honesty layer |
| 211d | Moat activation | Genetics overlay live, future-self trajectory live, privacy leadership (on-device extraction, photo deletion), practitioner monitoring loop, AR moment | 211c, GENEX P0-7 outcome, trajectory signal |

Order is binding. A later prompt may begin only when the earlier one has merged on its
acceptance, because each layer depends on the credibility and data of the one before it: a
viral clip is only safe to amplify once telemetry watches it, a goal body is only honest once
minimum detectable change exists, a genetic overlay is only launchable once trust is
established.

## 3. Sequencing rationale (why this order wins)

- Growth first because the shareable morph clip is the single largest organic acquisition lever in this category, proven by the competitor clip that started the entire FormaVision 3D program, and every later feature benefits from the users it brings.
- Trust second because the accuracy claim and statistical honesty convert new users into believers, and because 211c goal projections and 211d genetic framing are only responsible on top of proven error bands.
- Loops third because goal-to-plan and behavior-to-result attribution are the retention engine, and they need the honesty layer to avoid overpromising.
- Moat last because genetics and the future self are the announcements that define the brand, and they land hardest when the product beneath them is already the most trusted scanner on the market.

## 4. Cross-series invariants verified at every merge

- The 210e E2E suite, extended by each prompt with its new seams, runs green including visual regression and reduced-motion parity.
- The vision-walk smoke passes on both platforms after each merge.
- Telemetry events for every new surface land in the 171-series dashboards before the prompt closes.
- Kelsey signs the compliance sweep per prompt. Copy locks hold everywhere.
- The competitive matrix (companion file) is updated by Sherlock at each merge so positioning claims always match shipped truth. A cell moves to Shipped only with evidence.

## 5. Escalations reserved for Gary across the series

- Any new dependency or model (each lettered prompt carries its own gate, routed to Gary only).
- The public wording of the accuracy claim and the methodology whitepaper (211b).
- The go-live of genetics and future self as marketed features (211d), including announcement timing.
- Any practitioner-facing pricing or packaging decision arising from 211d.
- Any cell of the competitive matrix used in investor or Nexus materials before its feature is Shipped.

## 6. Deliverables of the charter

- This charter as the standing reference for the series, filed with the library.
- The competitive matrix (companion file) as the single positioning source for investor and Nexus conversations, maintained by Sherlock at every merge.
- The four lettered prompts, 211a through 211d, delivered alongside this charter.

## Positioning sentence (external use, once the series ships)

The only body scanner that needs no hardware, publishes its accuracy, tells you what is real
change and what is noise, turns your goal into a plan, and reads your genetics, in one platform
that acts on the result.

---

## Filing-status dependency note (controller, 2026-07-09)

This note is filing metadata, not part of the authored charter. It records the state of the
dependencies the charter binds against, at filing time.

- V1 shipped and closed out: 210 (foundation avatar, data contract, 2D floor), 210a (parametric mesh, first-scan read), 210b (eight-phase flagship + telemetry, analytics_events live), 210c (scan-accuracy pipeline + confidence model + validation harness). All merged to main.
- 210d (schema-integrity guardrails, strict mode, reason-tagged fail-open) and 210f (P1 executions) merged to main 2026-07-08. The guardrails the Section 0 rule 6 depends on are live in CI.
- OPEN, load-bearing for 211a: **210e (E2E integration + vision acceptance) is planned, not built.** Its seam map is filed (docs/formavision/210e-seam-map.md) and its execution plan exists (docs/superpowers/plans/2026-07-09-prompt-210e-e2e-integration.md), but the E2E suite, the seam matrix, and the vision-walk stabilization the Section 4 invariants require do not exist yet. Section 4 states the 210e E2E suite is "extended by each prompt," so 211a cannot verify its merge invariants until 210e has merged. Recommendation: complete 210e before 211a begins, or 211a's first task absorbs the 210e E2E scaffold. Gary's call at 211a kickoff.
- 210c harness (211b dependency) exists and is verified runnable; the labeled ground-truth cohort arrives per the 210c protocol and is a 211b input, not a blocker to charter filing.
- GENEX P0-7 outcome (211d dependency) is satisfied: the GENEX import path was repaired and applied (user_variants risk_level/category live) during the 210d/210f wave.
