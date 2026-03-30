// Ultrathink Safety Guardrails — Non-diagnostic, disclaimers, dosage limits, escalation

export const SAFETY_RULES = {
  nonDiagnostic: {
    enforced: true,
    requiredLanguage: ["patterns suggest", "this constellation often indicates", "worth investigating with your practitioner", "consistent with"],
    prohibitedLanguage: ["you have", "this is a diagnosis", "you are suffering from", "you definitely have"],
  },
  disclaimers: {
    requiredOnEveryOutput: true,
    text: "This analysis is AI-generated using multi-disciplinary clinical frameworks. It is NOT a medical diagnosis. Please consult your physician or naturopath to review these findings.",
  },
  interactionSafety: {
    checkBeforeRecommending: true,
    blockMajorInteractions: true,
    flagModerateInteractions: true,
  },
  dosageGuardrails: {
    neverExceedUL: true,
    pregnancyScreening: true,
    pediatricScreening: true,
    renalScreening: true,
    hepaticScreening: true,
  },
  escalationTriggers: [
    "Symptom scores averaging 8+ across multiple categories",
    "Suicidal ideation or self-harm indicators in descriptions",
    "Chest pain, sudden severe headache, or stroke-like symptoms",
    "Major drug interaction detected",
    "Pregnancy with high-risk supplement combinations",
  ],
};

export function sanitizeOutput(text: string): string {
  let result = text;
  // Replace prohibited diagnostic language with softer alternatives
  result = result.replace(/\byou have\b/gi, "patterns suggest");
  result = result.replace(/\bthis is a diagnosis of\b/gi, "this pattern is consistent with");
  result = result.replace(/\byou are suffering from\b/gi, "you may be experiencing");
  return result;
}

export function checkEscalationTriggers(scores: Record<string, { score: number; description: string }>): { triggered: boolean; message: string } {
  const allScores = Object.values(scores).map(v => v?.score || 0);
  const avg = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;

  if (avg >= 8) {
    return { triggered: true, message: "Based on your responses, we recommend speaking with a healthcare provider promptly. Your symptom burden is high across multiple areas." };
  }

  // Check descriptions for crisis indicators
  const allDescs = Object.values(scores).map(v => v?.description || "").join(" ").toLowerCase();
  if (allDescs.includes("suicide") || allDescs.includes("self-harm") || allDescs.includes("end my life")) {
    return { triggered: true, message: "If you are in crisis, please contact the 988 Suicide & Crisis Lifeline (call or text 988) or go to your nearest emergency room. You are not alone." };
  }

  return { triggered: false, message: "" };
}

export function verifyDisclaimer(output: { disclaimer?: string }): { disclaimer: string } {
  return { disclaimer: output.disclaimer || SAFETY_RULES.disclaimers.text };
}
