// Dynamic Pattern-Aware Progress Text for CAQ Phases
// Generates context-sensitive progress messages based on partial assessment data.
//
// Prompt 173 reorder (2026-06-03): keyed by stable step id (`stepId`) instead
// of numeric position so the right copy travels with each phase wherever it
// sits in the canonical order. Position-derived "Final phase!" framing fires
// on Medications, Supplements, and Allergies (step id "4") after the remap.

interface PartialSymptomData {
  [key: string]: { score: number; description: string };
}

interface PartialPatientContext {
  symptomsPhysical?: PartialSymptomData;
  symptomsNeurological?: PartialSymptomData;
  symptomsEmotional?: PartialSymptomData;
  medications?: Array<{ name: string }>;
  supplements?: Array<{ name: string }>;
}

function getTopSymptom(data: PartialSymptomData | undefined): string | null {
  if (!data) return null;
  let topKey: string | null = null;
  let topScore = 0;
  for (const [key, val] of Object.entries(data)) {
    if (val.score > topScore) {
      topScore = val.score;
      topKey = key;
    }
  }
  if (!topKey || topScore < 3) return null;
  return topKey
    .replace("_severity", "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getDynamicProgressText(
  stepId: string,
  partialData: PartialPatientContext
): string {
  // Demographics (step id "1")
  if (stepId === "1") {
    return "Let's get to know you, this helps Ultrathink personalize everything.";
  }

  // Lifestyle & Goals (step id "3", now position 2 of 7)
  if (stepId === "3") {
    return "Great start. Ultrathink is already building your health map.";
  }

  // Health Concerns & Family History (step id "1b", now position 3 of 7)
  if (stepId === "1b") {
    return "Your history shapes the protocol, every detail compounds.";
  }

  // Physical & Energy Symptoms (step id "2a", now position 4 of 7)
  const topPhysical = getTopSymptom(partialData.symptomsPhysical);
  const topNeuro = getTopSymptom(partialData.symptomsNeurological);

  if (stepId === "2a") {
    if (topPhysical) {
      return `Ultrathink has already connected your ${topPhysical} patterns to possible support pathways.`;
    }
    return "Ultrathink is already spotting patterns from your answers.";
  }

  // Neurological & Cognitive Symptoms (step id "2b", now position 5 of 7)
  if (stepId === "2b") {
    if (topPhysical && topNeuro) {
      return `Your ${topPhysical} + ${topNeuro} are forming a clear cluster, Ultrathink is narrowing the root cause.`;
    }
    return "Your neurological picture is taking shape.";
  }

  // Emotional & Systemic Symptoms (step id "2c", now position 6 of 7)
  if (stepId === "2c") {
    return "The emotional dimension adds the final layer, patterns are crystallizing.";
  }

  // Medications, Supplements & Allergies (step id "4", now position 7 of 7,
  // the last form phase and the protocol-engine completion trigger).
  if (stepId === "4") {
    const hasMeds = (partialData.medications?.length || 0) > 0;
    return hasMeds
      ? "Final phase! Ultrathink is cross-referencing your medications with the emerging patterns."
      : "Final phase! Your supplement data completes the picture, Ultrathink launches after this.";
  }

  return "Building your personalized blueprint.";
}
