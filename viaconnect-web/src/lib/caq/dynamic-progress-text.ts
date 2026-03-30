// Dynamic Pattern-Aware Progress Text for CAQ Phases
// Generates context-sensitive progress messages based on partial assessment data

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
  currentPhase: number,
  partialData: PartialPatientContext
): string {
  if (currentPhase <= 2) {
    return [
      "Let's get to know you \u2014 this helps Ultrathink personalize everything.",
      "Great start. Ultrathink is already building your health map.",
    ][currentPhase - 1];
  }

  const topPhysical = getTopSymptom(partialData.symptomsPhysical);
  const topNeuro = getTopSymptom(partialData.symptomsNeurological);

  if (currentPhase === 3 && topPhysical) {
    return `Ultrathink has already connected your ${topPhysical} patterns to possible support pathways.`;
  }
  if (currentPhase === 3) {
    return "Ultrathink is already spotting patterns from your answers.";
  }

  if (currentPhase === 4 && topPhysical && topNeuro) {
    return `Your ${topPhysical} + ${topNeuro} are forming a clear cluster \u2014 Ultrathink is narrowing the root cause.`;
  }
  if (currentPhase === 4) {
    return "Your neurological picture is taking shape.";
  }

  if (currentPhase === 5) {
    return "The emotional dimension adds the final layer \u2014 patterns are crystallizing.";
  }

  if (currentPhase === 6) {
    const hasMeds = (partialData.medications?.length || 0) > 0;
    return hasMeds
      ? "Ultrathink is cross-referencing your medications with emerging patterns."
      : "Your supplement data shapes the protocol \u2014 almost there.";
  }

  if (currentPhase === 7) {
    return "Final phase! Your lifestyle data completes the picture \u2014 Ultrathink launches after this.";
  }

  return `Building your personalized blueprint.`;
}
