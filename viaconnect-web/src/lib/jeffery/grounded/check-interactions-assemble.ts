/**
 * In-process check-interactions assemble (chat wrap).
 *
 * Mirrors POST /api/ai/check-interactions findings path:
 * Claude (when keyed) + local fallback + product-floor merge + blockedProducts.
 * Not floor-only. Not HTTP loopback. Not interactions/evaluate (different shape).
 *
 * Persist / notification side-effects stay on the HTTP route only.
 * Interim helper under grounded/* so this Stay DRAFT stays additive.
 */

import { checkProductInteractions } from "@/lib/ai/interaction-engine";
import { createClient } from "@/lib/supabase/server";
import { getCircuitBreaker, isCircuitBreakerError } from "@/lib/utils/circuit-breaker";
import { safeLog } from "@/lib/utils/safe-log";
import { isTimeoutError, withAbortTimeout } from "@/lib/utils/with-timeout";

export const CHECK_INTERACTIONS_ROUTE = "POST /api/ai/check-interactions";

export interface CheckInteractionsEngineBody {
  userId?: string;
  medications: string[];
  supplements: string[];
  recommendations: string[];
  allergies: string[];
}

export interface CheckInteractionsEnginePayload {
  interactions: unknown;
  summary?: {
    major: number;
    moderate: number;
    minor: number;
    synergistic: number;
  };
  blockedProducts?: unknown;
  error?: string;
}

export type AssembleCheckInteractionsFn = (
  body: CheckInteractionsEngineBody
) => Promise<CheckInteractionsEnginePayload>;

export const EMPTY_INTERACTION_SUMMARY = {
  major: 0,
  moderate: 0,
  minor: 0,
  synergistic: 0,
} as const;

export function emptyCheckInteractionsPayload(): CheckInteractionsEnginePayload {
  return {
    interactions: [],
    summary: { ...EMPTY_INTERACTION_SUMMARY },
    blockedProducts: [],
  };
}

const claudeBreaker = getCircuitBreaker("claude-api");

function buildPrompt(
  medications: string[],
  supplements: string[],
  recommendations: string[],
  allergies: string[]
) {
  return `You are a clinical pharmacology AI specializing in drug-supplement interactions.

PATIENT DATA:
- Current Medications: ${JSON.stringify(medications)}
- Current Supplements: ${JSON.stringify(supplements)}
- AI-Recommended Products: ${JSON.stringify(recommendations)}
- Known Allergies: ${JSON.stringify(allergies)}

TASK: Analyze ALL possible interactions between:
1. Each medication x each current supplement
2. Each medication x each AI-recommended product
3. Each medication x known allergies (contraindications)

For EACH interaction found, return:
{
  "medication": "drug name",
  "interactsWith": "supplement/product name",
  "interactionType": "current_supplement" | "ai_recommendation" | "allergy",
  "severity": "major" | "moderate" | "minor" | "synergistic",
  "mechanism": "pharmacological mechanism",
  "clinicalEffect": "what happens clinically",
  "onsetTiming": "when it manifests",
  "mitigation": "how to manage",
  "evidenceLevel": "strong" | "moderate" | "limited" | "theoretical",
  "citations": ["references"]
}

SEVERITY GUIDELINES:
- MAJOR: Life-threatening. Warfarin+Vitamin K, SSRIs+St John's Wort, MAOIs+tyramine
- MODERATE: Clinically significant. Metformin+B12, Levothyroxine+iron/calcium, Statins+CoQ10
- MINOR: Theoretical or minimal. Mild absorption competition, weak CYP450 effects
- SYNERGISTIC: Beneficial. CoQ10+Statins, Vitamin D+Calcium, Omega-3+anti-inflammatories

RULES:
- Be thorough but accurate. Do not invent interactions.
- Include mitigation for Major and Moderate.
- Note liposomal/micellar products have enhanced bioavailability affecting interaction potency.
- Flag CYP450 enzyme interactions (CYP3A4, CYP2D6, CYP1A2, CYP2C9, CYP2C19).
- Return empty array [] if no interactions found.

Return ONLY a valid JSON array. No preamble.`;
}

const COMMON_INTERACTIONS: Record<
  string,
  { with: string; severity: string; mechanism: string; effect: string; mitigation: string }[]
> = {
  warfarin: [
    {
      with: "CoQ10",
      severity: "major",
      mechanism: "CoQ10 structurally similar to Vitamin K, may reduce anticoagulant effect",
      effect: "Decreased INR, increased clot risk",
      mitigation: "Monitor INR weekly if co-administered. Adjust warfarin dose.",
    },
    {
      with: "Omega-3",
      severity: "moderate",
      mechanism: "Omega-3 may potentiate anticoagulant effect via platelet inhibition",
      effect: "Increased bleeding risk",
      mitigation: "Monitor INR. Limit fish oil to under 2g/day.",
    },
    {
      with: "Vitamin K",
      severity: "major",
      mechanism: "Direct antagonism of warfarin mechanism",
      effect: "Complete loss of anticoagulation",
      mitigation: "Avoid concurrent high-dose Vitamin K. Maintain consistent dietary intake.",
    },
    {
      with: "Vitamin E",
      severity: "moderate",
      mechanism: "Vitamin E inhibits vitamin K-dependent clotting factors",
      effect: "Increased bleeding risk",
      mitigation: "Avoid doses >400 IU/day with warfarin.",
    },
  ],
  levothyroxine: [
    {
      with: "Iron",
      severity: "moderate",
      mechanism: "Bivalent cation chelation reduces T4 absorption by 40-60%",
      effect: "Reduced thyroid hormone levels",
      mitigation: "Separate administration by 4+ hours",
    },
    {
      with: "Calcium",
      severity: "moderate",
      mechanism: "Calcium forms insoluble complex with levothyroxine",
      effect: "Reduced absorption of thyroid medication",
      mitigation: "Separate by 4+ hours",
    },
    {
      with: "Magnesium",
      severity: "moderate",
      mechanism: "Chelation reduces levothyroxine absorption",
      effect: "Reduced thyroid hormone levels",
      mitigation: "Separate by 4+ hours",
    },
  ],
  metformin: [
    {
      with: "Vitamin B12",
      severity: "synergistic",
      mechanism: "Metformin depletes B12 over time; supplementation repletes",
      effect: "Prevents metformin-induced B12 deficiency",
      mitigation: "Recommended co-supplementation",
    },
    {
      with: "Berberine",
      severity: "moderate",
      mechanism: "Both lower blood glucose via similar pathways",
      effect: "Hypoglycemia risk",
      mitigation: "Monitor blood glucose closely if combining",
    },
  ],
  statin: [
    {
      with: "CoQ10",
      severity: "synergistic",
      mechanism: "Statins deplete CoQ10; supplementation repletes",
      effect: "May reduce statin myopathy, support mitochondrial function",
      mitigation: "Recommended co-supplementation",
    },
    {
      with: "Grapefruit",
      severity: "moderate",
      mechanism: "CYP3A4 inhibition increases statin plasma concentration",
      effect: "Increased risk of myopathy/rhabdomyolysis",
      mitigation: "Avoid grapefruit with CYP3A4-metabolized statins",
    },
  ],
  ssri: [
    {
      with: "St. John's Wort",
      severity: "major",
      mechanism: "Additive serotonergic activity",
      effect: "Serotonin syndrome: agitation, confusion, rapid heart rate, high temperature",
      mitigation: "CONTRAINDICATED. Do not combine.",
    },
    {
      with: "5-HTP",
      severity: "major",
      mechanism: "Additive serotonin precursor loading",
      effect: "Serotonin syndrome risk",
      mitigation: "CONTRAINDICATED. Do not combine.",
    },
    {
      with: "SAMe",
      severity: "moderate",
      mechanism: "May increase serotonergic activity",
      effect: "Increased serotonin syndrome risk",
      mitigation: "Use with caution, start low dose if combining",
    },
  ],
};

type WireFinding = {
  medication: string;
  interactsWith: string;
  interactionType: string;
  severity: string;
  mechanism: string;
  clinicalEffect: string;
  onsetTiming: string;
  mitigation: string;
  evidenceLevel: string;
  citations: string[];
  pharmacogenomicContext?: string;
};

function findLocalInteractions(medications: string[], supplements: string[]): WireFinding[] {
  const results: WireFinding[] = [];

  for (const med of medications) {
    const medLower = med.toLowerCase();
    for (const [drugKey, interactions] of Object.entries(COMMON_INTERACTIONS)) {
      if (medLower.includes(drugKey)) {
        for (const interaction of interactions) {
          for (const supp of supplements) {
            if (supp.toLowerCase().includes(interaction.with.toLowerCase())) {
              results.push({
                medication: med,
                interactsWith: supp,
                interactionType: "current_supplement",
                severity: interaction.severity,
                mechanism: interaction.mechanism,
                clinicalEffect: interaction.effect,
                onsetTiming: interaction.severity === "major" ? "Hours to days" : "Days to weeks",
                mitigation: interaction.mitigation,
                evidenceLevel: interaction.severity === "major" ? "strong" : "moderate",
                citations: ["FDA Drug Interaction Database", "Natural Medicines Comprehensive Database"],
              });
            }
          }
        }
      }
    }
  }
  return results;
}

const ENGINE_SEVERITY_TO_WIRE: Record<string, string> = {
  critical: "major",
  warning: "moderate",
  info: "minor",
  none: "minor",
};

function productFloorInteractions(
  medications: string[],
  supplements: string[],
  interactionType: "current_supplement" | "ai_recommendation",
  cypStatusMap: Record<string, string> = {}
): WireFinding[] {
  return checkProductInteractions(supplements, medications, cypStatusMap)
    .filter((i) => i.severity !== "none")
    .map((i) => ({
      medication: i.medication,
      interactsWith: i.supplement,
      interactionType,
      severity: ENGINE_SEVERITY_TO_WIRE[i.severity] ?? "minor",
      mechanism: i.description,
      clinicalEffect: i.description,
      onsetTiming: i.severity === "critical" ? "Hours to days" : "Days to weeks",
      mitigation: i.recommendation,
      evidenceLevel: i.severity === "critical" ? "strong" : "moderate",
      citations: ["FarmCeutica formulation interaction database"],
      pharmacogenomicContext: i.pharmacogenomic_context,
    }));
}

const WIRE_SEVERITY_RANK: Record<string, number> = {
  major: 3,
  moderate: 2,
  minor: 1,
  synergistic: 0,
};

function mergeInteractions<T extends { medication: string; interactsWith: string; severity: string }>(
  primary: T[],
  floor: T[]
): T[] {
  const byKey = new Map<string, T>();
  for (const i of primary) {
    byKey.set(i.medication.toLowerCase() + "|" + i.interactsWith.toLowerCase(), i);
  }
  for (const f of floor) {
    const key = f.medication.toLowerCase() + "|" + f.interactsWith.toLowerCase();
    const existing = byKey.get(key);
    if (!existing || (WIRE_SEVERITY_RANK[f.severity] ?? 0) > (WIRE_SEVERITY_RANK[existing.severity] ?? 0)) {
      byKey.set(key, f);
    }
  }
  return [...byKey.values()];
}

async function loadCypStatusMap(userId: string | undefined): Promise<Record<string, string>> {
  if (!userId) return {};
  try {
    const supabase = await createClient();
    const { data: gpRow } = await supabase
      .from("genetic_profiles")
      .select("cyp2d6_status, additional_genes")
      .eq("user_id", userId)
      .maybeSingle();
    const cypStatusMap: Record<string, string> = {};
    if (gpRow?.cyp2d6_status) cypStatusMap.CYP2D6 = gpRow.cyp2d6_status;
    const extraGenes = gpRow?.additional_genes;
    if (extraGenes && typeof extraGenes === "object" && !Array.isArray(extraGenes)) {
      for (const [gene, status] of Object.entries(extraGenes)) {
        if (typeof status === "string" && gene.toUpperCase().startsWith("CYP")) {
          cypStatusMap[gene.toUpperCase()] = status;
        }
      }
    }
    return cypStatusMap;
  } catch {
    return {};
  }
}

async function claudeOrLocal(
  medications: string[],
  supplements: string[],
  recommendations: string[],
  allergies: string[]
): Promise<WireFinding[]> {
  const allSupplements = [...supplements, ...recommendations];
  const apiKey = process.env.ANTHROPIC_API_KEY || "";
  if (!apiKey) {
    return findLocalInteractions(medications, allSupplements);
  }
  try {
    const response = await claudeBreaker.execute(() =>
      withAbortTimeout(
        (signal) =>
          fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-20250514",
              max_tokens: 4096,
              messages: [
                {
                  role: "user",
                  content: buildPrompt(medications, supplements, recommendations, allergies),
                },
              ],
            }),
            signal,
          }),
        15000,
        "grounded.check-interactions.claude"
      )
    );
    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text =
      data.content
        ?.filter((b) => b.type === "text")
        .map((b) => b.text ?? "")
        .join("") || "[]";
    const parsed: unknown = JSON.parse(text.replace(/```json|```/g, "").trim());
    return Array.isArray(parsed) ? (parsed as WireFinding[]) : findLocalInteractions(medications, allSupplements);
  } catch (err) {
    if (isCircuitBreakerError(err)) {
      safeLog.warn("advisor.grounded.check-interactions", "claude circuit open, falling back to local", {
        error: err,
      });
    } else if (isTimeoutError(err)) {
      safeLog.warn("advisor.grounded.check-interactions", "claude timeout, falling back to local", {
        error: err,
      });
    } else {
      safeLog.warn("advisor.grounded.check-interactions", "claude failed, falling back to local", {
        error: err,
      });
    }
    return findLocalInteractions(medications, allSupplements);
  }
}

/**
 * Shared findings assemble used by the grounded chat wrap.
 * Empty medications → valid empty payload (no error).
 * Unexpected throw → soft-empty + error (wrap must refuse).
 */
export async function assembleCheckInteractions(
  body: CheckInteractionsEngineBody
): Promise<CheckInteractionsEnginePayload> {
  try {
    const medications = body.medications ?? [];
    if (!medications.length) {
      return emptyCheckInteractionsPayload();
    }
    const supplements = body.supplements ?? [];
    const recommendations = body.recommendations ?? [];
    const allergies = body.allergies ?? [];

    let interactions = await claudeOrLocal(medications, supplements, recommendations, allergies);
    const cypStatusMap = await loadCypStatusMap(body.userId);
    interactions = mergeInteractions(
      mergeInteractions(
        interactions,
        productFloorInteractions(medications, supplements, "current_supplement", cypStatusMap)
      ),
      productFloorInteractions(medications, recommendations, "ai_recommendation", cypStatusMap)
    );

    const summary = {
      major: interactions.filter((i) => i.severity === "major").length,
      moderate: interactions.filter((i) => i.severity === "moderate").length,
      minor: interactions.filter((i) => i.severity === "minor").length,
      synergistic: interactions.filter((i) => i.severity === "synergistic").length,
    };
    const blockedProducts = interactions
      .filter((i) => i.severity === "major")
      .map((i) => i.interactsWith);

    return { interactions, summary, blockedProducts };
  } catch (err) {
    safeLog.error("advisor.grounded.check-interactions", "unexpected error", { error: err });
    return {
      ...emptyCheckInteractionsPayload(),
      error: "Interaction check failed",
    };
  }
}
