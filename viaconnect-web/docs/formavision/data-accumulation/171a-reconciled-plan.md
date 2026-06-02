# Prompt 171a Reconciled Plan: Opt-In Anonymized Data Accumulation

Entity: Farmceutica Wellness Ltd. Platform: ViaConnect (Via Cura consumer brand). Owner agents: Arnold (Body Scan and Body Tracker), Marshall (privacy compliance), Sherlock (ML pipeline orchestration when it exists).
Status: PLANNING ARTIFACT, drafted 2026-06-02. No code. 171a builds the framework that turns body-scan usage into a training-data asset for the Phase 2 composition models. This doc reconciles 171a to the REAL codebase, separates what is buildable now from what is Phase 2 gated from what is counsel gated, and lists the decisions. Two facts shape everything: 171a is largely PREMATURE (the models it feeds do not exist), and it is the most legally sensitive prompt in the roadmap (it stores biometric-derived data under BIPA, GDPR Article 9, CUBI, and state biometric law). Nothing here stores real user data; that go-live is a hard counsel and Gary gate.

## 1. The two defining realities

### 1.1 Premature: the models it feeds do not exist
171a accumulates training data for the composition CNN, the weight-prediction CNN, the segmental CNN, and the multi-view SMPL-X fitting engine. NONE of these exist. They are Phase 2, behind three gates that are ALL unmet (see docs/formavision/phase-2-dependency-gates.md): Gate A (SMPL-X license or GHUM), Gate B (the Tier B DEXA cohort), Gate C (native depth plugins). Today the scan pipeline is MediaPipe BlazePose plus Navy and CUN-BAE math, the avatar is a primitive parametric mesh, and the tier resolves to Tier 1 only. So:
- The retain_depth_data toggle is for depth capture that does not exist (Gate C).
- The retraining cadence, DP-SGD, bias-audit runner, synthetic SMPL-X augmentation, model cards, and federated learning all operate on models that are not built.
- The MAE-versus-DEXA metrics need both the trained model AND the Tier B cohort.

The ONLY non-premature part is the accumulation FOUNDATION (consent, anonymization, storage, withdrawal): you start accumulating consented anonymized data BEFORE the models exist, so a corpus is ready when Phase 2 training begins. That is the legitimate, timely core.

### 1.2 Legally sensitive: this stores biometric-derived data
171a persists anonymized silhouettes, measurements, and composition values into a training corpus. That is regulated biometric data under BIPA (Illinois), GDPR Article 9 (special-category data), CUBI (Texas), Washington My Health My Data, and other state laws. This is literal BIPA class-action territory. Consequently:
- The consent text, the anonymization guarantees (HMAC, k-anonymity, differential privacy), the BIPA Section 15 recordkeeping and retention disclosure, and the 30-day withdrawal SLA all require counsel review BEFORE any real user data is stored.
- The 500 Helix opt-in incentive (Section 2.3) is itself a legal question: incentivizing biometric consent can undercut the "freely given" requirement under GDPR and the BIPA written-release standard. Counsel must bless the incentive design or it is dropped.
- 171a names Marshall for privacy compliance, Section 10 builds an audit trail, and Section 15 asks for an external counsel audit. Treat go-live as gated on a signed counsel review, the same posture as the BAA and COPPA items already pending.

## 2. Phantom to real reconciliation

| 171a reference | Reality |
|---|---|
| formavision_training_consents, formavision_consent_withdrawals, formavision_bias_audits | Phantom prefix. Use body_scan_training_consents, body_scan_consent_withdrawals, body_scan_bias_audits (the real convention, matching biometric_consents and the body_scan_ family) |
| The base "single model_improvement_opt_in boolean" to expand | REAL: public.biometric_consents.model_improvement_opt_in (169b, migration 20260516000070). 171a expands this one boolean into six toggles |
| src/services/anonymization/, src/services/training-consent/ | src/services does NOT exist. Use src/lib/body-tracker/anonymization/ and src/lib/body-tracker/training-consent/ |
| src/modules/body-tracker/formavision/components/* | src/modules does NOT exist; the FormaVision rebrand does not exist. Use src/components/body-tracker/ |
| user_profiles (the bias-audit RLS role check) | Real table is profiles; the role column lives there |
| Composition CNN, weight CNN, segmental CNN, SMPL-X fitting | Do not exist. Phase 2, Gates A/B/C unmet |
| Tier 2 and Tier 3, depth maps, ARKit/ARCore depth | No depth plugins; tier resolves to 1. Phase 2, Gate C |
| Dr. Fadi Dagher (bias-audit clinical interpretation) | Name an individual only after Gary's attribution sign-off; until then use the role "clinical lead" |
| infrastructure/training-pipeline/*.py, TensorFlow Privacy / Opacus, Modal/SageMaker | External ML pipeline and dependencies. package.json change locked; needs Gary approval. Phase 2 |

## 3. Section-by-section triage

| 171a section | Disposition | Notes |
|---|---|---|
| 2 Granular six-toggle consent | BUILDABLE (UI plus table); copy + go-live COUNSEL-GATED | Expand biometric_consents.model_improvement_opt_in into the six-row body_scan_training_consents model. The consent text is counsel-drafted |
| 2.3 Consent screen + 500 Helix incentive | BUILDABLE shell; the incentive is COUNSEL-GATED | The freely-given-consent question must clear counsel before the incentive ships. Helix stays consumer-only |
| 2.4 / 2.5 / 2.6 Storage, versioning, settings | BUILDABLE | Append-only consent table, version env var, Settings > Privacy panel |
| 3 Three-layer anonymization | BUILDABLE; guarantees COUNSEL-REVIEWED | HMAC de-id (Supabase Vault secret), quasi-identifier generalization, k-anonymity (k=5), EXIF strip + downsample. sharp is already approved (Prompt 106) for EXIF/resize, so no new dep |
| 3.4 HMAC key in Vault | BUILDABLE | Server-only secret, never client, annual rotation |
| 4 Differential privacy (DP-SGD, DP aggregation) | PHASE 2 | DP-SGD is a training-time mechanism; there is no model to train. Needs the ML framework (package.json) and the Phase 2 models |
| 5 Right to be forgotten (withdrawal cascade) | BUILDABLE; 30-day SLA COUNSEL-REVIEWED | Withdrawal table + the cascade job. The corpus-removal step is real once the corpus stores data |
| 6 Continuous retraining cadence | PHASE 2 | No models, external ML platform, package.json |
| 7 Automated bias auditing | TABLE buildable; RUNNER Phase 2 | body_scan_bias_audits schema is buildable; the audit runner audits models that do not exist |
| 7.5 Public model card at /formavision/model-transparency | PHASE 2 | No model to describe; publishing a model card now would be a fabricated artifact |
| 8 Synthetic augmentation (SMPL-X, SURREAL) | PHASE 2 | Needs SMPL-X (Gate A) |
| 9 Federated learning | PHASE 2 plus | Deferred by 171a itself to ~Q2 2027 |
| 10 Compliance documentation trail | SCAFFOLD buildable; CONTENT counsel | The directory structure and the templates are buildable; the legal content is counsel-authored |
| 11 Strategic velocity metrics | PARTIAL | Corpus-size metric is real once accumulation starts; the MAE-versus-DEXA and bias-parity metrics need the Phase 2 models + Tier B |

## 4. The buildable-now foundation (reconciled), if and when authorized

This is the accumulation foundation. It can be BUILT now but must ship INERT (storing no real data) behind a flag until counsel signs off the consent and anonymization and Gary clears go-live.

- Schema migration (append-only; number it after the live chain, clear of #170's 120010 lane and 169f's 140-200): body_scan_training_consents (the six toggles, version, ip_hash, user_agent, supersession chain, withdrawn_at; append-only; RLS owner all with USING and WITH CHECK), body_scan_consent_withdrawals (the withdrawal audit; RLS owner select), body_scan_bias_audits (immutable audit rows; RLS admin/compliance/clinical-lead select via profiles.role).
- Anonymization library (src/lib/body-tracker/anonymization/): de-identification (HMAC-SHA-256 research id, server secret), quasi-identifier-generalization (age 5-year bands, region not city, ethnicity broad category, time-of-day bucket), k-anonymity-enforcement (k=5 floor), silhouette-downsampler (256x256 binary mask), depth-downsampler (64x64, Phase 2 input shape only), exif-stripper (via sharp).
- Training-consent library (src/lib/body-tracker/training-consent/): consent-flow, consent-storage, withdrawal-cascade, version-management (the reprompt at every tenth scan logic).
- UI (src/components/body-tracker/): the six-toggle consent screen surfaced at the third successful scan, the Data Sharing settings panel, the withdrawal confirmation. Lucide strokeWidth 1.5, getDisplayName, no emojis, consent copy as counsel placeholders.
- Edge functions (supabase/functions/, with 30s/8s timeouts, try-catch fail-open, structured safe-log): the anonymization-pipeline (post-scan processing) and the withdrawal-fulfillment job. The corpus-snapshot and bias-audit-runner functions are Phase 2.
- A FEATURE FLAG that disables all corpus WRITES until counsel and Gary flip it. The consent UI may collect choices into the consent table (which is benign metadata), but NO silhouette/measurement/composition is written to a corpus until the flag is on.

## 5. The Phase 2 deferred apparatus

Hold until the Phase 2 models exist (Gates A/B/C) and the ML dependencies are approved: DP-SGD training, the retraining cadence and orchestrator, the bias-audit runner, synthetic SMPL-X augmentation, the public model cards, federated learning, and the infrastructure/training-pipeline Python scripts. Building these now would instrument and audit models that do not exist.

## 6. Counsel checklist (the hard legal gate before any go-live)

No real biometric-derived data is stored until counsel signs off, in writing, on all of:
1. The six-toggle consent text (BIPA written-release standard, GDPR Article 9 explicit consent, plain-language per-toggle descriptions).
2. The anonymization guarantees: that the HMAC research id, the k=5 generalization, and the DP posture meet "anonymized" under BIPA/GDPR/CUBI (and whether k=5 is sufficient or k=20 is required for a health-adjacent corpus).
3. The 500 Helix incentive: whether incentivizing biometric consent is compatible with "freely given" consent, or whether it must be dropped or restructured.
4. BIPA Section 15 recordkeeping, the public retention schedule, and the 30-day withdrawal SLA.
5. The right-to-be-forgotten policy in Section 5.2 (not retroactively retraining), confirmed against EDPB and FTC guidance for the disclosure.
6. The subprocessor list (any ML platform that touches the corpus) and the CCPA/CPRA no-sale posture.
7. Whether storing the corpus at all before a model consumes it changes the retention or purpose-limitation analysis.

## 7. Decisions for Gary (most are Phase 2 or counsel)

- Engage counsel for the Section 6 review. This is the gating decision; everything else waits on it.
- package.json: the ML dependencies (TensorFlow Privacy or Opacus and the pipeline) are Phase 2 and locked; no approval needed yet.
- Section 15 items, mostly Phase 2: the DP-SGD framework choice (couples to the Phase 2 model architecture), synthetic-data timing (Phase A uses SURREAL plus SMPL-X manipulation; the 3D scanning lab is a Phase C Series-A item), the Helix incentive amount (subject to the counsel freely-given finding), the privacy-budget bound (epsilon 20 cumulative), and the external-audit cadence and firm.
- The Dr. Fadi Dagher attribution sign-off (recurring across 171 and 171a).

## 8. Sequencing

1. Counsel reviews Section 6. (Gating.)
2. If cleared, build the Section 4 foundation INERT behind the flag, with the counsel-approved consent text dropped into the placeholders.
3. At launch + 30 days (the 171a activation), and only after counsel clears it, flip the flag to begin accumulation. The corpus is inert until then.
4. When the Phase 2 models exist (Gates A/B/C) and the ML dependencies are approved, build the Section 5 training apparatus and the model cards against the accumulated corpus.

## 9. Honesty guardrails

- No real biometric-derived data is stored without the Section 6 counsel sign-off. The foundation ships inert behind a flag.
- No model card, bias audit, or DP claim is published for a model that does not exist. No fabricated metrics.
- The corpus accumulates but trains nothing until Phase 2; the doc and any UI say so plainly rather than implying a live model is learning.
- All phantom names are reconciled to the real schema and paths; no body_scans, no formavision_ tables, no src/services or src/modules.
- Helix stays consumer-only; the incentive is gated on the counsel freely-given finding.
