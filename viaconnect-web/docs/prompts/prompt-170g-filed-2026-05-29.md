# Prompt 170g Filed: Custom Model Fine-Tune, LoRA on Open Base Vision-Language Model

Date: 2026-05-29
Status: **Filed at spec level; ratified.** NO code work. NO Hannah dispatch.
Memorialized by: Jeffery (orchestrator).

## Mission (one line)

Once user_meal_corpus reaches 50,000 opted-in trainable samples, fine-tune a private vision-language model on the corpus via LoRA, host on Modal Labs, and roll out via A/B testing in front of the LogMeal-Gemini-Claude stack to unlock 5-15pp accuracy lift, 90% cost reduction, 5x latency improvement, and a strategic AI differentiation asset.

## Why this filing posture differs from 170d, 170e, 170f

Three structural differences justify a memorialize-only posture (no Hannah dispatch, no schema migrations, no code stubs):

1. **Spec §1.4 explicitly directs "Filed. Not scheduled."** > "Jeffery does not schedule Blueprint until Gordon confirms the threshold is met." This is unique among the 170-series filings; 170d/170e/170f filings invited parallel UX preparation, but 170g explicitly defers everything.

2. **UI surface is intentionally minimal per §12.** The training consent toggle + revoke modal (§12.1) is a single Settings row with a confirmation modal. The /admin/corpus Model Versions tab + Rollout dashboard (§12.3, §12.4) is Arnold-scope, not Hannah-scope. No flow choreography or card design pattern requires pre-build wireframing.

3. **Owner block in spec preamble omits Hannah entirely.** Gordon owns corpus governance + base model selection + cuisine balance + bias audits. Michelangelo owns the new Python training repo + inference integration. Arnold owns the admin surfaces. No UX agent is named.

## The non-negotiable prerequisite

Corpus must reach **50,000 trainable samples** per §3.1 definition:
- `contributed_photo_path` non-null (research opt-in per Prompt 170 §2.5.3)
- New `training_consent` column set (this prompt's §3.4, §10.4)
- `user_modified = true` OR `meal_confidence >= 0.85` (ground truth quality)
- Schema-compatible row version
- pHash-deduplicated against the training set

**Current state: corpus at zero.** 170 Phase 1 shipped 2026-05-29 commit `47a7663d`; production telemetry begins ramping today. Projected 4-6 months until threshold per §0 Status.

## Corpus threshold trigger detail per §3.2

| Sample count | Recommended action |
|---|---|
| Under 25,000 | Do not train. Quality inadequate. |
| 25,000 to 50,000 | Pilot training on Modal spot for hyperparameter exploration. No production deployment. |
| **50,000 to 100,000** | **First production-quality training run. Schedule 170g Blueprint.** |
| 100,000 to 250,000 | 2-5pp accuracy lift over 50k baseline expected. |
| Above 250,000 | Diminishing returns at LoRA rank 16; consider rank 32 or 64. |

## Operational decisions Gary will face when threshold approaches

These need acknowledgment from Gary before Blueprint kickoff. Filing them now so they're on the radar:

1. **New Python repo provisioning**: `C:\Users\garyf\ViaConnect2026\viaconnect-fine-tune` per §17.2. Separate codebase, separate dependency management (transformers + peft + torch + bitsandbytes via pyproject.toml). NOT inside Next.js app. Standing rule on package.json (main app) applies; pyproject.toml is separately scoped.

2. **Modal Labs account**: serverless GPU access (A10G default, upgrade to A100 if latency targets not met). Monthly budget cap recommended $1,500 covering training and inference per §25.7.

3. **Weights & Biases project**: for training metric tracking + bias audit report attachments per §6.4.

4. **Base model license review**: three candidates per §4.1:
   - Qwen2-VL 7B (Apache 2.0; cleanest license; multilingual)
   - LLaVA-1.6 Vicuna-7B (Apache 2.0 with Vicuna heritage; mature tooling)
   - Llama 3.2 Vision 11B (Llama Community License; 700M MAU threshold; most capable)
   Provisional ordering favors Qwen2-VL on license cleanliness. Final selection at Blueprint with measured benchmark numbers.

5. **GitHub repo creation** for `viaconnect-fine-tune` (separate from main app repo).

## Two-stage rollout strategy per §1.3

| Stage | Months post-fine-tune launch | Routes | Rationale |
|---|---|---|---|
| Stage 1 | 1-3 | Chain meals (170e) + recipe cache-miss (170f) | Cleanest evaluation surface; chain catalog + user-confirmed recipe = clean ground truth |
| Stage 2 | 3-6 | Open-domain meals | Gated on Stage 1 success metrics |

Each stage has its own 5-phase percentage rollout (5%, 25%, 50%, 80%, 100%) with 2-week gates. Plan for 10-12 weeks per stage. Stage 2 is its own initiative; spec §25.6 says "do not bundle Stage 2 into 170g v1 acceptance."

## Cost model (filed reference)

At 100k NutriVision meals/mo after Stage 2 mature rollout:

| Component | Monthly cost |
|---|---|
| Custom model inference (80k meals × $0.005) | ~$400 |
| LogMeal fallback (20k meals) | ~$1,000 |
| Gemini fallback | ~$60 |
| Claude Vision (capped) | ~$45 |
| Modal compute (training, quarterly amortized) | ~$100 |
| **Total** | **~$1,600** |

Compare to pre-170g baseline of ~$4,100/mo at 100k meals on LogMeal-Gemini-Claude. **60% reduction in monthly vision spend.** Combined with 170e (~$1,800/mo savings) and 170f (~$1,500/mo savings), the NutriVision cost stack at 100k meals could land at ~$1k/mo from a baseline of ~$5k/mo. Largest cumulative cost reduction in the platform.

## Composition with other NutriVision prompts

Every upstream prompt improves corpus quality and therefore 170g value:
- **170**: builds the corpus
- **170a + supplement**: hardens the pipeline that grows it
- **170b (depth sensors, when shipped)**: enriches it with depth-grounded portions
- **170d (multi-photo, when shipped)**: enriches it with multi-angle ensemble truth
- **170e (chain context, when shipped)**: enriches it with chain-grounded ground truth (Stage 1 routes chain meals to custom model)
- **170f (recipes, when shipped)**: recipe matches short-circuit before any provider (custom or open); custom model serves cache-miss

**170g composes most powerfully with 170e**: chain meals are the cleanest Stage 1 evaluation surface because chain catalogs provide ground-truth macros.

## Right-to-erasure honest framing per §14.2

When a user revokes training consent:
- Future contributions excluded from all future training runs
- Past contributions remain in already-trained models (we cannot surgically remove a single sample's influence from trained weights)
- Mitigation: quarterly mandatory retrain respects latest consent state; a revoked user's contribution drops out of production model within one quarter
- Account deletion: corpus rows hard-deleted within 30 days; trained models retain learned representations until retrained

**This is honestly framed in the consent UI**. We do NOT promise cryptographic erasure of trained weights. The supplement §17 voice posture (honest framing per Hannah) applies here too.

## Helix events (filed for 170g build phase)

To be inserted when 170g builds:
- `training_consent_granted` (5 pt — generous to encourage opt-in)
- `training_consent_revoked` (0 pt — no penalty for revoking, but logged for audit)
- `custom_model_meal_logged` (1 pt — when the custom model produced the recognition)

## Migrations filed (7)

To be applied when 170g builds:
- `corpus_snapshots.sql` — snapshot identifier + row IDs + SHA-256 hash for reproducibility
- `model_versions.sql` — version tag + base model + training metrics + adapter path + status enum
- `model_inference_logs.sql` — sampled inference logs (10% in production)
- `user_meal_corpus_training_consent.sql` — new `training_consent` column with partial index for hot training-set query
- `meals_model_version.sql` — `model_version_used`, `provider_used`, `cohort_bucket` columns
- `helix_custom_model_events.sql` — 3 new event rows
- `model_version_promotion_log.sql` — audit log for promotions and rollbacks

All append-only — no CHECK reconstitution exceptions in 170g.

## Three nested kill switches per §8.4

- `CUSTOM_MODEL_ENABLED` (master, default false until ratification)
- `CUSTOM_MODEL_STAGE_1_ENABLED` (default false)
- `CUSTOM_MODEL_STAGE_2_ENABLED` (default false)

Plus phase percentage controls `CUSTOM_MODEL_STAGE_1_PERCENT` and `CUSTOM_MODEL_STAGE_2_PERCENT` (both default 0). Every phase advancement is a deliberate Gary action via the admin dashboard with audit logging.

## Promotion gate per §16.3

A staged model promotes to production only when:
1. Held-out test set meets or exceeds current production on every cuisine bucket
2. Golden test set (Gordon's 200 manually-curated edge cases) does not regress
3. Gordon signs off on the cuisine balance report
4. Gary signs off on the training metrics summary
5. Smoke test of 100 random recent meals through staged endpoint passes

## Sequencing 170g still needs (in order)

1. **170 Phase 1 baked in production minimum 7 days with telemetry** ✓ in progress
2. **Multiple upstream prompts shipped** (each improves corpus quality):
   - 170d (multi-photo) shipped: filed only
   - 170e (chain context) shipped: filed only
   - 170f (recipes) shipped: filed only
3. **Corpus reaches 50,000 trainable samples** (the gating condition; 4-6 months projected)
4. **Gordon confirms cuisine balance check passes** per §3.3 (each cuisine bucket has ≥ 200 trainable samples or augmentation plan accepted)
5. **Gary approves new Python repo creation + Modal Labs account + W&B project**
6. **Base model license review memo** signed by Gordon, approved by Gary at Blueprint
7. **Pilot training run on 25k subset** (Modal spot pricing, hyperparameter exploration)
8. **Production training run on 50k+ corpus** passing gate criteria
9. **`CUSTOM_MODEL_*` kill switches ready** all defaulted false for launch margin

Then Michelangelo (training pipeline + inference integration) Workstream is unblocked.

## Why no Hannah dispatch this turn

UI surface enumerated in §12 is:
- §12.1 Training consent toggle in Settings (single row + confirmation modal). Settings page exists from §17+§20 builds. Copy can be authored at build time against the established Settings tone pattern; doesn't require pre-locked wireframes.
- §12.2 Optional "Powered by ViaConnect AI" badge (filed for future, not v1 acceptance).
- §12.3 Admin Model Versions tab (Arnold-scope; admin dashboard pattern from /admin/corpus already established).
- §12.4 Admin Rollout dashboard (Arnold-scope).

None of these require Hannah's flow-choreography expertise. Standing-rules locked (Settings tone from supplement §17/§20, admin pattern from /admin/corpus). Build-time authoring is appropriate.

If Gary wants a Hannah pass on the training consent toggle + revoke modal copy specifically (tone-sensitive given the right-to-erasure framing), that can be a follow-up dispatch when 170g approaches Blueprint. Not needed now.

## Ratification posture (2026-05-29)

Gary acknowledged 170g at spec level 2026-05-29 by pasting the full spec into the session. Per ViaConnect convention this counts as filed and ratified at the spec level. No code change required.

The next code action is dispatched when prerequisites in the "Sequencing" section above are resolved — projected 4-6 months minimum.

## 170g-supplement anticipated per §25.10

After Stage 1 hits 100% stable, file a supplement covering:
- Stage 2 launch (open-domain routing)
- Distillation to a smaller model for cheaper inference
- Cross-restaurant chain menu pretraining pass (using Prompt 170e's chain catalog as additional structured training data)

## Related

- Prompt 170 (shipped Phase 1, commit `47a7663d` on 2026-05-29; corpus growth starts here)
- Prompt 170a + 170a-supplement (ratified 2026-05-29; safe set + §17 + §20 shipped)
- Prompt 170b (filed, not built; depth sensors enrich corpus when shipped)
- Prompt 170c (placeholder; PHI redaction + allergies + ED safety)
- Prompt 170d (filed 2026-05-29 with Hannah wireframes; multi-photo enriches corpus)
- Prompt 170e (filed 2026-05-29 with Hannah wireframes; chain context = cleanest Stage 1 eval surface)
- Prompt 170f (filed 2026-05-29 with Hannah wireframes; recipes are the ultimate cache layer that pre-empts custom model inference)
- Heritage: Prompts 15b (AI Product Lookup cache pattern), 17b (emitDataEvent cascade), 16 (safety-runs-before-save posture)
