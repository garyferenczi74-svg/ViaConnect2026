// Ultrathink AI Engine — Core Configuration & Chain-of-Thought Builder
// 14-specialty composite persona with 6-step methodology

export const ULTRATHINK_CONFIG = {
  model: "claude-sonnet-4-20250514" as const,
  maxTokens: 8000,
  ragEnabled: true,
  vectorStore: "supabase",
  embeddingModel: "text-embedding-3-large",
  retrievalStrategy: "hybrid" as const,
  topK: 20,
  rerankEnabled: true,
  lensCount: 14,
  nonDiagnostic: true,
  disclaimerRequired: true,
  interactionCheckRequired: true,
  escalationThreshold: "moderate" as const,
};

export const ULTRATHINK_SYSTEM_PROMPT = `You are ViaConnect\u2122 Clinical Intelligence \u2014 a comprehensive health analysis engine synthesizing 25 years of multi-disciplinary clinical expertise across 14 specialties:

1. GENOMICS & PHARMACOGENOMICS \u2014 How genetic variants drive symptom expression
2. NUTRACEUTICALS \u2014 Precision supplementation for symptom resolution
3. HERBAL MEDICINE \u2014 Adaptogenic, nervine, and therapeutic herbal protocols
4. VITAMINS & MINERALS \u2014 Micronutrient deficiency pattern recognition
5. PEPTIDE THERAPY \u2014 BPC-157, Thymosin Alpha-1, growth hormone secretagogues
6. MEDICAL CANNABIS \u2014 Endocannabinoid system modulation for symptom management
7. EASTERN MEDICINE (TCM) \u2014 Meridian theory, qi stagnation, yin/yang imbalance patterns
8. AYURVEDIC MEDICINE \u2014 Dosha assessment, Agni (digestive fire), Ojas depletion
9. DISEASE PATHOPHYSIOLOGY \u2014 Autoimmune, metabolic, endocrine, neurological patterns
10. PHYSIOTHERAPY \u2014 Musculoskeletal pain patterns, movement dysfunction
11. MASSAGE THERAPY \u2014 Myofascial trigger points, somatic symptom holding
12. GENERAL MEDICINE \u2014 Primary care differential diagnosis framework
13. SPECIALIST MEDICINE \u2014 Endocrinology, neurology, gastroenterology, rheumatology
14. FUNCTIONAL MEDICINE \u2014 Root cause analysis, system interconnection, upstream triggers

METHODOLOGY \u2014 "ULTRATHINK":
Step 1: ABSORB \u2014 Read every data point. The patient's own words are clinical gold.
Step 2: CROSS-REFERENCE \u2014 Every symptom connects to others. Find the thread.
Step 3: MULTI-LENS \u2014 View through ALL 14 lenses simultaneously. Synthesize perspectives.
Step 4: PATTERN RECOGNITION \u2014 Identify the 1-3 master patterns driving the majority of symptoms.
Step 5: PRIORITIZE \u2014 What matters MOST for THIS person RIGHT NOW?
Step 6: TRANSLATE \u2014 Plain language with analogies. Reference patient's own words.

CRITICAL: Do NOT diagnose. Say "patterns suggest" and "worth investigating with your practitioner."
ALWAYS recommend consulting a healthcare professional.`;

export interface PatientContext {
  age: number | null;
  sex: string | null;
  bmi: number | null;
  ethnicity: string[] | null;
  symptomsPhysical: Record<string, { score: number; description: string }>;
  symptomsNeurological: Record<string, { score: number; description: string }>;
  symptomsEmotional: Record<string, { score: number; description: string }>;
  healthConcerns: string[];
  familyHistory: Array<{ condition: string; relationships: string[] }>;
  lifestyle: Record<string, unknown>;
  allergies: string[];
  adverseReactions: string;
  medications: Array<{ name: string; dosage?: string }>;
  supplements: Array<{ name: string; dosage?: string; delivery_method?: string }>;
  geneticData: Record<string, unknown> | null;
  labData: Array<Record<string, unknown>> | null;
  dataTier: 1 | 2 | 3;
  dataCompleteness: number;
}

export function buildUltrathinkCoT(context: PatientContext, ragChunks?: Array<{ content: string; source?: string; specialty?: string }>): string {
  const chunks = ragChunks || [];
  return `
\u2550\u2550\u2550 ULTRATHINK 6-STEP CHAIN OF THOUGHT \u2550\u2550\u2550
Execute each step in order.

STEP 1 \u2014 ABSORB
Patient: age ${context.age || "unknown"}, sex ${context.sex || "unknown"}, BMI ${context.bmi || "unknown"}
Physical symptoms: ${JSON.stringify(context.symptomsPhysical)}
Neurological symptoms: ${JSON.stringify(context.symptomsNeurological)}
Emotional symptoms: ${JSON.stringify(context.symptomsEmotional)}
Health concerns: ${JSON.stringify(context.healthConcerns)}
Family history: ${JSON.stringify(context.familyHistory)}
Medications: ${JSON.stringify(context.medications)}
Supplements: ${JSON.stringify(context.supplements)}
Allergies: ${JSON.stringify(context.allergies)}
Lifestyle: ${JSON.stringify(context.lifestyle)}
${context.geneticData ? `Genetic data: ${JSON.stringify(context.geneticData)}` : "Genetic data: Not available"}
${context.labData?.length ? `Lab data: ${JSON.stringify(context.labData)}` : "Lab data: Not available"}

STEP 2 \u2014 CROSS-REFERENCE
Identify connections. Which symptoms share root causes? Group them.
${chunks.filter(c => c.specialty !== "tcm" && c.specialty !== "ayurvedic").map(c => `[${c.source || "Reference"}] ${c.content}`).join("\n")}

STEP 3 \u2014 MULTI-LENS ANALYSIS
View through ALL 14 specialties. TCM references:
${chunks.filter(c => c.specialty === "tcm").map(c => `[TCM] ${c.content}`).join("\n") || "(No TCM chunks retrieved)"}
Ayurvedic references:
${chunks.filter(c => c.specialty === "ayurvedic").map(c => `[Ayurveda] ${c.content}`).join("\n") || "(No Ayurvedic chunks retrieved)"}

STEP 4 \u2014 PATTERN RECOGNITION
Identify 1-3 master patterns. Name each. List symptoms explained. Rate confidence.

STEP 5 \u2014 PRIORITIZE
What matters MOST for this person RIGHT NOW? Order: immediate \u2192 this week \u2192 this month \u2192 ongoing.

STEP 6 \u2014 TRANSLATE
Plain language. Analogies. Reference patient's own words. Warm and professional.

Generate the 13-section JSON Symptom Profile output.`;
}
