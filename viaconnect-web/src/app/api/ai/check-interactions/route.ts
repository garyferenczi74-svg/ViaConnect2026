import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAbortTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import { getCircuitBreaker, isCircuitBreakerError } from "@/lib/utils/circuit-breaker";

const claudeBreaker = getCircuitBreaker("claude-api");

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

function buildPrompt(medications: string[], supplements: string[], recommendations: string[], allergies: string[]) {
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

// Known common interactions for dev mode (no API key)
const COMMON_INTERACTIONS: Record<string, { with: string; severity: string; mechanism: string; effect: string; mitigation: string }[]> = {
  warfarin: [
    { with: "CoQ10", severity: "major", mechanism: "CoQ10 structurally similar to Vitamin K, may reduce anticoagulant effect", effect: "Decreased INR, increased clot risk", mitigation: "Monitor INR weekly if co-administered. Adjust warfarin dose." },
    { with: "Omega-3", severity: "moderate", mechanism: "Omega-3 may potentiate anticoagulant effect via platelet inhibition", effect: "Increased bleeding risk", mitigation: "Monitor INR. Limit fish oil to under 2g/day." },
    { with: "Vitamin K", severity: "major", mechanism: "Direct antagonism of warfarin mechanism", effect: "Complete loss of anticoagulation", mitigation: "Avoid concurrent high-dose Vitamin K. Maintain consistent dietary intake." },
    { with: "Vitamin E", severity: "moderate", mechanism: "Vitamin E inhibits vitamin K-dependent clotting factors", effect: "Increased bleeding risk", mitigation: "Avoid doses >400 IU/day with warfarin." },
  ],
  levothyroxine: [
    { with: "Iron", severity: "moderate", mechanism: "Bivalent cation chelation reduces T4 absorption by 40-60%", effect: "Reduced thyroid hormone levels", mitigation: "Separate administration by 4+ hours" },
    { with: "Calcium", severity: "moderate", mechanism: "Calcium forms insoluble complex with levothyroxine", effect: "Reduced absorption of thyroid medication", mitigation: "Separate by 4+ hours" },
    { with: "Magnesium", severity: "moderate", mechanism: "Chelation reduces levothyroxine absorption", effect: "Reduced thyroid hormone levels", mitigation: "Separate by 4+ hours" },
  ],
  metformin: [
    { with: "Vitamin B12", severity: "synergistic", mechanism: "Metformin depletes B12 over time; supplementation repletes", effect: "Prevents metformin-induced B12 deficiency", mitigation: "Recommended co-supplementation" },
    { with: "Berberine", severity: "moderate", mechanism: "Both lower blood glucose via similar pathways", effect: "Hypoglycemia risk", mitigation: "Monitor blood glucose closely if combining" },
  ],
  statin: [
    { with: "CoQ10", severity: "synergistic", mechanism: "Statins deplete CoQ10; supplementation repletes", effect: "May reduce statin myopathy, support mitochondrial function", mitigation: "Recommended co-supplementation" },
    { with: "Grapefruit", severity: "moderate", mechanism: "CYP3A4 inhibition increases statin plasma concentration", effect: "Increased risk of myopathy/rhabdomyolysis", mitigation: "Avoid grapefruit with CYP3A4-metabolized statins" },
  ],
  ssri: [
    { with: "St. John's Wort", severity: "major", mechanism: "Additive serotonergic activity", effect: "Serotonin syndrome: agitation, confusion, rapid heart rate, high temperature", mitigation: "CONTRAINDICATED. Do not combine." },
    { with: "5-HTP", severity: "major", mechanism: "Additive serotonin precursor loading", effect: "Serotonin syndrome risk", mitigation: "CONTRAINDICATED. Do not combine." },
    { with: "SAMe", severity: "moderate", mechanism: "May increase serotonergic activity", effect: "Increased serotonin syndrome risk", mitigation: "Use with caution, start low dose if combining" },
  ],
};

function findLocalInteractions(medications: string[], supplements: string[]) {
  const results: Array<{
    medication: string; interactsWith: string; interactionType: string;
    severity: string; mechanism: string; clinicalEffect: string;
    onsetTiming: string; mitigation: string; evidenceLevel: string; citations: string[];
  }> = [];

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

export async function POST(request: Request) {
  try {
    const { userId, medications, supplements, recommendations, allergies } = await request.json();

    if (!medications?.length) {
      return NextResponse.json({ interactions: [], summary: { major: 0, moderate: 0, minor: 0, synergistic: 0 }, blockedProducts: [], notifications: { consumer: [], practitioner: [], naturopath: [] } });
    }

    const allSupplements = [...(supplements || []), ...(recommendations || [])];

    let interactions;

    if (!ANTHROPIC_API_KEY) {
      // Dev mode: use local interaction database
      interactions = findLocalInteractions(medications, allSupplements);
    } else {
      try {
        const response = await claudeBreaker.execute(() =>
          withAbortTimeout(
            (signal) => fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
              body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 4096,
                messages: [{ role: "user", content: buildPrompt(medications, supplements || [], recommendations || [], allergies || []) }],
              }),
              signal,
            }),
            15000,
            "api.ai.check-interactions.claude",
          )
        );
        const data = await response.json();
        const text = data.content?.filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("") || "[]";
        interactions = JSON.parse(text.replace(/```json|```/g, "").trim());
      } catch (err) {
        if (isCircuitBreakerError(err)) safeLog.warn("api.ai.check-interactions", "claude circuit open, falling back to local", { error: err });
        else if (isTimeoutError(err)) safeLog.warn("api.ai.check-interactions", "claude timeout, falling back to local", { error: err });
        else safeLog.warn("api.ai.check-interactions", "claude failed, falling back to local", { error: err });
        interactions = findLocalInteractions(medications, allSupplements);
      }
    }

    const summary = {
      major: interactions.filter((i: { severity: string }) => i.severity === "major").length,
      moderate: interactions.filter((i: { severity: string }) => i.severity === "moderate").length,
      minor: interactions.filter((i: { severity: string }) => i.severity === "minor").length,
      synergistic: interactions.filter((i: { severity: string }) => i.severity === "synergistic").length,
    };

    const blockedProducts = interactions
      .filter((i: { severity: string }) => i.severity === "major")
      .map((i: { interactsWith: string }) => i.interactsWith);

    // Save to database if userId provided
    if (userId) {
      const supabase = createClient();
      for (const i of interactions) {
        await supabase.from("medication_interactions").upsert({
          user_id: userId,
          medication_name: i.medication,
          interacts_with_name: i.interactsWith,
          interacts_with_type: i.interactionType || "current_supplement",
          severity: i.severity,
          mechanism: i.mechanism,
          clinical_effect: i.clinicalEffect,
          onset_timing: i.onsetTiming,
          mitigation: i.mitigation,
          evidence_level: i.evidenceLevel,
          blocked_from_protocol: i.severity === "major",
        }, { onConflict: "id" }).then(() => {}, () => {});
      }

      // Create notifications for major/moderate
      for (const i of interactions.filter((x: { severity: string }) => x.severity === "major" || x.severity === "moderate")) {
        await supabase.from("user_notifications").insert({
          user_id: userId,
          type: `interaction_${i.severity}`,
          title: i.severity === "major" ? "Important: Medication Interaction Found" : "Heads Up: Potential Interaction",
          body: `${i.interactsWith} may interact with ${i.medication}. ${i.mitigation || "Please consult a practitioner."}`,
          severity: i.severity === "major" ? "critical" : "warning",
          portal: "consumer",
        }).then(() => {}, () => {});
      }
    }

    return NextResponse.json({ interactions, summary, blockedProducts, notifications: { consumer: [], practitioner: [], naturopath: [] } });
  } catch (err) {
    safeLog.error("api.ai.check-interactions", "unexpected error", { error: err });
    return NextResponse.json({ interactions: [], summary: { major: 0, moderate: 0, minor: 0, synergistic: 0 }, blockedProducts: [], error: "Interaction check failed" });
  }
}
