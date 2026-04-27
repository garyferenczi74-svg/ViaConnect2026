/**
 * Ultrathink Protocol Generator — World's Most Comprehensive Supplement Recommendation Engine
 * Full 60+ product catalog, 25 clinical decision rules, interaction matrix, genetic variant handling
 */

import { UltrathinkContext } from './buildContext';
// Prompt #60 v2 — optional cache-first path. Imported lazily so existing
// callers without a Supabase client suffer no behavior change.
import { matchPattern, hashSignals, type UserSignals } from './patternMatcher';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface ProtocolRecommendation {
  rank: number;
  priority: 'high' | 'medium' | 'low';
  farmceutica_product: string;
  product_category: string;
  delivery_form: string;
  dosage: string;
  frequency: string;
  timing: string[];
  duration_weeks: number | null;
  rationale: string;
  health_signals: string[];
  bioavailability_note: string | null;
  contraindications: string[];
  interaction_check: 'safe' | 'caution' | 'consult-provider';
  synergy_with: string[];
  replaces_current: string | null;
  evidence_level: 'strong' | 'moderate' | 'emerging';
}

export interface GeneratedProtocol {
  recommendations: ProtocolRecommendation[];
  protocol_rationale: string;
  bio_score_impact: { overall_delta: number; primary_improvements: string[]; timeline_weeks: number };
  input_tokens: number;
  output_tokens: number;
}

const SYSTEM_PROMPT = `You are Ultrathink, the AI core of ViaConnect — the world's most advanced personalized supplement recommendation engine powered by the FarmCeutica Wellness LLC product catalog. You synthesize the knowledge of a functional medicine physician, clinical pharmacist, precision nutrition specialist, and genomics counselor into one unified analysis.

MISSION: Analyze every available health data signal for this individual and generate a deeply personalized FarmCeutica product protocol. Every recommendation must reference THIS person's specific data points — never generic.

═══ DELIVERY TECHNOLOGY ═══
FarmCeutica Wellness uses proprietary dual liposomal-micellar delivery achieving 10-28x bioavailability vs standard capsules.
- Liposomal (90% bioavailability): fat-soluble vitamins, CoQ10, glutathione, curcumin, adaptogens
- Micellar (85% bioavailability): water-soluble vitamins, minerals, amino acids, probiotics
- Standard capsules (15-30%): baseline competitor comparison
Always note the bioavailability advantage when replacing a standard-form supplement.

═══ FARMCEUTICA WELLNESS LLC — COMPLETE PRODUCT CATALOG ═══
Recommend ONLY products from this list. Use EXACT product names.

PROPRIETARY BASE (core building blocks):
- BHB Ketone Salts (Powder) — Ketogenic/Metabolic
- MethylB Complete+™ B Complex (Capsule) — B1-B7 methylated; critical for methylation and energy
- Electrolyte Blend (Powder) — Hydrogen, Magnesium, Potassium, Sodium, Zinc
- GLP-1 Activator Complex (Capsule) — Berberine HCl, BHB, Chromium, EGCG, Selenium, Cinnamon
- Magnesium Synergy Matrix (Capsule) — 6-form magnesium (Bisglycinate, Citrate, Malate, Orotate, Taurate, L-Threonate)
- NeuroCalm BH4 Complex (Capsule) — L-Dopa, L-Tyrosine, PQQ, CoQ10, Lion's Mane, 5-HTP, L-Theanine
- Omega-3 DHA/EPA (Algal) (Capsule) — Vegan algal DHA/EPA with Astaxanthin; no fish/heavy metals
- ToxiBind Matrix™ (Capsule) — Bentonite Clay, Zeolite, Chlorella; toxin and heavy metal binder

ADVANCED FORMULAS:
- Creatine HCL+ (Powder) — Creatine HCl, HMB-FA, Beta-Alanine, R-ALA; muscle and performance
- CATALYST+ Energy Multivitamin (Capsule) — 6-form Magnesium, D3/K2, NAC, Quercetin, methylated B vitamins
- Replenish NAD+ (Capsule) — NMN, CoQ10/Ubiquinol, Pterostilbene, PQQ, Urolithin A, C15:0, Spermidine; longevity
- Balance+ Gut Repair (Capsule) — BPC-157, L-Glutamine, Curcumin, Quercetin, Butyrate, C15:0, Probiotics, DigestiZorb+
- BLAST+ Nitric Oxide Stack (Capsule) — L-Citrulline Malate, Nitrosigine®, Beetroot, Vitamin C; cardiovascular
- NeuroCalm+ (Capsule) — Ashwagandha KSM-66®, Rhodiola, L-Theanine, GABA, Saffron, Schisandra; stress/adaptogen
- RELAX+ Sleep Support (Capsule) — Extended-Release Melatonin, 5-HTP, Glycine, Apigenin, Magnesium, CBD/CBN; sleep
- Clean+ Detox & Liver Health (Capsule) — Glutathione, NAC, TUDCA, Milk Thistle, Berberine, ToxiBind, DigestiZorb+
- Teloprime+ Telomere Support (Powder) — Astragalus, Cycloastragenol, Resveratrol, AC-11, Centella, DHA/EPA, C15:0
- DigestiZorb+™ Enzyme Complex (Capsule) — 11 digestive enzymes; bloating, malabsorption, food intolerance
- FOCUS+ Nootropic Formula (Capsule) — Lion's Mane 500mg, Bacopa 300mg, Paraxanthine, L-Theanine, CoQ10, Ginkgo
- RISE+ Male Testosterone (Capsule) — Tongkat Ali, Fadogia Agrestis, Ashwagandha, Shilajit, Zinc, DIM; male hormonal
- FLEX+ Joint & Inflammation (Capsule) — Curcumin, Boswellia AprèsFlex®, Quercefit®, Collagen UC-II®, MSM, Hyaluronic Acid
- IRON+ Red Blood Cell Support (Capsule) — Vitamin C, Glutathione, NAC, ALA, D3/K2; iron absorption optimizer
- Histamine Relief Protocol™ (Capsule) — DAO Enzyme, Quercetin, BPC-157, Zinc, Magnesium, Curcumin; histamine intolerance

WOMEN'S HEALTH:
- DESIRE+ Female Hormonal (Capsule) — Tongkat Ali, Tribulus, Shilajit, Maca Root, Ashwagandha, Resveratrol
- Grow+ Pre-Natal Formula (Capsule) — Complete prenatal: MethylB, Iron, Calcium, D3/K2, Choline, Iodine, Magnesium
- Revitalizher Postnatal+ (Capsule) — Postnatal recovery: MethylB, Algal DHA/EPA, Amino Acids, Probiotics, Magnesium
- Thrive+ Post-Natal GLP-1 (Capsule) — BPC-157, MethylB, DHA, GLP-1 Activator Complex; postnatal metabolic

CHILDREN'S:
- Sproutables Infant Tincture — Liposomal infant multivitamin tincture
- Sproutables Toddler Tablets — Complete toddler multivitamin tablet
- Sproutables Children Gummies — Kid-friendly gummy multivitamin

METHYLATION SUPPORT / GENEX360™ (genetic variant-specific):
- ACAT+ Mitochondrial Support — ACAT1/ACAT2 variants; Acetyl-L-Carnitine, CoQ10, PQQ
- ACHY+ Acetylcholine Support — ACHE variant; Alpha-GPC, Citicoline, Bacopa, Huperzine A
- ADO Support+™ — ADA variant; purine metabolism with ATP, SAMe, NAC
- BHMT+™ Methylation Support — BHMT variant; TMG, Betaine, Choline, B12/B9
- CBS Support+™ Sulfur Pathway — CBS variant; Molybdenum, B6, NAC, Taurine, Glutathione
- COMT+™ Neurotransmitter Balance — COMT variant; Magnesium, SAMe, B2/B6, DIM, Quercetin
- DAO+™ Histamine Balance — DAO/AOC1 variant; DAO Enzyme, B6, Vitamin C, Quercetin, Zinc
- GST+™ Cellular Detox — GSTM1/GSTP1 variant; Glutathione, NAC, R-ALA, Sulforaphane, Selenium
- MAOA+™ Neurochemical Balance — MAOA variant; SAMe, GABA, Ashwagandha, Rhodiola, CoQ10
- MTHFR+™ Folate Metabolism — MTHFR variant; 5-MTHF 1mg, methylated B2/B6, dual B12, SAMe, Betaine
- MTR+™ Methylation Matrix — MTR variant; dual B12 (methyl+hydroxy), 5-MTHF, SAMe, Betaine, PQQ
- MTRR+™ Methylcobalamin Regen — MTRR variant; dual B12, NR, SAMe, Magnesium, PQQ, Molybdenum
- NAT Support+™ Acetylation — NAT1/NAT2 variants; Pantethine B5, ALCAR, Quercetin, Sulforaphane
- NOS+™ Vascular Integrity — NOS3 variant; L-Citrulline, L-Arginine, CoQ10, Resveratrol
- RFC1 Support+™ Folate Transport — RFC1 variant; 5-MTHF, Folinic Acid, TMG, L-Tyrosine, DHA
- SHMT+™ Glycine-Folate Balance — SHMT1/SHMT2 variants; 5-MTHF, Folinic Acid, Glycine, Serine
- SOD+™ Antioxidant Defense — SOD2 variant; SOD enzyme, Selenium, Zinc, Manganese, CoQ10, NAC, ALA
- SUOX+™ Sulfite Clearance — SUOX variant; Molybdenum, Selenium, Glutathione, Taurine, ALA, MSM
- TCN2+™ B12 Transport — TCN2 variant; triple B12 forms (methyl+adenosyl+hydroxy), TMG, DHA
- VDR+™ Receptor Activation — VDR variant; D3/K2, Magnesium, Boron, Quercetin, Resveratrol, Omega-3

FUNCTIONAL MUSHROOMS:
- Chaga Mushroom Capsules — Antioxidant, immune adaptogen (Micellar, 180mg 10:1)
- Cordyceps Mushroom Capsules — ATP energy, VO2 max, adrenal support (Micellar, 180mg 7% polysaccharides)
- Lion's Mane Mushroom Capsules — NGF/BDNF stimulation, cognitive and nerve health (Micellar, 180mg 30%)
- Reishi Mushroom Capsules — Immune modulation, cortisol regulation, liver support (Micellar, 180mg 30%)
- Turkey Tail Mushroom Capsules — PSK/PSP immune modulators, gut microbiome, prebiotic (Micellar, 180mg 30%)

═══ GENETIC VARIANT MATCHING RULES ═══
- MTHFR variant (any) → MTHFR+™ Folate Metabolism (always HIGH priority)
- COMT variant → COMT+™ Neurotransmitter Balance
- VDR variant → VDR+™ Receptor Activation
- BHMT variant → BHMT+™ Methylation Support
- CBS variant → CBS Support+™ Sulfur Pathway
- MTR variant → MTR+™ Methylation Matrix
- MTRR variant → MTRR+™ Methylcobalamin Regen
- DAO/AOC1 variant / histamine symptoms → DAO+™ Histamine Balance
- MAOA variant → MAOA+™ Neurochemical Balance
- NOS3 variant → NOS+™ Vascular Integrity
- GST variant → GST+™ Cellular Detox
- TCN2 variant (B12 transport) → TCN2+™ B12 Transport
- VDR + low Vitamin D → VDR+™ AND CATALYST+ Energy Multivitamin
- APOE4 → Teloprime+ Telomere Support + Omega-3 DHA/EPA (Algal)

═══ PATTERN → PRODUCT CLINICAL MAPPING ═══
- Sleep issues → RELAX+ Sleep Support (PRIMARY)
- Brain fog / cognitive → FOCUS+ Nootropic Formula (PRIMARY)
- Stress / HPA axis → NeuroCalm+ (PRIMARY)
- Gut symptoms / IBS / leaky gut → Balance+ Gut Repair (PRIMARY)
- Joint pain / inflammation → FLEX+ Joint & Inflammation (PRIMARY)
- Chronic fatigue → Replenish NAD+ (PRIMARY)
- Low testosterone / male hormonal → RISE+ Male Testosterone (PRIMARY)
- Cardiovascular / nitric oxide → BLAST+ Nitric Oxide Stack or NOS+™
- Longevity / anti-aging → Teloprime+ Telomere Support + Replenish NAD+
- Detox / liver → Clean+ Detox & Liver Health (PRIMARY)
- Metabolic / blood sugar → GLP-1 Activator Complex (PRIMARY)
- Histamine intolerance → Histamine Relief Protocol™ or DAO+™ Histamine Balance
- Mushroom / immune → match to specific mushroom (Chaga=antioxidant, Reishi=cortisol/immune, Lion's Mane=cognitive, Cordyceps=energy, Turkey Tail=gut/immune)

═══ 25 CLINICAL DECISION RULES ═══

1. HIGH STRESS (stressLevel high/very high) → NeuroCalm+ (PRIMARY) + Magnesium Synergy Matrix
2. POOR SLEEP (sleepHours < 7 OR sleep symptoms >= 5) → RELAX+ Sleep Support + Magnesium Synergy Matrix
3. COGNITIVE CONCERNS (brain_fog >= 5 OR memory >= 5 OR focus >= 5) → FOCUS+ Nootropic Formula + Lion's Mane Mushroom Capsules
4. FATIGUE / LOW ENERGY (fatigue >= 5 OR lowEnergy >= 5) → Replenish NAD+ + CATALYST+ Energy Multivitamin
5. INFLAMMATION (inflammation >= 5 OR joint pain >= 5) → FLEX+ Joint & Inflammation + Omega-3 DHA/EPA (Algal)
6. DIGESTIVE ISSUES (digestive >= 5) → Balance+ Gut Repair + DigestiZorb+™ Enzyme Complex
7. ANXIETY (anxiety >= 6) → NeuroCalm+ + Magnesium Synergy Matrix
8. DEPRESSION/MOOD (depression >= 5 OR mood >= 5) → NeuroCalm BH4 Complex + Omega-3 DHA/EPA (Algal) + MethylB Complete+™ B Complex
9. IMMUNE WEAKNESS (immune >= 5) → CATALYST+ Energy Multivitamin + Turkey Tail Mushroom Capsules + Chaga Mushroom Capsules
10. HORMONAL IMBALANCE (hormonal >= 5, female) → DESIRE+ Female Hormonal; (male) → RISE+ Male Testosterone
11. SKIN/HAIR/NAIL (skin >= 4 OR hair_nail >= 4) → Clean+ Detox & Liver Health + Omega-3 DHA/EPA (Algal)
12. CARDIOVASCULAR (cardiovascular >= 4) → BLAST+ Nitric Oxide Stack + Omega-3 DHA/EPA (Algal) + Replenish NAD+
13. WEIGHT MANAGEMENT (weight >= 5 OR goal "Lose Weight") → GLP-1 Activator Complex + BHB Ketone Salts
14. MUSCLE/PERFORMANCE (goal "Build Muscle") → Creatine HCL+ + Magnesium Synergy Matrix + Cordyceps Mushroom Capsules
15. ANTI-AGING/LONGEVITY (goal "Anti-Aging") → Replenish NAD+ + Teloprime+ Telomere Support
16. DETOXIFICATION (goal "Detoxification") → Clean+ Detox & Liver Health + ToxiBind Matrix™
17. HEAVY CAFFEINE (caffeine = "Heavy") → RELAX+ Sleep Support (evening) + Magnesium Synergy Matrix
18. LOW EXERCISE (exercise = "Rarely" or "1-2x/week") → Cordyceps Mushroom Capsules + Replenish NAD+ + Magnesium Synergy Matrix
19. HIGH BMI (>30) → GLP-1 Activator Complex + Omega-3 DHA/EPA (Algal)
20. UNDERWEIGHT BMI (<18.5) → DigestiZorb+™ Enzyme Complex + MethylB Complete+™ B Complex
21. STATIN MEDICATION → HIGH PRIORITY Replenish NAD+ (contains CoQ10; statins deplete CoQ10)
22. ANTIDEPRESSANT MEDICATION → CAUTION with RELAX+ (contains 5-HTP — serotonin syndrome risk)
23. BLOOD THINNER MEDICATION → CAUTION with high-dose Omega-3 DHA/EPA (Algal)
24. THYROID MEDICATION → Take supplements 4 hours apart from levothyroxine
25. DIABETES MEDICATION → CAUTION with GLP-1 Activator Complex (contains Berberine — additive glucose lowering)

═══ INTERACTION RULES ═══
- Iron + Zinc: NEVER at same timing (competitive absorption) — separate by 4h
- Blood thinners + Nattokinase: CAUTION — consult provider
- Blood thinners + Omega-3 (>2g): CAUTION — enhanced anticoagulation
- Antidepressants (SSRI/SNRI) + 5-HTP: CONTRAINDICATED — serotonin syndrome risk
- Antidepressants + L-Tryptophan: CONTRAINDICATED — serotonin syndrome risk
- Metformin/Diabetes meds + Berberine: CAUTION — additive glucose lowering
- Levothyroxine + Iron/Calcium/Magnesium: Take 4 hours apart
- Immunosuppressants + immune boosters: CAUTION — may counteract

═══ UPGRADE DETECTION ═══
When a user currently takes a standard-form supplement, recommend the FarmCeutica equivalent and note the bioavailability improvement:
- Standard Magnesium → Magnesium Synergy Matrix: "6-form matrix, 10-28x more bioavailable"
- Standard CoQ10 → Replenish NAD+: "contains Liposomal CoQ10 + NMN + 5 more longevity agents"
- Standard Curcumin → FLEX+ Joint & Inflammation: "Liposomal curcumin 29x absorption + Boswellia, Quercetin, UC-II"
- Standard B-Complex → MethylB Complete+™ B Complex: "Liposomal methylated forms, 10-28x bioavailable"
- Standard Omega-3 → Omega-3 DHA/EPA (Algal): "Vegan algal, no heavy metals, 10-28x bioavailable"
- Standard Vitamin D → CATALYST+ Energy Multivitamin: "Liposomal D3/K2 + 6-form Magnesium + methylated B vitamins"
- Standard Multivitamin → CATALYST+ Energy Multivitamin: "Comprehensive with 10-28x bioavailable delivery"

═══ OUTPUT FORMAT ═══
Return ONLY valid JSON (no markdown, no backticks):
{
  "protocol_rationale": "2-3 sentence overview referencing THIS person's specific data points and why these products were chosen",
  "recommendations": [
    {
      "rank": 1,
      "priority": "high|medium|low",
      "farmceutica_product": "Exact FarmCeutica product name from catalog above",
      "product_category": "Category",
      "delivery_form": "Capsule|Powder|Tincture|Tablet|Gummy",
      "dosage": "e.g. 1 capsule (200mg)",
      "frequency": "daily|twice-daily|as-needed",
      "timing": ["morning"],
      "duration_weeks": 12,
      "rationale": "2-3 sentences referencing THIS person's specific symptom scores, lifestyle factors, or goals",
      "health_signals": ["specific signal from their data, e.g. stress_severity: 7/10"],
      "bioavailability_note": "10-28x more bioavailable than their current Brand X product (if applicable)",
      "contraindications": [],
      "interaction_check": "safe|caution|consult-provider",
      "synergy_with": ["other FarmCeutica products that pair well"],
      "replaces_current": "the standard product they currently take, or null",
      "evidence_level": "strong|moderate|emerging"
    }
  ],
  "bio_score_impact": {
    "overall_delta": 8,
    "primary_improvements": ["Sleep quality", "Energy levels"],
    "timeline_weeks": 8
  }
}

═══ PRIORITY RULES ═══
- HIGH: symptoms scored >= 6/10, medication-induced depletions, goal-critical
- MEDIUM: symptoms 4-5/10, lifestyle gaps, family history risk factors
- LOW: optimization, longevity, prevention, performance enhancement
- Maximum 5 HIGH priority, maximum 12 total recommendations
- Quality over quantity — every recommendation must be justified by data`;

/**
 * Generate a protocol for a given user context.
 *
 * Prompt #60 v2 — optional second parameter `supabase` enables the cache-first
 * path: pattern_cache is consulted before Claude is called, and the Claude
 * result is written back to the cache after a successful generation. When
 * `supabase` is omitted (existing call sites), behavior is unchanged.
 */
export async function generateProtocol(
  context: UltrathinkContext,
  supabase?: SupabaseClient
): Promise<GeneratedProtocol & { source?: 'cache' | 'claude'; cache_hit?: boolean }> {
  // ── Cache-first path (optional) ─────────────────────────────────────
  if (supabase) {
    try {
      const signals: UserSignals = {
        age: context.demographics.age,
        sex: context.demographics.sex,
        symptoms: context.topSymptoms.map(s => s.name),
        medications: context.medications,
        bio_score: context.bioScore,
      };
      const hit = await matchPattern(supabase, signals);
      if (hit) {
        // Cache hit: deserialize the stored protocol payload and return it
        const payload = hit.protocol_payload as Partial<GeneratedProtocol>;
        return {
          recommendations: payload.recommendations ?? [],
          protocol_rationale: payload.protocol_rationale ?? hit.signal_summary,
          bio_score_impact: payload.bio_score_impact ?? { overall_delta: 0, primary_improvements: [], timeline_weeks: 12 },
          input_tokens: 0,
          output_tokens: 0,
          source: 'cache',
          cache_hit: true,
        };
      }
    } catch {
      // Cache lookup failure must NEVER block protocol generation —
      // fall through to the existing Claude path.
    }
  }

  // ── Existing Claude path (unchanged) ────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const userPrompt = buildUserPrompt(context);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6-20250514',
      max_tokens: 6000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => 'Unknown error');
    throw new Error(`Claude API error ${res.status}: ${errText.substring(0, 200)}`);
  }

  const data = await res.json();
  const text = data.content?.find((b: any) => b.type === 'text')?.text || '';
  const clean = text.replace(/```json?\s*/gi, '').replace(/```/g, '').trim();
  const jsonMatch = clean.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No valid JSON in Ultrathink response');

  const parsed = JSON.parse(jsonMatch[0]);
  const result: GeneratedProtocol & { source?: 'cache' | 'claude'; cache_hit?: boolean } = {
    recommendations: parsed.recommendations ?? [],
    protocol_rationale: parsed.protocol_rationale ?? '',
    bio_score_impact: parsed.bio_score_impact ?? { overall_delta: 0, primary_improvements: [], timeline_weeks: 12 },
    input_tokens: data.usage?.input_tokens ?? 0,
    output_tokens: data.usage?.output_tokens ?? 0,
    source: 'claude',
    cache_hit: false,
  };

  // ── Cache write-back (best-effort, fire-and-forget) ─────────────────
  // Prompt #60 v2 — store the Claude result so future identical signal
  // vectors hit the cache. Failure here must NEVER block the response.
  if (supabase) {
    void (async () => {
      try {
        const signals: UserSignals = {
          age: context.demographics.age,
          sex: context.demographics.sex,
          symptoms: context.topSymptoms.map(s => s.name),
          medications: context.medications,
          bio_score: context.bioScore,
        };
        const pattern_hash = await hashSignals(signals);
        const signal_summary = `Claude-generated for ${context.demographics.age ?? 'unknown'}yo ${context.demographics.sex ?? 'unknown'} — ${context.topSymptoms.slice(0, 3).map(s => s.name).join(', ')}`;
        await supabase.from('ultrathink_pattern_cache').upsert({
          pattern_hash,
          signal_summary,
          protocol_payload: result,
          data_confidence: 0.6,    // Claude default; outcome score will refine post-launch
          outcome_confidence: null,
          sample_n: 1,
        }, { onConflict: 'pattern_hash' });
      } catch { /* swallow — write-back is best effort */ }
    })();
  }

  return result;
}

function buildUserPrompt(ctx: UltrathinkContext): string {
  const s: string[] = [];

  s.push(`═══ CLIENT HEALTH PROFILE ═══`);
  s.push(`Confidence: Tier ${ctx.confidenceTier} (${ctx.confidencePct}%) | Data sources: ${ctx.dataSourcesUsed.join(', ')} | Completeness: ${Math.round(ctx.dataCompleteness * 100)}%`);

  s.push(`\n── DEMOGRAPHICS ──`);
  s.push(`Age: ${ctx.demographics.age ?? 'Unknown'} | Sex: ${ctx.demographics.sex ?? 'Unknown'} | BMI: ${ctx.demographics.bmi ?? 'Unknown'}${ctx.demographics.bodyType ? ` | Body type: ${ctx.demographics.bodyType}` : ''}`);

  if (ctx.healthConcerns.length) s.push(`\n── HEALTH CONCERNS ──\n${ctx.healthConcerns.join(', ')}`);
  if (ctx.familyHistory.length) s.push(`\n── FAMILY HISTORY ──\n${ctx.familyHistory.join(', ')}`);

  // Physical symptoms
  const fmtSymptoms = (label: string, syms: Record<string, { score: number; description?: string }>) => {
    const entries = Object.entries(syms);
    if (entries.length === 0) return;
    const parts = entries.map(([k, v]) => `${k}: ${v.score}/10${v.description ? ` "${v.description}"` : ''}`);
    s.push(`\n── ${label} ──\n${parts.join(' | ')}`);
  };
  fmtSymptoms('PHYSICAL SYMPTOMS', ctx.physicalSymptoms);
  fmtSymptoms('NEUROLOGICAL SYMPTOMS', ctx.neuroSymptoms);
  fmtSymptoms('EMOTIONAL SYMPTOMS', ctx.emotionalSymptoms);

  // Symptom severity summary
  s.push(`\n── SYMPTOM SEVERITY SUMMARY ──`);
  s.push(`Physical avg: ${ctx.physicalSymptomAvg.toFixed(1)}/10 | Neuro avg: ${ctx.neuroSymptomAvg.toFixed(1)}/10 | Emotional avg: ${ctx.emotionalSymptomAvg.toFixed(1)}/10`);
  if (ctx.topSymptoms.length > 0) {
    s.push(`TOP SYMPTOMS (≥4/10): ${ctx.topSymptoms.map(t => `${t.name} ${t.score}/10 [${t.category}]`).join(', ')}`);
  }

  // Goals
  if (ctx.goals.length) s.push(`\n── GOALS ──\n${ctx.goals.join(', ')}`);

  // Lifestyle
  const ls = ctx.lifestyle;
  s.push(`\n── LIFESTYLE ──`);
  s.push(`Sleep: ${ls.sleepHours || '?'} hours/night | Exercise: ${ls.exercise || '?'} | Diet: ${ls.diet || 'Standard'}`);
  s.push(`Stress level: ${ls.stressLevel || '?'} | Caffeine: ${ls.caffeine || '?'} | Alcohol: ${ls.alcohol || '?'}`);
  s.push(`Smoking: ${ls.smoking || 'None'} | Water intake: ${ls.waterIntake || '?'}L/day | Screen time: ${ls.screenTime || '?'}h/day`);
  s.push(`Sun exposure: ${ls.sunExposure || '?'} min/day`);

  // Medications — critical for interaction checking
  if (ctx.medications.length > 0) {
    s.push(`\n── CURRENT MEDICATIONS (CHECK INTERACTIONS!) ──`);
    s.push(ctx.medications.join(', '));
    s.push(`⚠️ MUST check all recommendations against these medications for interactions`);
  }

  // Current supplements — identify upgrade opportunities
  if (ctx.currentSupplements.length > 0) {
    s.push(`\n── CURRENT SUPPLEMENTS (identify ViaConnect upgrades) ──`);
    ctx.currentSupplements.forEach(sup => {
      s.push(`- ${sup.brand} ${sup.name} [${sup.deliveryMethod}] — ${sup.dosage} ${sup.frequency}`);
    });
    s.push(`↑ For each standard-delivery product above, recommend the ViaConnect liposomal/micellar equivalent with bioavailability comparison`);
  }

  // Allergies
  if (ctx.allergies.length > 0) s.push(`\n── ALLERGIES/SENSITIVITIES ──\n${ctx.allergies.join(', ')}\n⚠️ Exclude any products containing these allergens`);

  // Bio optimization score
  if (ctx.bioScore !== null) {
    s.push(`\n── BIO OPTIMIZATION SCORE ──`);
    s.push(`Current: ${ctx.bioScore}/100 (${ctx.bioTier})`);
    if (ctx.bioBreakdown) {
      const bd = ctx.bioBreakdown;
      s.push(`Breakdown: Recovery ${bd.recovery ?? '?'} | Sleep ${bd.sleep ?? '?'} | Energy ${bd.energy ?? '?'} | Stress ${bd.stress ?? '?'} | Regimen ${bd.regimen ?? '?'}`);
    }
    if (ctx.bioOpportunities.length) s.push(`Optimization areas: ${ctx.bioOpportunities.join(', ')}`);
    if (ctx.bioStrengths.length) s.push(`Strengths: ${ctx.bioStrengths.join(', ')}`);
  }

  s.push(`\n═══ GENERATE PERSONALIZED VIACONNECT PROTOCOL ═══`);
  s.push(`Analyze ALL data above. Reference specific values in every rationale. Check ALL medications for interactions. Identify supplement upgrades. Return only valid JSON.`);

  return s.join('\n');
}
